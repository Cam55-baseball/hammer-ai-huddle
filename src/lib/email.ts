import { z } from "zod";

/** Clean what people paste or phones auto-correct: spaces, invisible characters, smart punctuation, capitals. */
export function normalizeEmail(raw: string): string {
  return (raw ?? "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\u2060\uFEFF\u00A0\s]/g, "")
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\uFF0B\u2795]/g, "+")
    .replace(/[\uFF20]/g, "@")
    .replace(/[\u3002\uFF0E\u2024]/g, ".")
    .toLowerCase();
}

/** Accepts every normal address, including "+" tags and dots. */
export const emailSchema = (message = "Enter a valid email address.") =>
  z.preprocess((v) => (typeof v === "string" ? normalizeEmail(v) : v), z.string().email({ message }).max(255));

export const isValidEmail = (raw: string) => emailSchema().safeParse(raw).success;

/** Props every email box uses so iPhone keyboards don't capitalize or "correct" addresses. */
export const emailInputProps = {
  type: "email",
  inputMode: "email",
  autoCapitalize: "none",
  autoCorrect: "off",
  spellCheck: false,
} as const;
