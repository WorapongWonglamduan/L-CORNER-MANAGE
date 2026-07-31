FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
# npm ci demands the lockfile list every optional platform-specific package
# (native bindings for sharp/lightningcss/@next-swc, etc.) for the platform
# it's running on — this lockfile was last generated on Windows, so it's
# missing the Linux-alpine ones `npm ci` wants here. `npm install` re-resolves
# those for the current platform instead of hard-failing on the mismatch.
RUN npm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Next.js inlines NEXT_PUBLIC_* vars into the client bundle at build time, not
# at container runtime — must arrive as build ARGs (wired from docker-compose
# build.args / the GitHub Actions build-push-action step), not just the
# runner stage's `environment:` block in docker-compose.yml.
ARG NEXT_PUBLIC_OMISE_PUBLIC_KEY
ARG NEXT_PUBLIC_PAYPAL_ENABLED
# Same rule applies here — src/lib/payments/paypal-driver.ts reads this at
# "runtime" via process.env, but Next's compiler still statically inlines it
# at build time since the file is server code Next itself bundles. Left
# unset, it silently falls back to the code's own http://localhost:3077
# default, which is wrong in any deployed environment.
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_OMISE_PUBLIC_KEY=${NEXT_PUBLIC_OMISE_PUBLIC_KEY}
ENV NEXT_PUBLIC_PAYPAL_ENABLED=${NEXT_PUBLIC_PAYPAL_ENABLED}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Every "local day boundary" fix in this app (sales/inventory-movements
# date filters, sale/refund number generation, dashboard "today" stats)
# relies on `new Date()`'s local getters/setters actually reflecting
# Asia/Bangkok wall-clock time. Alpine's musl libc has no timezone data
# without `tzdata`, and without TZ set the container defaults to UTC —
# silently shifting every one of those boundaries by 7 hours in
# production despite being correct in code.
RUN apk add --no-cache tzdata
ENV TZ=Asia/Bangkok

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
