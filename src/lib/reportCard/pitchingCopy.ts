/**
 * Coach-to-player copy for the baseball pitching card (2026-09-29).
 * No numbers, no degrees, no percentages. The owner has not yet written his
 * pitching reasoning down — these lines restate his standards plainly and must
 * be replaced with his own words when he supplies them.
 */
import type { CardKey } from "@/lib/biomech/metrics/pitchingCardTiles";

export const PITCHING_COPY: Record<CardKey, { pass: string; fail: string }> = {
  tempo_sec: { pass: "Good rhythm — you got from the top of your leg lift to landing without stalling.", fail: "You're hanging at the top of your leg lift. Keep the move going once the knee gets up." },
  shoulder_tilt_deg: { pass: "Your shoulders stayed level when you let the ball go.", fail: "Your shoulders tipped when you let the ball go. Stay tall and let the arm work over a level shoulder line." },
  stride_pct_of_height: { pass: "Good long stride down the mound.", fail: "Your stride is short. Push further down the mound before you land." },
  head_at_release_deg: { pass: "Your head stayed on the line to the plate at release.", fail: "Your head pulled off the line to the plate at release. Keep your eyes and belly button pointed at the target." },
  drag_line: { pass: "Your back foot drag stayed short and went straight to the plate.", fail: "Your back foot is dragging too far. Finish the push and let the foot come through." },
  stack_and_track: { pass: "You stayed stacked — shoulders level and eyes level as you let it go.", fail: "You tipped as you let it go. Keep your shoulders and your eyes level so your whole body throws on one line." },
  balance_at_landing: { pass: "Your eye line stayed level when your front foot landed.", fail: "Your eye line tilted when your front foot landed. Keep your eyes level through landing." },
  eyes_on_target_at_peak_lift: { pass: "Your eyes were on the target before you moved forward.", fail: "Your eyes weren't on the target at the top of your leg lift. Lock onto the glove before you go." },
  glove_swivel: { pass: "Your glove turned over and tucked into your body inside your shoulders.", fail: "Your glove flew open. Turn it over, pinky to your body, and keep it inside your shoulders." },
  glove_drift_outside_frame_in: { pass: "Your glove stayed inside your shoulders.", fail: "Your glove drifted outside your shoulders. Keep it in front of your chest." },
  release_extension: { pass: "Good extension — you let the ball go out in front of your front foot.", fail: "You let the ball go too early or too far out. Let it go just out in front of your front foot." },
};

export const PITCHING_ROOT_COPY = {
  posture_did_not_stay_stacked: {
    label: "You didn't stay stacked through release",
    plain: "Your shoulders, eyes and balance all showed the same thing: your body tipped off its line as you threw. These come from one thing, not separate problems — stay tall and level and they clean up together.",
  },
} as const;
