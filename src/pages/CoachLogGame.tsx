import { Navigate } from "react-router-dom";

/** Owner Nov 5 round 2: coach game logging lives in the Game Hub. Old links land there. */
export default function CoachLogGame() {
  return <Navigate to="/games?view=coach" replace />;
}
