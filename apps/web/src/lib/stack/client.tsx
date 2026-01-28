import { StackClientApp } from "@stackframe/stack";

export const stackClientApp = new StackClientApp({
  tokenStore: "nextjs-cookie",
  urls: {
    afterSignUp: "/check-inbox",
    afterSignIn: "/welcome",
    home: "/welcome",
    afterSignOut: "/handler/sign-in",
    passwordReset: "/reset-password",
    emailVerification: "/verify-email"
  }
});
