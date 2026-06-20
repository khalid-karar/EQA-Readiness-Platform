# Visual regression baselines

Committed PNG snapshots live under `visual-baselines/`. Each locale folder has a
`BASELINE.md` noting:

- **Valid only for pinned Chromium revision `148.0.7778.97`** (see `../CHROMIUM.md`).
- **Requires human visual approval** before updating any PNG.

## Canonical demo state

Shared synthetic fixture: `packages/workflows/src/synthetic-seera-demo.ts` (rule 5 —
synthetic only). Covers confirmed gaps, a retest-loop remediation, principle-2
evidence in flight, pending human review, and unreviewed working-paper items.

## Suites

| Suite                | Locales    | Path                                                   |
| -------------------- | ---------- | ------------------------------------------------------ |
| Seera demo           | `en`, `ar` | `visual-baselines/seera-demo/{locale}/page-NN.png`     |
| Mixed-script torture | `ar`       | `visual-baselines/mixed-script-torture/ar/page-NN.png` |

Page counts are recorded in `visual-baselines/manifest.json`.

## Regenerate (all suites, all pages)

Requires [poppler-utils](https://poppler.freedesktop.org/) (`pdftoppm` on PATH).
CI installs this automatically; on Windows install Poppler and add `pdftoppm` to PATH.

```bash
pnpm provision:chromium
pnpm generate:evidence-pack-visual-baselines
# visually approve every page PNG, then commit
```

Legacy script names (`generate:evidence-pack-baseline`,
`generate:mixed-script-torture-baseline`) delegate to the unified generator above.
