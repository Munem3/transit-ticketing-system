import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "TransitBD — Mass Transport Ticketing",
  description:
    "Book bus, train, and metro tickets across Bangladesh with real-time seat tracking and AI transit analytics.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
          <footer className="mx-auto max-w-6xl px-4 py-10 text-center text-xs text-slate-400">
            TransitBD — demo project. Payments and AI are simulated for
            educational use.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
