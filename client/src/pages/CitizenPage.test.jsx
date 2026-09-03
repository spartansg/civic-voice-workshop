// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CitizenPage } from "./CitizenPage";
import { submitFeedback } from "../api";

vi.mock("../api", () => ({ submitFeedback: vi.fn() }));

const citizen = { nric: "S0000001A", name: "Workshop Citizen" };

beforeEach(() => {
  vi.resetAllMocks();
  submitFeedback.mockResolvedValue({});
});
afterEach(cleanup);

describe("CV-003 feedback character limit", () => {
  it("updates the count when typing and deleting", async () => {
    const user = userEvent.setup();
    render(<CitizenPage user={citizen} />);
    const input = screen.getByRole("textbox", { name: "Your feedback" });

    expect(screen.getByText("0 / 500 characters")).toBeTruthy();
    expect(input.getAttribute("aria-describedby")).toBe("feedback-character-count");
    await user.type(input, "Hello");
    expect(screen.getByText("5 / 500 characters")).toBeTruthy();
    await user.keyboard("{Backspace}");
    expect(screen.getByText("4 / 500 characters")).toBeTruthy();
    await user.clear(input);
    expect(screen.getByText("0 / 500 characters")).toBeTruthy();
  });

  it("prevents typing beyond 500 and allows editing after deleting", async () => {
    const user = userEvent.setup();
    render(<CitizenPage user={citizen} />);
    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.paste("a".repeat(499));
    await user.type(input, "bc");

    expect(input.maxLength).toBe(500);
    expect(input.value).toBe("a".repeat(499) + "b");
    expect(screen.getByText("500 / 500 characters")).toBeTruthy();
    await user.keyboard("{Backspace}c");
    expect(input.value).toBe("a".repeat(499) + "c");
  });

  it("limits a long paste and submits exactly 500 characters, then resets the count", async () => {
    const user = userEvent.setup();
    render(<CitizenPage user={citizen} />);
    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.paste("a".repeat(501));

    expect(input.value).toBe("a".repeat(500));
    await user.click(screen.getByRole("button", { name: "Submit feedback" }));
    await waitFor(() => expect(submitFeedback).toHaveBeenCalledWith({
      ...citizen, message: "a".repeat(500),
    }));
    expect(screen.getByText("0 / 500 characters")).toBeTruthy();
    expect(input.value).toBe("");
  });

  it("caps input even if an input event bypasses the browser maxlength", async () => {
    render(<CitizenPage user={citizen} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "a".repeat(501) } });

    expect(input.value.length).toBe(500);
    expect(screen.getByText("500 / 500 characters")).toBeTruthy();
    fireEvent.submit(input.closest("form"));
    await waitFor(() => expect(submitFeedback).toHaveBeenCalledWith({
      ...citizen, message: "a".repeat(500),
    }));
  });

  it("retains feedback and its count when submission fails", async () => {
    submitFeedback.mockRejectedValue(new Error("Please try again."));
    const user = userEvent.setup();
    render(<CitizenPage user={citizen} />);
    const input = screen.getByRole("textbox");
    await user.type(input, "Hello");
    await user.click(screen.getByRole("button", { name: "Submit feedback" }));

    await screen.findByText("Please try again.");
    expect(input.value).toBe("Hello");
    expect(screen.getByText("5 / 500 characters")).toBeTruthy();
  });
});
