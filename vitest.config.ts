import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    // resetDb() (tests/helpers/fixtures.ts) wipes entire tables, not just
    // rows scoped to the running test — with fileParallelism on, two test
    // files hitting the same real test database concurrently would delete
    // each other's in-progress fixtures mid-test. Every file shares one
    // Postgres database on purpose (simplicity over speed for a suite this
    // size), so files must run one at a time.
    fileParallelism: false,
    testTimeout: 15000,
  },
});
