# NK Studio

NK Studio is a simple wrapper for the Higgsfield API by Nabila K. It gives a nontechnical user five clear screens: Home, Image, Video + B-roll, Library and Settings. It can run privately on one computer or as an isolated multi-visitor service.

## What it does

- Keeps API credentials server-side. Local credentials use a private file (`0600`) or private `.env`. Hosted credentials are encrypted at rest and separated by signed browser session.
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

1. Copy `.env.example` to `.env`, or paste your own credentials into the private connection screen after starting.
2. Run `npm start`.
3. Open `http://127.0.0.1:4180`.

No API secret is returned to the browser. Do not publish `.env`, `data/settings.json`, or screenshots containing credentials.

On localhost, NK Studio preserves the existing single-user files. In hosted mode, every browser receives a signed private session. API credentials are encrypted at rest, settings and histories are separated by session, and generated files are served only to the owning session. Set a strong `NK_SESSION_SECRET`, use HTTPS, and mount persistent storage at `NK_DATA_DIR` before publishing. Clearing the browser cookie ends access to that anonymous session, so viewers should download important results.

## Hosted deployment

1. Deploy the included `Dockerfile` to a Node-compatible host.
2. Set `HOST=0.0.0.0`, `NK_DATA_DIR=/data`, a random 32+ character `NK_SESSION_SECRET`, and Nabila's `HIGGSFIELD_TRACKING_URL`.
3. Mount persistent private storage at `/data`.
4. Point the public domain to the host and require HTTPS.
5. Do not set a shared `HF_API_KEY_ID` or `HF_API_KEY_SECRET`. Every visitor must connect their own Higgsfield account.

## Recording flow

1. Home: show $0/current spend and the hard cap.
2. Image: choose the model that fits the job. For this ad demo, use Marketing Studio Image and upload the product photo.
3. Click **See real price** and show the live USD + credits estimate.
4. Click **Generate image** and show the real result.
5. Video + B-roll: choose **Animate an image** for a product shot, or **B-roll Generator** to turn one script line into a cinematic text-to-video prompt. You can still choose the model.
6. Click **See real price**, then **Generate video**.
7. Library: show the outputs, prompts and costs.
8. Settings: show the masked connected state and spending cap. Never reveal either API credential.

The catalog is curated rather than fake-complete: every listed route has a model-specific request schema and has passed a real estimate request. Viewers can extend it with additional documented Higgsfield endpoints later.
