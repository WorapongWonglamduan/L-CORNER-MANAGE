# Shared reverse-proxy stack

One Caddy instance, shared across every project on this VPS — each project
gets its own block in `Caddyfile`, routed by hostname to that project's own
`docker-compose.yml` stack over the `shared-proxy` Docker network (created
once, by hand: `docker network create shared-proxy`).

## Cloudflare Tunnel (only on a VPS with no public IP)

If the VPS only has a Tailscale IP (no public IP to point DNS at), Caddy
can't bind host ports 80/443 to the internet the normal way — Cloudflare
Tunnel is the ingress instead. `cloudflared` runs as a container on
`shared-proxy` and forwards to Caddy over plain HTTP inside the Docker
network; Cloudflare's edge terminates TLS for real visitors. This is why
`Caddyfile`'s site blocks use an explicit `http://` address — that disables
Caddy's automatic-HTTPS/ACME behavior, which would otherwise retry forever
since this host can never answer an ACME HTTP-01 challenge from the public
internet.

A VPS with a real public IP doesn't need any of this — just don't add the
`cloudflared` service, and drop the `http://` prefix in `Caddyfile` so Caddy
gets its own real certs via ACME as normal.

### One-time bootstrap (per VPS)

```bash
# 1. Authenticate cloudflared to your Cloudflare account (opens a browser
#    link — approve it for the right domain/zone). Only needs doing once;
#    writes ~/.cloudflared/cert.pem.
cloudflared tunnel login

# 2. Create the tunnel (once) — writes ~/.cloudflared/<tunnel-id>.json,
#    the credentials file the container needs.
cloudflared tunnel create <tunnel-name>

# 3. Point this directory's cloudflared/ folder at that tunnel.
mkdir -p deploy/reverse-proxy/cloudflared
cp ~/.cloudflared/<tunnel-id>.json deploy/reverse-proxy/cloudflared/

cat > deploy/reverse-proxy/cloudflared/config.yml <<EOF
tunnel: <tunnel-id>
credentials-file: /etc/cloudflared/<tunnel-id>.json

ingress:
  - hostname: lcorner.anakodtech.com
    service: http://shared-caddy:80
  - hostname: uat-lcorner.anakodtech.com
    service: http://shared-caddy:80
  # Add one entry per project hostname, same shape, before the catch-all.
  - service: http_status:404
EOF

# 4. Route each hostname's DNS (CNAME to the tunnel) — repeat per hostname.
cloudflared tunnel route dns <tunnel-name> lcorner.anakodtech.com
cloudflared tunnel route dns <tunnel-name> uat-lcorner.anakodtech.com

# 5. Start (or restart) the stack.
docker compose up -d
```

Adding a new project later is just: a new `ingress` entry + a new
`cloudflared tunnel route dns` call + a new `Caddyfile` block — the tunnel
itself is created once per VPS, not once per project.
