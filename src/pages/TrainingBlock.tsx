import { DashboardLayout } from '@/components/DashboardLayout';
import { TrainingBlockView } from '@/components/training-block/TrainingBlockView';
import { TrainingPreferencesEditor } from '@/components/training-block/TrainingPreferencesEditor';

export default function TrainingBlockPage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
        <h1 className="text-2xl font-bold">Training Block</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TrainingBlockView />
          </div>
          <div>
            <TrainingPreferencesEditor />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
