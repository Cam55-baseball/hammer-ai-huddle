import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Instagram, Twitter, Facebook, Linkedin, Youtube, Globe, Check } from 'lucide-react';
import { FaTiktok } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

interface ScoutProfile {
  full_name: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  bio: string | null;
  credentials: string[] | null;
  position: string | null;
  team_affiliation: string | null;
  years_affiliated: number | null;
  social_instagram: string | null;
  social_twitter: string | null;
  social_facebook: string | null;
  social_linkedin: string | null;
  social_youtube: string | null;
  social_tiktok: string | null;
  social_website: string | null;
  social_website_2: string | null;
  social_website_3: string | null;
  social_website_4: string | null;
  social_website_5: string | null;
}

interface ScoutProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ScoutProfile | null;
}

export function ScoutProfileDialog({ open, onOpenChange, profile }: ScoutProfileDialogProps) {
  const { t } = useTranslation();

  if (!profile) return null;

  const displayName = profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(" ") || t('scoutProfile.defaultName');
  const initials = displayName.split(" ").map(n => n[0]).join("").toUpperCase();

  const socialLinks = [
    { url: profile.social_instagram, icon: Instagram, label: t('scoutProfile.social.instagram') },
    { url: profile.social_twitter, icon: Twitter, label: t('scoutProfile.social.twitter') },
    { url: profile.social_facebook, icon: Facebook, label: t('scoutProfile.social.facebook') },
    { url: profile.social_linkedin, icon: Linkedin, label: t('scoutProfile.social.linkedin') },
    { url: profile.social_youtube, icon: Youtube, label: t('scoutProfile.social.youtube') },
    { url: profile.social_tiktok, icon: FaTiktok, label: t('scoutProfile.social.tiktok') },
    { url: profile.social_website, icon: Globe, label: t('scoutProfile.social.website') },
    { url: profile.social_website_2, icon: Globe, label: `${t('scoutProfile.social.website')} 2` },
    { url: profile.social_website_3, icon: Globe, label: `${t('scoutProfile.social.website')} 3` },
    { url: profile.social_website_4, icon: Globe, label: `${t('scoutProfile.social.website')} 4` },
    { url: profile.social_website_5, icon: Globe, label: `${t('scoutProfile.social.website')} 5` },
  ].filter(link => link.url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('scoutProfile.title')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Avatar and Name */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              {profile.avatar_url && <AvatarImage src={profile.avatar_url} />}
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-2xl font-bold">{displayName}</h3>
              {profile.position && (
                <Badge variant="secondary" className="mt-1">{profile.position}</Badge>
              )}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div>
              <Label className="text-sm font-semibold">{t('scoutProfile.about')}</Label>
              <p className="text-sm text-muted-foreground mt-1">{profile.bio}</p>
            </div>
          )}

          {/* Credentials */}
          {profile.credentials && profile.credentials.length > 0 && (
            <div>
              <Label className="text-sm font-semibold">{t('scoutProfile.experienceCredentials')}</Label>
              <div className="space-y-2 mt-2">
                {profile.credentials.map((cred: string, index: number) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{cred}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Professional Info */}
          <div className="grid grid-cols-2 gap-4">
            {profile.team_affiliation && (
              <div>
                <Label className="text-xs text-muted-foreground">{t('scoutProfile.teamAffiliation')}</Label>
                <p className="text-sm font-medium mt-1">{profile.team_affiliation}</p>
              </div>
            )}
            {profile.years_affiliated && (
              <div>
                <Label className="text-xs text-muted-foreground">{t('scoutProfile.yearsAffiliated')}</Label>
                <p className="text-sm font-medium mt-1">{profile.years_affiliated}</p>
              </div>
            )}
          </div>

          {/* Social Links */}
          {socialLinks.length > 0 && (
            <div>
              <Label className="text-sm font-semibold">{t('scoutProfile.socialLinks')}</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {socialLinks.map((link, index) => {
                  const Icon = link.icon;
                  return (
                    <a
                      key={index}
                      href={link.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 border rounded-md hover:bg-accent transition-colors"
                      title={link.label}
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
