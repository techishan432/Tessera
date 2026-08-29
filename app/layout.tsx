import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
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
  metadataBase: new URL(
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"
  ),
  title: {
    default: "Tessera — Soulbound credentials for real-world contribution",
    template: "%s · Tessera",
  },
  description:
    "Tessera mints non-transferable credentials on Stellar for verified community contributions — mentoring, merged PRs, talks — into your wallet as a portable, verifiable resume.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Apply saved theme before first paint (light is the default). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("tessera-theme")==="dark"){document.documentElement.classList.add("dark")}}catch(e){}`,
          }}
        />
        <SiteNav />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
