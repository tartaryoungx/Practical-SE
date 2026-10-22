import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/features/auth/session";
export const metadata: Metadata = {
  title: "Garment Returns · Prototype",
  description: "Sprint 1 frontend prototype — simulated data and access only",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
