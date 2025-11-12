"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AuthSurface } from "../../components/AuthSurface";

const SignIn = dynamic(() => import("@stackframe/stack").then((mod) => mod.SignIn), {
  ssr: false
});

export default function AuthPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <AuthSurface>
      <SignIn />
    </AuthSurface>
  );
}
