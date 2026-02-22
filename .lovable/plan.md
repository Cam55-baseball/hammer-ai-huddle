

# AI Help Desk System + Biomechanics Coach in Analysis Pages

## Overview

This plan has two parts:
1. **Transform the floating chatbot into a Help Desk system** with a dedicated page and structured FAQ
2. **Move the biomechanics coaching chatbot into the analysis pages** so athletes can ask follow-up questions after receiving their video analysis

---

## Part 1: Help Desk System

### New Edge Function: `supabase/functions/ai-helpdesk/index.ts`

A dedicated backend function for help desk queries:
- Authenticates the user and fetches their role (player, coach, scout, admin, owner)
- Fetches subscribed modules for context
- Uses a comprehensive system prompt containing the full app knowledge base: navigation paths, feature explanations, FAQ content, role-specific guidance
- Uses `google/gemini-3-flash-preview` model
- Fallback: if the AI cannot answer, directs users to contact support
- Handles 429/402 errors

### New Page: `src/pages/HelpDesk.tsx`

A full page at `/help-desk` with:
- **Search bar** to filter FAQ topics
- **Categorized FAQ accordion** covering: Getting Started, Training Modules, Custom Activities, Vault and AI Recap, Account and Settings, and role-specific sections for Coaches/Scouts
- **Quick navigation cards** linking to common destinations (Dashboard, Custom Activities, Profile, etc.)
- **Embedded AI chat** at the bottom for questions not covered in the FAQ

### New Component: `src/components/HelpDeskChat.tsx`

A reusable chat component that:
- Accepts an `embedded` prop (true = full-width for the help desk page, false = floating card)
- Calls the `ai-helpdesk` edge function
- Shows suggested quick-action buttons ("How do I analyze a video?", "What modules are available?", "How do custom fields work?")
- Renders AI responses with basic markdown formatting (bold, lists, line breaks)
- Displays a clear greeting explaining this is the **app support assistant** (not the biomechanics coach)

### Update: `src/components/FloatingChatButton.tsx`

- Replace `ChatWidget` with `HelpDeskChat` (embedded=false)
- Same floating button in bottom-right corner, now labeled/branded as Help Desk

### Update: `src/components/AppSidebar.tsx`

- Add "Help Desk" item with `HelpCircle` icon to `accountItems`, positioned as the first item (above Profile/Settings)
- URL: `/help-desk`

### Update: `src/App.tsx`

- Add lazy import for `HelpDesk` page
- Add route: `/help-desk`

### i18n Updates (all 8 locale files)

Add translation keys for:
- `navigation.helpDesk`
- `helpDesk.title`, `helpDesk.searchPlaceholder`, `helpDesk.faqTitle`, `helpDesk.chatTitle`
- `helpDesk.greeting` -- clearly states: "I'm your app support assistant. Ask me how to navigate, use features, or troubleshoot issues."
- `helpDesk.fallback` -- "I'm not sure about that. Please contact support for further help."
- FAQ category and content keys

---

## Part 2: Biomechanics Coaching Chatbot in Analysis Pages

### What Changes

The existing `ai-chat` edge function (biomechanics coaching assistant) stays as-is -- it already has the coaching system prompt, owner philosophy, and user context. Instead of being attached to the floating button (which now becomes Help Desk), this coaching chat gets embedded directly into the analysis results page.

### New Component: `src/components/AnalysisCoachChat.tsx`

A dedicated chat component for post-analysis coaching questions:
- Clearly labeled: **"Ask the Coach"** with a subtitle like "Have questions about your analysis? Ask our AI biomechanics coach."
- Calls the existing `ai-chat` edge function (same coaching backend)
- Accepts an `analysisContext` prop containing the analysis results (feedback, score, drills) so the AI has full context of what was just analyzed
- Sends the analysis summary as part of the conversation context so the coach can reference specific findings
- Collapsible by default -- expands when the user taps "Ask the Coach"
- Shows 2-3 suggested starter questions based on the analysis type:
  - Hitting: "What drills fix my bat path?", "How do I improve my timing?"
  - Pitching: "How do I keep my chest closed longer?", "What causes arm drag?"
  - Throwing: "How do I improve my transfer?", "What footwork drills help accuracy?"

### Update: `src/pages/AnalyzeVideo.tsx`

- Import `AnalysisCoachChat`
- Place it after the analysis results card (after the disclaimer and action buttons, around line 951) -- only visible when `analysis` exists
- Pass the current analysis data and module type as props so the coaching AI has full context

### Update: `supabase/functions/ai-chat/index.ts`

- Accept an optional `analysisContext` field in the request body
- If provided, append it to the system prompt: "The athlete just received the following analysis: [summary, score, key findings]. Use this context to answer their follow-up questions with specific, personalized advice."

### i18n Updates

Add translation keys for:
- `analysisCoach.title`: "Ask the Coach"
- `analysisCoach.subtitle`: "Have questions about your analysis? Ask our AI biomechanics coach."
- `analysisCoach.placeholder`: "Ask about your mechanics..."
- `analysisCoach.suggestedQuestions.*`: Starter question labels

---

## Summary of All Files

| File | Action |
|------|--------|
| `supabase/functions/ai-helpdesk/index.ts` | New -- Help Desk backend |
| `src/pages/HelpDesk.tsx` | New -- Full Help Desk page |
| `src/components/HelpDeskChat.tsx` | New -- Reusable help desk chat |
| `src/components/AnalysisCoachChat.tsx` | New -- Post-analysis coaching chat |
| `src/components/FloatingChatButton.tsx` | Update -- use HelpDeskChat |
| `src/components/AppSidebar.tsx` | Update -- add Help Desk menu item |
| `src/App.tsx` | Update -- add /help-desk route |
| `src/pages/AnalyzeVideo.tsx` | Update -- embed AnalysisCoachChat after results |
| `supabase/functions/ai-chat/index.ts` | Update -- accept analysisContext |
| `src/i18n/locales/*.json` (8 files) | Update -- add help desk + coach chat keys |

---

## Clear Separation of the Two AI Chatbots

- **Floating button (bottom-right)** = Help Desk assistant -- answers questions about the app, navigation, features, troubleshooting
- **"Ask the Coach" (inside analysis pages)** = Biomechanics coaching assistant -- answers questions about mechanics, drills, and the specific analysis just received
- Both are clearly labeled so users always know which AI they are talking to

