import { StackClientApp } from "@stackframe/stack";

let stackClientAppInstance: StackClientApp<true, string> | null = null;

function hasStackProjectId(): boolean {
  const projectId = process.env.NEXT_PUBLIC_STACK_PROJECT_ID;
  return typeof projectId === "string" && projectId.trim().length > 0;
}

export function getStackClientApp(): StackClientApp<true, string> {
  if (stackClientAppInstance) return stackClientAppInstance;
  if (!hasStackProjectId()) {
    // Keep module evaluation safe during `next build` in envs where auth
    // isn't configured (e.g. local CI). Runtime code should only call this
    // when the env var is actually present.
    throw new Error(
      "Welcome to Stack Auth! It seems that you haven't provided a project ID. Please create a project on the Stack dashboard at https://app.stack-auth.com and put it in the NEXT_PUBLIC_STACK_PROJECT_ID environment variable."
    );
  }

  stackClientAppInstance = new StackClientApp({
    tokenStore: "nextjs-cookie",
    urls: {
      afterSignUp: "/check-inbox",
      afterSignIn: "/welcome",
      home: "/welcome",
      afterSignOut: "/handler/sign-in",
      passwordReset: "/reset-password",
      emailVerification: "/verify-email"
    }
  }) as StackClientApp<true, string>;

  return stackClientAppInstance;
}
