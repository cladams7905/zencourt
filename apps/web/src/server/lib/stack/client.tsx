import { StackClientApp } from "@stackframe/stack";

const globalForStack = globalThis as typeof globalThis & {
  stackClientApp?: StackClientApp<true, string>;
};

const baseUrl = "https://app.stack-auth.com";
const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID!;
const publishableClientKey =
  process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!;
const tokenStore = "nextjs-cookie" as const;
const urls = {};
const uniqueIdentifier = `zencourt-client-${projectId}`;
const serializedConfig = JSON.stringify({
  baseUrl,
  projectId,
  publishableClientKey,
  tokenStore,
  urls,
  uniqueIdentifier
});

export const stackClientApp: StackClientApp<true, string> =
  globalForStack.stackClientApp ??
  (globalForStack.stackClientApp = new StackClientApp({
    baseUrl,
    projectId,
    publishableClientKey,
    tokenStore,
    urls,
    uniqueIdentifier,
    checkString: serializedConfig
  } as unknown as ConstructorParameters<typeof StackClientApp>[0]) as StackClientApp<
    true,
    string
  >);
