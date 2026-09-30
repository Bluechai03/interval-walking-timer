import { buildPlan } from "@/lib/plan";

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export default function Home() {
  const plan = buildPlan();

  return (
    <main>
      <h1>Interval Walking Timer</h1>
      <ol>
        {plan.map((item, i) => (
          <li key={i}>
            {item.type} {formatTime(item.durationInSeconds)}
          </li>
        ))}
      </ol>
    </main>
  );
}
