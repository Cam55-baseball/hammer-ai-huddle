import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { wipe } from "@remotion/transitions/wipe";
import { HookProblemScene } from "./scenes/HookProblemScene";
import { DashboardHeroScene } from "./scenes/DashboardHeroScene";
import { MPIEngineScene } from "./scenes/MPIEngineScene";
import { TexVisionDrillScene } from "./scenes/TexVisionDrillScene";
import { VaultProgressScene } from "./scenes/VaultProgressScene";
import { CTACloserScene } from "./scenes/CTACloserScene";
import type { SceneEntry } from "./Root";

const SCENE_MAP: Record<string, React.FC<{ simData: Record<string, any> }>> = {
  "hook-problem": HookProblemScene,
  "dashboard-hero": DashboardHeroScene,
  "mpi-engine": MPIEngineScene,
  "tex-vision-drill": TexVisionDrillScene,
  "vault-progress": VaultProgressScene,
  "cta-closer": CTACloserScene,
};

const TRANSITION_FRAMES = 15;

export const MainVideo: React.FC<{ sceneSequence: SceneEntry[] }> = ({
  sceneSequence,
}) => {
  // Validation: fail hard on unknown scene keys
  for (const entry of sceneSequence) {
    if (!SCENE_MAP[entry.sceneKey]) {
      throw new Error(
        `Unknown scene_key: '${entry.sceneKey}'. Valid keys: ${Object.keys(SCENE_MAP).join(", ")}`
      );
    }
    if (!entry.simData || Object.keys(entry.simData).length === 0) {
      throw new Error(
        `Missing or empty simData for scene '${entry.sceneKey}'`
      );
    }
  }

  if (sceneSequence.length === 0) {
    throw new Error("sceneSequence is empty — cannot render video");
  }

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      <TransitionSeries>
        {sceneSequence.map((entry, i) => {
          const SceneComponent = SCENE_MAP[entry.sceneKey];
          const elements: React.ReactNode[] = [];

          if (i > 0) {
            elements.push(
              <TransitionSeries.Transition
                key={`t-${i}`}
                presentation={wipe({ direction: "from-bottom" })}
                timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
              />
            );
          }

          elements.push(
            <TransitionSeries.Sequence
              key={`s-${i}`}
              durationInFrames={entry.durationInFrames}
            >
              <SceneComponent simData={entry.simData} />
            </TransitionSeries.Sequence>
          );

          return elements;
        })}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
