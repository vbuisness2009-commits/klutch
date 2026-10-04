"use client";

import { PENDING_ATTEMPT_KEY, type AttemptInput } from "./attempts";

export type SaveResult = "saved" | "signed-out" | "error";

export async function saveAttempt(attempt: AttemptInput): Promise<SaveResult> {
  try {
    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(attempt),
    });
    if (res.status === 401) {
      localStorage.setItem(PENDING_ATTEMPT_KEY, JSON.stringify(attempt));
      return "signed-out";
    }
    return res.ok ? "saved" : "error";
  } catch {
    return "error";
  }
}

/** Saves a result finished while signed out. Safe to call on every page load. */
export async function flushPendingAttempt(): Promise<boolean> {
  const raw = localStorage.getItem(PENDING_ATTEMPT_KEY);
  if (!raw) return false;
  localStorage.removeItem(PENDING_ATTEMPT_KEY);
  try {
    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: raw,
    });
    if (res.status === 401) localStorage.setItem(PENDING_ATTEMPT_KEY, raw);
    return res.ok;
  } catch {
    localStorage.setItem(PENDING_ATTEMPT_KEY, raw);
    return false;
  }
}
