import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  replaceLocation: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: { signOut: mocks.signOut },
}));

vi.mock("@/lib/browser-navigation", () => ({
  replaceLocation: mocks.replaceLocation,
}));

import { LogoutButton } from "@/features/auth/logout";

describe("LogoutButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("replaces the document after sign-out succeeds", () => {
    render(<LogoutButton />);
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));

    const callbacks = mocks.signOut.mock.calls[0]?.[1];
    expect(callbacks).toBeDefined();

    act(() => callbacks.onRequest());
    expect(screen.getByRole("button", { name: "Loading..." })).toBeTruthy();

    act(() => callbacks.onSuccess());
    expect(mocks.replaceLocation).toHaveBeenCalledWith("/");
  });

  it("restores the button when sign-out fails", () => {
    render(<LogoutButton />);
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));

    const callbacks = mocks.signOut.mock.calls[0]?.[1];
    act(() => callbacks.onRequest());
    act(() => callbacks.onError());

    expect(screen.getByRole("button", { name: "Logout" })).toBeTruthy();
    expect(mocks.replaceLocation).not.toHaveBeenCalled();
  });
});
