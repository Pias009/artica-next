"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLink({ href, children }: { href: "/admin" | "/admin/inquiries" | "/admin/security"; children: ReactNode }) {
  const path = usePathname();
  const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={clsx("rounded-full px-3 py-1.5 text-[13.5px] font-semibold", active ? "bg-ink text-white" : "text-ink-2 hover:bg-chip hover:text-ink")}
    >
      {children}
    </Link>
  );
}
