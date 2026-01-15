import Link from "next/link";

type CanvaReturnPageProps = {
  searchParams?: {
    status?: string;
    message?: string;
    state?: string;
  };
};

export default function CanvaReturnPage({
  searchParams
}: CanvaReturnPageProps) {
  const status = searchParams?.status ?? "success";
  const message = searchParams?.message;
  const state = searchParams?.state;
  const isSuccess = status === "success";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Canva Connection
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">
          {isSuccess ? "You're all set." : "We couldn't finish that."}
        </h1>
        <p className="mt-3 text-slate-600">
          {isSuccess
            ? "You can safely return to Zencourt or close this tab."
            : "Please try connecting again. If the issue persists, reach out to support."}
        </p>
        {message ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-700">
            {message}
          </div>
        ) : null}
        {state ? (
          <div className="mt-3 text-xs text-slate-500">
            Connection state: {state}
          </div>
        ) : null}
        <div className="mt-6">
          <Link
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            href="/"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
