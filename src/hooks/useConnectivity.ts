"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 10_000;
const PING_TIMEOUT_MS = 5_000;

// Tracks real reachability of this server, not just the local network
// interface — navigator.onLine stays `true` even when the router's WAN link
// is down, so a genuine outage (or the server itself being unreachable) only
// shows up by actually trying a request. Polls /api/health in the
// background, plus an immediate re-check whenever the browser reports the
// network interface coming back up.
export function useConnectivity() {
  const [isOnline, setIsOnline] = useState(true);
  const inFlightRef = useRef(false);

  const check = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      await fetch("/api/health", {
        cache: "no-store",
        signal: AbortSignal.timeout(PING_TIMEOUT_MS),
      });
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);

    const handleOffline = () => setIsOnline(false);
    const handleOnline = () => check();
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [check]);

  return { isOnline, retryNow: check };
}
