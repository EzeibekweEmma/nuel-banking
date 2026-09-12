"use client";

import { useEffect, useState } from "react";
import { ListPagination } from "../../../components/list-pagination";
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

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[] | null>(null);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api
      .notifications({ page, limit: PAGE_SIZE, unreadOnly })
      .then((result) => {
        if (!active) return;
        if (result.total > 0 && page > result.totalPages) {
          setPage(result.totalPages);
          return;
        }
        setItems(result.data);
        setTotal(result.total);
        setUnread(result.unread);
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, reloadKey, unreadOnly]);

  if (error && !items) return <ErrorState message={error} />;
  if (!items) return <LoadingState />;

  async function markAllRead(): Promise<void> {
    setMarkingAll(true);
    setError("");
    try {
      await api.markAllNotificationsRead();
      setUnread(0);
      if (unreadOnly) {
        setItems([]);
        setTotal(0);
        setPage(1);
      } else {
        setItems(
          (current) =>
            current?.map((item) => ({ ...item, isRead: true })) ?? null,
        );
      }
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

  async function markRead(item: Notification): Promise<void> {
    if (item.isRead || markingId) return;
    setMarkingId(item.id);
    setError("");
    try {
      await api.markNotificationRead(item.id);
      setUnread((current) => Math.max(0, current - 1));
      if (unreadOnly) {
        const remainingOnPage = Math.max(0, (items?.length ?? 1) - 1);
        setItems(
          (current) =>
            current?.filter((notification) => notification.id !== item.id) ??
            null,
        );
        setTotal((current) => Math.max(0, current - 1));
        if (remainingOnPage === 0 && page > 1) {
          setPage((current) => current - 1);
        } else {
          setReloadKey((current) => current + 1);
        }
      } else {
        setItems(
          (current) =>
            current?.map((notification) =>
              notification.id === item.id
                ? { ...notification, isRead: true }
                : notification,
            ) ?? null,
        );
      }
      window.dispatchEvent(new Event("notifications-updated"));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to update the notification.",
      );
    } finally {
      setMarkingId(null);
    }
  }

  return (
    <section className="max-w-3xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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
            className="h-10 w-full shrink-0 rounded-xl border border-[#cbd8d3] bg-white px-4 text-xs font-bold text-[#087a5b] hover:border-[#087a5b] disabled:opacity-60 min-[420px]:w-auto"
          >
            {markingAll ? "Updating…" : "Mark all as read"}
          </button>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-[20px] border border-[#dce5e1] bg-white p-3 shadow-[0_14px_35px_-32px_rgba(13,56,45,.5)] min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between sm:p-4">
        <div
          className="inline-flex rounded-xl bg-[#eef4f1] p-1"
          aria-label="Notification filters"
        >
          <button
            type="button"
            aria-pressed={!unreadOnly}
            onClick={() => {
              setUnreadOnly(false);
              setPage(1);
            }}
            className={`h-9 rounded-lg px-4 text-xs font-bold transition ${
              !unreadOnly
                ? "bg-white text-[#087a5b] shadow-sm"
                : "text-[#63766f] hover:text-[#18352e]"
            }`}
          >
            All
          </button>
          <button
            type="button"
            aria-pressed={unreadOnly}
            onClick={() => {
              setUnreadOnly(true);
              setPage(1);
            }}
            className={`h-9 rounded-lg px-4 text-xs font-bold transition ${
              unreadOnly
                ? "bg-white text-[#087a5b] shadow-sm"
                : "text-[#63766f] hover:text-[#18352e]"
            }`}
          >
            Unread{unread > 0 ? ` (${unread})` : ""}
          </button>
        </div>
        <span className="text-xs font-semibold text-[#71827d]">
          {items.length} of {total} shown
        </span>
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      <div
        className={`mt-5 overflow-hidden rounded-[22px] border border-[#dce5e1] bg-white p-1 transition-opacity min-[380px]:p-2 sm:rounded-3xl sm:p-3 ${loading ? "opacity-60" : "opacity-100"}`}
        aria-busy={loading}
      >
        {items.map((item) => (
          <button
            type="button"
            key={item.id}
            disabled={item.isRead || markingId !== null}
            onClick={() => void markRead(item)}
            className={
              "relative flex w-full items-start gap-3 rounded-2xl p-3 text-left transition enabled:hover:bg-[#f4f8f6] disabled:cursor-default min-[380px]:p-4 sm:gap-4 " +
              (!item.isRead ? "bg-[#f0f8f5]" : "")
            }
          >
            <span
              className={
                "grid h-10 w-10 shrink-0 place-items-center rounded-xl min-[380px]:h-11 min-[380px]:w-11 " +
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
          <EmptyState
            message={
              unreadOnly
                ? "You have no unread notifications."
                : "Important account and transaction updates will appear here."
            }
          />
        )}
      </div>
      <ListPagination
        page={page}
        total={total}
        limit={PAGE_SIZE}
        loading={loading}
        label="Notifications"
        onPageChange={setPage}
      />
    </section>
  );
}
