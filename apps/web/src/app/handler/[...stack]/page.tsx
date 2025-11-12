import { StackHandler } from "@stackframe/stack";
import { AuthSurface } from "@web/src/components/AuthSurface";

export default function Handler() {
  return (
    <AuthSurface>
      <StackHandler fullPage={false} />
    </AuthSurface>
  );
}
