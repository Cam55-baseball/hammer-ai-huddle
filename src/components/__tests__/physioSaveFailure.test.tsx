import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PhysioHealthIntakeDialog } from "../physio/PhysioHealthIntakeDialog";

const mocks = vi.hoisted(() => ({ save: vi.fn(), close: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/hooks/usePhysioProfile", () => ({ usePhysioProfile: () => ({ profile: null, saveProfile: mocks.save, enableAdultFeatures: vi.fn() }) }));
vi.mock("@/components/ui/BirthDatePicker", () => ({ BirthDatePicker: () => null }));

describe("health profile save", () => {
  it("keeps the dialog and answers open when saving fails", async () => {
    mocks.save.mockResolvedValue({ success: false, error: "save refused" });
    render(<PhysioHealthIntakeDialog open onOpenChange={mocks.close} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. peanuts, shellfish, tree nuts"), { target: { value: "test allergy" } });
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    fireEvent.click(screen.getByRole("button", { name: "Complete Setup" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ allergies: ["test allergy"], setup_completed: true })));
    await waitFor(() => expect(mocks.close).not.toHaveBeenCalled());
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect((screen.getByPlaceholderText("e.g. peanuts, shellfish, tree nuts") as HTMLInputElement).value).toBe("test allergy");
  });
});