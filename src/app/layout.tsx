import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SocialSphere — Find your people",
  description: "A fresh space to share moments, discover ideas, and connect.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
