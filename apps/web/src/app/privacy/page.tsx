export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-foreground">Privacy Policy</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Last updated: 2026-01-30
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

      <section className="mt-10 space-y-4 text-base text-foreground/90">
        <h2 className="text-xl font-semibold text-foreground">
          Google user data
        </h2>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">
            Data accessed
          </h3>
          <p>
            If you sign in with Google, we access basic profile information from
            your Google account, such as your name, email address, profile
            photo, and Google user ID. We do not access your Gmail, Drive, or
            other Google services unless you explicitly connect those services.
            If you connect Google Drive, we request read-only access to your
            Google Drive photos and videos so you can upload content to generate
            social media content.
          </p>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Data usage</h3>
          <p>
            We use this data to authenticate your account, create and maintain
            your Zencourt profile, personalize your experience (for example,
            displaying your name and avatar), and provide support.
          </p>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">
            Data sharing
          </h3>
          <p>
            We do not sell Google user data. We share it only with service
            providers that help us operate Zencourt (such as hosting, storage,
            and analytics) or when required by law. We do not share Google user
            data with advertisers.
          </p>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">
            Data storage and protection
          </h3>
          <p>
            We store Google user data on secure servers and apply reasonable
            administrative, technical, and organizational safeguards to protect
            it. Access is limited to authorized personnel and service providers
            who need it to operate the service.
          </p>
        </div>
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">
            Data retention and deletion
          </h3>
          <p>
            We retain Google user data for as long as your account is active or
            as needed to provide the service and comply with legal obligations.
            You can request deletion of your data by contacting
            team@zencourt.ai. We will delete or anonymize data unless we are
            required to keep it for legal or security purposes.
          </p>
        </div>
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
          team@zencourt.ai.
        </p>
      </section>
    </main>
  );
}
