// PARKED 2026-09-25 — hidden behind PARKED_UI in src/lib/flags/parked.ts. Do not delete.
import { Construction, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";

export function ParkedComingSoonBox() {
  return (
    <>
      {/* Coming Soon Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <Card className="border-2 border-red-500 bg-red-50 shadow-lg">
              <div className="p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="bg-red-100 p-3 rounded-full animate-pulse">
                      <Construction className="h-8 w-8 text-red-600" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Sparkles className="h-6 w-6 text-red-600 animate-pulse" />
                      <h3 className="text-2xl md:text-3xl font-bold text-red-900">
                        Exciting Updates Coming Soon!
                      </h3>
                    </div>
                    <div className="space-y-3 text-red-900">
                      <p className="text-lg font-semibold">
                        Advanced metric measuring are under construction!
                      </p>
                      <p className="text-base">
                        We're working hard to bring you powerful new analytics. Your training data is being captured now for seamless integration when these features launch!
                      </p>
                      <p className="text-base font-semibold">
                        Professional Scout/Collegiate recruiting connections are in full effect for both Softball & Baseball
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <div className="h-2 w-2 bg-red-600 rounded-full animate-pulse" />
                      <span className="text-sm text-red-900 font-semibold">Active Development</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

    </>
  );
}

export function ParkedTeaserCards(props: { isOwner: boolean }) {
  return (
    <>
            <div className="bg-card p-8 rounded-xl shadow-lg border border-border hover:border-primary/50 transition-all duration-300">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h4 className="text-xl font-bold mb-2">Hammer Motion Capture</h4>
              <p className="text-muted-foreground">
                Advanced computer vision analyzes every throw, pitch, and swing with professional-grade accuracy
              </p>
            </div>

            <div className="bg-card p-8 rounded-xl shadow-lg border border-border hover:border-primary/50 transition-all duration-300">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h4 className="text-xl font-bold mb-2">Real-Time Analytics</h4>
              {props.isOwner ? (
                <p className="text-muted-foreground">
                  Instant feedback on velocity, spin rate, release point, and 20+ biomechanical metrics
                </p>
              ) : (
                <p className="text-muted-foreground">
                  <span className="inline-block px-3 py-1 bg-muted rounded-full text-sm font-medium mb-2">
                    Under Construction
                  </span>
                  <br />
                  Advanced analytics coming soon for all users
                </p>
              )}
            </div>

            <div className="bg-card p-8 rounded-xl shadow-lg border border-border hover:border-primary/50 transition-all duration-300">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🏆</span>
              </div>
              <h4 className="text-xl font-bold mb-2">Performance Rankings</h4>
              <p className="text-muted-foreground">
                <span className="inline-block px-3 py-1 bg-muted rounded-full text-sm font-medium mb-2">
                  Coming Soon
                </span>
                <br />
                Compare your stats against players worldwide and track your progress over time
              </p>
            </div>
    </>
  );
}
