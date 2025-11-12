import "server-only";

import { StackServerApp } from "@stackframe/stack";

// Use a deterministic uniqueIdentifier to prevent conflicts across server workers
// This ensures all workers see the same Stack server configuration
// Note: uniqueIdentifier and checkString are internal options not exposed in public types
type StackServerAppConstructor = new (options: {
  tokenStore: "nextjs-cookie";
  projectId: string;
  publishableClientKey: string;
  secretServerKey: string;
  uniqueIdentifier: string;
  checkString: string;
}) => StackServerApp<true, string>;

// Use a fixed checkString to ensure consistency across all worker processes
const STACK_SERVER_CHECK_STRING = `zencourt-server-check-${process.env.NEXT_PUBLIC_STACK_PROJECT_ID}`;

export const stackServerApp: StackServerApp<true, string> = new (StackServerApp as unknown as StackServerAppConstructor)({
  tokenStore: "nextjs-cookie",
  projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
  publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
  secretServerKey: process.env.STACK_SECRET_SERVER_KEY!,
  uniqueIdentifier: `zencourt-server-${process.env.NEXT_PUBLIC_STACK_PROJECT_ID}`,
  checkString: STACK_SERVER_CHECK_STRING,
});
