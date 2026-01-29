
# Implementation Plan: Nutrition Tips Educational Sections

## Overview

Add two new educational sections to the Nutrition Tips module:
1. **Eating Disorder Education** - Awareness and warning signs (not diagnosis/treatment)
2. **Body Image Education** - Healthy body image for athletes

Both sections will follow the existing accordion-based category pattern used in `NutritionCategory.tsx` but with expanded, dedicated components for richer educational content.

---

## Architecture Decision

The new sections will be implemented as:
1. **Separate Card Components** placed between the existing Categories section and Disclaimer
2. Using the **expandable card pattern** from Mind Fuel's `HealthyBoundaries.tsx` for detailed content
3. Each section includes its own **contextual disclaimer** following the sensitive topic pattern

This approach keeps the content accessible while maintaining the module's visual hierarchy.

---

## New Files to Create

### 1. `src/components/nutrition/EatingDisorderEducation.tsx`
A comprehensive educational component covering:

**Content Structure:**
- **Introduction Card** with supportive framing
- **Overview Section** - What are eating disorders (high-level, non-diagnostic)
- **Warning Signs** - Behavioral patterns to be aware of
- **Athlete-Specific Risks** - RED-S, over-training, under-fueling
- **Importance of Proper Fueling** - Performance, growth, recovery connection
- **Support Resources** - Encouraging seeking help from trusted adults
- **Disclaimer** - Clear educational-only messaging

**Warning Signs to Include:**
- Obsessive food tracking or calorie counting
- Skipping meals or extreme food restriction
- Excessive exercise beyond training requirements
- Preoccupation with body weight or shape
- Avoiding eating with teammates or family
- Hiding food or eating in secret
- Mood changes related to eating

**Athlete-Specific Risks:**
- Relative Energy Deficiency in Sport (RED-S)
- Under-fueling impacts on performance and injury risk
- Growth and development concerns for youth athletes
- Overtraining syndrome connection

### 2. `src/components/nutrition/BodyImageEducation.tsx`
A positive, athlete-centered component covering:

**Content Structure:**
- **Introduction Card** - Positive framing about body diversity
- **Impact Section** - How body image affects confidence, performance, mental health
- **Body Diversity** - Different body types across sports and positions
- **Comparison Culture** - Dangers of social media and unrealistic standards
- **Function Over Appearance** - Celebrating what bodies can DO
- **Positive Affirmations** - Athlete-centered self-talk examples

**Key Messaging:**
- Bodies come in all shapes and sizes
- Elite athletes have diverse body types
- Your body is a tool for performance, not just appearance
- Strength, speed, skill, and durability matter more than aesthetics
- Social media often shows unrealistic or edited images
- Compare yourself to yesterday's you, not others

---

## Files to Modify

### 1. `src/pages/Nutrition.tsx`
- Import the two new education components
- Add a new "Education" section between Categories and Disclaimer
- Use collapsible cards to keep the UI clean

```text
Current Structure:
├── Header
├── Streak Card
├── Badges
├── Daily Tip
├── Today's Tips Review
├── Categories
└── Disclaimer

New Structure:
├── Header
├── Streak Card
├── Badges
├── Daily Tip
├── Today's Tips Review
├── Categories
├── 🆕 Athlete Wellness Education (new section)
│   ├── Eating Disorder Awareness
│   └── Body Image & Self-Confidence
└── Disclaimer
```

### 2. `src/i18n/locales/en.json`
Add new translation keys under `nutrition.education`:
- `nutrition.education.sectionTitle`
- `nutrition.education.eatingDisorder.*` (all content keys)
- `nutrition.education.bodyImage.*` (all content keys)
- `nutrition.education.disclaimer.*` (educational disclaimer)
- `nutrition.education.support.*` (support resources messaging)

### 3. Additional Translation Files (7 files)
Translate all new keys to:
- Spanish (`es.json`)
- French (`fr.json`)
- German (`de.json`)
- Japanese (`ja.json`)
- Chinese (`zh.json`)
- Dutch (`nl.json`)
- Korean (`ko.json`)

---

## Content Guidelines Compliance

| Requirement | Implementation |
|-------------|----------------|
| Supportive, non-judgmental tone | All copy uses encouraging, caring language |
| No calorie targets | Content focuses on behaviors, not numbers |
| No weight-loss instructions | Emphasizes fueling for performance |
| No triggering language | Avoids specific weights, measurements, or restrictive language |
| Age-appropriate | Written for youth athletes (10+) with relevance to parents/coaches |
| Clear disclaimer | Each section has prominent educational-only disclaimer |
| Encourages professional help | Multiple touchpoints for seeking trusted adults/professionals |

---

## UI/UX Design

### Visual Hierarchy
- Uses soft, calming colors (teal/sage for Body Image, amber/warm for Eating Disorder awareness)
- Collapsible by default to not overwhelm the page
- Clear iconography (Heart for Eating Disorder, User/Smile for Body Image)

### Accessibility
- High contrast text
- Screen reader friendly structure
- Touch-friendly tap targets

### Disclaimer Styling
- Prominent but not alarming
- Uses amber/warning color palette (matching existing NutritionDisclaimer)
- Includes specific "seek help" messaging

---

## Sample Content Preview

### Eating Disorder Education - Introduction
> "Understanding the relationship between food and our bodies is an important part of being an athlete. This section provides educational information to help you recognize when eating habits might become unhealthy. Remember: this is not medical advice, and if you have concerns, please talk to a trusted adult or healthcare professional."

### Body Image Education - Introduction  
> "Athletes come in all shapes and sizes. What matters most is how your body performs, recovers, and helps you achieve your goals. This section helps you build a healthy relationship with your body and resist unhelpful comparisons."

### Support Resources Section
> "If you or someone you know is struggling with food or body image concerns, please reach out to:
> - A parent, guardian, or trusted family member
> - A coach, teacher, or school counselor
> - A doctor or healthcare provider
> - The National Eating Disorders Association: 1-800-931-2237"

---

## Technical Implementation Details

### Component Pattern
```tsx
// Following the HealthyBoundaries.tsx pattern
export default function EatingDisorderEducation() {
  const { t } = useTranslation();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  return (
    <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
      {/* Header with icon and disclaimer */}
      {/* Expandable sections for each topic */}
      {/* Support resources card */}
    </Card>
  );
}
```

### Icons to Use
- Eating Disorder: `Heart`, `AlertTriangle`, `Shield`
- Body Image: `Users`, `Sparkles`, `Trophy`, `Dumbbell`
- Support: `Phone`, `MessageCircle`, `HandHeart`

---

## Summary of Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/nutrition/EatingDisorderEducation.tsx` | Create | New educational component |
| `src/components/nutrition/BodyImageEducation.tsx` | Create | New educational component |
| `src/pages/Nutrition.tsx` | Modify | Add education section |
| `src/i18n/locales/en.json` | Modify | Add ~80 new translation keys |
| `src/i18n/locales/es.json` | Modify | Add Spanish translations |
| `src/i18n/locales/fr.json` | Modify | Add French translations |
| `src/i18n/locales/de.json` | Modify | Add German translations |
| `src/i18n/locales/ja.json` | Modify | Add Japanese translations |
| `src/i18n/locales/zh.json` | Modify | Add Chinese translations |
| `src/i18n/locales/nl.json` | Modify | Add Dutch translations |
| `src/i18n/locales/ko.json` | Modify | Add Korean translations |

---

## Expected Outcome

After implementation:
1. Users see a new "Athlete Wellness Education" section in the Nutrition module
2. Two collapsible educational cards provide comprehensive, age-appropriate content
3. Clear disclaimers establish this is educational content only
4. Supportive messaging encourages seeking professional help when needed
5. Content is fully localized across all 8 supported languages
6. Design follows existing UI patterns for visual consistency
