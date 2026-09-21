# NK Studio

NK Studio is a small local wrapper for the Higgsfield API by Nabila K. It gives a nontechnical user five clear screens: Home, Image, Video + B-roll, Library and Settings.

## What it does

- Keeps API credentials server-side in a private local file (`0600`) or private `.env`.
- Shows Higgsfield's live estimate before generation.
- Enforces a rolling 30-day spending cap on the server before submitting a request.
- Lets the user choose among 8 image models and 7 image-to-video models from the current Higgsfield catalog.
- Changes the available controls for the selected model instead of sending one generic payload to every endpoint.
- Supports image-to-video and text-to-video, plus an optional ending frame when the selected model supports it.
- Turns one ordinary script line into an editable cinematic B-roll prompt locally, before any paid request.
- Downloads completed outputs into the local Library with prompt, model, date and estimated cost.
- Saves Higgsfield's returned `request_id`, `status_url`, `cancel_url` and support correlation ID before polling.
- Polls with 2–10 second exponential backoff and jitter, recognizes every documented terminal state, and preserves pending jobs across restarts.
- Blocks duplicate active submissions and enforces the configured local concurrency limit.

## Current model catalog

**Image:** Marketing Studio Image, Soul 2, Soul Standard, Ideogram 4.0, Recraft 4.1, Grok Imagine 2.0, Qwen Image 3 and Z-Image Turbo.

**Video:** Kling 3.0 Standard, Kling 3.0 Pro, Kling 3.0 Turbo, Seedance 2.5, Seedance 2.0, Wan 3.0 and Wan 3.0 Prime.

The model picker is not decorative. Selecting a model updates the endpoint, supported duration, shape, resolution, sound, prompt enhancement, start/end image inputs and price logic. Exact estimates are labeled **Live Higgsfield estimate**. When Higgsfield returns only a token-pricing description, the app uses the currently published offer rate and labels it **Published offer estimate** rather than pretending it is a live exact price.

## Start

Requirements: Node.js 20 or newer.

1. Run `npm ci`.
2. Copy `.env.example` to `.env` and add your own Higgsfield API credentials, or paste them once in Settings.
3. Run `npm start`.
4. Open `http://127.0.0.1:4180`.

No API secret is returned to the browser. Do not publish `.env`, `data/settings.json`, or screenshots containing credentials.

NK Studio is a localhost, single-user tool. Its owner identity is the one local studio installation, and status requests are served only for request IDs recorded by that installation. It uses polling because a localhost app has no public HTTPS webhook endpoint. A hosted multi-user version would need real user authentication, tenant-scoped database records, object storage and verified/deduplicated webhooks.

## Recording flow

1. Home: show $0/current spend and the hard cap.
2. Image: choose the model that fits the job. For this ad demo, use Marketing Studio Image and upload the product photo.
3. Click **See real price** and show the live USD + credits estimate.
4. Click **Generate image** and show the real result.
5. Video + B-roll: choose **Animate an image** for a product shot, or **B-roll Generator** to turn one script line into a cinematic prompt. B-roll defaults to image-to-video so an uploaded character, outfit or scene remains the visual anchor. Choose **Text only** only when you want the model to invent the subject.
6. Click **See real price**, then **Generate video**.
7. Library: show the outputs, prompts and costs.
8. Settings: show the masked connected state and spending cap. Never reveal either API credential.

The catalog is curated rather than fake-complete: every listed route has a model-specific request schema and has passed a real estimate request. Viewers can extend it with additional documented Higgsfield endpoints later.

## Audience resources

- [Non-coder quickstart](docs/QUICKSTART.md)
- [One guided prompt to build your own branded studio](docs/BUILD-YOUR-OWN-NK-STUDIO-PROMPT.md)
- [Optional ad and B-roll prompt pack](docs/AD-PROMPT-PACK.md)
- [Cinematic video quality checklist](docs/CINEMATIC-VIDEO-QC.md)
- [Sanitized v1.0.0 release verification](docs/RELEASE-VERIFICATION.md)

## License and official branding

The source code is licensed under [AGPL-3.0-or-later](LICENSE). You may inspect, modify and fork it under that license. The names **NK Studio** and **Nabila K**, their logos and visual identity are not granted under the code license. Public forks must remove protected branding unless they have written permission. See [TRADEMARKS.md](TRADEMARKS.md) and [ASSET-LICENSE.md](ASSET-LICENSE.md).

The only official repository is <https://github.com/nabilakhannn/nk-studio>.

## Verify a signed release

Each release includes `SHA256SUMS` and an SSH signature. From the folder containing both files:

```bash
ssh-keygen -Y verify -f ALLOWED_SIGNERS -I nabilakhannn -n file -s SHA256SUMS.sig < SHA256SUMS
shasum -a 256 -c SHA256SUMS
```

This community project is not an official Higgsfield product. It does not guarantee virality, advertising performance, model availability or a fixed generation price. Review the current provider estimate before spending credits.
