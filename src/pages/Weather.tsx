import { DashboardLayout } from "@/components/DashboardLayout";
import { WeatherWidget } from "@/components/WeatherWidget";

export default function Weather() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Weather Conditions</h1>
          <p className="text-muted-foreground">
            Check current weather conditions for optimal training
          </p>
        </div>

        <WeatherWidget expanded />
      </div>
    </DashboardLayout>
  );
}
