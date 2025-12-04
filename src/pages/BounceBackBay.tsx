import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { HeartPulse, Waves, Sparkles, Activity, AlertTriangle, ThermometerSun, ChevronDown } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HurtingVsInjured } from "@/components/bounce-back-bay/HurtingVsInjured";
import { DiagnosticFlowChart } from "@/components/bounce-back-bay/DiagnosticFlowChart";
import { PainScaleSystem } from "@/components/bounce-back-bay/PainScaleSystem";
import { RedFlagQuickCheck } from "@/components/bounce-back-bay/RedFlagQuickCheck";
import { InjuryDisclaimer } from "@/components/bounce-back-bay/InjuryDisclaimer";
import { supabase } from "@/integrations/supabase/client";

interface InjuryLibraryItem {
  id: string;
  name: string;
  body_area: string;
  sport_relevance: string[];
  severity_range: string;
  description: string;
  symptoms: string[];
  typical_timeline: string | null;
  impact_on_performance: string | null;
}

export default function BounceBackBay() {
  const { t } = useTranslation();
  const [injuries, setInjuries] = useState<InjuryLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBodyArea, setSelectedBodyArea] = useState<string | null>(null);

  useEffect(() => {
    const fetchInjuries = async () => {
      try {
        const { data, error } = await supabase
          .from('injury_library')
          .select('*')
          .order('body_area');

        if (error) throw error;
        setInjuries(data || []);
      } catch (error) {
        console.error('Error fetching injuries:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInjuries();
  }, []);

  const bodyAreas = [...new Set(injuries.map(i => i.body_area))];
  const filteredInjuries = selectedBodyArea 
    ? injuries.filter(i => i.body_area === selectedBodyArea)
    : injuries;

  return (
    <DashboardLayout>
      <div className="min-h-screen">
        {/* Ocean-themed Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-cyan-600 via-teal-500 to-emerald-600 text-white">
          {/* Wave decorations */}
          <div className="absolute inset-0 opacity-20">
            <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 120" fill="none">
              <path d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,58.7C960,64,1056,64,1152,58.7C1248,53,1344,43,1392,37.3L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z" fill="currentColor"/>
            </svg>
          </div>
          
          <div className="relative z-10 px-4 sm:px-6 py-8 sm:py-12">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
                  <Waves className="h-8 w-8 sm:h-10 sm:w-10" />
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
                {t('bounceBackBay.title')}
              </h1>
              <p className="text-lg sm:text-xl text-white/90 mb-2">
                {t('bounceBackBay.subtitle')}
              </p>
              <p className="text-sm sm:text-base text-white/75 max-w-2xl mx-auto">
                {t('bounceBackBay.description')}
              </p>
              
              {/* Feature badges */}
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                  <Activity className="h-3 w-3 mr-1" />
                  {t('bounceBackBay.badges.educational')}
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                  <HeartPulse className="h-3 w-3 mr-1" />
                  {t('bounceBackBay.badges.athleteFocused')}
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {t('bounceBackBay.badges.comprehensiveGuide')}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
          {/* Hurting vs Injured - Top Card */}
          <HurtingVsInjured />

          {/* Main Content Sections */}
          <Accordion type="multiple" className="space-y-4" defaultValue={["diagnostic", "pain-scale", "red-flags"]}>
            {/* Diagnostic Flow Chart */}
            <AccordionItem value="diagnostic" className="border rounded-lg bg-card overflow-hidden">
              <AccordionTrigger className="px-4 sm:px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/20 rounded-lg">
                    <Activity className="h-5 w-5 text-cyan-500" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">{t('bounceBackBay.sections.diagnosticFlow.title')}</h3>
                    <p className="text-sm text-muted-foreground">{t('bounceBackBay.sections.diagnosticFlow.subtitle')}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 sm:px-6 pb-6">
                <DiagnosticFlowChart />
              </AccordionContent>
            </AccordionItem>

            {/* Pain Scale System */}
            <AccordionItem value="pain-scale" className="border rounded-lg bg-card overflow-hidden">
              <AccordionTrigger className="px-4 sm:px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/20 rounded-lg">
                    <ThermometerSun className="h-5 w-5 text-orange-500" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">{t('bounceBackBay.sections.painScale.title')}</h3>
                    <p className="text-sm text-muted-foreground">{t('bounceBackBay.sections.painScale.subtitle')}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 sm:px-6 pb-6">
                <PainScaleSystem />
              </AccordionContent>
            </AccordionItem>

            {/* Red Flag Quick Check */}
            <AccordionItem value="red-flags" className="border rounded-lg bg-card overflow-hidden">
              <AccordionTrigger className="px-4 sm:px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/20 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">{t('bounceBackBay.sections.redFlags.title')}</h3>
                    <p className="text-sm text-muted-foreground">{t('bounceBackBay.sections.redFlags.subtitle')}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 sm:px-6 pb-6">
                <RedFlagQuickCheck />
              </AccordionContent>
            </AccordionItem>

            {/* Injury Overview Hub */}
            <AccordionItem value="injury-hub" className="border rounded-lg bg-card overflow-hidden">
              <AccordionTrigger className="px-4 sm:px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-500/20 rounded-lg">
                    <HeartPulse className="h-5 w-5 text-teal-500" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">{t('bounceBackBay.sections.injuryHub.title')}</h3>
                    <p className="text-sm text-muted-foreground">{t('bounceBackBay.sections.injuryHub.subtitle')}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 sm:px-6 pb-6">
                {/* Body Area Filter */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <Badge 
                    variant={selectedBodyArea === null ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedBodyArea(null)}
                  >
                    {t('bounceBackBay.allAreas')}
                  </Badge>
                  {bodyAreas.map((area) => (
                    <Badge 
                      key={area}
                      variant={selectedBodyArea === area ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setSelectedBodyArea(area)}
                    >
                      {area}
                    </Badge>
                  ))}
                </div>

                {/* Injury Cards Grid */}
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredInjuries.map((injury) => (
                      <Card key={injury.id} className="border-l-4 border-l-teal-500">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-lg">{injury.name}</CardTitle>
                            <Badge variant="outline" className="text-xs">{injury.body_area}</Badge>
                          </div>
                          <CardDescription className="text-xs">{injury.severity_range}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground">{injury.description}</p>
                          
                          {injury.symptoms.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold mb-1">{t('bounceBackBay.commonSymptoms')}:</p>
                              <ul className="text-xs text-muted-foreground space-y-0.5">
                                {injury.symptoms.slice(0, 3).map((symptom, idx) => (
                                  <li key={idx}>• {symptom}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {injury.typical_timeline && (
                            <p className="text-xs">
                              <span className="font-semibold">{t('bounceBackBay.typicalTimeline')}:</span>{' '}
                              <span className="text-muted-foreground">{injury.typical_timeline}</span>
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Giant Disclaimer - Always visible at bottom */}
          <InjuryDisclaimer />
        </div>
      </div>
    </DashboardLayout>
  );
}
