import { useEffect, useState } from "react";
import { buildInfoLine, nativeAppInfo, screensBuiltAt, type AppInfo } from "@/lib/native/buildInfo";

/** Owner Nov 12: one small line with the app build (iPhone) and when the screens were built. */
export function BuildInfoLine() {
  const [app, setApp] = useState<AppInfo | null>(null);
  useEffect(() => { void nativeAppInfo().then(setApp); }, []);
  return <p className="text-xs text-muted-foreground" data-build-info>{buildInfoLine(app, screensBuiltAt())}</p>;
}
