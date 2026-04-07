import Link from "next/link";
import { LaunchPageShell } from "@/components/marketing/LaunchPageShell";
import { getPublicLaunchConfig } from "@/lib/server/launch";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export default async function SupportPage() {
  const launch = getPublicLaunchConfig();
  const user = await getAuthenticatedUser();

  return (
    <LaunchPageShell
      eyebrow="Support"
      title="Support for the Sitezy private beta"
      body="Use this page as the default support contact path during the beta, whether you need access, more usage room, or help reproducing a product issue."
    >
      <div className="space-y-6">
        <section>
          <h2>Best way to get help</h2>
          <p>
            {user
              ? "You can submit a bug report, feature request, or support ticket from Settings → Support & Feedback, then track every reply in your support inbox."
              : "If you already have access, sign in and use the in-product support inbox from Settings → Support & Feedback."}
          </p>
          <p>
            Direct email support is also available at <a href={`mailto:${launch.supportEmail}`}>{launch.supportEmail}</a>.
          </p>
        </section>
        <section>
          <h2>Private beta access</h2>
          <p>
            {launch.inviteOnlyBeta
              ? `Beta access is invite-only. If you want access or need a second invited email approved, contact ${launch.supportEmail}.`
              : "Beta access is currently open."}
          </p>
        </section>
        <section>
          <h2>Include this when reporting an issue</h2>
          <p>The page or feature you were using, what you expected, what happened instead, and whether the issue blocks generation, editing, saving, previewing, or export.</p>
        </section>
        <section>
          <h2>Useful links</h2>
          <p>
            <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> · {user ? <><Link href="/settings">Open settings</Link> · <Link href="/support/inbox">Open support inbox</Link></> : <Link href="/login">Log in</Link>}
          </p>
        </section>
      </div>
    </LaunchPageShell>
  );
}
