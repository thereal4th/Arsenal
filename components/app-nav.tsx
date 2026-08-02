"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Boxes, LayoutDashboard, LogOut, NotebookPen, Rotate3d } from "lucide-react";
import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/brand";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/editor", label: "Editor", icon: Rotate3d },
  { href: "/notes", label: "Techniques", icon: NotebookPen },
  { href: "/systems", label: "Systems", icon: Boxes },
];

export function AppNav({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop rail */}
      <nav
        aria-label="Main"
        className="hidden w-56 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-elev-1)] md:flex"
      >
        <div className="flex h-14 items-center border-b border-[var(--border)] px-4">
          <Wordmark />
        </div>

        <ul className="flex-1 space-y-0.5 p-2">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-[0.8125rem]",
                    "transition-colors duration-200",
                    active
                      ? "bg-[var(--primary-soft)] text-[var(--fg)]"
                      : "text-[var(--fg-muted)] hover:bg-[var(--bg-elev-2)] hover:text-[var(--fg)]",
                  )}
                >
                  <Icon
                    className={cn("size-4", active && "text-[var(--primary-hover)]")}
                    aria-hidden
                  />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-[var(--border)] p-3">
          <p className="truncate text-[0.8125rem] text-[var(--fg)]">{name}</p>
          <p className="truncate text-[0.6875rem] text-[var(--fg-subtle)]">{email}</p>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="mt-2 inline-flex items-center gap-1.5 text-[0.75rem] text-[var(--fg-muted)] transition-colors hover:text-[var(--danger)]"
          >
            <LogOut className="size-3.5" aria-hidden />
            Sign out
          </button>
        </div>
      </nav>

      {/* Mobile bar — kept to four items so labels stay legible. */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--border)] bg-[var(--bg-elev-1)]/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 py-2",
                "text-[0.625rem] transition-colors",
                active ? "text-[var(--primary-hover)]" : "text-[var(--fg-subtle)]",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
