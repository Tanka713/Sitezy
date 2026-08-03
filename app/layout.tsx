import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ErrorToast } from "@/components/ui/ErrorToast";
import { SettingsBootstrap } from "@/components/settings/SettingsBootstrap";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sitezy — AI Website Builder",
  description: "Describe your website. Sitezy builds it with AI.",
  keywords: ["AI website builder", "website generator", "no-code", "AI"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} antialiased`}>
        <SettingsBootstrap />
        {children}
        <ErrorToast />
      </body>
    </html>
  );
}
