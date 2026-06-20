# Chromium for evidence-pack PDF rendering

Evidence pack PDFs are rendered via **HTML → headless Chromium → PDF**. Chromium is
pinned to a fixed revision and must be present on the host **before** any render
or test runs. The application **never downloads Chromium at runtime**.

## Pinned revision

| Artifact       | Value                                                  |
| -------------- | ------------------------------------------------------ |
| Chromium build | `148.0.7778.97`                                        |
| Puppeteer      | `24.43.1`                                              |
| Constant       | `packages/workflows/src/evidence-pack-chromium-pin.ts` |

Visual regression baselines live under
`src/__fixtures__/visual-baselines/` (see `src/__fixtures__/README.md`). They are
valid **only** for this revision. After bumping the revision, regenerate every
page baseline:

```bash
pnpm provision:chromium
pnpm generate:evidence-pack-visual-baselines
```

Commit updated PNGs only after human visual approval.

## Install-time provisioning (dev / CI)

`pnpm install` runs `@eqa/workflows` postinstall, which downloads the pinned
Chromium into:

```
packages/workflows/.chromium-cache/
```

To provision explicitly:

```bash
pnpm provision:chromium
```

CI installs Poppler (`pdftoppm`) separately for PDF rasterization; Chromium is
still provisioned via postinstall.

A dedicated **PDF determinism** job (`pnpm test:pdf-determinism`, with
`EQA_PDF_REUSE_BROWSER=false`) renders each canonical evidence-pack input twice
via independent Chromium launches and fails the build when the two PDFs are not
byte-identical.

## In-Kingdom production image

The in-Kingdom deployment image must **bake Chromium `148.0.7778.97` into the
image** during image build — not on first request, not from the public internet
at runtime.

Choose one of:

1. **Recommended — copy the provisioned cache** during image build:
   - Run `pnpm install` (or `pnpm provision:chromium`) in the build stage.
   - Copy `packages/workflows/.chromium-cache/` into the runtime image.
   - Set `EQA_CHROMIUM_CACHE_DIR` to that path if not using the default layout.

2. **Explicit binary path** — install Chromium to a known location (e.g.
   `/opt/eqa/chromium/chrome`) and set:
   ```
   EQA_CHROMIUM_EXECUTABLE=/opt/eqa/chromium/chrome
   ```

Set `PUPPETEER_SKIP_DOWNLOAD=true` in production so Puppeteer cannot fetch a
browser if the baked binary is missing (the renderer fails fast with a clear
error).

## Offline / in-Kingdom rule

- No runtime browser download.
- No external HTTP(S) resources in the HTML template (fonts are embedded locally).
- Chromium must be on disk in the image or cache directory before the app starts.
