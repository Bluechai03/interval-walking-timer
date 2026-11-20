import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Room } from "./rooms";

const fresh = async () => {
  vi.resetModules();
  return import("./records");
};

const room = { id: "r1", code: "BCDF", host_id: "h", status: "walking", fast_seconds: 180, slow_seconds: 180, rounds: 5, get_ready_seconds: 10, activity: "walk", start_at: "2026-11-20T10:00:00.000Z" } as Room;

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("records: what a phone already has saved must keep working", () => {
  it("keeps every key under its present name and writes the same shapes", async () => {
    const { walkRecord, crewWalkRecord, serverOffsetRecord, pushRunRecord } = await fresh();
    expect([walkRecord.key, crewWalkRecord.key, serverOffsetRecord.key, pushRunRecord.key]).toEqual([
      "walk-state",
      "crew-walk",
      "server-offset",
      "phase-push-run",
    ]);
    walkRecord.write({ accumulatedMs: 5000, startedAt: 123, savedAt: 456 });
    crewWalkRecord.write({ room, savedAt: 789 });
    serverOffsetRecord.write({ offset: -42, at: 99 });
    pushRunRecord.write("run-1");
    expect(JSON.parse(localStorage.getItem("walk-state") ?? "")).toEqual({ accumulatedMs: 5000, startedAt: 123, savedAt: 456 });
    expect(JSON.parse(localStorage.getItem("crew-walk") ?? "")).toEqual({ room, savedAt: 789 });
    expect(JSON.parse(localStorage.getItem("server-offset") ?? "")).toEqual({ offset: -42, at: 99 });
    expect(localStorage.getItem("phase-push-run")).toBe("run-1");
  });

  it("reads records saved by an earlier version", async () => {
    localStorage.setItem("walk-state", '{"accumulatedMs":1000,"startedAt":null,"savedAt":50}');
    localStorage.setItem("server-offset", '{"offset":12,"at":' + Date.now() + "}");
    const { walkRecord, serverOffsetRecord } = await fresh();
    expect(walkRecord.read()).toEqual({ accumulatedMs: 1000, startedAt: null, savedAt: 50 });
    expect(serverOffsetRecord.read()?.offset).toBe(12);
  });
});

describe("records: stale, damaged and missing", () => {
  it("has nothing when nothing is saved, and a cleared record is gone", async () => {
    const { walkRecord } = await fresh();
    expect(walkRecord.read()).toBeNull();
    walkRecord.write({ accumulatedMs: 1, startedAt: null, savedAt: 1 });
    walkRecord.clear();
    expect(walkRecord.read()).toBeNull();
    expect(localStorage.getItem("walk-state")).toBeNull();
  });

  it("gives nothing, and never throws, for damaged text", async () => {
    localStorage.setItem("walk-state", "{not json");
    localStorage.setItem("crew-walk", '{"room":5}');
    localStorage.setItem("server-offset", '{"offset":"soon"}');
    const { walkRecord, crewWalkRecord, serverOffsetRecord } = await fresh();
    expect(walkRecord.read()).toBeNull();
    expect(crewWalkRecord.read()).toBeNull();
    expect(serverOffsetRecord.read()).toBeNull();
  });

  it("forgets a Crew walk and a clock offset after six hours, but keeps them before", async () => {
    const { crewWalkRecord, serverOffsetRecord } = await fresh();
    const t = 1_000_000_000;
    crewWalkRecord.write({ room, savedAt: t });
    serverOffsetRecord.write({ offset: 5, at: t });
    expect(crewWalkRecord.read(t + 5 * 3_600_000)).not.toBeNull();
    expect(serverOffsetRecord.read(t + 5 * 3_600_000)?.offset).toBe(5);
    expect(crewWalkRecord.read(t + 7 * 3_600_000)).toBeNull();
    expect(serverOffsetRecord.read(t + 7 * 3_600_000)).toBeNull();
  });

  it("leaves a walk's age to the timer, which knows the plan", async () => {
    const { walkRecord } = await fresh();
    walkRecord.write({ accumulatedMs: 1, startedAt: null, savedAt: 1 });
    expect(walkRecord.read(Date.now() + 10 * 24 * 3_600_000)).not.toBeNull();
  });

  it("still works from memory when storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { pushRunRecord } = await fresh();
    pushRunRecord.write("run-2");
    expect(pushRunRecord.read()).toBe("run-2");
  });
});

describe("walkInProgress", () => {
  it("is true for a started or part-walked walk, and false for nothing or an empty one", async () => {
    const { walkInProgress } = await fresh();
    expect(walkInProgress(null)).toBe(false);
    expect(walkInProgress({ accumulatedMs: 0, startedAt: null, savedAt: 1 })).toBe(false);
    expect(walkInProgress({ accumulatedMs: 5000, startedAt: null, savedAt: 1 })).toBe(true);
    expect(walkInProgress({ accumulatedMs: 0, startedAt: 123, savedAt: 1 })).toBe(true);
  });
});
