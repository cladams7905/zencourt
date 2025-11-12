import { StackClientApp } from "@stackframe/stack";

// Use a deterministic uniqueIdentifier to prevent conflicts across server workers
// This ensures all workers see the same Stack client configuration
// Note: uniqueIdentifier and checkString are internal options not exposed in public types
type StackClientAppConstructor = new (options: {
  tokenStore: "nextjs-cookie";
  projectId: string;
  publishableClientKey: string;
  uniqueIdentifier: string;
  checkString: string;
}) => StackClientApp<true, string>;

// Use a fixed checkString to ensure consistency across all worker processes
const STACK_CLIENT_CHECK_STRING = `zencourt-client-check-${process.env.NEXT_PUBLIC_STACK_PROJECT_ID}`;

export const stackClientApp: StackClientApp<true, string> = new (StackClientApp as unknown as StackClientAppConstructor)({
  tokenStore: "nextjs-cookie",
  projectId: process.env.NEXT_PUBLIC_STACK_PROJECT_ID!,
  publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY!,
  uniqueIdentifier: `zencourt-client-${process.env.NEXT_PUBLIC_STACK_PROJECT_ID}`,
  checkString: STACK_CLIENT_CHECK_STRING,
});
