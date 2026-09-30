import { Timer } from "./timer";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <h1 className="text-xl font-bold">Interval Walking Timer</h1>
      <Timer />
    </main>
  );
}
