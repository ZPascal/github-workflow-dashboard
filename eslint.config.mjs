import nextConfig from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextConfig,
  ...nextCoreWebVitals,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // setState inside async functions called from effects is safe; this rule
      // produces false positives for the load-on-mount pattern used throughout.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
