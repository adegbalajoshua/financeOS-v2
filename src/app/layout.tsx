import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { AppShell } from "@/components/AppShell";
import { Providers } from "@/components/Providers";
import { GlobalErrorLogger } from "@/components/GlobalErrorLogger";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FinanceOS",
  description: "Personal Financial Operating System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Anti-FOUC (Flash of Unstyled Content) Theme Initialization Script */}
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var stored = localStorage.getItem("fos-theme");
                var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                if (stored === "dark" || (!stored && prefersDark)) {
                  document.documentElement.classList.add("dark");
                } else {
                  document.documentElement.classList.remove("dark");
                }
              } catch (e) {}
            })();`,
          }}
        />
      </head>
      <body className="min-h-full font-sans">
        <Providers>
          <GlobalErrorLogger />
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
