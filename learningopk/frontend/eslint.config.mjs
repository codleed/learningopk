import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      // TODO: lift these back to "error" once tracked work completes.
      // - react-hooks/refs: curriculum-builder uses forwarded refs read
      //   transitively via parent useRef stores; needs a refactor to
      //   useRef + imperative handle. Tracked.
      // - react-hooks/set-state-in-effect: legacy derived-state-in-effect
      //   patterns in admin managers + use-summary-editor. Tracked.
      // - react-hooks/immutability: virtual-list/grid mutate memoized
      //   arrays; needs a structural-copy refactor. Tracked.
      // - react-hooks/error-boundaries: school/layout constructs JSX
      //   inside a try/catch; needs error-boundary extraction. Tracked.
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/error-boundaries": "warn",
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
