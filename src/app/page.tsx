import { buildPlan } from "@/lib/plan";
import { Timer } from "./timer";

export default function Home() {
  const plan = buildPlan();

  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-6 p-4">
      <h1 className="text-xl font-bold">Interval Walking Timer</h1>
      <Timer plan={plan} />
    </main>
  );
}
