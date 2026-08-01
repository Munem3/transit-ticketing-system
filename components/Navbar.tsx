"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { classNames } from "@/lib/utils";

const links = [
  { href: "/routes", label: "Book" },
  { href: "/tickets", label: "My Tickets" },
  { href: "/wallet", label: "Wallet" },
  { href: "/assistant", label: "AI Assistant" },
];

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isAdmin = session?.user?.role === "ADMIN";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-brand-700">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
            T
          </span>
          TransitBD
        </Link>

        {session && (
          <div className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={classNames(
                  "rounded-lg px-3 py-1.5 text-sm font-medium",
                  pathname.startsWith(l.href)
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                {l.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className={classNames(
                  "rounded-lg px-3 py-1.5 text-sm font-medium",
                  pathname.startsWith("/admin")
                    ? "bg-amber-50 text-amber-700"
                    : "text-amber-600 hover:bg-amber-50"
                )}
              >
                Admin
              </Link>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          {status === "loading" ? null : session ? (
            <>
              <Link
                href="/dashboard"
                className="hidden text-sm text-slate-600 hover:text-slate-900 sm:block"
              >
                {session.user?.name}
              </Link>
              <button onClick={() => signOut({ callbackUrl: "/" })} className="btn-ghost">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                Log in
              </Link>
              <Link href="/register" className="btn-primary">
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
