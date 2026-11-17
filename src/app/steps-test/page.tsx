import type { Metadata } from "next";
import { StepsTest } from "./steps-test";

// A test page for trying the Health Shortcut. It is not linked from anywhere.
export const metadata: Metadata = {
  title: "Steps test · Strut",
  robots: { index: false, follow: false },
};

export default function StepsTestPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <h1 className="font-condensed text-[2rem] leading-none">Steps test</h1>
      <StepsTest />
    </main>
  );
}
