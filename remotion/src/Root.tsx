import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

export type SceneEntry = {
  sceneKey: string;
  simData: Record<string, any>;
  durationInFrames: number;
};

const defaultSequence: SceneEntry[] = [
  {
    sceneKey: "hook-problem",
    simData: {
      headline: "90% of athletes train blind.",
      subtext: "No data. No feedback. No progress tracking.",
      stats: [
        { label: "Athletes without analytics", value: "90%" },
        { label: "Quit within 2 years", value: "70%" },
        { label: "Never reach potential", value: "85%" },
      ],
    },
    durationInFrames: 210,
  },
  {
    sceneKey: "dashboard-hero",
    simData: {
      mpiScore: 82,
      grades: { hitting: "A-", fielding: "A", pitching: "B+" },
      streak: 14,
    },
    durationInFrames: 210,
  },
];

const TRANSITION_FRAMES = 15;
const totalDuration =
  defaultSequence.reduce((sum, s) => sum + s.durationInFrames, 0) -
  TRANSITION_FRAMES * (defaultSequence.length - 1);

export const RemotionRoot = () => (
  <Composition
    id="MainVideo"
    component={MainVideo}
    durationInFrames={totalDuration}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{ sceneSequence: defaultSequence }}
  />
);
