import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Member, Room } from "@/lib/rooms";
import type { AuthState } from "@/lib/use-auth";
import type { RoomState } from "@/lib/use-room";
import { Lobby } from "./lobby";

const auth = vi.hoisted(() => ({ state: {} as AuthState }));
const room = vi.hoisted(() => ({ state: {} as RoomState }));
const push = vi.hoisted(() => vi.fn());
const leaveRoom = vi.hoisted(() => vi.fn());
const removeMember = vi.hoisted(() => vi.fn());
const startRoom = vi.hoisted(() => vi.fn());
const reload = vi.hoisted(() => vi.fn());
const primeAudio = vi.hoisted(() => vi.fn());

vi.mock("@/lib/use-auth", () => ({ useAuth: () => auth.state }));
vi.mock("@/lib/use-room", () => ({ useRoom: () => room.state }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("qrcode", () => ({ default: { toDataURL: () => Promise.resolve("data:image/png;base64,AAAA") } }));
vi.mock("@/lib/rooms", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rooms")>()),
  leaveRoom,
  removeMember,
  startRoom,
}));
vi.mock("@/lib/use-cues", () => ({ primeAudio }));
vi.mock("./room-walk", () => ({ RoomWalk: () => <p>THE WALK</p> }));

const theRoom: Room = {
  id: "r1",
  code: "BCDF",
  host_id: "host",
  status: "open",
  fast_seconds: 180,
  slow_seconds: 120,
  rounds: 4,
  get_ready_seconds: 5,
  start_at: null,
};
const person = (id: string, nickname: string): Member => ({
  user_id: id,
  nickname,
  removed: false,
  last_seen_at: new Date().toISOString(),
});

const as = (id: string): AuthState => ({ status: "signed-in", user: { id } }) as unknown as AuthState;
const inRoom = (...members: Member[]): RoomState => ({ status: "ready", room: theRoom, here: members, reload });

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Lobby", () => {
  it("shows the code, the plan and who is here", async () => {
    auth.state = as("host");
    room.state = inRoom(person("host", "Anna"), person("g1", "Ben"));
    render(<Lobby roomId="r1" />);
    expect(screen.getByText("BCDF")).toBeTruthy();
    expect(screen.getByText(/4 rounds of 3:00 fast and 2:00 slow/)).toBeTruthy();
    expect(screen.getByText("Here now (2)")).toBeTruthy();
    expect(screen.getByText("Ben")).toBeTruthy();
    expect(await screen.findByAltText("QR code that opens the room")).toBeTruthy();
  });

  it("marks you and the host", () => {
    auth.state = as("g1");
    room.state = inRoom(person("host", "Anna"), person("g1", "Ben"));
    render(<Lobby roomId="r1" />);
    expect(screen.getByText("(you)")).toBeTruthy();
    expect(screen.getByText("· host")).toBeTruthy();
  });

  it("lets only the host remove others, and never themselves", async () => {
    auth.state = as("host");
    room.state = inRoom(person("host", "Anna"), person("g1", "Ben"));
    removeMember.mockResolvedValue({ ok: true, value: null });
    render(<Lobby roomId="r1" />);
    expect(screen.getAllByRole("button", { name: /^Remove/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Remove Ben" }));
    await waitFor(() => expect(removeMember).toHaveBeenCalledWith("r1", "g1"));
  });

  it("gives a guest no Remove buttons", () => {
    auth.state = as("g1");
    room.state = inRoom(person("host", "Anna"), person("g1", "Ben"), person("g2", "Cara"));
    render(<Lobby roomId="r1" />);
    expect(screen.queryByRole("button", { name: /^Remove/ })).toBeNull();
  });

  it("leaves the room and goes back", async () => {
    auth.state = as("g1");
    room.state = inRoom(person("host", "Anna"), person("g1", "Ben"));
    leaveRoom.mockResolvedValue({ ok: true, value: null });
    render(<Lobby roomId="r1" />);
    fireEvent.click(screen.getByRole("button", { name: "Leave the room" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/friends"));
    expect(leaveRoom).toHaveBeenCalledWith("r1");
  });

  it("is kind when the room isn't available", () => {
    auth.state = as("g1");
    room.state = { status: "missing" };
    render(<Lobby roomId="r1" />);
    expect(screen.getByText(/isn't available to you/)).toBeTruthy();
  });
});

describe("Lobby, starting the walk", () => {
  it("lets only the host start, and tells guests to wait", () => {
    auth.state = as("host");
    room.state = inRoom(person("host", "Anna"), person("g1", "Ben"));
    const { unmount } = render(<Lobby roomId="r1" />);
    expect(screen.getByRole("button", { name: "Start the walk" })).toBeTruthy();
    expect(screen.getByText(/5 second countdown/)).toBeTruthy();
    unmount();

    auth.state = as("g1");
    render(<Lobby roomId="r1" />);
    expect(screen.queryByRole("button", { name: "Start the walk" })).toBeNull();
    expect(screen.getByText("Waiting for the host to start the walk.")).toBeTruthy();
  });

  it("starts the walk, unlocks sound with the tap, and refreshes the room", async () => {
    auth.state = as("host");
    room.state = inRoom(person("host", "Anna"));
    startRoom.mockResolvedValue({ ok: true, value: null });
    render(<Lobby roomId="r1" />);
    fireEvent.click(screen.getByRole("button", { name: "Start the walk" }));
    await waitFor(() => expect(reload).toHaveBeenCalled());
    expect(startRoom).toHaveBeenCalledWith("r1");
    expect(primeAudio).toHaveBeenCalled();
  });

  it("shows why the walk couldn't start", async () => {
    auth.state = as("host");
    room.state = inRoom(person("host", "Anna"));
    startRoom.mockResolvedValue({ ok: false, message: "That walk has already started." });
    render(<Lobby roomId="r1" />);
    fireEvent.click(screen.getByRole("button", { name: "Start the walk" }));
    expect((await screen.findByRole("alert")).textContent).toContain("already started");
    expect(reload).not.toHaveBeenCalled();
  });

  it("turns into the walk once the host has started", () => {
    auth.state = as("g1");
    room.state = {
      status: "ready",
      room: { ...theRoom, status: "walking", start_at: new Date().toISOString() },
      here: [person("host", "Anna"), person("g1", "Ben")],
      reload,
    };
    render(<Lobby roomId="r1" />);
    expect(screen.getByText("THE WALK")).toBeTruthy();
    expect(screen.queryByText("Room code")).toBeNull();
  });
});
