import { StackHandler } from "@stackframe/stack";
import { AuthView } from "@web/src/components/auth/AuthView";

export default function Handler() {
  return (
    <AuthView>
      <StackHandler fullPage={false} />
    </AuthView>
  );
}
