import type { Metadata } from "next";
import { LockTest } from "./lock-test";

// Throwaway page for the on-device lock-screen test. See docs/research/lock-screen-live-notifications.md.
export const metadata: Metadata = {
  title: "Lock-screen test",
  robots: { index: false, follow: false },
};

export default function LockTestPage() {
  return <LockTest />;
}
