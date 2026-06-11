"use client";

import { useEffect, useState } from "react";

/**
 * True only after the first client mount. Use to gate wallet-dependent UI so the
 * server render and the first client render agree (wagmi may reconnect on the
 * first client render, which otherwise causes a hydration mismatch).
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
