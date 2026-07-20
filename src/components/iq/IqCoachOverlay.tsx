/**
 * IqCoachOverlay — surface footwork / comm / eyes cues on top of the field.
 *
 * Rendered inside IqDiamond as absolutely-positioned chips anchored to each
 * defender's *live* sample position (so cues follow the actor when playing).
 * Filter is a plain string tuple so the parent can persist to localStorage.
 */
import { Footprints, MessageCircle, Eye } from "lucide-react";
import type { IqActor, IqActorRole } from "@/lib/iq/types";

export type OverlayMode = "all" | "footwork" | "comm" | "eyes" | "off";

interface Props {
  actors: IqActor[];
  mode: OverlayMode;
  /** Live position lookup for each actor (0..100 grid). */
  positionOf: (role: IqActorRole) => { x: number; y: number } | undefined;
  /** For eyes sight-lines. */
  landmarkOf: (target: string) => { x: number; y: number } | undefined;
  highlightRole?: IqActorRole | null;
}

const SHOW = {
  footwork: (m: OverlayMode) => m === "all" || m === "footwork",
  comm: (m: OverlayMode) => m === "all" || m === "comm",
  eyes: (m: OverlayMode) => m === "all" || m === "eyes",
};

export function IqCoachOverlay({ actors, mode, positionOf, landmarkOf, highlightRole }: Props) {
  if (mode === "off") return null;

  const eyesLines = SHOW.eyes(mode)
    ? actors
        .map((a) => {
          const et = (a as unknown as { eyes_target?: string | null }).eyes_target;
          if (!et) return null;
          const from = positionOf(a.role);
          const to = landmarkOf(et);
          if (!from || !to) return null;
          return { role: a.role, from, to };
        })
        .filter((v): v is { role: IqActorRole; from: { x: number; y: number }; to: { x: number; y: number } } => v !== null)
    : [];

  return (
    <>
      {eyesLines.length > 0 && (
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full pointer-events-none" aria-hidden>
          {eyesLines.map((l) => {
            const dim = highlightRole && highlightRole !== l.role;
            return (
              <line
                key={`eyes-${l.role}`}
                x1={l.from.x} y1={l.from.y} x2={l.to.x} y2={l.to.y}
                stroke="hsl(var(--iq-read, 210 90% 60%))"
                strokeWidth={0.35}
                strokeDasharray="0.6 0.8"
                opacity={dim ? 0.2 : 0.7}
              />
            );
          })}
        </svg>
      )}

      {actors.map((a) => {
        const p = positionOf(a.role);
        if (!p) return null;
        const dim = highlightRole && highlightRole !== a.role;
        const foot = (a as unknown as { footwork_cue?: string | null }).footwork_cue;
        const call = a.communication_call?.trim();
        const chips: { icon: typeof Footprints; text: string; kind: "footwork" | "comm" }[] = [];
        if (SHOW.footwork(mode) && foot) chips.push({ icon: Footprints, text: foot, kind: "footwork" });
        if (SHOW.comm(mode) && call) chips.push({ icon: MessageCircle, text: `"${call}"`, kind: "comm" });
        if (chips.length === 0) return null;
        return (
          <div
            key={`chip-${a.role}`}
            className="absolute pointer-events-none flex flex-col gap-0.5 -translate-x-1/2"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              transform: `translate(-50%, calc(-100% - 16px))`,
              opacity: dim ? 0.35 : 1,
              maxWidth: "44%",
            }}
          >
            {chips.map((c, i) => (
              <div
                key={i}
                className="rounded-md border bg-background/95 backdrop-blur px-1.5 py-0.5 text-[9px] sm:text-[10px] leading-tight shadow-sm flex items-center gap-1"
              >
                <c.icon className="h-2.5 w-2.5 shrink-0 text-primary" />
                <span className="truncate">{c.text}</span>
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}

interface FilterBarProps {
  value: OverlayMode;
  onChange: (v: OverlayMode) => void;
}
export function IqOverlayFilterBar({ value, onChange }: FilterBarProps) {
  const OPTS: { v: OverlayMode; label: string; icon?: typeof Footprints }[] = [
    { v: "all", label: "All" },
    { v: "footwork", label: "Footwork", icon: Footprints },
    { v: "comm", label: "Comm", icon: MessageCircle },
    { v: "eyes", label: "Eyes", icon: Eye },
    { v: "off", label: "Off" },
  ];
  return (
    <div className="inline-flex items-center gap-1 rounded-full border p-0.5 text-[11px] flex-wrap">
      {OPTS.map((o) => {
        const active = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={
              "px-2 py-0.5 rounded-full inline-flex items-center gap-1 " +
              (active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")
            }
          >
            {o.icon && <o.icon className="h-3 w-3" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
