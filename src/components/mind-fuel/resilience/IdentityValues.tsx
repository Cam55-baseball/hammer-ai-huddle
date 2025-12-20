import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Compass, Plus, Star, Heart, Zap, Target, Users, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Value {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  selected: boolean;
}

const coreValues: Omit<Value, 'selected'>[] = [
  { id: 'excellence', name: 'Excellence', icon: Star, description: 'Striving to be the best version of yourself' },
  { id: 'integrity', name: 'Integrity', icon: Heart, description: 'Being honest and true to your word' },
  { id: 'courage', name: 'Courage', icon: Zap, description: 'Facing challenges head-on despite fear' },
  { id: 'discipline', name: 'Discipline', icon: Target, description: 'Staying committed to your goals' },
  { id: 'teamwork', name: 'Teamwork', icon: Users, description: 'Supporting and uplifting others' },
  { id: 'growth', name: 'Growth', icon: Trophy, description: 'Continuously learning and improving' }
];

export default function IdentityValues() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [values, setValues] = useState<Value[]>(() => 
    coreValues.map(v => ({ ...v, selected: false }))
  );
  const [customValue, setCustomValue] = useState('');
  const [identityStatement, setIdentityStatement] = useState('');
  const [showStatement, setShowStatement] = useState(false);

  const selectedValues = values.filter(v => v.selected);

  const toggleValue = (id: string) => {
    setValues(values.map(v => 
      v.id === id ? { ...v, selected: !v.selected } : v
    ));
  };

  const addCustomValue = () => {
    if (customValue.trim() && !values.find(v => v.name.toLowerCase() === customValue.toLowerCase())) {
      setValues([...values, {
        id: `custom-${Date.now()}`,
        name: customValue.trim(),
        icon: Star,
        description: 'Your personal core value',
        selected: true
      }]);
      setCustomValue('');
    }
  };

  const generateStatement = () => {
    if (selectedValues.length === 0) {
      toast({
        title: t('mentalWellness.resilience.identity.selectValues', 'Select Values'),
        description: t('mentalWellness.resilience.identity.selectValuesDesc', 'Choose at least one core value first'),
        variant: 'destructive'
      });
      return;
    }
    setShowStatement(true);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-wellness-sky/20 to-wellness-sage/20 border-wellness-sky/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Compass className="h-5 w-5 text-wellness-sky" />
            {t('mentalWellness.resilience.identity.title', 'Identity & Values')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('mentalWellness.resilience.identity.intro', 'Clarify who you are and what you stand for. Strong identity builds unshakeable confidence.')}
          </p>
        </CardContent>
      </Card>

      {/* Core Values Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('mentalWellness.resilience.identity.selectCoreValues', 'Select Your Core Values')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <button
                  key={value.id}
                  onClick={() => toggleValue(value.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-all duration-300 ${
                    value.selected 
                      ? 'border-wellness-sky bg-wellness-sky/10' 
                      : 'border-muted hover:border-wellness-sky/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-4 w-4 ${value.selected ? 'text-wellness-sky' : 'text-muted-foreground'}`} />
                    <span className="font-medium text-sm">
                      {t(`mentalWellness.resilience.identity.values.${value.id}.name`, value.name)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t(`mentalWellness.resilience.identity.values.${value.id}.desc`, value.description)}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Add custom value */}
          <div className="flex gap-2">
            <Input
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder={t('mentalWellness.resilience.identity.addCustom', 'Add your own value...')}
              onKeyDown={(e) => e.key === 'Enter' && addCustomValue()}
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={addCustomValue}
              disabled={!customValue.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {selectedValues.length > 0 && (
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-2">
                {t('mentalWellness.resilience.identity.selected', 'Selected')}: {selectedValues.length}
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedValues.map(v => (
                  <span 
                    key={v.id}
                    className="px-3 py-1 bg-wellness-sky/20 text-wellness-sky rounded-full text-sm font-medium"
                  >
                    {t(`mentalWellness.resilience.identity.values.${v.id}.name`, v.name)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Identity Statement */}
      {!showStatement ? (
        <Button 
          onClick={generateStatement}
          className="w-full bg-wellness-sky hover:bg-wellness-sky/90"
        >
          {t('mentalWellness.resilience.identity.createStatement', 'Create Identity Statement')}
        </Button>
      ) : (
        <Card className="bg-gradient-to-br from-wellness-sage/20 to-wellness-cream border-wellness-sage/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-wellness-sage" />
              {t('mentalWellness.resilience.identity.statementTitle', 'Your Identity Statement')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('mentalWellness.resilience.identity.statementPrompt', 'Complete this statement based on your values:')}
            </p>
            
            <div className="p-3 bg-wellness-cream/50 rounded-lg">
              <p className="text-sm italic">
                {t('mentalWellness.resilience.identity.statementTemplate', '"I am an athlete who values {values}. I show up every day with {value1} and lead with {value2}. My identity is defined by my commitment to these principles, not by my performance on any single day."')}
              </p>
            </div>

            <Textarea
              value={identityStatement}
              onChange={(e) => setIdentityStatement(e.target.value)}
              placeholder={t('mentalWellness.resilience.identity.writePlaceholder', 'Write your personal identity statement here...')}
              rows={4}
            />

            <p className="text-xs text-muted-foreground">
              {t('mentalWellness.resilience.identity.tip', 'Read this statement before competitions to center yourself and remember who you are beyond the game.')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
