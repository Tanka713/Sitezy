import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Neutral palette ──────────────────────────────────────
        neutral: {
          0:   "#FFFFFF",
          50:  "#F8F8F9",
          100: "#F1F2F4",
          200: "#E4E6EA",
          300: "#C9CDD6",
          400: "#9EA4B0",
          500: "#6B7180",
          600: "#4B5162",
          700: "#343847",
          800: "#1E2130",
          900: "#121520",
          950: "#0A0C12",
        },
        // ── Accent / Indigo ──────────────────────────────────────
        accent: {
          50:  "#F0F1FF",
          100: "#E2E4FF",
          200: "#C5CAFF",
          300: "#9BA4FF",
          400: "#6B77FF",
          500: "#4550F0",
          600: "#3340D8",
          700: "#2530B8",
          800: "#1A2290",
          900: "#111766",
        },
        // ── Semantic status ──────────────────────────────────────
        success: {
          100: "#D4F5E7",
          500: "#1DB87C",
        },
        warning: {
          100: "#FEF3DC",
          500: "#F5A623",
        },
        danger: {
          100: "#FDEAEB",
          500: "#E5484D",
        },
        info: {
          100: "#E0F4FE",
          500: "#0EA5E9",
        },
        // ── Brand alias (keep for any legacy refs) ───────────────
        brand: {
          50:  "#F0F1FF",
          100: "#E2E4FF",
          200: "#C5CAFF",
          300: "#9BA4FF",
          400: "#6B77FF",
          500: "#4550F0",
          600: "#3340D8",
          700: "#2530B8",
          800: "#1A2290",
          900: "#111766",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      fontSize: {
        "display-2xl": ["72px", { lineHeight: "80px", letterSpacing: "-0.04em", fontWeight: "600" }],
        "display-xl":  ["56px", { lineHeight: "64px", letterSpacing: "-0.03em", fontWeight: "600" }],
        "display-lg":  ["44px", { lineHeight: "52px", letterSpacing: "-0.025em", fontWeight: "600" }],
      },
      spacing: {
        "1":  "4px",
        "2":  "8px",
        "3":  "12px",
        "4":  "16px",
        "5":  "20px",
        "6":  "24px",
        "8":  "32px",
        "10": "40px",
        "12": "48px",
        "16": "64px",
        "20": "80px",
        "24": "96px",
        "32": "128px",
      },
      borderRadius: {
        sm:   "4px",
        md:   "8px",
        lg:   "12px",
        xl:   "16px",
        "2xl":"24px",
      },
      boxShadow: {
        xs:  "0 1px 2px rgba(18,21,32,0.05)",
        sm:  "0 1px 3px rgba(18,21,32,0.07), 0 1px 2px rgba(18,21,32,0.04)",
        md:  "0 4px 8px rgba(18,21,32,0.07), 0 2px 4px rgba(18,21,32,0.04)",
        lg:  "0 8px 24px rgba(18,21,32,0.09), 0 2px 8px rgba(18,21,32,0.05)",
        xl:  "0 16px 48px rgba(18,21,32,0.12), 0 4px 16px rgba(18,21,32,0.06)",
        focus:       "0 0 0 3px rgba(69,80,240,0.20)",
        "focus-danger": "0 0 0 3px rgba(229,72,77,0.20)",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.16, 1, 0.3, 1)",
        spring:   "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      transitionDuration: {
        fast:     "100ms",
        base:     "160ms",
        moderate: "240ms",
        slow:     "360ms",
      },
      animation: {
        "fade-in":    "fadeIn 0.24s cubic-bezier(0.16,1,0.3,1) both",
        "slide-up":   "slideUp 0.24s cubic-bezier(0.16,1,0.3,1) both",
        "scale-in":   "scaleIn 0.16s cubic-bezier(0.34,1.56,0.64,1) both",
        "spin-slow":  "spin 3s linear infinite",
        "shimmer":    "shimmer 1.4s ease-in-out infinite",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn:    { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp:   { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        scaleIn:   { "0%": { opacity: "0", transform: "scale(0.96)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        shimmer:   { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        pulseSoft: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.45" } },
      },
    },
  },
  plugins: [],
};

export default config;
