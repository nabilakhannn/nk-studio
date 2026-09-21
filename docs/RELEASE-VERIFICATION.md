# NK Studio v1.0.0 release verification

This record documents a real completed request from the same NK Studio build published in this release, without publishing API credentials, private provider URLs or generated media.

## Real generation evidence

- Run date: September 20, 2026 (America/New_York).
- Workflow: NK Studio Video + B-roll using Kling 3.0 Pro text-to-video through the Higgsfield API.
- Request: one real generation request; no duplicate retry was submitted.
- Pre-generation estimate recorded by NK Studio: **$1.4280 USD**.
- Lifecycle observed: submitted, in progress, completed.
- Output: H.264 MP4, 1920 × 1080, 24 fps, 10.041667 seconds, 17,671,020 bytes.
- Output SHA-256: `c595d61611d43fb0e0d0760b4ba180cf0f741c0167302936f7635c05f845c3c0`.
- Request-ID SHA-256: `8f24d894380c376403b3b03a582962681c4053663fe6ebe0b298e77d9d76b940`.

The generated video and its temporary provider URL are intentionally not distributed in this repository. The output hash and media metadata allow the retained private file to be checked without exposing the content or an expiring URL.

## Cost evidence boundary

After the run, the authenticated Higgsfield Analytics page reported:

- Organization balance: **$46.83**.
- Spend this month: **$3.05 after discounts**.
- Usage before discounts: **$3.59**.
- Selected-period discounts: **$0.54**.
- Requests this month: **11**.

The exported account CSV did not provide a request-level line that could be matched to this exact generation. Therefore this release claims the price approved inside NK Studio before submission and the completed real output, but does **not** claim that $1.4280 was the final settled account charge. Provider reporting and account discounts may differ. The app always shows the current estimate before submission so the user can decide whether to proceed.

## Reproducibility checks

- macOS local suite: passed.
- Ubuntu GitHub Actions clean runner: passed.
- Fresh public Git clone with `npm ci`: passed.
- Fresh GitHub release-asset download: signature, checksums, install and test passed.
- `npm audit`: 0 known vulnerabilities.
- Gitleaks current-tree and Git-history scans: 0 findings.
- Runtime dependencies: none.
- Development dependency: Playwright 1.63.0, Apache-2.0.
- CycloneDX SBOM: included in the repository and release assets.
- Browser workflow: B-roll discovery, local prompt building, Seedance starting model, unrelated-brand exclusion and mobile visibility passed.

These checks validate the released code and packaging. They do not guarantee provider uptime, future model availability, a fixed price, output quality or advertising performance.
