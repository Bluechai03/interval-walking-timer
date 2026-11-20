import { afterEach } from "vitest";
import { forgetMemory } from "@/lib/phone-store";

// Each test starts with nothing saved on the phone, in storage or in the store's memory.
afterEach(() => {
  localStorage.clear();
  forgetMemory();
});
