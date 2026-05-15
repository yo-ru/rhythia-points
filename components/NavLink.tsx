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
          ? "text-white font-semibold"
          : "text-white/80 hover:text-white transition-colors"
      }
    >
      {children}
    </Link>
  );
}
