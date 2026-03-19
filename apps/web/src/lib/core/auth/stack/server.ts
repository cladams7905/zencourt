import "server-only";

import { StackServerApp } from "@stackframe/stack";
import { getStackClientApp } from "./client";

let stackServerAppInstance: StackServerApp | null = null;

function ensureStackServerApp(): StackServerApp {
  if (stackServerAppInstance) return stackServerAppInstance;

  stackServerAppInstance = new StackServerApp({
    inheritsFrom: getStackClientApp(),
    urls: {
      afterSignUp: "/check-inbox",
      afterSignIn: "/welcome",
      home: "/welcome",
      afterSignOut: "/handler/sign-in",
      passwordReset: "/reset-password",
      emailVerification: "/verify-email"
    }
  });

  return stackServerAppInstance;
}

export const stackServerApp = {
  getUser: (...args: Parameters<StackServerApp["getUser"]>) =>
    ensureStackServerApp().getUser(...args)
};
