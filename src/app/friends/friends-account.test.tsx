import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthState } from "@/lib/use-auth";
import { FriendsAccount } from "./friends-account";

const auth = vi.hoisted(() => ({ state: { status: "signed-out" } as AuthState }));
const signInAsGuest = vi.hoisted(() => vi.fn());
const fetchDisplayName = vi.hoisted(() => vi.fn());
const saveDisplayName = vi.hoisted(() => vi.fn());
const deleteMyData = vi.hoisted(() => vi.fn());

const push = vi.hoisted(() => vi.fn());
const createRoom = vi.hoisted(() => vi.fn());
const joinRoom = vi.hoisted(() => vi.fn());

vi.mock("@/lib/use-auth", () => ({ useAuth: () => auth.state, signInAsGuest }));
vi.mock("@/lib/profile", () => ({ fetchDisplayName, saveDisplayName, deleteMyData }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/rooms", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rooms")>()),
  createRoom,
  joinRoom,
}));

const signedIn = (): AuthState => ({ status: "signed-in", user: { id: "u1" } }) as unknown as AuthState;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const typeName = async (value: string) =>
  fireEvent.change(await screen.findByRole("textbox"), { target: { value } });

describe("FriendsAccount", () => {
  it("says so when Supabase isn't set up", () => {
    auth.state = { status: "unavailable" };
    render(<FriendsAccount />);
    expect(screen.getByText(/isn't switched on here yet/)).toBeTruthy();
  });

  it("asks a new visitor for a name, with a friendly suggestion, and no sign-in", async () => {
    auth.state = { status: "signed-out" };
    render(<FriendsAccount />);
    const input = (await screen.findByRole("textbox")) as HTMLInputElement;
    expect(input.value).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
    expect(screen.queryByText(/Google/)).toBeNull();
  });

  it("makes a guest account the first time a name is saved", async () => {
    auth.state = { status: "signed-out" };
    signInAsGuest.mockResolvedValue({ ok: true, userId: "u9" });
    saveDisplayName.mockResolvedValue({ ok: true, value: "Anna" });
    render(<FriendsAccount />);
    await typeName("Anna");
    fireEvent.click(screen.getByRole("button", { name: "Save my name" }));
    expect(await screen.findByText("Hi, Anna")).toBeTruthy();
    expect(signInAsGuest).toHaveBeenCalledOnce();
    expect(saveDisplayName).toHaveBeenCalledWith("u9", "Anna");
  });

  it("keeps the form through the moment the guest account is made", async () => {
    // Making the account makes useAuth report a signed-in person halfway through
    // saving. The form must not be rebuilt then, or the name seems to vanish.
    auth.state = { status: "signed-out" };
    signInAsGuest.mockResolvedValue({ ok: true, userId: "u9" });
    fetchDisplayName.mockResolvedValue({ ok: true, value: null });
    let rerender: (ui: React.ReactElement) => void = () => {};
    saveDisplayName.mockImplementation(async () => {
      auth.state = { status: "signed-in", user: { id: "u9" } } as unknown as AuthState;
      rerender(<FriendsAccount />);
      return { ok: true, value: "Anna" };
    });
    ({ rerender } = render(<FriendsAccount />));
    await typeName("Anna");
    fireEvent.click(screen.getByRole("button", { name: "Save my name" }));
    expect(await screen.findByText("Hi, Anna")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save my name" })).toBeNull();
    expect(fetchDisplayName).not.toHaveBeenCalled();
  });

  it("explains a bad name without making an account", async () => {
    auth.state = { status: "signed-out" };
    render(<FriendsAccount />);
    await typeName("A");
    fireEvent.click(screen.getByRole("button", { name: "Save my name" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(signInAsGuest).not.toHaveBeenCalled();
  });

  it("says so kindly when a guest account can't be made", async () => {
    auth.state = { status: "signed-out" };
    signInAsGuest.mockResolvedValue({ ok: false, message: "That didn't work just now." });
    render(<FriendsAccount />);
    await typeName("Anna");
    fireEvent.click(screen.getByRole("button", { name: "Save my name" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(saveDisplayName).not.toHaveBeenCalled();
  });

  it("greets a returning guest and lets them change their name", async () => {
    auth.state = signedIn();
    fetchDisplayName.mockResolvedValue({ ok: true, value: "Anna" });
    saveDisplayName.mockResolvedValue({ ok: true, value: "Anna M" });
    render(<FriendsAccount />);
    await waitFor(() => expect(screen.getByText("Hi, Anna")).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Change my name" }));
    await typeName("Anna M");
    fireEvent.click(screen.getByRole("button", { name: "Save my name" }));
    expect(await screen.findByText("Hi, Anna M")).toBeTruthy();
    expect(signInAsGuest).not.toHaveBeenCalled();
    expect(saveDisplayName).toHaveBeenCalledWith("u1", "Anna M");
  });
});

describe("rooms", () => {
  const named = async (joinCode?: string) => {
    auth.state = signedIn();
    fetchDisplayName.mockResolvedValue({ ok: true, value: "Anna" });
    render(<FriendsAccount joinCode={joinCode} />);
    await screen.findByText("Hi, Anna");
  };

  it("starts a room with the walker's name and plan, then opens it", async () => {
    createRoom.mockResolvedValue({ ok: true, value: { id: "room-1", code: "BCDF" } });
    await named();
    fireEvent.click(screen.getByRole("button", { name: "Start a room" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/friends/room/room-1"));
    expect(createRoom).toHaveBeenCalledWith(
      // A room counts down for at least 10 seconds, so a Watch has time to start.
      expect.objectContaining({ fast: 180, slow: 180, rounds: 5, getReady: 10 }),
      "Anna",
    );
  });

  it("only lets a complete code be joined, in any case", async () => {
    joinRoom.mockResolvedValue({ ok: true, value: "room-2" });
    await named();
    const join = screen.getByRole("button", { name: "Join the room" }) as HTMLButtonElement;
    expect(join.disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText("ABCD"), { target: { value: "bc-df" } });
    expect(join.disabled).toBe(false);
    fireEvent.click(join);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/friends/room/room-2"));
    expect(joinRoom).toHaveBeenCalledWith("BCDF", "Anna");
  });

  it("shows why joining failed", async () => {
    joinRoom.mockResolvedValue({ ok: false, message: "That room is full." });
    await named();
    fireEvent.change(screen.getByPlaceholderText("ABCD"), { target: { value: "BCDF" } });
    fireEvent.click(screen.getByRole("button", { name: "Join the room" }));
    expect((await screen.findByRole("alert")).textContent).toContain("full");
    expect(push).not.toHaveBeenCalled();
  });

  it("joins from a friend's link with one tap", async () => {
    joinRoom.mockResolvedValue({ ok: true, value: "room-3" });
    await named("bcdf");
    expect(screen.queryByRole("button", { name: "Start a room" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Join as Anna" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/friends/room/room-3"));
    expect(joinRoom).toHaveBeenCalledWith("BCDF", "Anna");
  });

  it("explains a link that doesn't make sense", async () => {
    await named("12");
    expect(screen.getByText(/doesn't look right/)).toBeTruthy();
    expect(joinRoom).not.toHaveBeenCalled();
  });
});

describe("Delete my data", () => {
  const named = async () => {
    auth.state = signedIn();
    fetchDisplayName.mockResolvedValue({ ok: true, value: "Anna" });
    render(<FriendsAccount />);
    await screen.findByText("Hi, Anna");
  };

  it("asks first, and says what will go", async () => {
    await named();
    fireEvent.click(screen.getByRole("button", { name: "Delete my data" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("removes your name and takes you out of every room");
    expect(dialog.textContent).toContain("removed for everyone in it");
    expect(deleteMyData).not.toHaveBeenCalled();
  });

  it("keeps everything when the answer is no", async () => {
    await named();
    fireEvent.click(screen.getByRole("button", { name: "Delete my data" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Keep my data" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(deleteMyData).not.toHaveBeenCalled();
    expect(screen.getByText("Hi, Anna")).toBeTruthy();
  });

  it("deletes, then starts again with a fresh name and a thank-you", async () => {
    await named();
    deleteMyData.mockResolvedValue({ ok: true, value: null });
    fireEvent.click(screen.getByRole("button", { name: "Delete my data" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete my data" }));
    expect(await screen.findByText(/All done. Your name and your rooms are deleted/)).toBeTruthy();
    expect(screen.queryByText("Hi, Anna")).toBeNull();
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
  });

  it("makes a brand new guest account for the next name", async () => {
    await named();
    deleteMyData.mockResolvedValue({ ok: true, value: null });
    signInAsGuest.mockResolvedValue({ ok: true, userId: "u-new" });
    saveDisplayName.mockResolvedValue({ ok: true, value: "Dana" });
    fireEvent.click(screen.getByRole("button", { name: "Delete my data" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete my data" }));
    await screen.findByText(/All done/);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Dana" } });
    fireEvent.click(screen.getByRole("button", { name: "Save my name" }));
    expect(await screen.findByText("Hi, Dana")).toBeTruthy();
    // Not the deleted account: the name goes to the new one.
    expect(saveDisplayName).toHaveBeenCalledWith("u-new", "Dana");
    expect(screen.queryByText(/All done/)).toBeNull();
  });

  it("says so and keeps the name if the delete fails", async () => {
    await named();
    deleteMyData.mockResolvedValue({ ok: false, message: "That didn't work just now." });
    fireEvent.click(screen.getByRole("button", { name: "Delete my data" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete my data" }));
    expect((await screen.findByRole("alert")).textContent).toContain("didn't work");
    expect(screen.getByText("Hi, Anna")).toBeTruthy();
  });
});
