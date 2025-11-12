import "server-only";

import { StackServerApp } from "@stackframe/stack";

const globalForStack = globalThis as typeof globalThis & {
  stackServerApp?: StackServerApp<true, string>;
};

export const stackServerApp =
  globalForStack.stackServerApp ??
  (globalForStack.stackServerApp = new StackServerApp({
    tokenStore: "nextjs-cookie",
    baseUrl: process.env.NEXT_PUBLIC_STACK_URL || "https://app.stack-auth.com",
    projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
    publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
    secretServerKey: process.env.STACK_SECRET_SERVER_KEY!
  }));
