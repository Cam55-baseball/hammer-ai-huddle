
# Complete Fascia Science Translations - 8 Languages to 100%

## Overview

This plan adds the complete `fascia` translation namespace to all 7 remaining language files, bringing the Elite Fascia Science Integration to 100% completion. The English keys (already implemented) serve as the source for kid-friendly, research-backed terminology.

---

## Translation Keys to Add

The following `fascia` namespace (54 keys) must be added to each language file:

```json
{
  "fascia": {
    "bodyConnection": {
      "title": "Body Connection Insight",
      "subtitle": "How your body parts are connected"
    },
    "bodyLine": {
      "sbl": "Back Track",
      "sfl": "Front Track",
      "ll": "Side Track",
      "spl": "Twist Track",
      "dfl": "Core Track",
      "arm": "Arm Tracks"
    },
    "onBodyLine": "This is on your \"{{lineName}}\"",
    "connectedSpots": "Connected Spots",
    "proTip": "Pro Tip",
    "whyItMightHurt": "Why It Might Hurt",
    "whatProsDo": "What the Pros Do",
    "selfCareTip": "Self-Care Tip",
    "patternDetected": "Pattern detected on {{lineName}}",
    "disclaimer": {
      "title": "Just For Learning!",
      "text": "This is educational information only. Always talk to a doctor, trainer, or trusted adult about pain that doesn't go away.",
      "compact": "Educational only - always consult a professional",
      "bullet1": "Tell your coach or parent if something hurts",
      "bullet2": "See a doctor or athletic trainer for real pain",
      "bullet3": "Don't train through serious pain"
    },
    "education": {
      "title": "How Your Body Connects",
      "subtitle": "Tap to learn like a pro!",
      "webAnalogy": "Did you know your body has an invisible web inside?",
      "whatIsFascia": "It's called fascia (fash-ee-uh), and it wraps around every muscle like a stretchy suit.",
      "sheetAnalogy": "When one part gets tight, it can pull on other parts - like pulling one corner of a bedsheet!",
      "mainTracksTitle": "The Main \"Body Tracks\"",
      "whyProsCare": "Why Pros Care",
      "proExplanation": "Top athletes know that pain in one spot might come from tightness in a completely different spot. They stretch the WHOLE track, not just where it hurts!",
      "researchTitle": "This comes from real science!",
      "researchers": "Researchers like Thomas Myers (Anatomy Trains), Dr. Robert Schleip, and Carla & Antonio Stecco study how our bodies connect. Pretty cool, right?"
    },
    "recap": {
      "title": "Body Connection Patterns",
      "kidSummary": "Your body is connected like a spider web!",
      "whatThisMeans": "What This Means",
      "proMove": "Pro Move"
    },
    "patternAlert": {
      "clue": "Body Connection Clue",
      "proMove": "What the Pros Do",
      "connectedToCheck": "Connected spots to check",
      "remember": "Remember: Talk to a coach, parent, or doctor about this."
    },
    "heatMap": {
      "showBodyLines": "Show Body Lines"
    },
    "research": {
      "attribution": "Based on research by {{sources}}",
      "basedOn": "Based on"
    }
  }
}
```

---

## Files to Modify

| File | Language | Status |
|------|----------|--------|
| `src/i18n/locales/en.json` | English | Already complete - add missing keys |
| `src/i18n/locales/es.json` | Spanish | Add fascia namespace |
| `src/i18n/locales/fr.json` | French | Add fascia namespace |
| `src/i18n/locales/de.json` | German | Add fascia namespace |
| `src/i18n/locales/ja.json` | Japanese | Add fascia namespace |
| `src/i18n/locales/zh.json` | Chinese (Simplified) | Add fascia namespace |
| `src/i18n/locales/ko.json` | Korean | Add fascia namespace |
| `src/i18n/locales/nl.json` | Dutch | Add fascia namespace |

---

## Translation Guidelines

### Kid-Friendly Language Requirements
- Use simple words a 10-year-old can understand
- Maintain analogies (spider web, train tracks, bedsheet)
- Keep the playful tone across all languages
- Preserve emojis in translated content

### Legal Compliance (Critical)
- Disclaimer text must maintain the same legal meaning
- "Educational only" must be clear in all languages
- "Consult a professional" must be unambiguous

### Technical Notes
- Preserve `{{lineName}}` and `{{sources}}` interpolation placeholders
- Maintain JSON structure exactly
- Insert at approximately line 4625 (after "streakFlame" section)

---

## Language-Specific Translations

### Spanish (es.json)
```json
"fascia": {
  "bodyConnection": {
    "title": "Conexion Corporal",
    "subtitle": "Como tus partes del cuerpo estan conectadas"
  },
  "bodyLine": {
    "sbl": "Via de la Espalda",
    "sfl": "Via Frontal",
    "ll": "Via Lateral",
    "spl": "Via en Espiral",
    "dfl": "Via del Core",
    "arm": "Vias de los Brazos"
  }
  // ... full namespace
}
```

### French (fr.json)
```json
"fascia": {
  "bodyConnection": {
    "title": "Connexion Corporelle",
    "subtitle": "Comment tes parties du corps sont connectees"
  },
  "bodyLine": {
    "sbl": "Ligne du Dos",
    "sfl": "Ligne Frontale",
    "ll": "Ligne Laterale",
    "spl": "Ligne en Spirale",
    "dfl": "Ligne du Centre",
    "arm": "Lignes des Bras"
  }
  // ... full namespace
}
```

### German (de.json)
```json
"fascia": {
  "bodyConnection": {
    "title": "Korperverbindung",
    "subtitle": "Wie deine Korperteile verbunden sind"
  },
  "bodyLine": {
    "sbl": "Ruckenbahn",
    "sfl": "Vorderbahn",
    "ll": "Seitenbahn",
    "spl": "Spiralbahn",
    "dfl": "Kernbahn",
    "arm": "Armbahnen"
  }
  // ... full namespace
}
```

### Japanese (ja.json)
```json
"fascia": {
  "bodyConnection": {
    "title": "体のつながり",
    "subtitle": "体の部分がどうつながっているか"
  },
  "bodyLine": {
    "sbl": "背中ライン",
    "sfl": "前面ライン",
    "ll": "横ライン",
    "spl": "らせんライン",
    "dfl": "コアライン",
    "arm": "腕ライン"
  }
  // ... full namespace
}
```

### Chinese Simplified (zh.json)
```json
"fascia": {
  "bodyConnection": {
    "title": "身体连接",
    "subtitle": "你的身体部位如何连接"
  },
  "bodyLine": {
    "sbl": "背部轨道",
    "sfl": "前部轨道",
    "ll": "侧面轨道",
    "spl": "螺旋轨道",
    "dfl": "核心轨道",
    "arm": "手臂轨道"
  }
  // ... full namespace
}
```

### Korean (ko.json)
```json
"fascia": {
  "bodyConnection": {
    "title": "신체 연결",
    "subtitle": "몸의 부위가 어떻게 연결되어 있는지"
  },
  "bodyLine": {
    "sbl": "등 라인",
    "sfl": "앞 라인",
    "ll": "옆 라인",
    "spl": "나선 라인",
    "dfl": "코어 라인",
    "arm": "팔 라인"
  }
  // ... full namespace
}
```

### Dutch (nl.json)
```json
"fascia": {
  "bodyConnection": {
    "title": "Lichaamsverbinding",
    "subtitle": "Hoe je lichaamsdelen verbonden zijn"
  },
  "bodyLine": {
    "sbl": "Rugbaan",
    "sfl": "Voorkantbaan",
    "ll": "Zijkantbaan",
    "spl": "Spiraalbaan",
    "dfl": "Kernbaan",
    "arm": "Armbanen"
  }
  // ... full namespace
}
```

---

## Implementation Steps

1. **Update English file** - Add any missing keys (bullet1-3, education.subtitle, etc.)
2. **Add Spanish translations** - Full fascia namespace to es.json
3. **Add French translations** - Full fascia namespace to fr.json
4. **Add German translations** - Full fascia namespace to de.json
5. **Add Japanese translations** - Full fascia namespace to ja.json
6. **Add Chinese translations** - Full fascia namespace to zh.json
7. **Add Korean translations** - Full fascia namespace to ko.json
8. **Add Dutch translations** - Full fascia namespace to nl.json
9. **Update plan.md** - Mark translations as 100% complete

---

## Validation Checklist

| Check | Expected Result |
|-------|-----------------|
| All 8 language files | Have complete fascia namespace |
| Interpolation placeholders | `{{lineName}}`, `{{sources}}` preserved |
| Kid-friendly tone | Maintained across all languages |
| Legal disclaimers | Clear and unambiguous in each language |
| JSON syntax | Valid, no trailing commas |
| Component rendering | No missing translation warnings |

---

## Summary

This implementation completes the Elite Fascia Science Integration by providing full internationalization support across all 8 supported languages. Young athletes worldwide will be able to learn about body connections in their native language with the same kid-friendly, research-backed educational content.
