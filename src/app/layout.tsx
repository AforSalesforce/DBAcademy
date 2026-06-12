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
  title: {
    default: "DBAcademy | Interactive Database Learning Platform",
    template: "%s | DBAcademy"
  },
  description: "Master PostgreSQL, SQLite & NoSQL with interactive lessons, quizzes, and a browser-based SQL playground. For students, schools, and enterprises.",
  keywords: ["SQL", "database", "learning", "PostgreSQL", "SQLite", "NoSQL", "interactive", "education", "programming"],
  authors: [{ name: "DBAcademy" }],
  openGraph: {
    title: "DBAcademy — Master Database Engineering",
    description: "Interactive SQL playground with guided lessons. Learn by doing — 100% in your browser.",
    type: "website",
    siteName: "DBAcademy",
  },
  twitter: {
    card: "summary_large_image",
    title: "DBAcademy — Master Database Engineering",
    description: "Interactive SQL playground with guided lessons. Learn by doing.",
  },
  robots: { index: true, follow: true },
};

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ProgressSync } from "@/components/ProgressSync";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${display.variable} ${body.variable} ${body.className}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          disableTransitionOnChange
        >
          <ErrorBoundary>
            <ProgressSync />
            {children}
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
