
# Fix Missing Translation: gamePlan.workout.unicorn

## Problem

The Unicorn workout task uses translation keys `gamePlan.workout.unicorn.title` and `gamePlan.workout.unicorn.description`, but these keys don't exist in any locale file. This causes raw key text to display on the Game Plan.

## Fix

Add the missing `unicorn` entry under `gamePlan.workout` in all 8 locale files.

### Translation Values

| Locale | Title | Description |
|--------|-------|-------------|
| en | Complete The Unicorn Workout | Elite 2-way training: strength, velocity, and speed |
| es | Completar el Entrenamiento Unicornio | Entrenamiento elite de 2 vias: fuerza, velocidad y rapidez |
| fr | Terminer l'Entrainement Unicorn | Entrainement elite 2 voies : force, velocite et vitesse |
| de | Das Unicorn-Training absolvieren | Elite 2-Wege-Training: Kraft, Wurfgeschwindigkeit und Sprint |
| ja | ユニコーンワークアウトを完了 | エリート二刀流トレーニング：筋力・球速・スピード |
| ko | 유니콘 운동 완료 | 엘리트 투웨이 훈련: 근력, 구속, 스피드 |
| nl | Voltooi de Unicorn Workout | Elite 2-way training: kracht, werpsnelheid en snelheid |
| zh | 完成独角兽训练 | 精英双向训练：力量、球速与速度 |

### Files to Edit (8 files, same structural change)

In each locale file under `src/i18n/locales/`, add a `unicorn` block inside `gamePlan.workout`, right after the existing `pitching` entry:

```json
"workout": {
  "hitting": { ... },
  "pitching": { ... },
  "unicorn": {
    "title": "Complete The Unicorn Workout",
    "description": "Elite 2-way training: strength, velocity, and speed"
  }
}
```
