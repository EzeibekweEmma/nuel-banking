"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { api, clearTokens, isAuthenticated, User } from "../lib/api";
import { BrandMark } from "./brand-mark";
import { ChatbotPanel } from "./chatbot-panel";
import { Icon, IconName } from "./icons";

interface NavigationItem {
  label: string;
  href: string;
  icon: IconName;
}

const navigation: NavigationItem[] = [
  { label: "Home", href: "/dashboard", icon: "home" },
  { label: "Add money", href: "/funding", icon: "wallet" },
  { label: "Send money", href: "/transfer", icon: "send" },
  { label: "Transactions", href: "/transactions", icon: "receipt" },
  { label: "Beneficiaries", href: "/beneficiaries", icon: "users" },
  { label: "Notifications", href: "/notifications", icon: "bell" },
];

const pageDetails: Record<string, { eyebrow: string; title: string }> = {
  "/dashboard": { eyebrow: "Overview", title: "Your financial home" },
  "/funding": { eyebrow: "Account", title: "Add money" },
  "/transfer": { eyebrow: "Payments", title: "Send money" },
  "/transactions": { eyebrow: "Activity", title: "Transactions" },
  "/beneficiaries": { eyebrow: "Payments", title: "Beneficiaries" },
  "/notifications": { eyebrow: "Updates", title: "Notifications" },
  "/profile": { eyebrow: "Account", title: "Profile & security" },
};

function isCurrent(pathname: string, href: string): boolean {
  return (
    pathname === href ||
    (href === "/transactions" && pathname.startsWith("/transactions/"))
  );
}

export function CustomerShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationNotice, setVerificationNotice] = useState("");
  const [developmentVerificationUrl, setDevelopmentVerificationUrl] =
    useState("");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }
    Promise.all([api.me(), api.notifications()])
      .then(([nextUser, notifications]) => {
        if (nextUser.role === "ADMIN") {
          router.replace("/admin");
          return;
        }
        setUser(nextUser);
        setUnread(notifications.filter((item) => !item.isRead).length);
      })
      .catch(() => {
        clearTokens();
        router.replace("/login");
      });
  }, [router]);

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    const updateUnread = () => {
      void api
        .notifications()
        .then((items) => setUnread(items.filter((item) => !item.isRead).length))
        .catch(() => undefined);
    };
    window.addEventListener("notifications-updated", updateUnread);
    return () =>
      window.removeEventListener("notifications-updated", updateUnread);
  }, []);

  useEffect(() => {
    const updateProfile = () => {
      void api
        .me()
        .then(setUser)
        .catch(() => undefined);
    };
    window.addEventListener("profile-updated", updateProfile);
    return () => window.removeEventListener("profile-updated", updateProfile);
  }, []);

  async function logout(): Promise<void> {
    await api.logout().catch(() => undefined);
    clearTokens();
    router.replace("/login");
  }

  async function resendVerification(): Promise<void> {
    setResendingVerification(true);
    setVerificationNotice("");
    setDevelopmentVerificationUrl("");
    try {
      const result = await api.resendEmailVerification();
      setVerificationNotice(result.message);
      setDevelopmentVerificationUrl(result.verificationUrl ?? "");
    } catch (reason) {
      setVerificationNotice(
        reason instanceof Error
          ? reason.message
          : "Unable to send a verification email right now.",
      );
    } finally {
      setResendingVerification(false);
    }
  }

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f3f6f4]">
        <div className="flex items-center gap-3 text-sm font-medium text-[#63736f]">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#c7d2ce] border-t-[#087a5b]" />
          Opening your secure workspace…
        </div>
      </main>
    );
  }

  const details =
    pageDetails[pathname] ??
    (pathname.startsWith("/transactions/")
      ? { eyebrow: "Activity", title: "Transaction details" }
      : { eyebrow: "Banking", title: "Nuel Bank" });
  const initials =
    `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();

  return (
    <div className="min-h-screen min-h-dvh bg-[#f3f6f4] lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
      {menuOpen && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-[60] cursor-default bg-[#10231f]/45 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-[70] flex w-[min(276px,calc(100vw-24px))] flex-col overflow-y-auto bg-[#092d24] px-4 py-5 text-white transition-transform duration-300 lg:sticky lg:top-0 lg:z-50 lg:h-screen lg:w-auto lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-2">
          <Link href="/dashboard" className="flex items-center gap-3">
            <BrandMark className="h-10 w-10 shrink-0" />
            <span>
              <span className="block text-[17px] font-bold tracking-tight">
                Nuel Bank
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8fb0a7]">
                Personal banking
              </span>
            </span>
          </Link>
          <button
            aria-label="Close menu"
            className="rounded-lg p-2 text-[#b5cbc5] hover:bg-white/10 lg:hidden"
            onClick={() => setMenuOpen(false)}
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-10 space-y-1" aria-label="Primary navigation">
          {navigation.map((item) => {
            const active = isCurrent(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${active ? "bg-white text-[#092d24] shadow-sm" : "text-[#b8ccc7] hover:bg-white/8 hover:text-white"}`}
              >
                <Icon
                  name={item.icon}
                  className={`h-[19px] w-[19px] ${active ? "text-[#087a5b]" : "text-[#8fb0a7] group-hover:text-white"}`}
                />
                <span className="flex-1">{item.label}</span>
                {item.href === "/notifications" && unread > 0 && (
                  <span className="grid min-w-5 place-items-center rounded-full bg-[#d8f85c] px-1.5 py-0.5 text-[10px] font-bold text-[#092d24]">
                    {unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-2xl bg-white/7 p-3">
          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/8"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#d8f85c] text-xs font-extrabold text-[#092d24]">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {user.firstName} {user.lastName}
              </span>
              <span className="block truncate text-xs text-[#8fb0a7]">
                Personal account
              </span>
            </span>
            <Icon name="chevron-right" className="h-4 w-4 text-[#8fb0a7]" />
          </Link>
          <button
            onClick={() => void logout()}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#9db8b1] transition hover:bg-white/8 hover:text-white"
          >
            <Icon name="logout" className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-[#dce5e1]/80 bg-[#f3f6f4]/90 px-4 backdrop-blur-xl sm:px-6 lg:px-10">
          <div className="mx-auto flex min-h-[68px] max-w-[1320px] items-center justify-between py-2 sm:min-h-[76px]">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <button
                aria-label="Open menu"
                className="rounded-xl border border-[#d8e1de] bg-white p-2.5 text-[#314b44] shadow-sm lg:hidden"
                onClick={() => setMenuOpen(true)}
              >
                <Icon name="menu" className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7a8b86]">
                  {details.eyebrow}
                </p>
                <h1 className="mt-0.5 truncate text-base font-bold tracking-tight text-[#10231f] sm:text-xl">
                  {details.title}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/notifications"
                aria-label="Notifications"
                className="relative grid h-10 w-10 place-items-center rounded-full border border-[#d8e1de] bg-white text-[#38534b] transition hover:border-[#087a5b]/30 hover:text-[#087a5b]"
              >
                <Icon name="bell" className="h-[18px] w-[18px]" />
                {unread > 0 && (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-[#e35c45]" />
                )}
              </Link>
              <Link
                href="/profile"
                className="ml-1 hidden items-center gap-2.5 rounded-full border border-transparent py-1 pl-1 pr-3 hover:border-[#d8e1de] hover:bg-white sm:flex"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#dceae5] text-xs font-bold text-[#075642]">
                  {initials}
                </span>
                <span className="text-sm font-semibold text-[#243c35]">
                  {user.firstName}
                </span>
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1320px] p-3 pb-24 min-[380px]:p-4 sm:p-6 sm:pb-20 lg:p-10 lg:pb-16">
          {!user.emailVerifiedAt && (
            <section className="mb-5 flex flex-col gap-4 rounded-[20px] border border-[#c4d7cf] bg-[#eaf5f0] p-4 shadow-[0_12px_30px_-24px_rgba(8,82,63,.45)] sm:flex-row sm:items-center sm:px-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-[#087a5b] shadow-sm">
                <Icon name="shield" className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#183f34]">
                  Verify your email to unlock payments
                </p>
                <p className="mt-1 text-xs leading-5 text-[#5f766f]">
                  Deposits, transfers, and beneficiary changes stay protected
                  until you confirm {user.email}.
                </p>
                {verificationNotice && (
                  <p
                    className="mt-1 text-xs font-semibold text-[#087a5b]"
                    role="status"
                  >
                    {verificationNotice}
                  </p>
                )}
                {developmentVerificationUrl && (
                  <a
                    className="mt-1 inline-block text-xs font-bold text-[#087a5b] underline"
                    href={developmentVerificationUrl}
                  >
                    Open development verification link
                  </a>
                )}
              </div>
              <button
                type="button"
                disabled={resendingVerification}
                onClick={() => void resendVerification()}
                className="h-10 w-full shrink-0 rounded-xl bg-[#087a5b] px-4 text-xs font-bold text-white transition hover:bg-[#06694f] disabled:bg-[#94b2a9] sm:w-auto"
              >
                {resendingVerification ? "Sending…" : "Resend verification"}
              </button>
            </section>
          )}
          <div className="page-enter">{children}</div>
        </main>
      </div>
      <ChatbotPanel />
    </div>
  );
}
