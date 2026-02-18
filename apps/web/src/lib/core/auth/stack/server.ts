import "server-only";

import { StackServerApp } from "@stackframe/stack";
import { stackClientApp } from "./client";

export const stackServerApp = new StackServerApp({
  inheritsFrom: stackClientApp,
  urls: {
    afterSignUp: "/check-inbox",
    afterSignIn: "/welcome",
    home: "/welcome",
    afterSignOut: "/handler/sign-in",
    passwordReset: "/reset-password",
    emailVerification: "/verify-email"
  }
});
