export const BUSINESS_ADDRESS_LINES = [
  "15985 Preserve Marketplace #1154",
  "Odessa, FL 33556",
] as const;

export const BUSINESS_ADDRESS_ONE_LINE =
  "15985 Preserve Marketplace #1154, Odessa, FL 33556";

export function BusinessAddressBlock({ className }: { className?: string }) {
  return (
    <address className={`not-italic ${className ?? ""}`}>
      {BUSINESS_ADDRESS_LINES.map((line) => (
        <span key={line} className="block">{line}</span>
      ))}
    </address>
  );
}
