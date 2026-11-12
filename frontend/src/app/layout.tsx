import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/features/auth/session";
export const metadata: Metadata = {
  title: "Garment Returns",
  description: "Internal garment return management",
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
