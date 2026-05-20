import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold text-foreground border-l-2 border-primary pl-3">{title}</h2>
      <div className="space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_li]:text-sm [&_p]:text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-playfair text-3xl font-bold">Privacy Policy</h1>
              <p className="text-sm text-muted-foreground">Effective Date: April 22, 2026 · Last Updated: April 22, 2026</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-10 pl-[52px]">
            Applies to: StudioOne AI (Android App &amp; Web Application)
          </p>

          <div className="space-y-10 text-muted-foreground">

            {/* Intro */}
            <p className="text-sm leading-relaxed">
              StudioOne AI ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains what
              personal data we collect, how we use it, and what rights you have — in plain, easy-to-understand language.
              By using StudioOne AI, you agree to the practices described in this policy.
            </p>

            {/* 1. Data We Collect */}
            <Section title="1. Data We Collect">
              <p>We collect the following categories of data:</p>

              <p className="font-medium text-foreground mt-3">a) Account Information</p>
              <ul>
                <li>Email address, display name, and User ID — used to create and manage your account.</li>
              </ul>

              <p className="font-medium text-foreground mt-3">b) User-Generated Content</p>
              <ul>
                <li>AI prompts, creative scripts, stories, and projects you create within the app — used to deliver the AI generation service and save your work to your personal library.</li>
              </ul>

              <p className="font-medium text-foreground mt-3">c) Technical &amp; Diagnostic Data</p>
              <ul>
                <li>Device identifiers, crash logs, and performance diagnostics — collected automatically via <strong className="text-foreground">Firebase</strong> (Google) to maintain app stability and improve performance. This data does not identify you personally.</li>
              </ul>

              <p className="font-medium text-foreground mt-3">d) Financial Information</p>
              <ul>
                <li>Subscription and payment data is processed securely by <strong className="text-foreground">Stripe</strong>. We do <strong className="text-foreground">not</strong> store your full credit card number or sensitive payment details on our servers. We only receive a confirmation of successful payment and your subscription tier.</li>
              </ul>
            </Section>

            {/* 2. Purpose of Use */}
            <Section title="2. How We Use Your Data">
              <p>We use your data only for the following purposes:</p>
              <ul>
                <li><strong className="text-foreground">To provide the service</strong> — process your AI prompts and deliver generated blueprints, scripts, and creative outputs.</li>
                <li><strong className="text-foreground">To manage your account</strong> — authenticate you, track your gem balance, and maintain your saved projects.</li>
                <li><strong className="text-foreground">To manage subscriptions</strong> — verify your plan (Free, Creator Pro, Studio Elite) and process renewals via Stripe.</li>
                <li><strong className="text-foreground">To improve app performance</strong> — analyze crash reports and diagnostics to fix bugs and improve stability.</li>
                <li><strong className="text-foreground">To prevent fraud and misuse</strong> — detect and prevent abuse of the platform, including violations of our usage policies.</li>
                <li><strong className="text-foreground">To comply with legal obligations</strong> — retain records required by applicable law (e.g., financial transaction records).</li>
              </ul>
              <p className="text-xs text-muted-foreground/70 mt-2">We do not sell your personal data to third parties.</p>
            </Section>

            {/* 3. Third-Party Services */}
            <Section title="3. Third-Party Services">
              <p>We use the following trusted third-party providers. Each operates under their own privacy policy:</p>
              <ul>
                <li>
                  <strong className="text-foreground">Stripe</strong> — Secure payment processing and subscription management.{' '}
                  <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">stripe.com/privacy</a>
                </li>
                <li>
                  <strong className="text-foreground">Firebase / Google Cloud</strong> — User authentication, database hosting, crash analytics, and app performance monitoring.{' '}
                  <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">firebase.google.com/support/privacy</a>
                </li>
                <li>
                  <strong className="text-foreground">Generative AI Providers</strong> — Your prompts are sent to AI model providers to generate creative content. Inputs are not stored by us beyond your saved project data.
                </li>
              </ul>
              <p>We do not share your personal data with any other third parties except as required by law.</p>
            </Section>

            {/* 4. AI Disclosure */}
            <Section title="4. AI Technology Disclosure">
              <p>
                StudioOne AI uses <strong className="text-foreground">generative artificial intelligence (AI)</strong> technology to create creative content based on your inputs.
              </p>
              <ul>
                <li>Your text inputs (prompts, project details) are processed by AI models to produce the requested outputs (scripts, visual prompts, sound guides, YouTube packages).</li>
                <li>We implement <strong className="text-foreground">content safety filters</strong> to prevent the generation of prohibited, harmful, or illegal content.</li>
                <li>If you encounter content that appears inappropriate or violates our policies, you can report it directly via email at{' '}
                  <a href="mailto:support@studioone-ai.com" className="text-primary hover:underline">support@studioone-ai.com</a>.
                </li>
                <li>AI-generated outputs are creative suggestions — you are responsible for reviewing content before use in any published work.</li>
              </ul>
            </Section>

            {/* 5. User Rights & Data Deletion */}
            <Section title="5. Your Rights &amp; Data Deletion">
              <p>Under GDPR and applicable privacy laws, you have the right to:</p>
              <ul>
                <li><strong className="text-foreground">Access</strong> your personal data</li>
                <li><strong className="text-foreground">Correct</strong> inaccurate data</li>
                <li><strong className="text-foreground">Delete</strong> your account and personal data</li>
                <li><strong className="text-foreground">Restrict</strong> or object to certain processing</li>
                <li><strong className="text-foreground">Data portability</strong> — request a copy of your data</li>
              </ul>

              <p className="font-medium text-foreground mt-4">How to Delete Your Account &amp; Data</p>
              <p>You have two options:</p>
              <ul>
                <li>
                  <strong className="text-foreground">In-App:</strong> Go to{' '}
                  <Link to="/account" className="text-primary hover:underline">Account Settings</Link>{' '}
                  and tap <strong className="text-foreground">"Delete Account"</strong> to submit a deletion request directly.
                </li>
                <li>
                  <strong className="text-foreground">By Email:</strong> Send a request to{' '}
                  <a href="mailto:support@studioone-ai.com" className="text-primary hover:underline">support@studioone-ai.com</a>{' '}
                  with the subject line "Data Deletion Request".
                </li>
              </ul>
              <p>
                We will process all deletion requests within <strong className="text-foreground">30 days</strong>. This includes your email, account profile, and all saved projects.
              </p>
              <p className="text-xs text-muted-foreground/70">
                <strong className="text-foreground/70">Exception:</strong> We may retain financial transaction records for the legally required period for tax and accounting compliance.
              </p>
            </Section>

            {/* 6. Data Retention */}
            <Section title="6. Data Retention">
              <p>We retain your personal data only as long as necessary:</p>
              <ul>
                <li>Account data is retained while your account is active.</li>
                <li>Upon deletion, personal data is removed within 30 days.</li>
                <li>Financial records may be retained longer as required by law.</li>
                <li>Anonymized diagnostic data (crash logs) may be retained for up to 12 months.</li>
              </ul>
            </Section>

            {/* 7. Security */}
            <Section title="7. Security">
              <p>
                We take data security seriously. All data transmitted between your device and our servers is encrypted using{' '}
                <strong className="text-foreground">HTTPS (TLS)</strong>. Our infrastructure is hosted on Google Cloud, which maintains industry-leading security certifications.
              </p>
              <p>
                While we implement strong security measures, no system is 100% immune to breaches. We encourage you to use a strong, unique password for your account.
              </p>
            </Section>

            {/* 8. Children's Privacy */}
            <Section title="8. Children's Privacy">
              <p>
                StudioOne AI is not directed at children under the age of <strong className="text-foreground">13</strong> (or 16 in the EU/EEA under GDPR). We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us at{' '}
                <a href="mailto:support@studioone-ai.com" className="text-primary hover:underline">support@studioone-ai.com</a>{' '}
                and we will delete it promptly.
              </p>
            </Section>

            {/* 9. Changes */}
            <Section title="9. Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. When we do, we will update the "Last Updated" date at the top of this page. We encourage you to review this policy periodically. Continued use of the app after changes constitutes acceptance of the updated policy.
              </p>
            </Section>

            {/* 10. Contact */}
            <Section title="10. Contact Us">
              <p>If you have any questions, concerns, or requests regarding this Privacy Policy or your data, please contact us:</p>
              <ul>
                <li>
                  <strong className="text-foreground">Email:</strong>{' '}
                  <a href="mailto:support@studioone-ai.com" className="text-primary hover:underline">support@studioone-ai.com</a>
                </li>
                <li>
                  <strong className="text-foreground">In-App:</strong> Account Settings → Contact Support
                </li>
              </ul>
              <p className="text-xs text-muted-foreground/70 mt-2">
                We aim to respond to all privacy-related inquiries within <strong className="text-foreground/70">5 business days</strong>.
              </p>
            </Section>

            <div className="pt-4 border-t border-border/40 text-xs text-muted-foreground/50 text-center">
              © 2026 StudioOne AI · All rights reserved
            </div>

          </div>
        </motion.div>
      </div>
    </div>
  );
}