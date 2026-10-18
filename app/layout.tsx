import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PREPAINT_SCRIPT } from "@/components/landing/intro/intro-script";
import { InlineScript } from "@/components/ui/inline-script";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChefBOT — Real Food. Real Fast.",
  description:
    "Pick what is in your kitchen. Get three real recipes fast — then stamp every dish you cook on BOT Chain.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The prepaint script adds landing-intro classes before hydration.
      suppressHydrationWarning
    >
      <head>
        {/* In <head> so it runs before anything paints (landing page only). */}
        <InlineScript html={PREPAINT_SCRIPT} />
      </head>
      <body className="flex min-h-screen flex-col bg-parchment text-ink">
        <noscript>
          {/* Keep scroll-reveal content visible when JavaScript is off. */}
          <style>{`[data-reveal],.reveal-word{opacity:1!important;transform:none!important}.scroll-letter{color:inherit!important;transform:none!important}`}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
