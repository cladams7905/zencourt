import { StackClientApp } from "@stackframe/stack";

const globalForStack = globalThis as typeof globalThis & {
  stackClientApp?: StackClientApp<true, string>;
};

export const stackClientApp =
  globalForStack.stackClientApp ??
  (globalForStack.stackClientApp = new StackClientApp({
    tokenStore: "nextjs-cookie",
    baseUrl: process.env.NEXT_PUBLIC_STACK_URL || "https://app.stack-auth.com",
    projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
    publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!
  }));
