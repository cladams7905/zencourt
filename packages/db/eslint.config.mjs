import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

const appAgnosticImportPatterns = [
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
];

const drizzleImportPatterns = [
  {
    group: ["drizzle-orm", "drizzle-orm/*"],
    message:
      "Direct drizzle-orm imports belong only in packages/db/client.ts and drizzle/schema/. For query helpers, import from @db/client."
  }
];

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
          patterns: [...appAgnosticImportPatterns, ...drizzleImportPatterns]
        }
      ]
    }
  },
  {
    files: ["client.ts", "drizzle/schema/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: appAgnosticImportPatterns
        }
      ]
    }
  },
  {
    ignores: ["node_modules/**", "dist/**", "*.js", "__tests__/**"]
  }
];
