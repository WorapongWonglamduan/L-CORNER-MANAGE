import { config } from "dotenv";

// Runs before every test file's own imports — critical, since
// src/lib/prisma.ts reads process.env.DB_HOST/etc. to build its pg.Pool at
// module-load time, not lazily. `override: true` so this always wins even
// if something upstream already populated process.env from .env.
config({ path: ".env.test", override: true });
