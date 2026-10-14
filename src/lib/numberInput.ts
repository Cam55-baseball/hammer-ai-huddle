/** Digits only (one optional decimal point), no leading zeros: "01" → "1", "007.5" → "7.5", "0" stays "0". */
export function cleanNumberText(raw: string, allowDecimal = false): string {
  let t = raw.replace(allowDecimal ? /[^0-9.]/g : /[^0-9]/g, "");
  if (allowDecimal) { const i = t.indexOf("."); if (i >= 0) t = t.slice(0, i + 1) + t.slice(i + 1).replace(/\./g, ""); }
  return t.replace(/^0+(?=\d)/, "");
}

/** For native number boxes: strips leading zeros ("01" → "1", "-05" → "-5") and leaves everything else alone. */
export function stripLeadingZeros(raw: string): string {
  return raw.replace(/^(-?)0+(?=\d)/, "$1");
}
