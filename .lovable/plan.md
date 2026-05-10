## Add back button to System Operations (Foundation Health) page

**File:** `src/pages/owner/FoundationHealthDashboard.tsx`

**Change:** Add a "Back to Owner Dashboard" button at the top of the page header that navigates to `/owner`.

### Implementation
- Import `ArrowLeft` from `lucide-react` and `useNavigate` from `react-router-dom` (if not already present).
- Render a `Button` (variant="ghost", size="sm") above (or inline with) the page title containing `<ArrowLeft />` + "Back to Dashboard".
- `onClick` calls `navigate('/owner')`.
- Style with existing semantic tokens — no custom colors.

### Out of scope
- No changes to tab content, alert bell, routing, or any business logic.
- No back buttons added to other owner subpages (can be a follow-up if wanted).