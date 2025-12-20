import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, Globe, Heart, AlertTriangle, ExternalLink } from 'lucide-react';

interface CrisisResource {
  id: string;
  name: string;
  description: string;
  contact: string;
  contactType: 'phone' | 'text' | 'website';
  available: string;
  region: 'us' | 'international';
}

const crisisResources: CrisisResource[] = [
  // US Resources
  {
    id: 'suicide-prevention',
    name: '988 Suicide & Crisis Lifeline',
    description: 'Free, confidential 24/7 support for people in distress',
    contact: '988',
    contactType: 'phone',
    available: '24/7',
    region: 'us',
  },
  {
    id: 'crisis-text-mlb',
    name: 'Crisis Text Line - MLB',
    description: 'Free, 24/7 crisis support via text message',
    contact: 'Text MLB to 741741',
    contactType: 'text',
    available: '24/7',
    region: 'us',
  },
  {
    id: 'samhsa',
    name: 'SAMHSA National Helpline',
    description: 'Treatment referrals and information for mental health and substance use',
    contact: '1-800-662-4357',
    contactType: 'phone',
    available: '24/7',
    region: 'us',
  },
  {
    id: 'veterans',
    name: 'Veterans Crisis Line',
    description: 'Support for veterans and their families',
    contact: '1-800-273-8255 (Press 1)',
    contactType: 'phone',
    available: '24/7',
    region: 'us',
  },
  // International Resources
  {
    id: 'befrienders',
    name: 'Befrienders Worldwide',
    description: 'Global network of crisis centers',
    contact: 'befrienders.org',
    contactType: 'website',
    available: 'Varies by location',
    region: 'international',
  },
  {
    id: 'samaritans-uk',
    name: 'Samaritans (UK & Ireland)',
    description: 'Emotional support for anyone in distress',
    contact: '116 123',
    contactType: 'phone',
    available: '24/7',
    region: 'international',
  },
  {
    id: 'lifeline-au',
    name: 'Lifeline Australia',
    description: 'Crisis support and suicide prevention',
    contact: '13 11 14',
    contactType: 'phone',
    available: '24/7',
    region: 'international',
  },
  {
    id: 'canada-crisis',
    name: 'Canada Suicide Prevention Service',
    description: 'National crisis line',
    contact: '1-833-456-4566',
    contactType: 'phone',
    available: '24/7',
    region: 'international',
  },
  {
    id: 'iahsp',
    name: 'International Association for Suicide Prevention',
    description: 'Find crisis centers worldwide',
    contact: 'iasp.info/resources/Crisis_Centres',
    contactType: 'website',
    available: 'Directory',
    region: 'international',
  },
];

export default function CrisisResourcesCard() {
  const { t } = useTranslation();

  const usResources = crisisResources.filter(r => r.region === 'us');
  const intlResources = crisisResources.filter(r => r.region === 'international');

  const getContactIcon = (type: string) => {
    switch (type) {
      case 'phone': return <Phone className="h-4 w-4" />;
      case 'text': return <MessageCircle className="h-4 w-4" />;
      case 'website': return <Globe className="h-4 w-4" />;
      default: return <Phone className="h-4 w-4" />;
    }
  };

  const handleContact = (resource: CrisisResource) => {
    if (resource.contactType === 'phone') {
      window.location.href = `tel:${resource.contact.replace(/[^0-9]/g, '')}`;
    } else if (resource.contactType === 'text') {
      // Crisis Text Line - opens SMS app with number and pre-filled keyword
      window.location.href = 'sms:741741?body=MLB';
    } else if (resource.contactType === 'website') {
      window.open(`https://${resource.contact}`, '_blank');
    }
  };

  return (
    <Card className="border-wellness-warning/30 bg-gradient-to-br from-wellness-cream to-background">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-wellness-warning/20">
            <Heart className="h-5 w-5 text-wellness-warning" />
          </div>
          <div>
            <CardTitle className="text-lg">{t('mentalWellness.crisis.title', 'Crisis Support Resources')}</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t('mentalWellness.crisis.subtitle', 'You are not alone. Help is available.')}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Important Notice */}
        <div className="flex gap-3 p-4 rounded-xl bg-wellness-warning/10 border border-wellness-warning/20">
          <AlertTriangle className="h-5 w-5 text-wellness-warning shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-wellness-warning-foreground">
              {t('mentalWellness.crisis.emergencyNotice', 'If you are in immediate danger, please call emergency services (911 in the US).')}
            </p>
            <p className="text-muted-foreground mt-1">
              {t('mentalWellness.crisis.confidential', 'All resources listed below are free and confidential.')}
            </p>
          </div>
        </div>

        {/* US Resources */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t('mentalWellness.crisis.usResources', 'United States')}
          </h3>
          <div className="grid gap-3">
            {usResources.map((resource) => (
              <div
                key={resource.id}
                className="p-4 rounded-xl bg-card border border-border/50 hover:border-wellness-lavender/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground">{resource.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{resource.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      {getContactIcon(resource.contactType)}
                      <span className="font-medium text-wellness-lavender">{resource.contact}</span>
                      <span className="text-muted-foreground">• {resource.available}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleContact(resource)}
                    className="shrink-0 border-wellness-lavender/30 hover:bg-wellness-lavender/10"
                  >
                    {resource.contactType === 'website' ? (
                      <>
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        {t('mentalWellness.crisis.visit', 'Visit')}
                      </>
                    ) : (
                      <>
                        {getContactIcon(resource.contactType)}
                        <span className="ml-1.5">{resource.contactType === 'phone' ? t('mentalWellness.crisis.call', 'Call') : t('mentalWellness.crisis.text', 'Text')}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* International Resources */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t('mentalWellness.crisis.internationalResources', 'International')}
          </h3>
          <div className="grid gap-3">
            {intlResources.map((resource) => (
              <div
                key={resource.id}
                className="p-4 rounded-xl bg-card border border-border/50 hover:border-wellness-sky/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground">{resource.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{resource.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-sm">
                      {getContactIcon(resource.contactType)}
                      <span className="font-medium text-wellness-sky">{resource.contact}</span>
                      <span className="text-muted-foreground">• {resource.available}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleContact(resource)}
                    className="shrink-0 border-wellness-sky/30 hover:bg-wellness-sky/10"
                  >
                    {resource.contactType === 'website' ? (
                      <>
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                        {t('mentalWellness.crisis.visit', 'Visit')}
                      </>
                    ) : (
                      <>
                        {getContactIcon(resource.contactType)}
                        <span className="ml-1.5">{t('mentalWellness.crisis.call', 'Call')}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reach Out Prompt */}
        <div className="p-4 rounded-xl bg-wellness-sage/10 border border-wellness-sage/20 text-center">
          <p className="text-sm text-wellness-sage-foreground">
            {t('mentalWellness.crisis.reachOut', "Remember: Reaching out for help is a sign of strength, not weakness. You matter, and there are people who want to help.")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
