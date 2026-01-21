export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-foreground">Privacy Policy</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Last updated: 2026-01-21
      </p>

      <section className="mt-8 space-y-3 text-base text-foreground/90">
        <p>
          This Privacy Policy explains how Zencourt collects, uses, and shares
          information when you use the service. By using Zencourt, you consent
          to the practices described here.
        </p>
        <p>
          We collect information you provide directly, such as account details,
          project content, and support requests. We also collect technical data
          like device identifiers, log data, and usage analytics to operate and
          improve the service.
        </p>
        <p>
          We use this information to provide the service, secure accounts,
          personalize your experience, and comply with legal obligations. We do
          not sell your personal information.
        </p>
      </section>

      <section className="mt-10 space-y-3 text-base text-foreground/90">
        <h2 className="text-xl font-semibold text-foreground">Sharing</h2>
        <p>
          We share information with service providers that help us run Zencourt,
          such as hosting, storage, and analytics vendors. We may also share
          information when required by law or to protect our users and platform.
        </p>
      </section>

      <section className="mt-10 space-y-3 text-base text-foreground/90">
        <h2 className="text-xl font-semibold text-foreground">
          Cookies and tracking
        </h2>
        <p>
          We use cookies and similar technologies to maintain sessions and
          measure usage. You can control cookies through your browser settings,
          but disabling them may affect functionality.
        </p>
      </section>

      <section className="mt-10 space-y-3 text-base text-foreground/90">
        <h2 className="text-xl font-semibold text-foreground">Contact</h2>
        <p>
          If you have questions about this policy, contact us at
          support@zencourt.com.
        </p>
      </section>
    </main>
  );
}
