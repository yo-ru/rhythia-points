"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={
        active
          ? "text-text font-semibold"
          : "text-text-dim hover:text-accent transition-colors"
      }
    >
      {children}
    </Link>
  );
}
