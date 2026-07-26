import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // The React Compiler plugin (new in eslint-config-next 16.2) flags every
      // "fetch on mount / on filter change" useEffect as an error. That pattern
      // is used app-wide (dashboard, pos, sales, inventory, useEntityList) as
      // the project's standard client-side data-fetching idiom — rewriting all
      // of them is a separate, larger effort, not a side effect of a version
      // bump. Keep it visible as a warning instead of failing the build.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    // Standalone Node utility scripts (run via `node scripts/x.js`, plain
    // CommonJS, no "type": "module" in package.json) — require() is correct
    // here, not a TypeScript/ESM violation.
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
