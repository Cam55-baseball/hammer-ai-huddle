/**
 * Lightweight markdown renderer for ops docs. Avoids a new dep — handles
 * headings, lists, code blocks, inline code, bold, and tables minimally.
 */
import { Card } from '@/components/ui/card';

interface Props { title: string; body: string }

function renderInline(s: string) {
  // bold + inline code + links
  const parts: React.ReactNode[] = [];
  let rest = s;
  let key = 0;
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[([^\]]+)\]\(([^)]+)\))/;
  while (rest.length > 0) {
    const m = rest.match(regex);
    if (!m) { parts.push(rest); break; }
    if (m.index! > 0) parts.push(rest.slice(0, m.index!));
    const tok = m[0];
    if (tok.startsWith('**')) parts.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('`')) parts.push(<code key={key++} className="px-1 py-0.5 bg-muted rounded text-xs font-mono">{tok.slice(1, -1)}</code>);
    else parts.push(<a key={key++} href={m[3]} target="_blank" rel="noreferrer" className="text-primary underline">{m[2]}</a>);
    rest = rest.slice(m.index! + tok.length);
  }
  return parts;
}

export function MarkdownPanel({ title, body }: Props) {
  const lines = body.split('\n');
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('```')) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) { buf.push(lines[i]); i++; }
      out.push(<pre key={key++} className="bg-muted p-2 rounded text-xs font-mono overflow-x-auto my-2">{buf.join('\n')}</pre>);
      i++;
      continue;
    }
    if (line.startsWith('# ')) { out.push(<h2 key={key++} className="text-lg font-bold mt-3">{renderInline(line.slice(2))}</h2>); i++; continue; }
    if (line.startsWith('## ')) { out.push(<h3 key={key++} className="text-base font-semibold mt-3">{renderInline(line.slice(3))}</h3>); i++; continue; }
    if (line.startsWith('### ')) { out.push(<h4 key={key++} className="text-sm font-semibold mt-2">{renderInline(line.slice(4))}</h4>); i++; continue; }
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s/, '')); i++; }
      out.push(<ol key={key++} className="list-decimal list-inside space-y-1 text-sm my-2">{items.map((t, j) => <li key={j}>{renderInline(t)}</li>)}</ol>);
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: string[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) { items.push(lines[i].slice(2)); i++; }
      out.push(<ul key={key++} className="list-disc list-inside space-y-1 text-sm my-2">{items.map((t, j) => <li key={j}>{renderInline(t)}</li>)}</ul>);
      continue;
    }
    if (line.startsWith('|')) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) { rows.push(lines[i]); i++; }
      const parsed = rows.map((r) => r.split('|').slice(1, -1).map((c) => c.trim()));
      const header = parsed[0];
      const body = parsed.slice(2);
      out.push(
        <div key={key++} className="overflow-x-auto my-2">
          <table className="text-xs border w-full">
            <thead className="bg-muted/40">
              <tr>{header.map((h, j) => <th key={j} className="text-left px-2 py-1 border">{renderInline(h)}</th>)}</tr>
            </thead>
            <tbody>
              {body.map((r, j) => (
                <tr key={j}>{r.map((c, k) => <td key={k} className="px-2 py-1 border align-top">{renderInline(c)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (line.trim() === '') { out.push(<div key={key++} className="h-2" />); i++; continue; }
    out.push(<p key={key++} className="text-sm my-1">{renderInline(line)}</p>);
    i++;
  }

  return (
    <Card className="p-4">
      <h2 className="font-semibold mb-2">{title}</h2>
      <div className="prose prose-sm max-w-none">{out}</div>
    </Card>
  );
}
