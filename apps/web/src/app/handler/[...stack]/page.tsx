import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "../../../server/lib/stack/server";
import { AuthSurface } from "../../../components/AuthSurface";

export default function Handler(props: unknown) {
  return (
    <AuthSurface>
      <StackHandler fullPage={false} app={stackServerApp} routeProps={props} />
    </AuthSurface>
  );
}
