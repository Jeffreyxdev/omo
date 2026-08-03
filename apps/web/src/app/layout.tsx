import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Udyking FIS - Financial Information System",
    template: "%s | Udyking FIS",
  },
  description:
    "Automated financial information system for Udyking Filling Station - fuel sales, cash reconciliation and inventory tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-100 font-sans text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
