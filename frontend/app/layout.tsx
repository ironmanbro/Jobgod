import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Aggregator",
  description: "Search jobs scraped directly from company applicant tracking systems.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        {children}
      </body>
    </html>
  );
}
