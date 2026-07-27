import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const databaseUrl = `postgresql://${env("DB_USERNAME")}:${env("DB_PASSWORD")}@${env("DB_HOST")}:${env("DB_PORT")}/${env("DB_DATABASE")}?schema=public`;

export default defineConfig({
  datasource: {
    url: databaseUrl,
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
