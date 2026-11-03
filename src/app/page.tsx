import { Timer } from "./timer";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <h1 className="px-4 text-lg sm:px-0 font-semibold">Interval walking</h1>
      <Timer />
    </main>
  );
}
