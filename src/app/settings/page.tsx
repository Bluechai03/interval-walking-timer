import type { Metadata } from "next";
import { SettingsScreen } from "./settings-screen";

export const metadata: Metadata = {
  title: "Settings · Strut",
};

export default function SettingsPage() {
  return <SettingsScreen />;
}
