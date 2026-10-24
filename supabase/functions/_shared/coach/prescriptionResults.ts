type Row = Record<string, any>;
/** Authorized occurrences only; never join by slug or scheduled send date.
 * Use today can move work away from its original scheduled date. */
export function prescriptionResults(sends: readonly Row[], prescriptions: readonly Row[], logs: readonly Row[]) {
  const recipients = new Map(sends.map(send => [send.id, send.recipient_id]));
  const rows = new Map(prescriptions.filter(row => recipients.get(row.why_payload?.coach_rx) === row.user_id).map(row => [row.id, row]));
  const results: Record<string, Row[]> = {};
  for (const log of logs) {
    const row = rows.get(log.prescription_id);
    if (!row || row.user_id !== log.user_id || row.plan_date !== log.plan_date || row.movement_slug !== log.movement_slug) continue;
    (results[row.why_payload.coach_rx] ??= []).push({ ...log, prescription: { movement_name: row.movement_name, dosage_unit: row.dosage_unit, slot: row.slot } });
  }
  return results;
}