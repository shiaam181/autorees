export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
      <p className="text-gray-400 mb-8">
        Last Updated: {new Date().toLocaleDateString()}
      </p>

      <div className="space-y-8 text-gray-300">
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            1. Information We Collect
          </h2>
          <p className="mb-4">
            We collect information you provide directly to us when you create an
            account and connect your Google services:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Email address and name (from your account)</li>
            <li>Google Drive access (to scan folders for videos)</li>
            <li>YouTube channel access (to upload videos)</li>
            <li>Video metadata (titles, descriptions, hashtags)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            2. How We Use Your Information
          </h2>
          <p className="mb-4">We use the information we collect to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Scan your Google Drive folders for video files</li>
            <li>Generate AI-powered metadata for your videos</li>
            <li>Upload videos to your YouTube channel on your behalf</li>
            <li>Provide scheduling and automation features</li>
            <li>Improve our service and user experience</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            3. Data Storage and Security
          </h2>
          <p className="mb-4">We take data security seriously:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>OAuth tokens are encrypted and securely stored</li>
            <li>We never store your Google password</li>
            <li>All data transmission uses HTTPS encryption</li>
            <li>
              Access tokens are automatically refreshed and managed securely
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            4. Third-Party Services
          </h2>
          <p className="mb-4">
            We integrate with the following third-party services:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Google Drive API</strong> - To access and read your video
              files
            </li>
            <li>
              <strong>YouTube Data API</strong> - To upload videos to your
              channel
            </li>
            <li>
              <strong>Google OAuth 2.0</strong> - For secure authentication
            </li>
          </ul>
          <p className="mt-4">
            These services have their own privacy policies. We recommend
            reviewing:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-500 hover:text-red-400 underline"
              >
                Google Privacy Policy
              </a>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            5. Your Rights and Control
          </h2>
          <p className="mb-4">You have the right to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Disconnect your Google Drive or YouTube account at any time</li>
            <li>Delete your account and all associated data</li>
            <li>
              Revoke access from your{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-500 hover:text-red-400 underline"
              >
                Google Account settings
              </a>
            </li>
            <li>Request a copy of your data</li>
            <li>Request deletion of your data</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            6. Data Retention
          </h2>
          <p>
            We retain your data for as long as your account is active. If you
            delete your account, we will delete all your data within 30 days,
            except where we are required to retain it for legal purposes.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            7. Google API Services User Data Policy
          </h2>
          <p className="mb-4">
            This application's use of information received from Google APIs
            adheres to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-red-500 hover:text-red-400 underline"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
          <p className="mb-4">Specifically, we:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Only request the minimum scopes necessary for functionality</li>
            <li>Use data only for providing and improving our service</li>
            <li>
              Do not transfer data to third parties (except as required for
              service functionality)
            </li>
            <li>Do not use data for advertising purposes</li>
            <li>
              Do not allow humans to read your data unless you give explicit
              permission
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            8. Children's Privacy
          </h2>
          <p>
            Our service is not intended for children under 13 years of age. We
            do not knowingly collect personal information from children under
            13.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            9. Changes to This Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify
            you of any changes by posting the new Privacy Policy on this page
            and updating the "Last Updated" date.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">10. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact
            us through your account settings or by email.
          </p>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-white/10">
        <a href="/" className="text-red-500 hover:text-red-400 font-semibold">
          ← Back to Home
        </a>
      </div>
    </div>
  );
}
