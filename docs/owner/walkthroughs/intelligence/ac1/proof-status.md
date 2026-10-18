# AC1 — automatic phone-format preparation

Ready to publish: no. This run implements and proves the conversion sub-step, not complete phone-format report delivery.

## Implemented in preview
- Analysis selection decodes an actual frame. If unsupported, private single-thread FFmpeg runs on the device before preview, metadata, pose or upload. No source upload to a conversion service; original bytes unchanged.
- H264 MP4 on compatible browsers; VP8 WebM on browsers without H264. No forced FPS, interpolation, trimming or scaling; normal decoded rotation retained, odd H264 dimensions padded by at most one pixel. Audio omitted from derivative only.
- Progress appears while preparing; upload and further selection disabled until ready. Original 50 MiB rule and converted-size check retained.
- Converter files come from version-pinned package imports, including WASM; no remote code hotlink. A briefly staged CDN WASM pointer was removed after local sandbox serving returned HTML instead of WASM. No orphan asset remains.

## Verified
- Untouched owner-authorized original MOV downloaded privately via authenticated storage; H264, 960×560, 30 fps, 557 frames. Sandbox Chromium has no H264 decoder, exercising the actual conversion fallback.
- Signed-in kept TEST college player, actual Analyze Hitting screen, 390×844: selection of original MOV automatically produced readable WebM preview; Upload & Analyze enabled. No horizontal overflow or page exceptions. Screenshot player-conversion.png excludes owner footage.
- Actual shared metadata probe of the derivative: 30 fps from container, 960×560, 18.566 seconds. Original stream duration 18.536667; mux endpoint difference about one frame, no forced resampling. Exact frame-count and timestamp-equivalence proof still pending.
- Upload tests: 4 files / 19 tests PASS. Latest preview build OK.
- Browser emitted existing dev-only service-worker HTML MIME warning and software WebGL/pose warnings. Converter WASM failure was diagnosed and corrected; final run has zero page exceptions.

## Not yet proven
- Genuine HEVC originals: eight inspected owner MOV sources were H264, not HEVC. Continue inspecting authorized originals; do not substitute a manually re-encoded clip for proof.
- Original clip → saved report → UI read-back and exact test-report cleanup have not run in AC1. No new report or storage upload was created here.
- Actual iPhone Safari memory/codec performance, all original phone formats, high-FPS timestamp parity, and cancellation/navigation during conversion still need verification. Do not claim every phone format works.

## Scope and next
Frontend preview only. No function redeployment, migration, publishing, schedules or iOS changes. Existing owner originals untouched; temporary downloads remain private under /tmp for continuation. Next concrete sub-step: genuine HEVC original conversion and original-format saved-report proof, then assessment Start read-back in owner order.
