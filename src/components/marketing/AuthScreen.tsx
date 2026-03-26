"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, Check, Lock, Mail, UserRound } from "lucide-react";

type Mode = "login" | "signup";

export function AuthScreen({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const content = useMemo(
    () =>
      mode === "login"
        ? {
            title: "Welcome back",
            subtitle: "Log in to continue building.",
            primary: "Enter studio",
            altLabel: "No account?",
            altHref: "/signup",
            altCta: "Sign up free",
          }
        : {
            title: "Create your account",
            subtitle: "Start building premium websites with AI.",
            primary: "Get started",
            altLabel: "Have an account?",
            altHref: "/login",
            altCta: "Log in",
          },
    [mode]
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    router.push("/studio");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#09090B", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif", padding: "24px" }}>
      {/* Ambient glow */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-20vh", left: "50%", transform: "translateX(-50%)", width: "60vw", height: "60vh", borderRadius: "50%", background: "rgba(91,124,250,0.07)", filter: "blur(120px)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 880, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)", boxShadow: "0 32px 80px rgba(0,0,0,0.5)" }}>

        {/* Left — Brand panel */}
        <div style={{ background: "#0F0F13", padding: "48px 40px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            {/* Logo */}
            <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 48 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: "#5B7CFA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>S</div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.85)", letterSpacing: "-0.01em" }}>Sitezy</span>
            </Link>

            <div style={{ marginBottom: 32 }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 12 }}>
                {mode === "login" ? "Studio access" : "Get started"}
              </p>
              <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", color: "#F2F2F7", lineHeight: 1.2, marginBottom: 12 }}>{content.title}</h1>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.38)" }}>{content.subtitle}</p>
            </div>
          </div>

          {/* Feature list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "AI-generated multi-page websites",
              "Visual editor — no code needed",
              "Export clean HTML & CSS",
            ].map((item) => (
              <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(91,124,250,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Check size={10} style={{ color: "#5B7CFA" }} />
                </div>
                <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)" }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Form panel */}
        <div style={{ background: "#111116", padding: "48px 40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", marginBottom: 8 }}>
              {mode === "login" ? "Welcome back" : "New account"}
            </p>
            <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.025em", color: "#F2F2F7" }}>
              {mode === "login" ? "Log in to Sitezy" : "Create your account"}
            </h2>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {mode === "signup" && (
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>Full name</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 14px", height: 42, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", transition: "border-color 0.15s" }}
                  onFocusCapture={e => (e.currentTarget.style.borderColor = "rgba(91,124,250,0.5)")}
                  onBlurCapture={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}>
                  <UserRound size={14} style={{ color: "rgba(255,255,255,0.22)", flexShrink: 0 }} />
                  <input required type="text" placeholder="Jane Doe"
                    style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13.5, color: "rgba(255,255,255,0.82)", caretColor: "#5B7CFA" }}
                  />
                </div>
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>Email</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 14px", height: 42, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", transition: "border-color 0.15s" }}
                onFocusCapture={e => (e.currentTarget.style.borderColor = "rgba(91,124,250,0.5)")}
                onBlurCapture={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}>
                <Mail size={14} style={{ color: "rgba(255,255,255,0.22)", flexShrink: 0 }} />
                <input required type="email" placeholder="you@company.com"
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13.5, color: "rgba(255,255,255,0.82)", caretColor: "#5B7CFA" }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>Password</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 14px", height: 42, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", transition: "border-color 0.15s" }}
                onFocusCapture={e => (e.currentTarget.style.borderColor = "rgba(91,124,250,0.5)")}
                onBlurCapture={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}>
                <Lock size={14} style={{ color: "rgba(255,255,255,0.22)", flexShrink: 0 }} />
                <input required type="password" placeholder={mode === "login" ? "Enter password" : "Create password"}
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13.5, color: "rgba(255,255,255,0.82)", caretColor: "#5B7CFA" }}
                />
              </div>
            </div>

            {mode === "signup" && (
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" required style={{ marginTop: 2, accentColor: "#5B7CFA", flexShrink: 0 }} />
                <span style={{ fontSize: 12, lineHeight: 1.55, color: "rgba(255,255,255,0.32)" }}>
                  I agree to the terms and want to start using the Sitezy studio workflow.
                </span>
              </label>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                height: 44, borderRadius: 11, background: submitting ? "rgba(91,124,250,0.6)" : "#5B7CFA",
                border: "none", cursor: submitting ? "not-allowed" : "pointer",
                fontSize: 14, fontWeight: 600, color: "#fff",
                transition: "filter 0.15s, transform 0.15s",
                marginTop: 4,
              }}
              onMouseEnter={e => { if (!submitting) (e.currentTarget as HTMLElement).style.filter = "brightness(1.1)"; }}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = "none"}
              onMouseDown={e => (e.currentTarget as HTMLElement).style.transform = "scale(0.98)"}
              onMouseUp={e => (e.currentTarget as HTMLElement).style.transform = "none"}
            >
              {content.primary}
              <ArrowRight size={15} />
            </button>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
              <span>{content.altLabel}</span>
              <Link href={content.altHref} style={{ color: "rgba(255,255,255,0.65)", fontWeight: 500, textDecoration: "none", transition: "color 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}>
                {content.altCta}
              </Link>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
