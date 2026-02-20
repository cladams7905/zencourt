import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./tsconfig.json"
      }
    },
    plugins: {
      "@typescript-eslint": tseslint
    },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@db/*", "../db/*", "../../db/*", "**/packages/db/**"],
              message:
                "packages/shared must not import from packages/db. Move shared contracts/types to packages/shared or import DB-owned types at consumers."
            }
          ]
        }
      ]
    }
  },
  {
    ignores: ["node_modules/**", "dist/**", "*.js", "__tests__/**", "__mocks__/**"]
  }
];
