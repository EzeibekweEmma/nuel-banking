"use client";

import { useEffect, useState } from "react";
import { ErrorState, LoadingState } from "../../../components/page-state";
import { Icon } from "../../../components/icons";
import { Account, api, User } from "../../../lib/api";
import { formatDate } from "../../../lib/format";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([api.me(), api.account()])
      .then(([nextUser, nextAccount]) => {
        setUser(nextUser);
        setAccount(nextAccount);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);
  if (error) return <ErrorState message={error} />;
  if (!user || !account) return <LoadingState />;
  const initials = (user.firstName[0] + user.lastName[0]).toUpperCase();

  return (
    <section className="max-w-3xl space-y-5">
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
          <Info
            label="Account type"
            value={account.type[0] + account.type.slice(1).toLowerCase()}
          />
          <Info label="Account number" value={account.accountNumber} />
          <Info label="Currency" value={account.currency} />
          <Info label="Member since" value={formatDate(account.createdAt)} />
        </dl>
      </div>
      <div className="rounded-3xl border border-[#dce5e1] bg-white p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e5f2ed] text-[#087a5b]">
            <Icon name="shield" className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-[#28483f]">
              Account security
            </h3>
            <p className="mt-1 text-xs leading-5 text-[#74847f]">
              {account.status === "FROZEN"
                ? "Account access is temporarily restricted. Review your notifications for the reason and status updates."
                : "Your account is protected with secure authentication and real-time transfer monitoring."}
            </p>
          </div>
          <span
            className={`ml-auto text-xs font-bold ${account.status === "FROZEN" ? "text-blue-700" : "text-[#087a5b]"}`}
          >
            {account.status === "FROZEN" ? "Frozen" : "Active"}
          </span>
        </div>
        <div className="mt-5 rounded-xl bg-[#f5f8f6] p-4 text-xs leading-5 text-[#667a74]">
          Nuel staff will never ask for your password, PIN, or one-time code.
          Keep your login details private.
        </div>
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
