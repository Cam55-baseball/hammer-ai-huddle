/**
 * Release A3 (owner Nov 9): the app's own small iPhone workout writer (ios/App/HealthWorkoutPlugin.swift).
 * Writes and deletes only; reading Apple Health stays on @capgo/capacitor-health.
 */
import { registerPlugin } from "@capacitor/core";

export type HealthShareStatus = "authorized" | "denied" | "notDetermined" | "unavailable";

export interface HealthWorkoutsPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  authorizationStatus(): Promise<{ workouts: HealthShareStatus; distance: HealthShareStatus }>;
  requestAuthorization(): Promise<{ workouts: HealthShareStatus }>;
  saveWorkout(opts: { completionId: string; activityType: string; start: string; end: string; distanceMeters?: number }): Promise<{ workoutId: string; distanceSaved: boolean }>;
  deleteWorkout(opts: { completionId: string; workoutId?: string | null }): Promise<{ deleted: number }>;
}

export const HealthWorkouts = registerPlugin<HealthWorkoutsPlugin>("HealthWorkouts");
