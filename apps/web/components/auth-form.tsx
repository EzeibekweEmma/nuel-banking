"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { api, ApiError, saveTokens } from "../lib/api";
import { Icon } from "./icons";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const tokens =
        mode === "login"
          ? await api.login(String(form.get("email")), password)
          : await api.register({
              email: String(form.get("email")),
              firstName: String(form.get("firstName")),
              lastName: String(form.get("lastName")),
              password,
            });
      saveTokens(tokens);
      window.location.assign(
        mode === "register" && tokens.emailVerificationRequired
          ? "/verify-email"
          : "/dashboard",
      );
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? reason.message
          : "Unable to continue right now.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-4">
      {mode === "register" && (
        <div className="grid grid-cols-2 gap-3">
          <Input
            name="firstName"
            label="First name"
            autoComplete="given-name"
          />
          <Input name="lastName" label="Last name" autoComplete="family-name" />
        </div>
      )}
      <Input
        name="email"
        label="Email address"
        type="email"
        autoComplete="email"
      />
      <label className="block text-xs font-bold text-[#39574f]">
        <span className="flex items-center justify-between">
          <span>Password</span>
          {mode === "login" && (
            <Link
              href="/forgot-password"
              className="font-bold text-[#087a5b] hover:underline"
            >
              Forgot password?
            </Link>
          )}
        </span>
        <span className="relative mt-2 block">
          <input
            required
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            className="h-12 w-full rounded-xl border border-[#ccd8d3] bg-[#fbfcfb] px-4 pr-12 text-sm font-normal text-[#18352e] outline-none transition focus:border-[#087a5b] focus:bg-white"
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[#80908b] hover:bg-[#edf3f0]"
          >
            <Icon name={showPassword ? "eye-off" : "eye"} className="h-4 w-4" />
          </button>
        </span>
      </label>
      {mode === "register" && (
        <p className="text-[11px] leading-5 text-[#7b8b87]">
          Use at least 12 characters. A mix of words, numbers, and symbols works
          best.
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
        >
          {error}
        </div>
      )}
      <button
        disabled={loading}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#087a5b] text-sm font-bold text-white shadow-[0_12px_24px_-16px_rgba(6,105,79,.8)] transition hover:bg-[#06694f] disabled:bg-[#a8bdb6]"
      >
        {loading
          ? "Please wait…"
          : mode === "login"
            ? "Sign in securely"
            : "Create my account"}
        {!loading && <Icon name="chevron-right" className="h-4 w-4" />}
      </button>
      <p className="pt-1 text-center text-xs text-[#70817c]">
        {mode === "login" ? "New to Nuel?" : "Already have an account?"}{" "}
        <Link
          className="font-bold text-[#087a5b] hover:underline"
          href={mode === "login" ? "/register" : "/login"}
        >
          {mode === "login" ? "Open an account" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}

function Input({
  name,
  label,
  type = "text",
  autoComplete,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete: string;
}) {
  return (
    <label className="block text-xs font-bold text-[#39574f]">
      {label}
      <input
        required
        name={name}
        type={type}
        autoComplete={autoComplete}
        className="mt-2 h-12 w-full rounded-xl border border-[#ccd8d3] bg-[#fbfcfb] px-4 text-sm font-normal text-[#18352e] outline-none transition focus:border-[#087a5b] focus:bg-white"
      />
    </label>
  );
}
