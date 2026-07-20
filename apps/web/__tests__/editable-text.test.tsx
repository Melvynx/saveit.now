import { EditableText } from "@/features/app/bookmark-page/editable-text";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

const defaultProps = {
  value: "Original title",
  displayValue: "Original title",
  variant: "large" as const,
  className: "",
  commitOnEnter: true,
  allowEmpty: false,
  ariaLabel: "Bookmark title",
  onSave: async () => undefined,
};

describe("EditableText", () => {
  it("exposes an accessible edit control for pointer and keyboard users", () => {
    render(<EditableText {...defaultProps} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Edit Bookmark title" }),
    );

    expect(document.activeElement).toBe(
      screen.getByRole("textbox", { name: "Bookmark title" }),
    );
  });

  it("keeps the editor open until an asynchronous save succeeds", async () => {
    let resolveSave: (() => void) | undefined;
    const onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve;
        }),
    );
    render(<EditableText {...defaultProps} onSave={onSave} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Edit Bookmark title" }),
    );
    const textbox = screen.getByRole("textbox", { name: "Bookmark title" });
    fireEvent.change(textbox, { target: { value: "Updated title" } });
    fireEvent.blur(textbox);

    expect(textbox.getAttribute("aria-busy")).toBe("true");
    expect(onSave).toHaveBeenCalledWith("Updated title");

    await act(async () => resolveSave?.());

    await waitFor(() => {
      expect(
        screen.queryByRole("textbox", { name: "Bookmark title" }),
      ).toBeNull();
    });
  });

  it("retains the draft and shows an inline error when saving fails", async () => {
    const onSave = vi.fn(async () => {
      throw new Error("network failure");
    });
    render(<EditableText {...defaultProps} onSave={onSave} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Edit Bookmark title" }),
    );
    const textbox = screen.getByRole("textbox", { name: "Bookmark title" });
    fireEvent.change(textbox, { target: { value: "Unsaved title" } });
    fireEvent.blur(textbox);

    expect(
      (
        await screen.findByText("Failed to save changes. Please try again.")
      ).getAttribute("role"),
    ).toBe("alert");
    expect((textbox as HTMLTextAreaElement).value).toBe("Unsaved title");
    expect(textbox.getAttribute("aria-invalid")).toBe("true");
  });

  it("applies the provided client-side length limit", () => {
    render(<EditableText {...defaultProps} maxLength={500} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Edit Bookmark title" }),
    );

    expect(
      screen
        .getByRole("textbox", { name: "Bookmark title" })
        .getAttribute("maxlength"),
    ).toBe("500");
  });

  it("does not expose editing while the bookmark is processing", () => {
    render(<EditableText {...defaultProps} disabled />);

    expect(
      screen.queryByRole("button", { name: "Edit Bookmark title" }),
    ).toBeNull();
    expect(screen.getByText("Original title")).toBeTruthy();
  });
});
