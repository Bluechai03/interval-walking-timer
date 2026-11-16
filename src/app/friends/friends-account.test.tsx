import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthState } from "@/lib/use-auth";
import { FriendsAccount } from "./friends-account";

const auth = vi.hoisted(() => ({ state: { status: "signed-out" } as AuthState }));
const signInAsGuest = vi.hoisted(() => vi.fn());
const fetchDisplayName = vi.hoisted(() => vi.fn());
const saveDisplayName = vi.hoisted(() => vi.fn());

vi.mock("@/lib/use-auth", () => ({ useAuth: () => auth.state, signInAsGuest }));
vi.mock("@/lib/profile", () => ({ fetchDisplayName, saveDisplayName }));

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
