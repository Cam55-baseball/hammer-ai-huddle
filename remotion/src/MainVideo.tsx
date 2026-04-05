import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { wipe } from "@remotion/transitions/wipe";
import { HookProblemScene } from "./scenes/HookProblemScene";
import { DashboardHeroScene } from "./scenes/DashboardHeroScene";
import type { SceneEntry } from "./Root";

const SCENE_MAP: Record<string, React.FC<{ simData: Record<string, any> }>> = {
  "hook-problem": HookProblemScene,
  "dashboard-hero": DashboardHeroScene,
};

const TRANSITION_FRAMES = 15;

export const MainVideo: React.FC<{ sceneSequence: SceneEntry[] }> = ({
  sceneSequence,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      <TransitionSeries>
        {sceneSequence.map((entry, i) => {
          const SceneComponent = SCENE_MAP[entry.sceneKey];
          if (!SceneComponent) return null;

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
