import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthState } from "@/lib/use-auth";
import { FriendsAccount } from "./friends-account";

const auth = vi.hoisted(() => ({ state: { status: "signed-out" } as AuthState }));
const signInWithGoogle = vi.hoisted(() => vi.fn());
const fetchDisplayName = vi.hoisted(() => vi.fn());
const saveDisplayName = vi.hoisted(() => vi.fn());

vi.mock("@/lib/use-auth", () => ({
  useAuth: () => auth.state,
  signInWithGoogle,
  signOut: vi.fn(),
}));
vi.mock("@/lib/profile", () => ({ fetchDisplayName, saveDisplayName }));

const signedIn = (name?: string): AuthState =>
  ({
    status: "signed-in",
    user: { id: "u1", user_metadata: name ? { full_name: name } : {} },
  }) as unknown as AuthState;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("FriendsAccount", () => {
  it("says so when Supabase isn't set up", () => {
    auth.state = { status: "unavailable" };
    render(<FriendsAccount />);
    expect(screen.getByText(/isn't switched on here yet/)).toBeTruthy();
  });

  it("offers Google sign-in when signed out", async () => {
    auth.state = { status: "signed-out" };
    render(<FriendsAccount />);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(signInWithGoogle).toHaveBeenCalledOnce();
  });

  it("asks for a name, suggesting the Google one, when there is no profile yet", async () => {
    auth.state = signedIn("Anna Montero");
    fetchDisplayName.mockResolvedValue({ ok: true, value: null });
    saveDisplayName.mockResolvedValue({ ok: true, value: "Anna Montero" });
    render(<FriendsAccount />);
    const input = await screen.findByRole("textbox");
    expect((input as HTMLInputElement).value).toBe("Anna Montero");
    fireEvent.click(screen.getByRole("button", { name: "Save my name" }));
    expect(saveDisplayName).toHaveBeenCalledWith("u1", "Anna Montero");
    expect(await screen.findByText("Hi, Anna Montero")).toBeTruthy();
  });

  it("explains a bad name without saving it", async () => {
    auth.state = signedIn();
    fetchDisplayName.mockResolvedValue({ ok: true, value: null });
    render(<FriendsAccount />);
    fireEvent.change(await screen.findByRole("textbox"), { target: { value: "A" } });
    fireEvent.click(screen.getByRole("button", { name: "Save my name" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(saveDisplayName).not.toHaveBeenCalled();
  });

  it("greets someone who already has a name", async () => {
    auth.state = signedIn();
    fetchDisplayName.mockResolvedValue({ ok: true, value: "Anna" });
    render(<FriendsAccount />);
    await waitFor(() => expect(screen.getByText("Hi, Anna")).toBeTruthy());
  });
});
