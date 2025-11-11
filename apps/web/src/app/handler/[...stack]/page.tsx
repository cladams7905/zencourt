import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "../../../server/lib/stack/server";
import { AuthSurface } from "../../../components/AuthSurface";

export default async function Handler(props: {
  params: Promise<{ stack?: string[] }>;
  searchParams?: Promise<Record<string, string>>;
}) {
  const params = await props.params;
  const searchParams = props.searchParams ? await props.searchParams : undefined;

  return (
    <AuthSurface>
      <StackHandler app={stackServerApp} params={params} searchParams={searchParams} />
    </AuthSurface>
  );
}
