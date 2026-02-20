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
              group: [
                "@web/*",
                "@video-server/*",
                "apps/*",
                "../../apps/*",
                "../apps/*",
                "**/apps/web/**",
                "**/apps/video-server/**"
              ],
              message:
                "packages/db must remain app-agnostic. Move app-specific logic to apps/web or apps/video-server."
            }
          ]
        }
      ]
    }
  },
  {
    ignores: ["node_modules/**", "dist/**", "*.js", "__tests__/**"]
  }
];
