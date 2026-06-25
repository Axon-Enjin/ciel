"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BrandLogo } from "@/components/ui/brand-logo";
import {
  IconHorizon,
  IconNodes,
  IconPulse,
  IconPin,
  IconReport,
  IconGear,
  IconChevronDown,
  IconArrowUpRight,
  IconCheck,
} from "./icons";

export interface ShellOrg {
  id: string;
  name: string;
  role: string;
  type: string;
}

export interface DashboardShellProps {
  user: { email: string };
  orgs: ShellOrg[];
  activeOrgId: string;
  children: React.ReactNode;
}

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  soon?: boolean;
};

const EASE = "cubic-bezier(0.22,1,0.36,1)";

function useNav(activeOrgId: string): NavItem[] {
  return [
    { label: "Overview", href: "/dashboard", icon: <IconHorizon size={19} /> },
    { label: "ToC Studio", href: `/projects/new?org=${activeOrgId}`, icon: <IconNodes size={19} /> },
    { label: "Signals", href: "/dashboard#signals", icon: <IconPulse size={19} /> },
    { label: "Field Capture", href: "#", icon: <IconPin size={19} />, soon: true },
    { label: "Reports", href: "#", icon: <IconReport size={19} />, soon: true },
    { label: "Settings", href: "#", icon: <IconGear size={19} />, soon: true },
  ];
}

function NavLinks({
  items,
  pathname,
  onNavigate,
  stagger = false,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
  stagger?: boolean;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item, i) => {
        const base = item.href.split("?")[0].split("#")[0];
        const isAnchor = item.href.includes("#");
        const active = !item.soon && !isAnchor && base === pathname;
        if (item.soon) {
          return (
            <span
              key={item.label}
              aria-disabled
              className="flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[14px] font-medium text-[var(--color-text-muted)]/70"
            >
              <span className="text-[var(--color-text-muted)]/60">{item.icon}</span>
              {item.label}
              <span className="ml-auto rounded-full bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                Soon
              </span>
            </span>
          );
        }
        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            data-reveal={stagger ? "true" : undefined}
            style={stagger ? { transitionDelay: `${80 + i * 55}ms` } : undefined}
            className={[
              "group/nav relative flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[14px] font-medium outline-none transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              "focus-visible:[outline:2px_solid_var(--color-primary)] focus-visible:[outline-offset:2px]",
              active
                ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-sm)]"
                : "text-[var(--color-text-muted)] hover:bg-[color-mix(in_srgb,var(--color-text)_4%,transparent)] hover:text-[var(--color-text)]",
            ].join(" ")}
          >
            {active ? (
              <span
                className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[var(--color-accent)]"
                aria-hidden
              />
            ) : null}
            <span className={active ? "text-[var(--color-primary)]" : ""}>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({ user, orgs, activeOrgId, children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const items = useNav(activeOrgId);

  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [orgMenu, setOrgMenu] = React.useState(false);
  const [userMenu, setUserMenu] = React.useState(false);

  const activeOrg = orgs.find((o) => o.id === activeOrgId) ?? orgs[0];
  const initials = (activeOrg?.name ?? user.email).slice(0, 2).toUpperCase();

  // Close menus when clicking outside any dropdown (subscribe to document).
  React.useEffect(() => {
    if (!orgMenu && !userMenu) return;
    const onDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el?.closest("[data-dropdown]")) {
        setOrgMenu(false);
        setUserMenu(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [orgMenu, userMenu]);

  // Lock body scroll while the mobile drawer is open.
  React.useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [drawerOpen]);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/sign-in");
    router.refresh();
  };

  const renderSidebar = (stagger: boolean) => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-2 py-1">
        <BrandLogo variant="mark" title="Ciel" className="h-8 w-8 object-contain" />
        <span className="font-[family-name:var(--font-fraunces)] text-[19px] font-semibold leading-none text-[var(--color-text)]">
          Ciel
        </span>
      </div>

      <div className="mt-7 px-1">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]/70">
          Workspace
        </p>
        <NavLinks
          items={items}
          pathname={pathname}
          onNavigate={() => setDrawerOpen(false)}
          stagger={stagger}
        />
      </div>

      <div className="mt-auto px-1 pt-6">
        <div className="rounded-[16px] bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)] p-1.5">
          <div className="rounded-[11px] bg-[var(--color-surface)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
              Ground before scale
            </p>
            <p className="mt-1.5 text-[12px] leading-snug text-[var(--color-text-muted)]">
              Every claim stays evidence-linked. We&apos;ll tell you when to adapt — or stop.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_70%,var(--color-surface))] px-4 py-5 lg:flex">
        {renderSidebar(false)}
      </aside>

      {/* Mobile drawer */}
      <div
        className={[
          "fixed inset-0 z-40 lg:hidden",
          drawerOpen ? "pointer-events-auto" : "pointer-events-none",
        ].join(" ")}
        aria-hidden={!drawerOpen}
      >
        <div
          onClick={() => setDrawerOpen(false)}
          className={[
            "absolute inset-0 bg-[rgba(11,21,51,0.45)] transition-opacity duration-500",
            drawerOpen ? "opacity-100" : "opacity-0",
          ].join(" ")}
          style={{ transitionTimingFunction: EASE }}
        />
        <div
          className="absolute inset-y-0 left-0 w-[84%] max-w-[320px] border-r border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-5 transition-transform duration-[450ms]"
          style={{
            transitionTimingFunction: EASE,
            transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          }}
        >
          {renderSidebar(true)}
        </div>
      </div>

      {/* Main column */}
      <div className="lg:pl-[248px]">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_85%,var(--color-surface))] px-4 sm:px-6">
          {/* Mobile hamburger -> X */}
          <button
            type="button"
            onClick={() => setDrawerOpen((v) => !v)}
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            aria-expanded={drawerOpen}
            className="relative grid h-10 w-10 place-items-center rounded-full text-[var(--color-text)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)] lg:hidden"
          >
            <span className="relative block h-4 w-5">
              <span
                className="absolute left-0 block h-[1.5px] w-5 rounded-full bg-current transition-all duration-300"
                style={{
                  transitionTimingFunction: EASE,
                  top: drawerOpen ? "7px" : "2px",
                  transform: drawerOpen ? "rotate(45deg)" : "none",
                }}
              />
              <span
                className="absolute left-0 top-[7px] block h-[1.5px] w-5 rounded-full bg-current transition-opacity duration-200"
                style={{ opacity: drawerOpen ? 0 : 1 }}
              />
              <span
                className="absolute left-0 block h-[1.5px] w-5 rounded-full bg-current transition-all duration-300"
                style={{
                  transitionTimingFunction: EASE,
                  top: drawerOpen ? "7px" : "12px",
                  transform: drawerOpen ? "rotate(-45deg)" : "none",
                }}
              />
            </span>
          </button>

          {/* Org switcher */}
          <div className="relative" data-dropdown>
            <button
              type="button"
              onClick={() => {
                setOrgMenu((v) => !v);
                setUserMenu(false);
              }}
              aria-haspopup="menu"
              aria-expanded={orgMenu}
              className="flex items-center gap-2.5 rounded-full bg-[var(--color-surface)] py-1.5 pl-1.5 pr-3 ring-1 ring-[var(--color-border)] transition-all duration-300 hover:ring-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))] active:scale-[0.98]"
              style={{ transitionTimingFunction: EASE }}
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-primary)] text-[11px] font-semibold text-white">
                {initials}
              </span>
              <span className="hidden max-w-[160px] truncate text-[13px] font-semibold text-[var(--color-text)] sm:block">
                {activeOrg?.name ?? "Workspace"}
              </span>
              <IconChevronDown
                size={16}
                className="text-[var(--color-text-muted)] transition-transform duration-300"
                style={{ transform: orgMenu ? "rotate(180deg)" : "none", transitionTimingFunction: EASE }}
              />
            </button>

            {orgMenu ? (
              <div
                role="menu"
                className="absolute left-0 top-[calc(100%+8px)] z-30 w-64 origin-top-left rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-lg)]"
              >
                <p className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                  Your organizations
                </p>
                {orgs.map((o) => {
                  const isActive = o.id === activeOrgId;
                  return (
                    <Link
                      key={o.id}
                      href={`/dashboard?org=${o.id}`}
                      role="menuitem"
                      onClick={() => setOrgMenu(false)}
                      className="flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-[13px] transition-colors hover:bg-[color-mix(in_srgb,var(--color-text)_4%,transparent)]"
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-[11px] font-semibold text-[var(--color-primary)]">
                        {o.name.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-[var(--color-text)]">{o.name}</span>
                        <span className="block truncate text-[11px] capitalize text-[var(--color-text-muted)]">
                          {o.type} · {o.role}
                        </span>
                      </span>
                      {isActive ? <IconCheck size={16} className="text-[var(--color-success)]" /> : null}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {/* Primary CTA — button-in-button */}
            <Link
              href={`/projects/new?org=${activeOrgId}`}
              className="group inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] py-1.5 pl-4 pr-1.5 text-[13px] font-semibold text-white transition-all duration-300 hover:bg-[var(--color-primary-hover)] active:scale-[0.98]"
              style={{ transitionTimingFunction: EASE }}
            >
              <span className="hidden sm:inline">New Theory of Change</span>
              <span className="sm:hidden">New ToC</span>
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105">
                <IconArrowUpRight size={15} />
              </span>
            </Link>

            {/* User menu */}
            <div className="relative" data-dropdown>
              <button
                type="button"
                onClick={() => {
                  setUserMenu((v) => !v);
                  setOrgMenu(false);
                }}
                aria-haspopup="menu"
                aria-expanded={userMenu}
                aria-label="Account menu"
                className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-surface)] text-[12px] font-semibold text-[var(--color-text)] ring-1 ring-[var(--color-border)] transition-all duration-300 hover:ring-[color-mix(in_srgb,var(--color-primary)_40%,var(--color-border))] active:scale-95"
              >
                {user.email.slice(0, 2).toUpperCase()}
              </button>
              {userMenu ? (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+8px)] z-30 w-60 origin-top-right rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-[var(--shadow-lg)]"
                >
                  <div className="px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">Signed in as</p>
                    <p className="mt-0.5 truncate text-[13px] font-semibold text-[var(--color-text)]">{user.email}</p>
                  </div>
                  <div className="my-1 h-px bg-[var(--color-border)]" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={signOut}
                    className="flex w-full items-center gap-2 rounded-[11px] px-3 py-2.5 text-left text-[13px] font-medium text-[var(--color-error)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-error)_8%,transparent)]"
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto w-full max-w-[1180px] px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
          {children}
        </main>
      </div>

      {/* Staggered reveal styling for drawer nav links (motion-safe) */}
      <style>{`
        [data-reveal="true"] { opacity: 0; transform: translateY(10px); transition: opacity 420ms ${EASE}, transform 420ms ${EASE}; }
        [aria-hidden="false"] [data-reveal="true"] { opacity: 1; transform: none; }
        @media (prefers-reduced-motion: reduce) {
          [data-reveal="true"] { opacity: 1 !important; transform: none !important; transition: none !important; }
        }
      `}</style>
    </div>
  );
}

export default DashboardShell;
