import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PMS Report · Appraisal Operations",
  description: "Track appraisal completion, ratings, and management reporting.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
