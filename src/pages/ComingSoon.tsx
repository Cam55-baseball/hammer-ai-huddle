import { Construction, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DashboardLayout } from "@/components/DashboardLayout";

const ComingSoon = () => {
  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 sm:p-6 max-w-3xl">
        <Card className="border-2 border-red-500 bg-red-50 shadow-lg">
          <div className="p-4 sm:p-8">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex-shrink-0">
                <div className="bg-red-100 p-2 sm:p-3 rounded-full animate-pulse">
                  <Construction className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
                </div>
              </div>
              <div className="flex-1 space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 animate-pulse" />
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-red-900">
                    Exciting Updates Coming Soon!
                  </h1>
                </div>
                <div className="space-y-2 sm:space-y-3 text-red-900">
                  <p className="text-base sm:text-lg font-semibold">
                    Advanced metric measuring and enhanced Professional Scout/Collegiate recruiting connections are under construction!
                  </p>
                  <p className="text-sm sm:text-base">
                    We're working hard to bring you powerful new analytics and direct connections to scouts and recruiters. Your training data is being captured now for seamless integration when these features launch!
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1 sm:pt-2">
                  <div className="h-2 w-2 bg-red-600 rounded-full animate-pulse" />
                  <span className="text-sm text-red-900 font-semibold">Active Development</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ComingSoon;
