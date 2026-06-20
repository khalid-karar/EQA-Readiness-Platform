# Visual baseline — Seera demo (AR)

Valid only for pinned Chromium revision 148.0.7778.97.

Requires human visual approval before updating any PNG in this folder.

Region-scoped baselines live under `regions/` (metadata/timestamp band and
each evidence-index row). Each region is diffed independently at ≤0.5%.

Regenerate all baselines:

```bash
pnpm generate:evidence-pack-visual-baselines
```
