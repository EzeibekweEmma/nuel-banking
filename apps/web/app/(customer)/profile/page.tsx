"use client";

import { FormEvent, useEffect, useState } from "react";
import { ErrorState, LoadingState } from "../../../components/page-state";
import { Icon } from "../../../components/icons";
import {
  Account,
  ActiveSession,
  api,
  clearTokens,
  getCurrentSessionId,
  User,
} from "../../../lib/api";
import { formatDate } from "../../../lib/format";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [sessions, setSessions] = useState<ActiveSession[] | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [securityMessage, setSecurityMessage] = useState("");
  const [error, setError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [revokingId, setRevokingId] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  useEffect(() => {
    setCurrentSessionId(getCurrentSessionId());
    Promise.all([api.me(), api.account(), api.sessions()])
      .then(([nextUser, nextAccount, activeSessions]) => {
        setUser(nextUser);
        setFirstName(nextUser.firstName);
        setLastName(nextUser.lastName);
        setAccount(nextAccount);
        setSessions(activeSessions);
        setCurrentSessionId(getCurrentSessionId());
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage("");
    try {
      const updated = await api.updateProfile({ firstName, lastName });
      setUser(updated);
      setFirstName(updated.firstName);
      setLastName(updated.lastName);
      setProfileMessage("Your profile information has been updated.");
      window.dispatchEvent(new Event("profile-updated"));
    } catch (reason) {
      setProfileMessage(
        reason instanceof Error ? reason.message : "Unable to update profile.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword"));
    const newPassword = String(form.get("newPassword"));
    const confirmation = String(form.get("confirmation"));
    if (newPassword !== confirmation) {
      setSecurityMessage("New password and confirmation do not match.");
      return;
    }
    setChangingPassword(true);
    setSecurityMessage("");
    try {
      const result = await api.changePassword(currentPassword, newPassword);
      setSecurityMessage(result.message);
      clearTokens();
      window.setTimeout(() => window.location.assign("/login"), 1200);
    } catch (reason) {
      setSecurityMessage(
        reason instanceof Error ? reason.message : "Unable to change password.",
      );
    } finally {
      setChangingPassword(false);
    }
  }

  async function revokeSession(sessionId: string): Promise<void> {
    setRevokingId(sessionId);
    setSecurityMessage("");
    try {
      await api.revokeSession(sessionId);
      if (sessionId === currentSessionId) {
        clearTokens();
        window.location.assign("/login");
        return;
      }
      setSessions(
        (current) =>
          current?.filter((session) => session.id !== sessionId) ?? null,
      );
      setSecurityMessage("The selected session has been signed out.");
    } catch (reason) {
      setSecurityMessage(
        reason instanceof Error ? reason.message : "Unable to revoke session.",
      );
    } finally {
      setRevokingId("");
    }
  }

  if (error) return <ErrorState message={error} />;
  if (!user || !account || !sessions) return <LoadingState />;
  const initials = (user.firstName[0] + user.lastName[0]).toUpperCase();

  return (
    <section className="max-w-4xl space-y-5">
      <div className="rounded-3xl border border-[#dce5e1] bg-white p-6">
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-[#d8f85c] text-lg font-extrabold text-[#163b31]">
            {initials}
          </span>
          <div>
            <h2 className="text-xl font-bold text-[#18352e]">
              {user.firstName} {user.lastName}
            </h2>
            <p className="mt-1 text-sm text-[#788883]">{user.email}</p>
          </div>
          <span
            className={`ml-auto hidden rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide sm:block ${user.emailVerifiedAt ? "bg-[#e3f3ec] text-[#087a5b]" : "bg-amber-50 text-amber-700"}`}
          >
            {user.emailVerifiedAt ? "Email verified" : "Verification pending"}
          </span>
        </div>
        <dl className="mt-6 grid gap-4 border-t border-[#e8edea] pt-6 sm:grid-cols-2">
          <Info label="Account type" value={titleCase(account.type)} />
          <Info label="Account number" value={account.accountNumber} />
          <Info label="Currency" value={account.currency} />
          <Info label="Member since" value={formatDate(account.createdAt)} />
        </dl>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <form
          onSubmit={(event) => void updateProfile(event)}
          className="rounded-3xl border border-[#dce5e1] bg-white p-6"
        >
          <h3 className="text-base font-bold text-[#28483f]">
            Personal information
          </h3>
          <p className="mt-1 text-xs leading-5 text-[#74847f]">
            Keep the name shown on your Nuel account up to date.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <ProfileInput
              label="First name"
              value={firstName}
              onChange={setFirstName}
              autoComplete="given-name"
            />
            <ProfileInput
              label="Last name"
              value={lastName}
              onChange={setLastName}
              autoComplete="family-name"
            />
          </div>
          <label className="mt-4 block text-xs font-bold text-[#39574f]">
            Email address
            <input
              disabled
              value={user.email}
              className="mt-2 h-11 w-full rounded-xl border border-[#e0e6e3] bg-[#f4f7f5] px-4 text-sm text-[#74847f]"
            />
          </label>
          <p className="mt-2 text-[11px] text-[#879590]">
            Contact support to change your verified email address.
          </p>
          {profileMessage && (
            <p
              className="mt-4 text-xs font-semibold text-[#087a5b]"
              role="status"
            >
              {profileMessage}
            </p>
          )}
          <button
            disabled={savingProfile}
            className="mt-5 h-11 rounded-xl bg-[#087a5b] px-5 text-xs font-bold text-white hover:bg-[#06694f] disabled:opacity-60"
          >
            {savingProfile ? "Saving…" : "Save profile"}
          </button>
        </form>

        <form
          onSubmit={(event) => void changePassword(event)}
          className="rounded-3xl border border-[#dce5e1] bg-white p-6"
        >
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e5f2ed] text-[#087a5b]">
              <Icon name="shield" className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-[#28483f]">
                Change password
              </h3>
              <p className="mt-1 text-xs leading-5 text-[#74847f]">
                Changing it signs out every active session.
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            <PasswordInput name="currentPassword" label="Current password" />
            <PasswordInput name="newPassword" label="New password" />
            <PasswordInput name="confirmation" label="Confirm new password" />
          </div>
          {securityMessage && (
            <p
              className="mt-4 text-xs font-semibold text-[#315048]"
              role="status"
            >
              {securityMessage}
            </p>
          )}
          <button
            disabled={changingPassword}
            className="mt-5 h-11 rounded-xl bg-[#183d33] px-5 text-xs font-bold text-white hover:bg-[#0d3027] disabled:opacity-60"
          >
            {changingPassword ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>

      <div className="rounded-3xl border border-[#dce5e1] bg-white p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf4f1] text-[#087a5b]">
            <Icon name="settings" className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-bold text-[#28483f]">
              Active sessions
            </h3>
            <p className="mt-1 text-xs leading-5 text-[#74847f]">
              Review browsers signed in to your account and remove access you do
              not recognize.
            </p>
          </div>
        </div>
        <div className="mt-5 divide-y divide-[#e8edea]">
          {sessions.map((session) => {
            const current = session.id === currentSessionId;
            return (
              <div
                key={session.id}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f0f4f2] text-[#456159]">
                  <Icon name="user" className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#28483f]">
                    {sessionName(session.userAgent)}
                    {current && (
                      <span className="ml-2 rounded-full bg-[#e3f3ec] px-2 py-0.5 text-[9px] font-bold uppercase text-[#087a5b]">
                        Current
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-[11px] text-[#7b8b87]">
                    {session.ipAddress || "IP unavailable"} · Signed in{" "}
                    {formatDate(session.createdAt, true)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={revokingId === session.id}
                  onClick={() => void revokeSession(session.id)}
                  className="h-9 rounded-xl border border-red-200 px-4 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  {revokingId === session.id ? "Signing out…" : "Revoke"}
                </button>
              </div>
            );
          })}
          {sessions.length === 0 && (
            <p className="py-6 text-sm text-[#74847f]">No active sessions.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-[#f5f8f6] p-4 text-xs leading-5 text-[#667a74]">
        Nuel staff will never ask for your password, PIN, or one-time code. Keep
        your login details private.
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a9793]">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm font-bold text-[#315048]">{value}</dd>
    </div>
  );
}

function ProfileInput({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}) {
  return (
    <label className="block text-xs font-bold text-[#39574f]">
      {label}
      <input
        required
        minLength={2}
        maxLength={100}
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-xl border border-[#ccd8d3] bg-[#fbfcfb] px-4 text-sm font-normal outline-none focus:border-[#087a5b]"
      />
    </label>
  );
}

function PasswordInput({ name, label }: { name: string; label: string }) {
  return (
    <label className="block text-xs font-bold text-[#39574f]">
      {label}
      <input
        required
        name={name}
        type="password"
        minLength={12}
        maxLength={128}
        autoComplete={
          name === "currentPassword" ? "current-password" : "new-password"
        }
        className="mt-2 h-11 w-full rounded-xl border border-[#ccd8d3] bg-[#fbfcfb] px-4 text-sm font-normal outline-none focus:border-[#087a5b]"
      />
    </label>
  );
}

function titleCase(value: string): string {
  return value[0] + value.slice(1).toLowerCase();
}

function sessionName(userAgent: string | null): string {
  if (!userAgent) return "Unknown browser";
  const browser = userAgent.includes("Edg/")
    ? "Microsoft Edge"
    : userAgent.includes("Firefox/")
      ? "Firefox"
      : userAgent.includes("Chrome/")
        ? "Chrome"
        : userAgent.includes("Safari/")
          ? "Safari"
          : "Web browser";
  const platform = userAgent.includes("Windows")
    ? "Windows"
    : userAgent.includes("Android")
      ? "Android"
      : userAgent.includes("iPhone") || userAgent.includes("iPad")
        ? "iOS"
        : userAgent.includes("Mac OS")
          ? "macOS"
          : userAgent.includes("Linux")
            ? "Linux"
            : "Unknown device";
  return `${browser} on ${platform}`;
}
