import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Demoted to a warning: the only hits are intentional, idiomatic
      // patterns — SSR client-mount guards (`setMounted(true)` in an empty
      // effect) and a debounced search that clears results. These don't
      // cause the cascading-render problem the rule targets.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
