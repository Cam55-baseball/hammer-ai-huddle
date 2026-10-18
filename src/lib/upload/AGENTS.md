- Client reads/write-backs on `videos` name their columns (`.select('id')`, `VIDEO_PUBLIC_COLUMNS`); never bare `.select()` or `'*'`. Why: score columns are read-locked, so a whole-row read-back fails the save.
- Video save failures go through `saveFailure.ts`: true message, reference code, structured `[video-save-failure]` log. Why: a refused save was once shown as "signed out".

- Analysis files pass through `prepareAnalysisVideo` before preview/probe/extraction; private single-thread FFmpeg preserves frame timing without interpolation or forced FPS. Why: phone codecs must not cause invented measurements or a pre-upload decode failure.
