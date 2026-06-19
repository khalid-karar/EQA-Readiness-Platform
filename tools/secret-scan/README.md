# Secret scanning

Secret scanning uses [gitleaks](https://github.com/gitleaks/gitleaks) with its
maintained default rule set (extended via [`.gitleaks.toml`](../../.gitleaks.toml)).
No custom regexes are maintained here.

CI runs two checks:

1. **Repository scan** — `gitleaks` over the whole repo using `.gitleaks.toml`.
   This must report **no leaks**. The fixtures directory and `.env.example` are
   allowlisted so legitimate code never produces false positives.

2. **Detection proof** — `gitleaks` over [`fixtures/`](./fixtures) using the
   default rule set with **no allowlist**. This must report a leak (the fake AWS
   key). If it does not, the secret scanner is broken and CI fails.

The fixture in [`fixtures/leaked-aws-key.txt`](./fixtures/leaked-aws-key.txt)
contains a synthetic, non-functional AWS access key id. It is never a real
secret.

## Run locally

```bash
# Repo scan (expect: no leaks found)
gitleaks detect --no-git --config .gitleaks.toml --redact --verbose

# Detection proof (expect: leak found)
gitleaks detect --no-git --no-banner --source tools/secret-scan/fixtures
```
