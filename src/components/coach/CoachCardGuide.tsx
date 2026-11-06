import { useState } from 'react';
import { BookOpen, ChevronDown, CalendarDays, Send, Pencil, Save, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';

const steps = [
  { title: 'Send a workout', icon: Send, buttons: ['Send workouts', 'Build workout', 'Preview player card', 'Send workout'], text: 'Coaches: open Send workouts from your dashboard. Organizations: open Workouts, then Send workouts. Pick players or a team. Choose Exercise Vault exercises, skill drills, your own items or a saved template. Pick One day, Picked dates, Repeating or Any day. Check the player preview before sending.' },
  { title: 'See what the player receives', icon: Send, buttons: ['Use instead', 'Add alongside', 'Save for later'], text: 'The player gets a named workout notice. For its scheduled day, From Coach appears at the top of Today. Use instead replaces matching work after a safety check. Add alongside adds checked work. Save for later keeps it in My Custom Activities → Coach workouts; saving is not completing.' },
  { title: 'Allow a skip', icon: CalendarDays, buttons: ['Allow skip', 'Okay', 'Skip (allowed)'], text: 'Open the player profile → Player week. Pick today or an upcoming day and expand a card. Choose Allow skip on the whole card or one activity, add a note, then Okay. The player sees your note and decides whether to tap Skip (allowed). An allowed skip does not lower Discipline.' },
  { title: 'Remove work for one session', icon: CalendarDays, buttons: ['Remove for this session', 'Okay'], text: 'In the same day details, choose Remove for this session on a card or activity. Add a note and confirm. That work is removed only for this session, with no Discipline penalty. Other dates and already-entered results stay intact. The decision remains in Player week and Sent workouts.' },
  { title: 'Edit a day', icon: Pencil, buttons: ['Edit this day', 'Save this day', 'Okay', 'Cancel'], text: 'Expand an editable card in Player week and choose Edit this day. Change its exercises, order, sets, reps, rest and notes. Save this day checks safety. Read any warning before Okay or Cancel. Under-18 edits require a typed reason and parent notice. A saved edit names the coach in Because and notifies the player. Logged work, preparation and unsafe changes remain protected.' },
  { title: 'Save and reuse a template', icon: Save, buttons: ['Save as template', 'Apply to…', 'Apply to this day', 'Send workouts'], text: 'In the edit screen, name the template and tap Save as template. This saves a reusable card, not a change to the player’s day. Find it in Send workouts → Saved templates. Apply to… lets you choose an authorized player and date, then Apply to this day checks safety again. Or choose Send workouts to preview and schedule it as an offer.' },
  { title: 'Add a note and tag an issue', icon: StickyNote, buttons: ['Add a note', 'Defense', 'Hitting', 'Throwing', 'Baserunning', 'Save note'], text: "Open the player profile → Notes (or pick a day in Player week) and tap Add a note. Write your note, then under Tag an issue (optional) pick Defense, Hitting, Throwing or Baserunning and add a short label. Tagging an issue adds a card to this player's Before you start, with your reason. The player never sees your note." },
  { title: 'Read the week and results', icon: CalendarDays, buttons: ['This week', 'Sent workouts'], text: 'Open Player week in the player profile. Pick a day to see cards, activities and the actual entered results. Week arrows open earlier or later weeks. Sent workouts shows each player’s response separately from completion. Done means recorded work, not a skill grade. Organization staff see only assigned, shared athletes.' },
];

/** Read-free education: button pictures use the same variants as live controls. */
export function CoachCardGuide() {
  const [open, setOpen] = useState(false);
  return <section aria-label="Coach and organization workout guide" className="border-y border-border py-4">
    <Button variant="ghost" className="h-auto w-full justify-between gap-3 whitespace-normal py-2 text-left" aria-expanded={open} aria-controls="coach-card-guide-steps" onClick={() => setOpen(value => !value)}>
      <span className="flex items-center gap-2"><BookOpen className="h-5 w-5" />How it works</span>
      <ChevronDown className={open ? 'rotate-180' : ''} />
    </Button>
    {open && <div id="coach-card-guide-steps" className="pt-4">
      <ol className="grid gap-x-8 gap-y-6 lg:grid-cols-2">
        {steps.map((step, index) => <li key={step.title} className="min-w-0 space-y-2 border-b border-border pb-5">
          <h3 className="flex items-center gap-2 font-semibold"><step.icon className="h-4 w-4 shrink-0 text-primary" />{index + 1}. {step.title}</h3>
          <div role="img" aria-label={`Button pictures: ${step.buttons.join(', ')}`} className="flex flex-wrap gap-2">
            {step.buttons.map(label => <Button key={label} asChild size="sm" variant={label === 'Okay' || label === 'Send workout' ? 'default' : 'outline'} className="pointer-events-none h-auto min-h-9 whitespace-normal text-left shadow-none"><span aria-hidden="true">{label}</span></Button>)}
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{step.text}</p>
        </li>)}
      </ol>
    </div>}
  </section>;
}