import { config } from "@workspace/eslint-config/react-internal";

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...config,
  {
    ignores: [
      "node_modules/**",
      ".expo/**",
      "ios/**",
      "android/**",
      "dist/**",
      ".tamagui/**",
    ],
  },
];