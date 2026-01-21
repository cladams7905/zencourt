export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-foreground">Terms of Use</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Last updated: 2026-01-20
      </p>

      <section className="mt-8 space-y-3 text-base text-foreground/90">
        <p>
          By using Zencourt, you agree to use the service responsibly and in
          compliance with applicable laws. You are responsible for the content
          you publish using the platform.
        </p>
        <p>
          The service is provided on an as-is basis without warranties of any
          kind. We may update these terms from time to time by posting a new
          version on this page.
        </p>
      </section>

      <section className="mt-10 space-y-3 text-base text-foreground/90">
        <h2 className="text-xl font-semibold text-foreground">Attribution</h2>
        <p>
          City and county data is sourced from SimpleMaps
          (https://simplemaps.com/data/us-cities).
        </p>
      </section>
    </main>
  );
}
