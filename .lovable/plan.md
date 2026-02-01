

# Complete Fascia Translations - All 8 Languages to 100%

## Overview

Add the complete `fascia` namespace translations to all 7 non-English language files. The English source (lines 4625-4678 in `en.json`) contains 55 translation keys that need to be accurately translated while maintaining:

1. **Kid-friendly tone** (understandable by 10-year-olds)
2. **Accurate analogies** (spider web, bedsheet, train tracks)
3. **Legal compliance** (educational disclaimers)
4. **Cultural appropriateness** per language

---

## English Source Keys (Reference)

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
      "compact": "Educational only - always consult a professional"
    },
    "education": {
      "title": "How Your Body Connects",
      "webAnalogy": "Did you know your body has an invisible web inside?",
      "whatIsFascia": "It's called fascia (fash-ee-uh), and it wraps around every muscle like a stretchy suit.",
      "sheetAnalogy": "When one part gets tight, it can pull on other parts - like pulling one corner of a bedsheet!",
      "whyProsCare": "Why Pros Care",
      "prosCareExplanation": "Top athletes know that pain in one spot might come from tightness in a completely different spot. They stretch the WHOLE track, not just where it hurts!",
      "realScience": "This comes from real science! Researchers like Thomas Myers and Dr. Robert Schleip study how our bodies connect.",
      "important": "If something hurts a lot, ALWAYS talk to your coach, parent, or doctor!"
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
| `src/i18n/locales/es.json` | Spanish | Add fascia namespace |
| `src/i18n/locales/fr.json` | French | Add fascia namespace |
| `src/i18n/locales/de.json` | German | Add fascia namespace |
| `src/i18n/locales/ja.json` | Japanese | Add fascia namespace |
| `src/i18n/locales/zh.json` | Chinese (Simplified) | Add fascia namespace |
| `src/i18n/locales/ko.json` | Korean | Add fascia namespace |
| `src/i18n/locales/nl.json` | Dutch | Add fascia namespace |

---

## Translation Details by Language

### 1. Spanish (es.json)

```json
"fascia": {
  "bodyConnection": {
    "title": "Conexion Corporal",
    "subtitle": "Como se conectan las partes de tu cuerpo"
  },
  "bodyLine": {
    "sbl": "Linea de Espalda",
    "sfl": "Linea Frontal",
    "ll": "Linea Lateral",
    "spl": "Linea en Espiral",
    "dfl": "Linea Central",
    "arm": "Lineas del Brazo"
  },
  "onBodyLine": "Esto esta en tu \"{{lineName}}\"",
  "connectedSpots": "Puntos Conectados",
  "proTip": "Consejo Pro",
  "whyItMightHurt": "Por Que Podria Doler",
  "whatProsDo": "Lo Que Hacen los Pros",
  "selfCareTip": "Consejo de Autocuidado",
  "patternDetected": "Patron detectado en {{lineName}}",
  "disclaimer": {
    "title": "Solo Para Aprender!",
    "text": "Esta es informacion educativa solamente. Siempre habla con un doctor, entrenador o adulto de confianza sobre dolores que no desaparecen.",
    "compact": "Solo educativo - siempre consulta a un profesional"
  },
  "education": {
    "title": "Como Se Conecta Tu Cuerpo",
    "webAnalogy": "Sabias que tu cuerpo tiene una telarana invisible adentro?",
    "whatIsFascia": "Se llama fascia (fash-ee-uh), y envuelve cada musculo como un traje elastico.",
    "sheetAnalogy": "Cuando una parte se tensa, puede tirar de otras partes - como jalar una esquina de una sabana!",
    "whyProsCare": "Por Que Les Importa a los Pros",
    "prosCareExplanation": "Los atletas de elite saben que el dolor en un lugar puede venir de tension en un lugar completamente diferente. Estiran TODA la linea, no solo donde duele!",
    "realScience": "Esto viene de ciencia real! Investigadores como Thomas Myers y Dr. Robert Schleip estudian como se conectan nuestros cuerpos.",
    "important": "Si algo duele mucho, SIEMPRE habla con tu entrenador, padre o doctor!"
  },
  "recap": {
    "title": "Patrones de Conexion Corporal",
    "kidSummary": "Tu cuerpo esta conectado como una telarana!",
    "whatThisMeans": "Que Significa Esto",
    "proMove": "Movimiento Pro"
  },
  "patternAlert": {
    "clue": "Pista de Conexion Corporal",
    "proMove": "Lo Que Hacen los Pros",
    "connectedToCheck": "Puntos conectados para revisar",
    "remember": "Recuerda: Habla con un entrenador, padre o doctor sobre esto."
  },
  "heatMap": {
    "showBodyLines": "Mostrar Lineas del Cuerpo"
  },
  "research": {
    "attribution": "Basado en investigacion de {{sources}}",
    "basedOn": "Basado en"
  }
}
```

### 2. French (fr.json)

```json
"fascia": {
  "bodyConnection": {
    "title": "Connexion Corporelle",
    "subtitle": "Comment les parties de ton corps sont connectees"
  },
  "bodyLine": {
    "sbl": "Ligne du Dos",
    "sfl": "Ligne Frontale",
    "ll": "Ligne Laterale",
    "spl": "Ligne en Spirale",
    "dfl": "Ligne Centrale",
    "arm": "Lignes du Bras"
  },
  "onBodyLine": "C'est sur ta \"{{lineName}}\"",
  "connectedSpots": "Points Connectes",
  "proTip": "Astuce Pro",
  "whyItMightHurt": "Pourquoi Ca Pourrait Faire Mal",
  "whatProsDo": "Ce Que Font les Pros",
  "selfCareTip": "Conseil d'Auto-Soin",
  "patternDetected": "Motif detecte sur {{lineName}}",
  "disclaimer": {
    "title": "Juste Pour Apprendre!",
    "text": "Ceci est une information educative uniquement. Parle toujours a un docteur, entraineur ou adulte de confiance pour les douleurs qui ne disparaissent pas.",
    "compact": "Educatif seulement - consulte toujours un professionnel"
  },
  "education": {
    "title": "Comment Ton Corps Est Connecte",
    "webAnalogy": "Savais-tu que ton corps a une toile invisible a l'interieur?",
    "whatIsFascia": "Ca s'appelle le fascia (fash-ee-uh), et ca enveloppe chaque muscle comme une combinaison elastique.",
    "sheetAnalogy": "Quand une partie se tend, ca peut tirer sur d'autres parties - comme tirer un coin d'un drap!",
    "whyProsCare": "Pourquoi Les Pros S'en Soucient",
    "prosCareExplanation": "Les athletes de haut niveau savent que la douleur a un endroit peut venir d'une tension ailleurs. Ils etirent TOUTE la ligne, pas seulement la ou ca fait mal!",
    "realScience": "Ca vient de vraie science! Des chercheurs comme Thomas Myers et Dr. Robert Schleip etudient comment nos corps sont connectes.",
    "important": "Si quelque chose fait tres mal, parle TOUJOURS a ton entraineur, parent ou docteur!"
  },
  "recap": {
    "title": "Motifs de Connexion Corporelle",
    "kidSummary": "Ton corps est connecte comme une toile d'araignee!",
    "whatThisMeans": "Ce Que Ca Veut Dire",
    "proMove": "Mouvement Pro"
  },
  "patternAlert": {
    "clue": "Indice de Connexion Corporelle",
    "proMove": "Ce Que Font les Pros",
    "connectedToCheck": "Points connectes a verifier",
    "remember": "Rappel: Parle a un entraineur, parent ou docteur."
  },
  "heatMap": {
    "showBodyLines": "Afficher les Lignes du Corps"
  },
  "research": {
    "attribution": "Base sur les recherches de {{sources}}",
    "basedOn": "Base sur"
  }
}
```

### 3. German (de.json)

```json
"fascia": {
  "bodyConnection": {
    "title": "Korperverbindung",
    "subtitle": "Wie deine Korperteile verbunden sind"
  },
  "bodyLine": {
    "sbl": "Ruckenlinie",
    "sfl": "Frontlinie",
    "ll": "Seitenlinie",
    "spl": "Spirallinie",
    "dfl": "Kernlinie",
    "arm": "Armlinien"
  },
  "onBodyLine": "Das ist auf deiner \"{{lineName}}\"",
  "connectedSpots": "Verbundene Stellen",
  "proTip": "Profi-Tipp",
  "whyItMightHurt": "Warum Es Weh Tun Konnte",
  "whatProsDo": "Was die Profis Machen",
  "selfCareTip": "Selbstpflege-Tipp",
  "patternDetected": "Muster erkannt bei {{lineName}}",
  "disclaimer": {
    "title": "Nur Zum Lernen!",
    "text": "Dies ist nur Bildungsinformation. Sprich immer mit einem Arzt, Trainer oder vertrauenswurdigen Erwachsenen uber Schmerzen die nicht weggehen.",
    "compact": "Nur zur Bildung - immer einen Fachmann konsultieren"
  },
  "education": {
    "title": "Wie Dein Korper Verbunden Ist",
    "webAnalogy": "Wusstest du dass dein Korper ein unsichtbares Netz in sich hat?",
    "whatIsFascia": "Es heisst Faszien (fash-ee-uh), und es umwickelt jeden Muskel wie ein dehnbarer Anzug.",
    "sheetAnalogy": "Wenn ein Teil angespannt wird, kann es an anderen Teilen ziehen - wie wenn du an einer Ecke eines Bettlakens ziehst!",
    "whyProsCare": "Warum Profis Das Wichtig Ist",
    "prosCareExplanation": "Spitzenathleten wissen dass Schmerz an einer Stelle von Spannung an einer ganz anderen Stelle kommen kann. Sie dehnen die GANZE Linie, nicht nur wo es weh tut!",
    "realScience": "Das kommt aus echter Wissenschaft! Forscher wie Thomas Myers und Dr. Robert Schleip untersuchen wie unsere Korper verbunden sind.",
    "important": "Wenn etwas sehr weh tut, sprich IMMER mit deinem Trainer, Eltern oder Arzt!"
  },
  "recap": {
    "title": "Korperverbindungs-Muster",
    "kidSummary": "Dein Korper ist verbunden wie ein Spinnennetz!",
    "whatThisMeans": "Was Das Bedeutet",
    "proMove": "Profi-Zug"
  },
  "patternAlert": {
    "clue": "Korperverbindungs-Hinweis",
    "proMove": "Was die Profis Machen",
    "connectedToCheck": "Verbundene Stellen zum Prufen",
    "remember": "Denk dran: Sprich mit einem Trainer, Eltern oder Arzt daruber."
  },
  "heatMap": {
    "showBodyLines": "Korperlinien Anzeigen"
  },
  "research": {
    "attribution": "Basiert auf Forschung von {{sources}}",
    "basedOn": "Basiert auf"
  }
}
```

### 4. Japanese (ja.json)

```json
"fascia": {
  "bodyConnection": {
    "title": "体のつながり",
    "subtitle": "体の部分がどうつながっているか"
  },
  "bodyLine": {
    "sbl": "背中ライン",
    "sfl": "前ライン",
    "ll": "横ライン",
    "spl": "らせんライン",
    "dfl": "中心ライン",
    "arm": "腕ライン"
  },
  "onBodyLine": "これはあなたの「{{lineName}}」にあります",
  "connectedSpots": "つながっている場所",
  "proTip": "プロのヒント",
  "whyItMightHurt": "痛むかもしれない理由",
  "whatProsDo": "プロがすること",
  "selfCareTip": "セルフケアのヒント",
  "patternDetected": "{{lineName}}でパターンが検出されました",
  "disclaimer": {
    "title": "学習用です!",
    "text": "これは教育目的の情報です。治らない痛みについては、必ず医師、トレーナー、または信頼できる大人に相談してください。",
    "compact": "教育目的のみ - 必ず専門家に相談"
  },
  "education": {
    "title": "体のつながり方",
    "webAnalogy": "体の中に見えない網があるって知ってた?",
    "whatIsFascia": "それは筋膜(きんまく)といって、すべての筋肉を伸縮性のあるスーツのように包んでいます。",
    "sheetAnalogy": "一部分が硬くなると、他の部分も引っ張られる - シーツの角を引っ張るみたいに!",
    "whyProsCare": "なぜプロが気にするのか",
    "prosCareExplanation": "トップアスリートは、ある場所の痛みが全く違う場所の硬さから来ることを知っています。痛い場所だけじゃなく、ライン全体をストレッチします!",
    "realScience": "これは本当の科学に基づいています! Thomas MyersやDr. Robert Schleipなどの研究者が体のつながりを研究しています。",
    "important": "何かがすごく痛いときは、必ずコーチ、親、または医師に話してね!"
  },
  "recap": {
    "title": "体のつながりパターン",
    "kidSummary": "あなたの体はクモの巣のようにつながっています!",
    "whatThisMeans": "これが意味すること",
    "proMove": "プロの動き"
  },
  "patternAlert": {
    "clue": "体のつながりヒント",
    "proMove": "プロがすること",
    "connectedToCheck": "確認すべきつながっている場所",
    "remember": "覚えておいて: これについてコーチ、親、または医師に話してね。"
  },
  "heatMap": {
    "showBodyLines": "体のラインを表示"
  },
  "research": {
    "attribution": "{{sources}}の研究に基づく",
    "basedOn": "基づく"
  }
}
```

### 5. Chinese Simplified (zh.json)

```json
"fascia": {
  "bodyConnection": {
    "title": "身体连接",
    "subtitle": "身体各部分是如何连接的"
  },
  "bodyLine": {
    "sbl": "背部线",
    "sfl": "前部线",
    "ll": "侧边线",
    "spl": "螺旋线",
    "dfl": "核心线",
    "arm": "手臂线"
  },
  "onBodyLine": "这在你的\"{{lineName}}\"上",
  "connectedSpots": "连接的部位",
  "proTip": "专业提示",
  "whyItMightHurt": "为什么可能会痛",
  "whatProsDo": "专业运动员怎么做",
  "selfCareTip": "自我护理提示",
  "patternDetected": "在{{lineName}}检测到模式",
  "disclaimer": {
    "title": "仅供学习!",
    "text": "这仅是教育信息。对于持续的疼痛,请务必咨询医生、教练或值得信赖的成年人。",
    "compact": "仅供教育 - 请务必咨询专业人士"
  },
  "education": {
    "title": "你的身体如何连接",
    "webAnalogy": "你知道你的身体里有一张看不见的网吗?",
    "whatIsFascia": "它叫做筋膜(fascia),像一件有弹性的衣服一样包裹着每块肌肉。",
    "sheetAnalogy": "当一个部位变紧时,会拉动其他部位 - 就像拉床单的一角一样!",
    "whyProsCare": "为什么专业运动员在意这个",
    "prosCareExplanation": "顶级运动员知道一个地方的疼痛可能来自完全不同位置的紧张。他们拉伸整条线,而不只是疼的地方!",
    "realScience": "这来自真正的科学! 像Thomas Myers和Dr. Robert Schleip这样的研究者在研究我们的身体是如何连接的。",
    "important": "如果某个地方很痛,一定要告诉你的教练、父母或医生!"
  },
  "recap": {
    "title": "身体连接模式",
    "kidSummary": "你的身体像蜘蛛网一样连接在一起!",
    "whatThisMeans": "这意味着什么",
    "proMove": "专业动作"
  },
  "patternAlert": {
    "clue": "身体连接线索",
    "proMove": "专业运动员怎么做",
    "connectedToCheck": "需要检查的连接部位",
    "remember": "记住: 与教练、父母或医生谈谈这件事。"
  },
  "heatMap": {
    "showBodyLines": "显示身体线条"
  },
  "research": {
    "attribution": "基于{{sources}}的研究",
    "basedOn": "基于"
  }
}
```

### 6. Korean (ko.json)

```json
"fascia": {
  "bodyConnection": {
    "title": "신체 연결",
    "subtitle": "신체 부위가 어떻게 연결되어 있는지"
  },
  "bodyLine": {
    "sbl": "등 라인",
    "sfl": "앞 라인",
    "ll": "옆 라인",
    "spl": "나선 라인",
    "dfl": "코어 라인",
    "arm": "팔 라인"
  },
  "onBodyLine": "이것은 당신의 \"{{lineName}}\"에 있습니다",
  "connectedSpots": "연결된 부위",
  "proTip": "프로 팁",
  "whyItMightHurt": "아플 수 있는 이유",
  "whatProsDo": "프로들이 하는 것",
  "selfCareTip": "자기 관리 팁",
  "patternDetected": "{{lineName}}에서 패턴 감지됨",
  "disclaimer": {
    "title": "학습용입니다!",
    "text": "이것은 교육 정보일 뿐입니다. 사라지지 않는 통증에 대해서는 항상 의사, 트레이너 또는 믿을 수 있는 어른과 상담하세요.",
    "compact": "교육 목적만 - 항상 전문가와 상담하세요"
  },
  "education": {
    "title": "당신의 몸이 어떻게 연결되어 있는지",
    "webAnalogy": "당신의 몸 안에 보이지 않는 그물이 있다는 거 알아요?",
    "whatIsFascia": "그것은 근막(fascia)이라고 하고, 신축성 있는 옷처럼 모든 근육을 감싸고 있어요.",
    "sheetAnalogy": "한 부분이 팽팽해지면 다른 부분도 당겨질 수 있어요 - 침대 시트의 한 모서리를 당기는 것처럼요!",
    "whyProsCare": "왜 프로들이 신경 쓰는지",
    "prosCareExplanation": "최고의 운동선수들은 한 곳의 통증이 완전히 다른 곳의 긴장에서 올 수 있다는 것을 알아요. 그들은 아픈 곳만이 아니라 전체 라인을 스트레칭해요!",
    "realScience": "이것은 진짜 과학에서 나온 거예요! Thomas Myers와 Dr. Robert Schleip 같은 연구자들이 우리 몸이 어떻게 연결되어 있는지 연구해요.",
    "important": "무언가 많이 아프면, 항상 코치, 부모님 또는 의사에게 말하세요!"
  },
  "recap": {
    "title": "신체 연결 패턴",
    "kidSummary": "당신의 몸은 거미줄처럼 연결되어 있어요!",
    "whatThisMeans": "이것이 의미하는 것",
    "proMove": "프로 무브"
  },
  "patternAlert": {
    "clue": "신체 연결 단서",
    "proMove": "프로들이 하는 것",
    "connectedToCheck": "확인해야 할 연결된 부위",
    "remember": "기억하세요: 이것에 대해 코치, 부모님 또는 의사에게 말하세요."
  },
  "heatMap": {
    "showBodyLines": "신체 라인 보기"
  },
  "research": {
    "attribution": "{{sources}}의 연구 기반",
    "basedOn": "기반"
  }
}
```

### 7. Dutch (nl.json)

```json
"fascia": {
  "bodyConnection": {
    "title": "Lichaamsverbinding",
    "subtitle": "Hoe je lichaamsdelen met elkaar verbonden zijn"
  },
  "bodyLine": {
    "sbl": "Ruglijn",
    "sfl": "Frontlijn",
    "ll": "Zijlijn",
    "spl": "Spiraallijn",
    "dfl": "Kernlijn",
    "arm": "Armlijnen"
  },
  "onBodyLine": "Dit zit op je \"{{lineName}}\"",
  "connectedSpots": "Verbonden Plekken",
  "proTip": "Pro Tip",
  "whyItMightHurt": "Waarom Het Pijn Kan Doen",
  "whatProsDo": "Wat de Profs Doen",
  "selfCareTip": "Zelfzorg Tip",
  "patternDetected": "Patroon gedetecteerd op {{lineName}}",
  "disclaimer": {
    "title": "Alleen Om Te Leren!",
    "text": "Dit is alleen educatieve informatie. Praat altijd met een dokter, trainer of vertrouwde volwassene over pijn die niet weggaat.",
    "compact": "Alleen educatief - raadpleeg altijd een professional"
  },
  "education": {
    "title": "Hoe Je Lichaam Verbonden Is",
    "webAnalogy": "Wist je dat je lichaam een onzichtbaar web in zich heeft?",
    "whatIsFascia": "Het heet fascia (fash-ee-uh), en het wikkelt om elke spier als een rekbaar pak.",
    "sheetAnalogy": "Als een deel strak wordt, kan het aan andere delen trekken - zoals wanneer je aan een hoek van een laken trekt!",
    "whyProsCare": "Waarom Profs Het Belangrijk Vinden",
    "prosCareExplanation": "Topathleten weten dat pijn op een plek kan komen door spanning op een heel andere plek. Ze stretchen de HELE lijn, niet alleen waar het pijn doet!",
    "realScience": "Dit komt uit echte wetenschap! Onderzoekers zoals Thomas Myers en Dr. Robert Schleip bestuderen hoe onze lichamen verbonden zijn.",
    "important": "Als iets heel erg pijn doet, praat ALTIJD met je coach, ouder of dokter!"
  },
  "recap": {
    "title": "Lichaamsverbinding Patronen",
    "kidSummary": "Je lichaam is verbonden als een spinnenweb!",
    "whatThisMeans": "Wat Dit Betekent",
    "proMove": "Pro Zet"
  },
  "patternAlert": {
    "clue": "Lichaamsverbinding Hint",
    "proMove": "Wat de Profs Doen",
    "connectedToCheck": "Verbonden plekken om te checken",
    "remember": "Onthoud: Praat met een coach, ouder of dokter hierover."
  },
  "heatMap": {
    "showBodyLines": "Lichaamslijnen Tonen"
  },
  "research": {
    "attribution": "Gebaseerd op onderzoek door {{sources}}",
    "basedOn": "Gebaseerd op"
  }
}
```

---

## Implementation Steps

| Step | Action | File |
|------|--------|------|
| 1 | Add fascia namespace to Spanish | `es.json` |
| 2 | Add fascia namespace to French | `fr.json` |
| 3 | Add fascia namespace to German | `de.json` |
| 4 | Add fascia namespace to Japanese | `ja.json` |
| 5 | Add fascia namespace to Chinese | `zh.json` |
| 6 | Add fascia namespace to Korean | `ko.json` |
| 7 | Add fascia namespace to Dutch | `nl.json` |

---

## Insertion Location

For each file, the `fascia` namespace will be inserted after the existing content that corresponds to around line 4623 (after the streak/wellness section), maintaining alphabetical ordering with surrounding namespaces.

---

## Validation Checklist

| Check | Expected |
|-------|----------|
| All 8 languages have fascia namespace | Yes |
| Kid-friendly tone preserved | Yes |
| Spider web analogy translated naturally | Yes |
| Bedsheet analogy culturally appropriate | Yes |
| Legal disclaimers properly translated | Yes |
| Placeholders {{lineName}}, {{sources}} preserved | Yes |
| No broken JSON syntax | Yes |

---

## Summary

This plan adds 55 translation keys to 7 language files, bringing the Elite Fascia Science Integration to 100% completion across all supported languages. Each translation maintains:

- Kid-friendly language (10-year-old understandable)
- Accurate scientific analogies (spider web, bedsheet, train tracks)
- Mandatory educational disclaimers for legal compliance
- Cultural appropriateness per language/region

