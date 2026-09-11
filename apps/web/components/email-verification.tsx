"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, isAuthenticated } from "../lib/api";
import { Icon } from "./icons";

type VerificationState = "pending" | "verifying" | "verified" | "error";

export function EmailVerification({ token }: { token: string }) {
  const started = useRef(false);
  const [state, setState] = useState<VerificationState>(
    token ? "verifying" : "pending",
  );
  const [message, setMessage] = useState(
    token
      ? "Confirming your secure link…"
      : "We sent a verification link to your email address.",
  );
  const [resending, setResending] = useState(false);
  const [developmentUrl, setDevelopmentUrl] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => setSignedIn(isAuthenticated()), []);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    api
      .verifyEmail(token)
      .then((result) => {
        setState("verified");
        setMessage(result.message);
      })
      .catch((reason: unknown) => {
        setState("error");
        setMessage(
          reason instanceof ApiError
            ? reason.message
            : "We could not verify this email link.",
        );
      });
  }, [token]);

  async function resend(): Promise<void> {
    setResending(true);
    setDevelopmentUrl("");
    try {
      const result = await api.resendEmailVerification();
      setState("pending");
      setMessage(result.message);
      setDevelopmentUrl(result.verificationUrl ?? "");
    } catch (reason) {
      setState("error");
      setMessage(
        reason instanceof ApiError
          ? reason.message
          : "We could not send another verification email.",
      );
    } finally {
      setResending(false);
    }
  }

  const verified = state === "verified";
  return (
    <div className="mt-7">
      <span
        className={`grid h-14 w-14 place-items-center rounded-2xl ${verified ? "bg-[#d8f85c] text-[#173c31]" : state === "error" ? "bg-red-50 text-red-600" : "bg-[#e4f4ed] text-[#087a5b]"}`}
      >
        {state === "verifying" ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Icon name={verified ? "shield" : "send"} className="h-6 w-6" />
        )}
      </span>
      <h3 className="mt-5 text-base font-bold text-[#24453c]">
        {verified
          ? "Email verified"
          : state === "error"
            ? "Link not verified"
            : token
              ? "Verifying your email"
              : "Check your inbox"}
      </h3>
      <p className="mt-2 text-sm leading-6 text-[#61736d]" role="status">
        {message}
      </p>
      {!verified && (
        <p className="mt-2 text-xs leading-5 text-[#879590]">
          The link expires in 24 hours. If it is missing, check your spam folder
          or request another one.
        </p>
      )}

      {developmentUrl && (
        <a
          href={developmentUrl}
          className="mt-5 flex h-11 items-center justify-center rounded-xl border border-[#9dbdb3] bg-[#f2f8f5] text-xs font-bold text-[#087a5b]"
        >
          Open development verification link
        </a>
      )}

      {verified ? (
        <Link
          href={signedIn ? "/dashboard" : "/login"}
          className="mt-6 flex h-12 items-center justify-center rounded-xl bg-[#087a5b] text-sm font-bold text-white"
        >
          {signedIn ? "Continue to my account" : "Continue to sign in"}
        </Link>
      ) : signedIn ? (
        <button
          type="button"
          disabled={resending || state === "verifying"}
          onClick={() => void resend()}
          className="mt-6 h-12 w-full rounded-xl bg-[#087a5b] text-sm font-bold text-white transition hover:bg-[#06694f] disabled:bg-[#a8bdb6]"
        >
          {resending ? "Sending…" : "Send another verification email"}
        </button>
      ) : (
        <Link
          href="/login"
          className="mt-6 flex h-12 items-center justify-center rounded-xl bg-[#087a5b] text-sm font-bold text-white"
        >
          Sign in to request another link
        </Link>
      )}
      {!verified && signedIn && (
        <Link
          href="/dashboard"
          className="mt-4 block text-center text-xs font-bold text-[#087a5b]"
        >
          Continue with limited access
        </Link>
      )}
    </div>
  );
}
