import Link from "next/link";
import { LaunchPageShell } from "@/components/marketing/LaunchPageShell";
import { getSupportEmail } from "@/lib/server/launch";

const LAST_UPDATED = "April 3, 2026";

const SECTION_LINKS = [
  { id: "acceptance", label: "Acceptance" },
  { id: "beta-access", label: "Beta Access" },
  { id: "accounts", label: "Accounts And Security" },
  { id: "using-sitezy", label: "Using Sitezy" },
  { id: "ai-features", label: "AI Features" },
  { id: "content-and-ip", label: "Content And IP" },
  { id: "usage-limits", label: "Usage Limits" },
  { id: "availability", label: "Availability" },
  { id: "termination", label: "Suspension Or Termination" },
  { id: "disclaimers", label: "Disclaimers" },
  { id: "liability", label: "Liability" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact" },
];

export default function TermsPage() {
  const supportEmail = getSupportEmail();

  return (
    <LaunchPageShell
      eyebrow="Terms"
      title="Terms of Service"
      body="These Terms of Service govern access to Sitezy, including the invite-only beta, AI generation features, project editing workflows, exports, support, and account security surfaces."
    >
      <div className="space-y-10">
        <div className="rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface-2)] p-5 md:p-6">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--fg-faint)]">Last updated</p>
          <p className="mt-2 mb-0 text-[15px] leading-7 text-[var(--text-primary)]">{LAST_UPDATED}</p>
          <p className="mt-3 mb-0 text-[14px] leading-7 text-[var(--text-secondary)]">
            These terms are written for the current Sitezy private beta product and should be reviewed again before any
            public self-serve launch, billing launch, or hosted publishing rollout.
          </p>
        </div>

        <section className="rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface-2)] p-5 md:p-6">
          <h2 className="mt-0 mb-4 text-[18px]">Quick Links</h2>
          <div className="flex flex-wrap gap-2">
            {SECTION_LINKS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="inline-flex items-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-3)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-primary)] no-underline transition-colors hover:border-[var(--border-default)] hover:text-[var(--text-accent)]"
              >
                {item.label}
              </a>
            ))}
          </div>
        </section>

        <section id="acceptance">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using Sitezy, you agree to these Terms of Service and our{" "}
            <Link href="/privacy">Privacy Policy</Link>. If you do not agree, do not use the service.
          </p>
        </section>

        <section id="beta-access">
          <h2>2. Private Beta Access</h2>
          <p>
            Sitezy is currently offered as an invite-only private beta. Access may be limited, delayed, suspended,
            revoked, or expanded at any time while the product is being stabilized.
          </p>
          <ul>
            <li>Creating an account does not guarantee beta activation.</li>
            <li>Invite, customer-service, and admin access is managed internally by Sitezy.</li>
            <li>Beta access may be withheld or revoked for misuse, operational reasons, or launch-readiness changes.</li>
          </ul>
        </section>

        <section id="accounts">
          <h2>3. Accounts and Security</h2>
          <ul>
            <li>You must provide accurate account information and keep it current.</li>
            <li>Email/password accounts may require email verification before login.</li>
            <li>You are responsible for activity that occurs under your account.</li>
            <li>You must protect your credentials and use verification or security features appropriately.</li>
            <li>Where available, mobile 2FA is intended to improve account security, not to replace safe credential practices.</li>
          </ul>
        </section>

        <section id="using-sitezy">
          <h2>4. Permitted Use</h2>
          <p>
            You may use Sitezy to create, edit, manage, preview, and export websites and related assets for lawful
            business or evaluation purposes.
          </p>
          <p>You may not:</p>
          <ul>
            <li>Use the service for unlawful, deceptive, infringing, abusive, or harmful activity.</li>
            <li>Attempt to bypass rate limits, access controls, invite rules, or product restrictions.</li>
            <li>Reverse engineer, scrape, overload, disrupt, or probe the service beyond normal product use.</li>
            <li>Upload or submit malware, malicious code, or content designed to compromise the service or other users.</li>
            <li>Use Sitezy in a way that could create legal, security, or operational risk for the beta.</li>
          </ul>
        </section>

        <section id="ai-features">
          <h2>5. AI Features and Generated Output</h2>
          <p>
            Sitezy uses AI to generate site blueprints, pages, sections, suggestions, and edits. AI output may be
            incomplete, inaccurate, biased, duplicative, or unsuitable for your specific use case.
          </p>
          <ul>
            <li>You are responsible for reviewing, testing, and approving generated output before publishing or using it.</li>
            <li>You should verify factual claims, pricing, legal copy, accessibility, and technical correctness yourself.</li>
            <li>You should not input highly sensitive, confidential, regulated, or special-category personal data into AI flows.</li>
          </ul>
        </section>

        <section id="content-and-ip">
          <h2>6. Content, Ownership, and Product Rights</h2>
          <p>
            You retain your rights in the content, prompts, assets, and materials you provide to Sitezy, subject to any
            rights held by third parties. You also remain responsible for ensuring you have the rights needed to upload,
            generate, edit, store, and export that content.
          </p>
          <p>
            You grant Sitezy a limited right to host, process, store, reproduce, and transform your content as needed
            to operate the service, generate output, support editing flows, respond to support requests, and maintain
            the beta.
          </p>
          <p>
            Sitezy and its licensors retain all rights in the product, editor, generation systems, UI, branding, and
            software, except for rights expressly granted to you.
          </p>
        </section>

        <section id="usage-limits">
          <h2>7. Usage Limits and Beta Controls</h2>
          <p>
            The private beta may include account-level limits, AI usage controls, invite restrictions, and operational
            safeguards. Those controls exist to manage cost, security, and reliability.
          </p>
          <ul>
            <li>Usage caps may prevent additional AI actions until Sitezy resets or expands your allowance.</li>
            <li>The beta may be free during this phase, but that does not create an entitlement to unlimited use.</li>
            <li>We may modify or enforce limits at any time.</li>
          </ul>
        </section>

        <section id="availability">
          <h2>8. Availability, Changes, and Exports</h2>
          <p>
            Sitezy is a beta product. Features may change quickly, generation quality may vary, and parts of the
            service may be slow, unavailable, or removed without notice.
          </p>
          <ul>
            <li>Export is the intended delivery path for the current beta.</li>
            <li>You are responsible for keeping your own copies of exported work if you need independent backups.</li>
            <li>We may change, limit, pause, or discontinue features at any time.</li>
          </ul>
        </section>

        <section id="termination">
          <h2>9. Suspension or Termination</h2>
          <p>
            We may suspend, restrict, or terminate access to Sitezy, remove content, or revoke beta eligibility if we
            believe there is misuse, security risk, legal risk, policy violation, or a need to protect the service or
            other users.
          </p>
          <p>
            You may stop using the service at any time. Account deletion and support requests may remain subject to
            limited operational retention described in the Privacy Policy.
          </p>
        </section>

        <section id="disclaimers">
          <h2>10. Disclaimers</h2>
          <p>
            Sitezy is provided on an “as is” and “as available” basis. To the maximum extent permitted by law, Sitezy
            disclaims warranties of any kind, whether express or implied, including warranties of merchantability,
            fitness for a particular purpose, non-infringement, availability, security, and accuracy.
          </p>
        </section>

        <section id="liability">
          <h2>11. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Sitezy will not be liable for indirect, incidental, special,
            consequential, exemplary, or punitive damages, or for loss of data, profits, goodwill, or business
            interruption arising out of or related to your use of the service.
          </p>
          <p>
            Because this is a private beta, you should not rely on Sitezy as your sole system of record, backup system,
            or legally reviewed publishing workflow.
          </p>
        </section>

        <section id="changes">
          <h2>12. Changes to These Terms</h2>
          <p>
            We may revise these terms as the beta evolves. If we do, we may update the effective date, publish the
            revised version here, and provide additional notice where appropriate. Your continued use after changes
            become effective means you accept the updated terms.
          </p>
        </section>

        <section id="contact">
          <h2>13. Contact</h2>
          <p>
            For questions about these terms, contact <a href={`mailto:${supportEmail}`}>{supportEmail}</a>, visit the{" "}
            <Link href="/support">support page</Link>, or use the in-product support inbox available from{" "}
            <Link href="/settings">settings</Link>.
          </p>
        </section>
      </div>
    </LaunchPageShell>
  );
}
