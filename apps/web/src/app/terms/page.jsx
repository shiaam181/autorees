export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
      <p className="text-gray-400 mb-8">
        Last Updated: {new Date().toLocaleDateString()}
      </p>

      <div className="space-y-8 text-gray-300">
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing and using this YouTube Shorts automation service, you
            accept and agree to be bound by the terms and conditions of this
            agreement. If you do not agree to these terms, please do not use our
            service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            2. Description of Service
          </h2>
          <p className="mb-4">Our service provides:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Automated scanning of Google Drive folders for video content
            </li>
            <li>
              AI-powered metadata generation (titles, descriptions, hashtags)
            </li>
            <li>Scheduled upload to YouTube</li>
            <li>Video queue management</li>
            <li>Upload history and analytics</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            3. User Responsibilities
          </h2>
          <p className="mb-4">You agree to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Provide accurate and complete information when creating your
              account
            </li>
            <li>Maintain the security of your account credentials</li>
            <li>Only upload content you own or have permission to use</li>
            <li>
              Comply with YouTube's Terms of Service and Community Guidelines
            </li>
            <li>Not use the service for spam, abuse, or illegal activities</li>
            <li>
              Not upload copyrighted material without proper authorization
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            4. Content Ownership and Rights
          </h2>
          <p className="mb-4">
            You retain all ownership rights to the videos you upload. By using
            our service, you grant us:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Permission to access your Google Drive files for processing</li>
            <li>Permission to upload videos to YouTube on your behalf</li>
            <li>
              License to process and analyze your content for metadata
              generation
            </li>
          </ul>
          <p className="mt-4">
            We do not claim ownership of your content and will not use it for
            any purpose other than providing the service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            5. YouTube Compliance
          </h2>
          <p className="mb-4">You acknowledge that:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>All uploads are subject to YouTube's Terms of Service</li>
            <li>YouTube may remove or restrict content at their discretion</li>
            <li>We are not responsible for YouTube's actions or policies</li>
            <li>
              You must comply with all YouTube content policies and guidelines
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            6. Service Availability
          </h2>
          <p className="mb-4">We strive to provide reliable service, but:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>We do not guarantee 100% uptime</li>
            <li>Scheduled maintenance may occur with or without notice</li>
            <li>
              Third-party API limitations (Google, YouTube) may affect
              functionality
            </li>
            <li>
              We are not liable for failed uploads or service interruptions
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            7. Prohibited Activities
          </h2>
          <p className="mb-4">You may not:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Use the service to upload spam or misleading content</li>
            <li>Attempt to circumvent rate limits or quotas</li>
            <li>Reverse engineer or exploit vulnerabilities in the service</li>
            <li>Share your account with others</li>
            <li>Use automated tools to abuse the service</li>
            <li>Violate any applicable laws or regulations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            8. Account Termination
          </h2>
          <p className="mb-4">
            We reserve the right to suspend or terminate your account if:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>You violate these Terms of Service</li>
            <li>You engage in prohibited activities</li>
            <li>Your account is inactive for an extended period</li>
            <li>Required by law or legal process</li>
          </ul>
          <p className="mt-4">
            You may delete your account at any time from your account settings.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            9. Limitation of Liability
          </h2>
          <p className="mb-4">To the maximum extent permitted by law:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              We are not liable for any indirect, incidental, or consequential
              damages
            </li>
            <li>We are not responsible for content uploaded by users</li>
            <li>We are not liable for YouTube account restrictions or bans</li>
            <li>
              We do not guarantee specific results or upload success rates
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            10. Disclaimer of Warranties
          </h2>
          <p>
            THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND,
            EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE
            UNINTERRUPTED, ERROR-FREE, OR SECURE.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            11. Third-Party Services
          </h2>
          <p className="mb-4">
            Our service integrates with Google Drive and YouTube. You
            acknowledge that:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>These services have their own terms and policies</li>
            <li>We are not responsible for changes to third-party APIs</li>
            <li>Service functionality depends on third-party availability</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            12. Modifications to Terms
          </h2>
          <p>
            We reserve the right to modify these terms at any time. Changes will
            be effective immediately upon posting. Your continued use of the
            service constitutes acceptance of the modified terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            13. Governing Law
          </h2>
          <p>
            These terms shall be governed by and construed in accordance with
            applicable laws, without regard to conflict of law provisions.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-4">
            14. Contact Information
          </h2>
          <p>
            If you have questions about these Terms of Service, please contact
            us through your account settings.
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
