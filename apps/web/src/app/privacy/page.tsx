import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy - Clawntown',
  description: 'Privacy Policy for Clawntown, the coastal crustacean town',
};

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-rct-sand py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="window-retro mb-6">
          <div className="window-title flex items-center gap-2">
            <span>Privacy Policy</span>
          </div>
          <div className="p-4">
            <div className="text-center mb-4">
              <h1 className="font-pixel text-lg text-shell-red mb-2">
                CLAWNTOWN PRIVACY POLICY
              </h1>
              <p className="font-retro text-xs text-gray-600">
                How We Handle Your Data in Our Coastal Community
              </p>
              <p className="font-retro text-xs text-gray-500 mt-2">
                Last updated: February 2025
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="window-retro">
          <div className="window-title">
            <span>Data & Privacy</span>
          </div>
          <div className="p-4 space-y-6 font-retro text-sm">
            {/* Introduction */}
            <section>
              <h2 className="font-pixel text-xs text-shell-red mb-2">
                PLAIN TALK ABOUT YOUR PRIVACY
              </h2>
              <p className="text-gray-700 leading-relaxed">
                At Clawntown, we believe privacy policies shouldn't require a law degree to
                understand. This document explains what information we collect, why we collect it,
                and what rights you have. We'll keep it as simple as a lobster's life philosophy:
                eat, swim, and be crabby when necessary.
              </p>
            </section>

            {/* What We Collect */}
            <section>
              <h2 className="font-pixel text-xs text-shell-red mb-2">
                WHAT WE COLLECT
              </h2>
              <p className="text-gray-700 leading-relaxed mb-2">
                Here's the full list of information we may collect:
              </p>

              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                  <p className="text-blue-800 text-xs font-bold mb-1">Account Information</p>
                  <ul className="list-disc list-inside text-blue-700 text-xs space-y-1">
                    <li><strong>Email address:</strong> Used for magic link authentication</li>
                    <li><strong>Display name:</strong> The name you choose to show in town</li>
                    <li><strong>Avatar selection:</strong> Your chosen visual representation</li>
                  </ul>
                </div>

                <div className="bg-purple-50 border border-purple-200 p-3 rounded">
                  <p className="text-purple-800 text-xs font-bold mb-1">Chat & Activity Data</p>
                  <ul className="list-disc list-inside text-purple-700 text-xs space-y-1">
                    <li><strong>Chat messages:</strong> Your conversations with council members</li>
                    <li><strong>Timestamps:</strong> When you visited and chatted</li>
                    <li><strong>Moderation flags:</strong> Records of any conduct violations</li>
                  </ul>
                </div>

                <div className="bg-orange-50 border border-orange-200 p-3 rounded">
                  <p className="text-orange-800 text-xs font-bold mb-1">Technical Data</p>
                  <ul className="list-disc list-inside text-orange-700 text-xs space-y-1">
                    <li><strong>IP address:</strong> For security and abuse prevention</li>
                    <li><strong>Browser/device info:</strong> Basic technical details for compatibility</li>
                    <li><strong>Captcha data:</strong> Verification to prevent bot abuse</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Public Chats Notice */}
            <section>
              <h2 className="font-pixel text-xs text-shell-red mb-2">
                YOUR CHATS ARE PUBLIC
              </h2>
              <div className="bg-amber-50 border border-amber-200 p-3 rounded mb-2">
                <p className="text-amber-800 text-xs">
                  <strong>Important:</strong> Chat conversations with council members are publicly
                  viewable. Think of them as town hall transcripts — anyone can read them. Your
                  display name (not your email) appears alongside your messages.
                </p>
              </div>
              <p className="text-gray-700 leading-relaxed">
                Don't share sensitive personal information in chats. We can't make public messages
                private after the fact — once said in the town square, it's out there!
              </p>
            </section>

            {/* How We Use Data */}
            <section>
              <h2 className="font-pixel text-xs text-shell-red mb-2">
                HOW WE USE YOUR DATA
              </h2>
              <p className="text-gray-700 leading-relaxed mb-2">
                We use your information to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-2">
                <li><strong>Provide the service:</strong> Let you log in, chat, and participate</li>
                <li><strong>Authenticate you:</strong> Send magic link emails to verify your identity</li>
                <li><strong>Moderate content:</strong> Keep the town safe and friendly</li>
                <li><strong>Prevent abuse:</strong> Stop bots, spam, and bad actors</li>
                <li><strong>Improve Clawntown:</strong> Understand how people use the site</li>
                <li><strong>Communicate with you:</strong> Send important updates (rarely, we promise)</li>
              </ul>
            </section>

            {/* AI and Data */}
            <section>
              <h2 className="font-pixel text-xs text-shell-red mb-2">
                AI & YOUR MESSAGES
              </h2>
              <p className="text-gray-700 leading-relaxed mb-2">
                When you chat with council members, your messages are processed by AI systems to
                generate responses. Here's what you should know:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-2">
                <li>Messages are sent to AI services to generate council member responses</li>
                <li>We may use anonymized conversation data to improve our AI characters</li>
                <li>The AI doesn't "remember" you between sessions (each chat starts fresh)</li>
                <li>We filter messages for harmful content before and after AI processing</li>
              </ul>
            </section>

            {/* Data Sharing */}
            <section>
              <h2 className="font-pixel text-xs text-shell-red mb-2">
                WHO WE SHARE DATA WITH
              </h2>
              <p className="text-gray-700 leading-relaxed mb-2">
                We don't sell your personal data. Period. We may share data with:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-2">
                <li><strong>Service providers:</strong> Hosting, email delivery, AI processing, captcha verification</li>
                <li><strong>Legal requirements:</strong> If required by law or to protect rights and safety</li>
                <li><strong>The public:</strong> Chat transcripts (with display names) are publicly visible</li>
              </ul>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="font-pixel text-xs text-shell-red mb-2">
                HOW LONG WE KEEP DATA
              </h2>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-2">
                <li><strong>Account data:</strong> Until you delete your account</li>
                <li><strong>Chat messages:</strong> Retained as public transcripts (can be deleted on request)</li>
                <li><strong>Technical logs:</strong> Typically 90 days for security purposes</li>
                <li><strong>Moderation records:</strong> Retained to enforce bans and track repeat violations</li>
              </ul>
            </section>

            {/* Your Rights (GDPR) */}
            <section>
              <h2 className="font-pixel text-xs text-shell-red mb-2">
                YOUR RIGHTS
              </h2>
              <p className="text-gray-700 leading-relaxed mb-2">
                You have rights over your data. Here's what you can do:
              </p>
              <div className="bg-green-50 border border-green-200 p-3 rounded">
                <ul className="list-disc list-inside text-green-700 text-xs space-y-2">
                  <li>
                    <strong>Access:</strong> Request a copy of the data we have about you
                  </li>
                  <li>
                    <strong>Correction:</strong> Update or fix inaccurate information
                  </li>
                  <li>
                    <strong>Deletion:</strong> Request that we delete your account and associated data
                  </li>
                  <li>
                    <strong>Portability:</strong> Receive your data in a common format (JSON/CSV)
                  </li>
                  <li>
                    <strong>Objection:</strong> Object to certain types of processing
                  </li>
                  <li>
                    <strong>Withdraw consent:</strong> Change your mind about optional data uses
                  </li>
                </ul>
              </div>
              <p className="text-gray-700 leading-relaxed mt-2">
                To exercise these rights, contact us through our community channels. We'll respond
                within 30 days (usually much faster).
              </p>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="font-pixel text-xs text-shell-red mb-2">
                COOKIES & LOCAL STORAGE
              </h2>
              <p className="text-gray-700 leading-relaxed mb-2">
                We use cookies and similar technologies to:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-2">
                <li><strong>Keep you logged in:</strong> Session cookies for authentication</li>
                <li><strong>Remember preferences:</strong> Your settings and choices</li>
                <li><strong>Security:</strong> Captcha verification and abuse prevention</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mt-2">
                We don't use tracking cookies for advertising. We're not trying to follow you
                around the internet — we're just running a crustacean town here.
              </p>
            </section>

            {/* Children */}
            <section>
              <h2 className="font-pixel text-xs text-shell-red mb-2">
                CHILDREN'S PRIVACY
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Clawntown is not intended for children under 13. We don't knowingly collect
                personal information from children under 13. If you believe a child has provided
                us with personal data, please contact us and we'll delete it.
              </p>
            </section>

            {/* Security */}
            <section>
              <h2 className="font-pixel text-xs text-shell-red mb-2">
                DATA SECURITY
              </h2>
              <p className="text-gray-700 leading-relaxed">
                We use reasonable security measures to protect your data, including encryption
                in transit (HTTPS) and secure storage practices. However, no system is 100%
                secure — if you discover a security issue, please let us know responsibly.
              </p>
            </section>

            {/* International */}
            <section>
              <h2 className="font-pixel text-xs text-shell-red mb-2">
                INTERNATIONAL DATA TRANSFERS
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Clawntown operates internationally. Your data may be processed in countries
                outside your own. We take appropriate measures to ensure your data is protected
                regardless of where it's processed.
              </p>
            </section>

            {/* Changes */}
            <section>
              <h2 className="font-pixel text-xs text-shell-red mb-2">
                CHANGES TO THIS POLICY
              </h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this Privacy Policy from time to time. We'll post the new version
                here with an updated date. For significant changes, we'll notify registered
                citizens via email.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="font-pixel text-xs text-shell-red mb-2">
                CONTACT US
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Questions about privacy? Want to exercise your data rights? Reach out to us
                through our community channels. We take privacy seriously and are happy to help.
              </p>
            </section>

            {/* Footer Links */}
            <div className="pt-4 border-t border-gray-300 flex justify-between items-center">
              <Link href="/" className="btn-retro text-xs">
                Back to Town
              </Link>
              <Link href="/terms" className="font-retro text-xs text-blue-600 hover:underline">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
