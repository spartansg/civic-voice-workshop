// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { getFeedback, login } from "./api";

vi.mock("./api", () => ({ login: vi.fn(), getFeedback: vi.fn(), submitFeedback: vi.fn() }));

const STORAGE_KEY = "civicvoice.session";
const sessions = {
  citizen: { token: "demo-citizen-session", user: { nric: "S0000001A", name: "Workshop Citizen", role: "citizen" } },
  admin: { token: "demo-admin-session", user: { nric: "S0000002B", name: "Workshop Admin", role: "admin" } },
};

beforeEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
  getFeedback.mockResolvedValue({ feedback: [] });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

async function signIn(role = "citizen") {
  const user = userEvent.setup();
  if (role === "admin") await user.click(screen.getByRole("button", { name: "Admin" }));
  await user.type(screen.getByLabelText("NRIC"), sessions[role].user.nric);
  await user.type(screen.getByLabelText("Password"), "fictional-password");
  await user.click(screen.getByRole("button", { name: "Sign in", exact: true }));
  return user;
}

describe("CV-001 session persistence", () => {
  it.each(["citizen", "admin"])("restores the %s page after reload and stays signed out after logout and reload", async (role) => {
    login.mockResolvedValue(sessions[role]);
    localStorage.setItem("unrelated-preference", "keep-me");
    const firstPage = render(<App />);
    const user = await signIn(role);
    const heading = role === "admin" ? "Feedback inbox" : "What would you like us to know?";
    await screen.findByRole("heading", { name: heading });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual(sessions[role]);
    expect(localStorage.getItem(STORAGE_KEY)).not.toContain("fictional-password");

    firstPage.unmount();
    const refreshedPage = render(<App />);
    await screen.findByRole("heading", { name: heading });
    expect(login).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Sign in", exact: true })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem("unrelated-preference")).toBe("keep-me");

    refreshedPage.unmount();
    render(<App />);
    expect(screen.getByRole("heading", { name: "Welcome to CivicVoice" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
  });

  it.each([
    "not-json", "null", "{}",
    JSON.stringify({ token: "demo", user: { nric: "S0000001A", name: "Demo", role: "unknown" } }),
    JSON.stringify({ token: "demo", user: { role: "citizen" } }),
    JSON.stringify({ user: sessions.citizen.user }),
  ])("ignores invalid stored session %s", (saved) => {
    localStorage.setItem(STORAGE_KEY, saved);
    render(<App />);
    expect(screen.getByRole("heading", { name: "Welcome to CivicVoice" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
  });

  it("does not persist failed sign-ins", async () => {
    login.mockRejectedValue(new Error("Invalid workshop credentials."));
    render(<App />);
    await signIn();
    await screen.findByText("Invalid workshop credentials.");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(screen.getByRole("heading", { name: "Welcome to CivicVoice" })).toBeTruthy();
  });

  it("keeps login and logout usable when browser storage is unavailable", async () => {
    for (const method of ["getItem", "setItem", "removeItem"]) {
      vi.spyOn(Storage.prototype, method).mockImplementation(() => { throw new Error("Storage unavailable"); });
    }
    login.mockResolvedValue(sessions.citizen);
    render(<App />);
    const user = await signIn();
    await screen.findByRole("heading", { name: "What would you like us to know?" });
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(screen.getByRole("heading", { name: "Welcome to CivicVoice" })).toBeTruthy();
  });
});
