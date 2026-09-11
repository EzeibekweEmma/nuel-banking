"use client";

import { useEffect, useState } from "react";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../components/page-state";
import { Icon, IconName } from "../../../components/icons";
import { api, Notification } from "../../../lib/api";
import { formatDate } from "../../../lib/format";

const notificationIcons: Record<string, IconName> = {
  FRAUD_ALERT: "shield",
  SECURITY_ALERT: "shield",
  TRANSACTION_UPDATE: "receipt",
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const load = () =>
    api
      .notifications()
      .then(setItems)
      .catch((reason: Error) => setError(reason.message));
  useEffect(() => {
    void load();
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!items) return <LoadingState />;
  const unread = items.filter((item) => !item.isRead).length;

  async function markAllRead(): Promise<void> {
    setMarkingAll(true);
    setError("");
    try {
      await api.markAllNotificationsRead();
      setItems(
        (current) =>
          current?.map((item) => ({ ...item, isRead: true })) ?? null,
      );
      window.dispatchEvent(new Event("notifications-updated"));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to update notifications.",
      );
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <section className="max-w-3xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#18352e]">Updates for you</h2>
          <p className="mt-1 text-sm text-[#788883]">
            {unread
              ? unread +
                " unread " +
                (unread === 1 ? "notification" : "notifications")
              : "You’re all caught up"}
          </p>
        </div>
        {unread > 0 && (
          <button
            type="button"
            disabled={markingAll}
            onClick={() => void markAllRead()}
            className="h-10 shrink-0 rounded-xl border border-[#cbd8d3] bg-white px-4 text-xs font-bold text-[#087a5b] hover:border-[#087a5b] disabled:opacity-60"
          >
            {markingAll ? "Updating…" : "Mark all as read"}
          </button>
        )}
      </div>
      <div className="mt-5 overflow-hidden rounded-3xl border border-[#dce5e1] bg-white p-2 sm:p-3">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() =>
              !item.isRead &&
              api
                .markNotificationRead(item.id)
                .then(() => {
                  setItems(
                    (current) =>
                      current?.map((notification) =>
                        notification.id === item.id
                          ? { ...notification, isRead: true }
                          : notification,
                      ) ?? null,
                  );
                  window.dispatchEvent(new Event("notifications-updated"));
                })
                .catch((reason: Error) => setError(reason.message))
            }
            className={
              "relative flex w-full items-start gap-4 rounded-2xl p-4 text-left transition hover:bg-[#f4f8f6] " +
              (!item.isRead ? "bg-[#f0f8f5]" : "")
            }
          >
            <span
              className={
                "grid h-11 w-11 shrink-0 place-items-center rounded-xl " +
                (item.type === "FRAUD_ALERT"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-[#e5f2ed] text-[#087a5b]")
              }
            >
              <Icon
                name={notificationIcons[item.type] ?? "bell"}
                className="h-5 w-5"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-[#28483f]">
                {item.title}
              </span>
              <span className="mt-1 block text-xs leading-5 text-[#70817c]">
                {item.message}
              </span>
              <span className="mt-2 block text-[10px] font-medium text-[#929f9b]">
                {formatDate(item.createdAt, true)}
              </span>
            </span>
            {!item.isRead && (
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#087a5b]" />
            )}
          </button>
        ))}
        {items.length === 0 && (
          <EmptyState message="Important account and transaction updates will appear here." />
        )}
      </div>
    </section>
  );
}
