import type { IqActorRole, IqAssignment } from "@/lib/iq/types";

export interface DraftActor {
  role: IqActorRole;
  assignment: IqAssignment;
  primary_path: { x: number; y: number }[];
  secondary_read: string;
  communication_call: string;
  coaching_note: string;
  common_mistake: string;
  elite_cue: string;
  footwork_cue: string;
  eyes_target: string;
}

export function emptyActor(role: IqActorRole): DraftActor {
  return {
    role,
    assignment: "idle",
    primary_path: [],
    secondary_read: "",
    communication_call: "",
    coaching_note: "",
    common_mistake: "",
    elite_cue: "",
    footwork_cue: "",
    eyes_target: "",
  };
}
