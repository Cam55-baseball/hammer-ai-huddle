/**
 * Runbook & Troubleshooting tab — renders the markdown ops docs in-app.
 */
import runbookMd from '@/../docs/foundations/runbook.md?raw';
import cronInventoryMd from '@/../docs/foundations/cron-inventory.md?raw';
import { MarkdownPanel } from './MarkdownPanel';

export function RunbookTab() {
  return (
    <div className="space-y-4">
      <MarkdownPanel title="Cron inventory" body={cronInventoryMd} />
      <MarkdownPanel title="Runbook & troubleshooting" body={runbookMd} />
    </div>
  );
}
