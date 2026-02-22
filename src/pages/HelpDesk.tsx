import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { HelpDeskChat } from "@/components/HelpDeskChat";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Search, Home, LayoutGrid, User, Trophy, BookOpen, Target, Apple, Brain, HeartPulse, HelpCircle } from "lucide-react";
import { useEffect } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqCategory {
  title: string;
  icon: React.ReactNode;
  items: FaqItem[];
}

const quickLinks = [
  { label: "Dashboard", url: "/dashboard", icon: Home },
  { label: "My Activities", url: "/my-custom-activities", icon: LayoutGrid },
  { label: "Profile", url: "/profile", icon: User },
  { label: "Rankings", url: "/rankings", icon: Trophy },
];

export default function HelpDesk() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const faqCategories: FaqCategory[] = useMemo(() => [
    {
      title: t('helpDesk.faq.gettingStarted', 'Getting Started'),
      icon: <BookOpen className="h-4 w-4" />,
      items: [
        {
          question: t('helpDesk.faq.setupProfile', 'How do I set up my profile?'),
          answer: t('helpDesk.faq.setupProfileAnswer', 'Go to **Profile** from the sidebar menu. You can update your name, avatar, position, social links, and more. Make sure to save your changes.'),
        },
        {
          question: t('helpDesk.faq.chooseSport', 'How do I choose my sport?'),
          answer: t('helpDesk.faq.chooseSportAnswer', 'During onboarding you select Baseball or Softball. You can switch anytime from the Dashboard by tapping the sport selector at the top.'),
        },
        {
          question: t('helpDesk.faq.whatModules', 'What modules are available?'),
          answer: t('helpDesk.faq.whatModulesAnswer', 'There are three main modules: **Complete Hitter** (hitting analysis + Production Lab + Tex Vision), **Complete Pitcher** (pitching analysis + Production Studio), and **Complete Player** (throwing analysis + Speed Lab). Each requires a subscription.'),
        },
      ],
    },
    {
      title: t('helpDesk.faq.trainingModules', 'Training Modules'),
      icon: <Target className="h-4 w-4" />,
      items: [
        {
          question: t('helpDesk.faq.analyzeVideo', 'How do I analyze a video?'),
          answer: t('helpDesk.faq.analyzeVideoAnswer', '1. Go to any analysis module (Hitting, Pitching, or Throwing)\n2. Upload your video\n3. The AI will analyze your mechanics\n4. You\'ll receive an efficiency score, detailed feedback, recommended drills, and a scorecard comparing to previous analyses.'),
        },
        {
          question: t('helpDesk.faq.texVision', 'How does Tex Vision work?'),
          answer: t('helpDesk.faq.texVisionAnswer', 'Tex Vision is a daily vision training program for pitch recognition. Complete daily drill sessions, progress through tiers (Beginner to Chaos), and track your streaks. The program runs continuously — there is no end.'),
        },
        {
          question: t('helpDesk.faq.speedLab', 'What is Speed Lab?'),
          answer: t('helpDesk.faq.speedLabAnswer', 'Speed Lab is a progressive speed and agility training program inside the Complete Player module. It features tiered workouts that increase in difficulty and runs continuously.'),
        },
      ],
    },
    {
      title: t('helpDesk.faq.customActivities', 'Custom Activities & Game Plan'),
      icon: <LayoutGrid className="h-4 w-4" />,
      items: [
        {
          question: t('helpDesk.faq.createActivity', 'How do I create a custom activity card?'),
          answer: t('helpDesk.faq.createActivityAnswer', 'Go to **My Activities** from the sidebar, tap **Create New**, choose your activity type (workout, running, nutrition, etc.), add custom fields, set a schedule, and save.'),
        },
        {
          question: t('helpDesk.faq.customFields', 'What do the custom field types mean?'),
          answer: t('helpDesk.faq.customFieldsAnswer', '• **Checkbox** — for habits you want to mark as done\n• **Number** — for trackable data (reps, weight, distance)\n• **Text** — for notes or descriptions\n• **Time** — for durations (workout time, rest periods)'),
        },
        {
          question: t('helpDesk.faq.shareActivities', 'How do I share activities with my coach?'),
          answer: t('helpDesk.faq.shareActivitiesAnswer', 'Custom activities can be shared via a share code. Your coach can also push activities directly to you from their Coach Dashboard.'),
        },
      ],
    },
    {
      title: t('helpDesk.faq.vaultRecap', 'Vault & AI Recap'),
      icon: <BookOpen className="h-4 w-4" />,
      items: [
        {
          question: t('helpDesk.faq.whatIsVault', 'What is the Vault?'),
          answer: t('helpDesk.faq.whatIsVaultAnswer', 'The Vault is your personal training library. It stores all your saved video analyses, annotations, and progress data in one place.'),
        },
        {
          question: t('helpDesk.faq.aiRecap', 'How does the 6-week AI recap work?'),
          answer: t('helpDesk.faq.aiRecapAnswer', 'Every 6 weeks, the AI generates a comprehensive recap analyzing your training trends, score improvements, and areas that need attention. It\'s available in The Vault.'),
        },
      ],
    },
    {
      title: t('helpDesk.faq.nutritionMental', 'Nutrition & Mental Performance'),
      icon: <Apple className="h-4 w-4" />,
      items: [
        {
          question: t('helpDesk.faq.nutritionHub', 'What can I do in Nutrition Hub?'),
          answer: t('helpDesk.faq.nutritionHubAnswer', 'Nutrition Hub lets you log meals, track hydration, browse recipes, create meal templates, and get AI-powered meal suggestions tailored to your training.'),
        },
        {
          question: t('helpDesk.faq.mindFuel', 'What is Mind Fuel?'),
          answer: t('helpDesk.faq.mindFuelAnswer', 'Mind Fuel is the mental performance module. It includes daily lessons on focus, confidence, and resilience, plus weekly mental challenges. Track your streaks and earn badges.'),
        },
      ],
    },
    {
      title: t('helpDesk.faq.accountSettings', 'Account & Settings'),
      icon: <User className="h-4 w-4" />,
      items: [
        {
          question: t('helpDesk.faq.changeSubscription', 'How do I change my subscription?'),
          answer: t('helpDesk.faq.changeSubscriptionAnswer', 'Go to **Profile** and manage your subscription from there. You can upgrade, downgrade, or cancel modules individually.'),
        },
        {
          question: t('helpDesk.faq.updateProfile', 'How do I update my profile?'),
          answer: t('helpDesk.faq.updateProfileAnswer', 'Navigate to **Profile** from the sidebar. Update your name, avatar, position, height, weight, social links, and more. Tap Save when done.'),
        },
      ],
    },
  ], [t]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return faqCategories;
    const query = searchQuery.toLowerCase();
    return faqCategories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.question.toLowerCase().includes(query) ||
            item.answer.toLowerCase().includes(query)
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [faqCategories, searchQuery]);

  if (loading || !user) return null;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <HelpCircle className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">{t('helpDesk.title', 'Help Desk')}</h1>
          <p className="text-muted-foreground">
            {t('helpDesk.subtitle', 'Find answers, learn features, and get help navigating the app.')}
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('helpDesk.searchPlaceholder', 'Search for help topics...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick Navigation */}
        <div>
          <h2 className="text-lg font-semibold mb-3">{t('helpDesk.quickNav', 'Quick Navigation')}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickLinks.map((link) => (
              <Card
                key={link.url}
                className="p-4 cursor-pointer hover:bg-accent/50 transition-colors text-center"
                onClick={() => navigate(link.url)}
              >
                <link.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">{link.label}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-lg font-semibold mb-3">{t('helpDesk.faqTitle', 'Frequently Asked Questions')}</h2>
          {filteredCategories.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              {t('helpDesk.noResults', 'No results found. Try asking the AI assistant below.')}
            </p>
          ) : (
            <div className="space-y-4">
              {filteredCategories.map((category, catIndex) => (
                <div key={catIndex}>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {category.icon}
                    {category.title}
                  </h3>
                  <Accordion type="multiple" className="border rounded-lg">
                    {category.items.map((item, itemIndex) => (
                      <AccordionItem key={itemIndex} value={`${catIndex}-${itemIndex}`}>
                        <AccordionTrigger className="px-4 text-sm text-left">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div
                            className="text-sm text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground"
                            dangerouslySetInnerHTML={{
                              __html: item.answer
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/\n/g, '<br/>'),
                            }}
                          />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Embedded Chat */}
        <div>
          <HelpDeskChat embedded />
        </div>
      </div>
    </DashboardLayout>
  );
}
