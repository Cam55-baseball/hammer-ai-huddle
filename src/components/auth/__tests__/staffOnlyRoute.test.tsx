/**
 * Behavioural proof that StaffOnlyRoute blocks a non-staff account.
 * Renders the real component with the role hooks reporting a regular
 * player, and asserts the guarded page never renders and the user is
 * redirected to /dashboard.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const ownerState = { isOwner: false, loading: false };
const adminState = { isAdmin: false, loading: false };

vi.mock("@/hooks/useOwnerAccess", () => ({ useOwnerAccess: () => ownerState }));
vi.mock("@/hooks/useAdminAccess", () => ({ useAdminAccess: () => adminState }));

import { StaffOnlyRoute } from "../StaffOnlyRoute";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path={path}
          element={
            <StaffOnlyRoute>
              <div>STAFF CONTENT</div>
            </StaffOnlyRoute>
          }
        />
        <Route path="/dashboard" element={<div>DASHBOARD</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("StaffOnlyRoute", () => {
  beforeEach(() => {
    ownerState.isOwner = false;
    ownerState.loading = false;
    adminState.isAdmin = false;
    adminState.loading = false;
  });

  it.each(["/recruiting/standards", "/combine/entry"])(
    "redirects a regular player away from %s",
    (path) => {
      renderAt(path);
      expect(screen.queryByText("STAFF CONTENT")).toBeNull();
      expect(screen.getByText("DASHBOARD")).toBeTruthy();
    },
  );

  it("renders for an owner", () => {
    ownerState.isOwner = true;
    renderAt("/recruiting/standards");
    expect(screen.getByText("STAFF CONTENT")).toBeTruthy();
  });

  it("renders for an admin", () => {
    adminState.isAdmin = true;
    renderAt("/combine/entry");
    expect(screen.getByText("STAFF CONTENT")).toBeTruthy();
  });

  it("shows neither content nor redirect while roles are still loading", () => {
    ownerState.loading = true;
    renderAt("/recruiting/standards");
    expect(screen.queryByText("STAFF CONTENT")).toBeNull();
    expect(screen.queryByText("DASHBOARD")).toBeNull();
  });
});
