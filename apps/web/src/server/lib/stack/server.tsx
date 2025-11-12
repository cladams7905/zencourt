import "server-only";

import { StackServerApp } from "@stackframe/stack";

const globalForStack = globalThis as typeof globalThis & {
  stackServerApp?: StackServerApp<true, string>;
};

const serverBaseUrl = "https://api.stack-auth.com";
const serverProjectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID!;
const publishableKey = process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!;
const secretServerKey = process.env.STACK_SECRET_SERVER_KEY!;
const serverTokenStore = "nextjs-cookie" as const;
const serverUrls = {};
const serverUniqueIdentifier = `zencourt-server-${serverProjectId}`;
const serverSerializedConfig = JSON.stringify({
  baseUrl: serverBaseUrl,
  projectId: serverProjectId,
  publishableClientKey: publishableKey,
  secretServerKey,
  tokenStore: serverTokenStore,
  urls: serverUrls,
  uniqueIdentifier: serverUniqueIdentifier
});

export const stackServerApp: StackServerApp<true, string> =
  globalForStack.stackServerApp ??
  (globalForStack.stackServerApp = new StackServerApp({
    baseUrl: serverBaseUrl,
    projectId: serverProjectId,
    publishableClientKey: publishableKey,
    secretServerKey,
    tokenStore: serverTokenStore,
    urls: serverUrls,
    uniqueIdentifier: serverUniqueIdentifier,
    checkString: serverSerializedConfig
  } as unknown as ConstructorParameters<typeof StackServerApp>[0]) as StackServerApp<
    true,
    string
  >);
