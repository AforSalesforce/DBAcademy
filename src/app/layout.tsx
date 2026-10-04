import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
});

const body = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-body",
});

export const viewport: Viewport = {
  themeColor: '#07090F',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  // Canonical URLs and preview images resolve against the official domain.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "DBAcademy: learn SQL, PostgreSQL and NoSQL by doing",
    template: "%s | DBAcademy"
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: { index: true, follow: true },
  // Google Search Console ownership of https://www.dbacademy.online/.
  // Must stay in place: removing it un-verifies the property.
  verification: { google: "gxxQdjdOk4fGSMgAaSkqDK7UeY_ubvJcMPInOzFys4Y" },
};

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProgressSync } from "@/components/ProgressSync";
import { FeaturesProvider } from "@/components/FeaturesProvider";
import { accountsEnabled } from "@/lib/features";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const features = { accounts: accountsEnabled() };
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable} ${body.className}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          disableTransitionOnChange
        >
          <FeaturesProvider features={features}>
            <ErrorBoundary>
              {features.accounts && <ProgressSync />}
              {children}
            </ErrorBoundary>
          </FeaturesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
