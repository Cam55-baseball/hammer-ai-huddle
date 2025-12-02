import { AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function NutritionDisclaimer() {
  return (
    <Alert variant="destructive" className="bg-amber-500/10 border-amber-500/50 text-amber-200">
      <AlertTriangle className="h-5 w-5 text-amber-400" />
      <AlertTitle className="text-amber-300 font-semibold">Important Health Disclaimer</AlertTitle>
      <AlertDescription className="text-amber-200/90 text-sm space-y-2 mt-2">
        <p>
          The information provided in this module is for <strong>educational purposes only</strong> and is not intended as medical advice, diagnosis, or treatment. Some information may be inaccurate or outdated.
        </p>
        <p>
          Always consult with a qualified healthcare provider, registered dietitian, or sports nutritionist before making significant changes to your diet or supplement regimen.
        </p>
        <p>
          Individual nutritional needs vary based on age, health status, activity level, and other factors. What works for one athlete may not be appropriate for another.
        </p>
        <div className="flex items-start gap-2 mt-3 p-2 bg-amber-500/10 rounded-md">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span className="text-xs">
            AI-generated tips are created using general nutrition knowledge and should be verified with a professional before implementation.
          </span>
        </div>
      </AlertDescription>
    </Alert>
  );
}
