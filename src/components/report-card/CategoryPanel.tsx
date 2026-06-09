/**
 * CategoryPanel — §17 Universal Category Explanation Law (§6) renderer.
 *
 * One per ratified report-card category. Pure presentation over a typed
 * schema entry. Unmapped Drill / Video / Roadmap slots render as visible
 * missingness per §3 Law 7 / CDR-8=D — never silent.
 *
 * RR-5: observational only — no destiny framing.
 * RR-6: athlete-reported pain outranks anything inferred (Coach Hammer
 * surface honors this; this component never diagnoses).
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import type { BhCategorySchema } from "@/lib/reportCard/v1/hittingV1Schema";

interface Props {
  readonly category: BhCategorySchema;
  readonly onAskHammer?: (category: BhCategorySchema) => void;
}

function MissingnessChip({ reason }: { reason: string }) {
  return (
    <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
      {reason}
    </Badge>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm text-foreground">{children}</div>
    </div>
  );
}

export function CategoryPanel({ category, onAskHammer }: Props) {
  const isNonNeg = category.hierarchyRank === "non_negotiable";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span>
            <span className="text-[10px] text-muted-foreground mr-2">{category.phaseId}</span>
            {category.name}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {isNonNeg ? (
              <Badge variant="secondary" className="text-[10px] uppercase">
                Non-Negotiable
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] uppercase">
                Rank 1
              </Badge>
            )}
            <MissingnessChip reason={category.missingnessRule} />
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 text-sm">
        <Section label="What is it">{category.whatIsIt}</Section>
        <Section label="Why it matters">{category.whyItMatters}</Section>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Section label="If poor → performance">{category.ifPoorPerformance}</Section>
          <Section label="If poor → durability">{category.ifPoorDurability}</Section>
          <Section label="If poor → efficiency">{category.ifPoorEfficiency}</Section>
          <Section label="If poor → consistency">{category.ifPoorConsistency}</Section>
        </div>

        <Section label="How to improve">{category.howToImprove}</Section>

        <Section label="Drills">
          {category.drillIds.length === 0 ? (
            <MissingnessChip reason="Drill prescription pending — operational tagging backlog (§3 Law 7)" />
          ) : (
            <ul className="list-disc pl-5 text-xs">
              {category.drillIds.map((id) => (
                <li key={id}>
                  <code className="text-[10px]">{id}</code>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section label="Videos">
          <div className="flex flex-wrap gap-2">
            {category.videoIds.length === 0 ? (
              <MissingnessChip reason="Video pairing pending — §8 taxonomy" />
            ) : (
              category.videoIds.map((id) => (
                <Badge key={id} variant="outline" className="text-[10px]">
                  {id}
                </Badge>
              ))
            )}
            {!category.goodLooksLikeClip && (
              <MissingnessChip reason='"Good looks like" clip pending — §8' />
            )}
            {!category.badLooksLikeClip && (
              <MissingnessChip reason='"Bad looks like" clip pending — §8' />
            )}
          </div>
        </Section>

        <Section label="Roadmap step">
          {category.roadmapStep ?? (
            <MissingnessChip reason="Roadmap step pending — §9" />
          )}
        </Section>

        <Section label="Coach Hammer">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAskHammer?.(category)}
              disabled={!onAskHammer}
            >
              <MessageCircle className="mr-1 h-3 w-3" />
              Ask Coach Hammer about {category.name}
            </Button>
            <span className="text-[10px] text-muted-foreground">
              voices: athlete · parent · coach (§10 + §16 I; RR-5 / RR-6 bound)
            </span>
          </div>
        </Section>

        <div className="border-t pt-2 text-[10px] text-muted-foreground space-y-1">
          <div>
            <span className="font-semibold">Confidence rule:</span> {category.confidenceRule}
          </div>
          <div>
            <span className="font-semibold">Missingness rule:</span> {category.missingnessRule}
          </div>
          <div>
            <span className="font-semibold">Engine binding:</span>{" "}
            <code className="text-[10px]">{category.engineBinding}</code>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
