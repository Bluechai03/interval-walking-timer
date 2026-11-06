import { Timer } from "./timer";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Timer />
    </main>
  );
}
