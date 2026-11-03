import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PhysioHealthIntakeDialog } from "../physio/PhysioHealthIntakeDialog";

const mocks = vi.hoisted(() => ({ save: vi.fn(), close: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: {id:'test-health'} }) }));
vi.mock("@/hooks/usePhysioProfile", () => ({ usePhysioProfile: () => ({ profile: null, computedAge:16, isLoading:false, saveProfile: mocks.save }) }));
vi.mock('@/hooks/useAthleteGoals',()=>({useAthleteGoals:()=>({activeGoal:null,loading:false,createGoal:vi.fn(),updateGoal:vi.fn()})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{from:()=>{const q:any={select:()=>q,eq:()=>q,limit:()=>q,maybeSingle:async()=>({data:null,error:null})};return q;}}}));

describe("health profile save", () => {
  it("keeps the dialog and answers open when saving fails", async () => {
    mocks.save.mockResolvedValue({ success: false, error: "save refused" });
    render(<QueryClientProvider client={new QueryClient()}><PhysioHealthIntakeDialog open onOpenChange={mocks.close} /></QueryClientProvider>);
    fireEvent.click(await screen.findByRole('button',{name:'Next'}));
    fireEvent.change(screen.getByLabelText('Food allergies'), { target: { value: "test allergy" } });
    for(let i=0;i<3;i++)fireEvent.click(screen.getByRole('button',{name:'Next'}));
    fireEvent.click(screen.getByRole('button',{name:'No'}));
    for(let i=0;i<2;i++)fireEvent.click(screen.getByRole('button',{name:'Next'}));
    fireEvent.click(screen.getByRole("button", { name: "Save health setup" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ allergies: ["test allergy"], setup_completed: true })));
    await waitFor(() => expect(mocks.close).not.toHaveBeenCalled());
    expect(screen.getByRole("dialog")).toBeTruthy();
    for(let i=0;i<5;i++)fireEvent.click(screen.getByRole('button',{name:'Back'}));
    expect((screen.getByLabelText('Food allergies') as HTMLInputElement).value).toBe("test allergy");
  });
});