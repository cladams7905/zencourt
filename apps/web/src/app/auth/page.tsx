"use client";

import { SignIn } from "@stackframe/stack";
import { AuthSurface } from "../../components/AuthSurface";

export default function AuthPage() {
  return (
    <AuthSurface>
      <SignIn />
    </AuthSurface>
  );
}
