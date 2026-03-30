import dynamic from "next/dynamic";

const ResetPasswordClient = dynamic(
  () =>
    import("@/components/marketing/ResetPasswordScreen").then(
      (mod) => mod.ResetPasswordScreen
    ),
  {
    ssr: false,
    loading: () => <div className="min-h-screen bg-[var(--bg-primary)]" />,
  }
);

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: { email?: string | string[] };
}) {
  const rawEmail = searchParams?.email;
  const initialEmail = Array.isArray(rawEmail) ? rawEmail[0] ?? "" : rawEmail ?? "";
  return <ResetPasswordClient initialEmail={initialEmail} />;
}
