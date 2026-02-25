import { dirname } from "path";
import { fileURLToPath } from "url";
import { readdirSync } from "fs";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const servicesDir = `${__dirname}/src/server/services`;
const serviceNames = readdirSync(servicesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const serviceBoundaryRules = serviceNames.map((serviceName) => ({
  files: [`src/server/services/${serviceName}/**/*.ts`],
  ignores: ["**/__tests__/**", "**/*.test.ts"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: serviceNames
              .filter(
                (other) =>
                  other !== serviceName &&
                  other !== "_config" &&
                  other !== "_integrations"
              )
              .map((other) => `@web/src/server/services/${other}/**`),
            message:
              "Services must not import other services. Allowed: imports within the same service module and shared config/integrations under @web/src/server/services/_config/** and @web/src/server/services/_integrations/**.",
          },
        ],
      },
    ],
  },
}));

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["**/__tests__/**", "**/*.test.ts", "**/*.spec.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["drizzle-orm", "drizzle-orm/*"],
              message:
                "Import Drizzle helpers from @db/client in app code. Avoid direct drizzle-orm imports.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/server/models/shared/dbErrorHandling.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    files: ["src/app/api/v1/**/route.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@web/src/server/models/**"],
              message:
                "API routes must not import server models directly. Call server/actions instead.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/app/api/v1/**/route.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@web/src/server/services/**"],
              message:
                "API routes should call server/actions. Direct service imports are reserved for explicit edge/integration routes.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/server/actions/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@web/src/app/api/**"],
              message:
                "Server actions must remain HTTP-agnostic and must not import API route modules.",
            },
          ],
          paths: [
            {
              name: "next/server",
              message:
                "Server actions must not use NextResponse/HTTP objects. Keep HTTP concerns in route handlers.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/server/services/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@web/src/server/actions/**"],
              message:
                "Services must not import server/actions. Keep dependency direction action -> service.",
            },
          ],
        },
      ],
    },
  },
  ...serviceBoundaryRules,
  {
    files: ["src/server/models/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@web/src/server/actions/**", "@web/src/server/services/**", "@web/src/app/api/**"],
              message:
                "Models are the DB layer and must not depend on actions, services, or routes.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@web/src/server/models/**", "@web/src/server/services/**"],
              message:
                "Components must not depend on server models/services directly. Use server actions (mutations) or API routes (client fetching/streaming).",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "coverage/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
