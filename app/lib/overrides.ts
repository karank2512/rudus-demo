"use client";

// Session-scoped override store. Overrides are the estimator's decisions on
// flagged fields. They persist for the browser session only (sessionStorage)
// so the takeoff, review, and export sheets stay consistent while the demo is
// open - a real deployment would write each decision back with the
// estimator's name and a timestamp. The UI says this plainly.

import type { Overrides } from "../../src/engine/takeoff";

const KEY = "rudus-demo-overrides";
const EVENT = "rudus-demo-overrides-changed";

export function loadOverrides(): Overrides {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.sessionStorage.getItem(KEY) ?? "{}") as Overrides;
  } catch {
    return {};
  }
}

export function saveOverrides(o: Overrides): void {
  window.sessionStorage.setItem(KEY, JSON.stringify(o));
  window.dispatchEvent(new Event(EVENT));
}

export function clearOverrides(): void {
  window.sessionStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function onOverridesChanged(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
