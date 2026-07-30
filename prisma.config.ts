import "dotenv/config";
import { defineConfig } from "prisma/config";

// Fall back to placeholders instead of prisma's env() (which throws on a
// missing var) — `generate` and the Dockerfile's build stage load this
// without any real DB_* vars set and never connect, so they'd otherwise
// fail just importing the config. Commands that do connect (db push,
// migrate) still fail normally, just with a connection error instead of a
// missing-env-var one, if these are genuinely unset.
const databaseUrl = `postgresql://${process.env.DB_USERNAME ?? "prisma"}:${process.env.DB_PASSWORD ?? "prisma"}@${process.env.DB_HOST ?? "localhost"}:${process.env.DB_PORT ?? "5432"}/${process.env.DB_DATABASE ?? "prisma"}?schema=public`;

export default defineConfig({
  datasource: {
    url: databaseUrl,
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
