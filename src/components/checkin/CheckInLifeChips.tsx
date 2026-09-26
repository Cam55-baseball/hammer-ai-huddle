/** Morning and night use the same entry surface and timeline as Today. */
import { TellHammersInbox } from "@/components/hammer/TellHammersInbox";
export function CheckInLifeChips({ onDone }: { onDone?: () => void }) {
  return <div data-testid="checkin-life-chips"><TellHammersInbox checkIn onDone={onDone} /></div>;
}
export default CheckInLifeChips;
