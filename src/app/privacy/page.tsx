import Link from "next/link";
import { LaunchPageShell } from "@/components/marketing/LaunchPageShell";
import { getSupportEmail } from "@/lib/server/launch";

const LAST_UPDATED = "April 3, 2026";

const SECTION_LINKS = [
  { id: "overview", label: "Overview" },
  { id: "data-we-collect", label: "Data We Collect" },
  { id: "how-we-use-data", label: "How We Use Data" },
  { id: "ai-and-providers", label: "AI And Providers" },
  { id: "sharing", label: "Sharing" },
  { id: "retention", label: "Retention" },
  { id: "choices", label: "Your Choices" },
  { id: "security", label: "Security" },
  { id: "international", label: "International Processing" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact" },
];

export default function PrivacyPage() {
  const supportEmail = getSupportEmail();

  return (
    <LaunchPageShell
      eyebrow="Privacy"
      title="Privacy Policy"
      body="This Privacy Policy explains what Sitezy collects, how that information is used, and how privacy works across authentication, AI generation, project storage, support, media, and private beta access."
    >
      <div className="space-y-10">
        <div className="rounded-[22px] border border-[var(--border-soft)] bg-[var(--surface-2)] p-5 md:p-6">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--fg-faint)]">Last updated</p>
          <p className="mt-2 mb-0 text-[15px] leading-7 text-[var(--text-primary)]">{LAST_UPDATED}</p>
          <p className="mt-3 mb-0 text-[14px] leading-7 text-[var(--text-secondary)]">
            This policy is written for the current Sitezy private beta product. It covers the existing account, project,
            support, AI, media, settings, and beta-access flows that are live today.
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

        <section id="overview">
          <h2>1. Overview</h2>
          <p>
            Sitezy is a private beta website builder that lets users sign in, generate websites with AI, edit pages
            visually, upload assets, save projects, export work, and contact support. To provide those features, we
            process account information, project content, settings, media metadata, support communications, and limited
            operational data.
          </p>
          <p>
            This policy applies to the Sitezy website, the authenticated product experience, and related support and
            beta-access workflows.
          </p>
        </section>

        <section id="data-we-collect">
          <h2>2. Data We Collect</h2>
          <h3>Account and access data</h3>
          <ul>
            <li>Email address, name, login provider, and account identifiers from authentication.</li>
            <li>Verification and security state, including email confirmation and mobile 2FA status where enabled.</li>
            <li>Beta-access records such as invite status, role, invite notes, and accepted access state.</li>
            <li>Beta-interest submissions if your account is not yet activated for the beta.</li>
          </ul>

          <h3>Project and workspace data</h3>
          <ul>
            <li>Project briefs, AI generation inputs, blueprints, generated pages, files, editor state, and AI chat history.</li>
            <li>Workspace and product settings, including theme, interface preferences, AI defaults, and project defaults.</li>
            <li>Media library records and related storage metadata for assets you upload or manage in the product.</li>
          </ul>

          <h3>Support and communications data</h3>
          <ul>
            <li>Support requests, ticket numbers, reply threads, and the contents of messages you send to us.</li>
            <li>Operational metadata included with support tickets, such as route and browser information where available.</li>
            <li>Email delivery metadata for support replies when email notifications are enabled.</li>
          </ul>

          <h3>Usage and technical data</h3>
          <ul>
            <li>Timestamps, request IDs, save states, error states, and similar operational data needed to run the beta safely.</li>
            <li>Usage counters and allowance tracking used to enforce beta limits on AI generation features.</li>
          </ul>
        </section>

        <section id="how-we-use-data">
          <h2>3. How We Use Data</h2>
          <p>We use the information above to:</p>
          <ul>
            <li>Authenticate accounts and manage invite-only beta access.</li>
            <li>Generate, save, reopen, sync, and export websites and project files.</li>
            <li>Support visual editing, media management, settings persistence, and project recovery.</li>
            <li>Provide support, respond to tickets, and send support-related emails where configured.</li>
            <li>Operate security features such as verification and mobile 2FA.</li>
            <li>Enforce usage limits, prevent abuse, investigate failures, and stabilize the product for launch.</li>
            <li>Improve product quality, reliability, and launch readiness during the beta.</li>
          </ul>
        </section>

        <section id="ai-and-providers">
          <h2>4. AI and Service Providers</h2>
          <p>Sitezy relies on third-party infrastructure to provide core parts of the service.</p>
          <ul>
            <li>Supabase is used for authentication, database persistence, storage, and account/session operations.</li>
            <li>Anthropic is used for AI-powered site generation and related AI editing flows.</li>
            <li>Resend may be used to deliver support reply emails when that feature is enabled.</li>
            <li>Unsplash and/or Pexels may be used to source images when image-assisted generation features are used.</li>
          </ul>
          <p>
            Your prompts, project descriptions, or page-generation instructions may be processed by these providers to
            deliver the feature you requested. You should not submit highly sensitive, confidential, regulated, or
            special-category personal information into AI prompts, project content, uploaded files, or support messages.
          </p>
        </section>

        <section id="sharing">
          <h2>5. How We Share Information</h2>
          <p>We do not sell your personal information. We may share information in the following limited situations:</p>
          <ul>
            <li>With infrastructure and processing providers that help us operate the product.</li>
            <li>With service providers involved in email delivery, storage, authentication, or generation workflows.</li>
            <li>When required by law, legal process, or to protect Sitezy, users, or the public.</li>
            <li>As part of a merger, acquisition, financing, or transfer of all or part of the business, subject to appropriate safeguards.</li>
          </ul>
        </section>

        <section id="retention">
          <h2>6. Retention</h2>
          <p>
            We keep information for as long as reasonably necessary to operate the beta, preserve projects, troubleshoot
            issues, enforce access rules, respond to support requests, and comply with legal obligations.
          </p>
          <ul>
            <li>Project and workspace data is typically retained while your account remains active.</li>
            <li>Support records may be retained after a ticket is closed for operational history and follow-up.</li>
            <li>Backups and replicated storage may persist for a limited period after deletion.</li>
          </ul>
        </section>

        <section id="choices">
          <h2>7. Your Choices and Controls</h2>
          <ul>
            <li>You can update profile details, workspace preferences, and security settings inside the product.</li>
            <li>You can export project files through the product’s export flow.</li>
            <li>You can contact support to request account help or deletion assistance.</li>
            <li>You can stop using the private beta at any time.</li>
          </ul>
          <p>
            Some account and project information may remain in backups or operational records for a limited period after
            deletion or closure.
          </p>
        </section>

        <section id="security">
          <h2>8. Security</h2>
          <p>
            We use commercially reasonable measures to protect account and project data, including authenticated access
            controls and platform security tooling. No internet service is completely secure, and we cannot guarantee
            that unauthorized access, disclosure, or loss will never occur.
          </p>
          <p>
            You are responsible for keeping your credentials secure, using verification and security features
            appropriately, and limiting the sensitive data you place into the beta.
          </p>
        </section>

        <section id="international">
          <h2>9. International Processing</h2>
          <p>
            Sitezy and its providers may process or store data in multiple countries depending on infrastructure and
            provider operations. By using the service, you understand that your information may be transferred to and
            processed in jurisdictions other than your own.
          </p>
        </section>

        <section id="changes">
          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy as the product changes, new features are added, or launch requirements
            evolve. If we make material changes, we may update the effective date, publish the revised policy here, and
            provide additional notice where appropriate.
          </p>
        </section>

        <section id="contact">
          <h2>11. Contact</h2>
          <p>
            If you have questions about privacy, data handling, or account requests, contact us at{" "}
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>, open a request on the{" "}
            <Link href="/support">support page</Link>, or use the in-product support inbox from{" "}
            <Link href="/settings">settings</Link>.
          </p>
        </section>
      </div>
    </LaunchPageShell>
  );
}
