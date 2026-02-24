import { useDataDensityLevel } from '@/hooks/useDataDensityLevel';
import { useMicroLayerInput, MicroLayerData } from '@/hooks/useMicroLayerInput';
import { DataDensityGate } from './DataDensityGate';
import { PitchLocationGrid } from './PitchLocationGrid';
import { SwingDecisionTag } from './SwingDecisionTag';
import { ContactQualitySelector } from './ContactQualitySelector';
import { ExitDirectionSelector } from './ExitDirectionSelector';
import { SituationTagSelector } from './SituationTagSelector';
import { CountSelector } from './CountSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

interface MicroLayerInputProps {
  sessionType: 'hitting' | 'pitching' | 'fielding';
  microLayer: ReturnType<typeof useMicroLayerInput>;
}

export function MicroLayerInput({ sessionType, microLayer }: MicroLayerInputProps) {
  const { isEnhanced, isAdvanced } = useDataDensityLevel();
  const { currentRep, updateField, commitRep, repData, removeRep } = microLayer;

  return (
    <DataDensityGate requiredLevel={2}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Micro Layer — Rep Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logged reps */}
          {repData.map((rep, i) => (
            <div key={i} className="flex items-center justify-between rounded border p-2 text-xs">
              <span>Rep #{i + 1}: {formatRep(rep)}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeRep(i)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}

          {/* Current rep form */}
          <div className="space-y-3 rounded-lg border border-dashed p-3">
            {sessionType === 'hitting' && (
              <>
                {isEnhanced && (
                  <div className="grid grid-cols-2 gap-3">
                    <PitchLocationGrid
                      value={currentRep.pitch_location}
                      onSelect={v => updateField('pitch_location', v)}
                    />
                    <CountSelector
                      value={currentRep.count ?? { balls: 0, strikes: 0 }}
                      onChange={v => updateField('count', v)}
                    />
                  </div>
                )}
                {isAdvanced && (
                  <>
                    <SwingDecisionTag
                      value={currentRep.swing_decision}
                      onValueChange={v => updateField('swing_decision', v)}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <ContactQualitySelector
                        value={currentRep.contact_quality}
                        onValueChange={v => updateField('contact_quality', v as any)}
                      />
                      <ExitDirectionSelector
                        value={currentRep.exit_direction}
                        onValueChange={v => updateField('exit_direction', v as any)}
                      />
                    </div>
                    <SituationTagSelector
                      runners={currentRep.situation_tag?.runners}
                      outs={currentRep.situation_tag?.outs}
                      onRunnersChange={r => updateField('situation_tag', { runners: r, outs: currentRep.situation_tag?.outs ?? 0 })}
                      onOutsChange={o => updateField('situation_tag', { runners: currentRep.situation_tag?.runners ?? 'none', outs: o })}
                    />
                  </>
                )}
              </>
            )}

            {sessionType === 'pitching' && isEnhanced && (
              <div className="grid grid-cols-2 gap-3">
                <PitchLocationGrid
                  value={currentRep.pitch_location}
                  onSelect={v => updateField('pitch_location', v)}
                />
                <CountSelector
                  value={currentRep.count ?? { balls: 0, strikes: 0 }}
                  onChange={v => updateField('count', v)}
                />
              </div>
            )}

            <Button onClick={commitRep} size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Add Rep
            </Button>
          </div>
        </CardContent>
      </Card>
    </DataDensityGate>
  );
}

function formatRep(rep: MicroLayerData): string {
  const parts: string[] = [];
  if (rep.contact_quality) parts.push(rep.contact_quality);
  if (rep.swing_decision) parts.push(rep.swing_decision);
  if (rep.exit_direction) parts.push(rep.exit_direction);
  if (rep.pitch_location) parts.push(`zone ${rep.pitch_location.row},${rep.pitch_location.col}`);
  return parts.length > 0 ? parts.join(' • ') : 'logged';
}
