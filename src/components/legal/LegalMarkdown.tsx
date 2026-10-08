/**
 * Tiny, safe renderer for legal_documents bodies (no HTML passthrough).
 * Supports: # / ## / ### headings, paragraphs, "- " lists, **bold**, [text](url),
 * and a statutory block between ":::notice" and ":::" — rendered uppercase,
 * at least 5 points larger than body text, boxed and set apart (Fla. Stat. §744.301(3)(b)).
 */
import { Fragment, type ReactNode } from "react";

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0; let m: RegExpExecArray | null; let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={`${key}b${i++}`}>{t.slice(2, -2)}</strong>);
    else {
      const [, label, href] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(t)!;
      const safe = /^(https?:|mailto:|\/)/.test(href) ? href : "#";
      out.push(<a key={`${key}a${i++}`} href={safe}>{label}</a>);
    }
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function LegalMarkdown({ body }: { body: string }) {
  const lines = body.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let para: string[] = []; let list: string[] = []; let k = 0;
  const flush = () => {
    if (para.length) { blocks.push(<p key={k++}>{inline(para.join(" "), `p${k}`)}</p>); para = []; }
    if (list.length) { blocks.push(<ul key={k++} className="space-y-1">{list.map((l, j) => <li key={j}>{inline(l, `l${k}${j}`)}</li>)}</ul>); list = []; }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === ":::notice") {
      flush();
      const inner: string[] = [];
      while (++i < lines.length && lines[i].trim() !== ":::") inner.push(lines[i]);
      blocks.push(
        <div key={k++} data-statutory-notice role="note"
          className="my-4 rounded-md border-4 border-foreground bg-muted p-4 font-bold uppercase leading-snug text-foreground"
          style={{ fontSize: "calc(1em + 7px)" }}>
          {inner.filter((t) => t.trim()).map((t, j) => <p key={j} className="mb-2 last:mb-0">{t.toUpperCase()}</p>)}
        </div>,
      );
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      flush();
      const lvl = h[1].length;
      blocks.push(lvl === 1
        ? <h2 key={k++} className="pt-4 text-xl font-semibold text-foreground">{h[2]}</h2>
        : <h3 key={k++} className="pt-3 text-base font-semibold text-foreground">{h[2]}</h3>);
      continue;
    }
    if (/^\s*-\s+/.test(line)) { if (para.length) { const p = para; para = []; blocks.push(<p key={k++}>{inline(p.join(" "), `p${k}`)}</p>); } list.push(line.replace(/^\s*-\s+/, "")); continue; }
    if (!line.trim()) { flush(); continue; }
    if (list.length) flush();
    para.push(line.trim());
  }
  flush();
  return <div className="space-y-3 text-base leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_strong]:text-foreground [&_li]:ml-5 [&_li]:list-disc"><Fragment>{blocks}</Fragment></div>;
}
