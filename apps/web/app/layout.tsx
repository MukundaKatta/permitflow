import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PermitFlow - AI-Powered Permit & Compliance Navigator",
  description:
    "Navigate business permits and regulatory compliance with AI-powered guidance. Get your required permits checklist, auto-fill applications, and never miss a deadline.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
