# One Prompt: Build My Personal Higgsfield API Studio

Copy everything below into **Codex or Claude Code while it is opened inside a new empty folder**.

---

You are my patient product engineer. I am a non-coder. Build and launch a simple local visual-generation app that uses my own Higgsfield API account and is safe to demo.

First ask me these questions one at a time, using plain language:

1. What should the studio be called?
2. Which main brand color should it use?
3. Which two results matter most: product images, social images, thumbnails, portraits, or image-to-video clips?
4. What is the maximum amount in USD the app may spend in any rolling 30-day period?
5. Do I already have a Higgsfield Key ID and Key Secret? If not, open `https://open.higgsfield.ai/` and guide me to create them. Never ask me to paste either credential into this chat, source code, Git, a screenshot, or a recorded terminal. Give me a private Settings screen in the local app where I can paste them after the build is running.

Then build the app without asking me technical questions. Use Node.js 20+ and browser-native HTML/CSS/JavaScript so setup stays small. Bind the server only to `127.0.0.1`.

The finished app must have five simple pages:

- Home: connected/not-connected state, spend today, rolling 30-day spend, all-time spend, three large creation shortcuts, and recent results.
- Image: a prominent real model selector, prompt box, aspect ratio, resolution/quality, model-specific advanced controls, optional/required reference image based on the endpoint, current presets fetched live when an endpoint requires a preset, `See real price`, then `Generate`.
- Video + B-roll: a prominent real model selector plus two obvious workflows: `Animate an image` and `B-roll Generator`. The B-roll workflow must accept one ordinary narration line, offer a few understandable visual styles, and build an editable cinematic prompt locally for free. Keep `image-to-video` or `text-to-video` routing, required starting image in image mode, optional ending image only for supporting models, duration, aspect ratio, resolution, sound and prompt enhancement only when supported, `See real price`, then `Generate`.
- Library: locally archived results with media preview, prompt, model, timestamp and recorded estimate/cost.
- Settings: private API connection, connection test, rolling 30-day hard spend cap and concurrent-request limit.

Non-negotiable safety and reliability requirements:

- Keep the Key ID and Key Secret server-side. Never return either to the browser after saving.
- Store local credentials in a private file with owner-only permissions or a private `.env`; both must be in `.gitignore`.
- Never put credentials in localStorage, public JavaScript, logs, screenshots, generated prompts, Git or downloadable resources.
- Use `Authorization: Key KEY_ID:KEY_SECRET` only on the local server when calling `https://api.higgsfield.ai`.
- Reject any API base URL except exactly `https://api.higgsfield.ai`.
- Before every generation, call Higgsfield's official estimate endpoint and display USD plus credits.
- Re-check that estimate on the server immediately before submission.
- Calculate completed spend from the local ledger. If the new estimate would exceed my rolling 30-day cap, block the generation on the server and explain why.
- Poll the official request-status endpoint until completed or failed. Support current image and video response shapes, including nested `image.url` and `video.url`.
- Save the returned `request_id`, `status_url`, `cancel_url` and `X-Correlation-ID` immediately. Poll the returned `status_url`; do not rebuild it unless a documented compatibility fallback is required. Validate that returned lifecycle URLs remain on `https://api.higgsfield.ai`.
- Poll from two seconds, increase gradually to ten seconds, add jitter, set a model-appropriate deadline, and stop on `completed`, `failed`, `nsfw`, or `canceled`.
- Never automatically repeat a generation POST after an ambiguous timeout because Higgsfield generation endpoints do not currently accept an idempotency key. Prevent accidental duplicate active submissions locally using a deterministic request fingerprint.
- Enforce the configured concurrent-request limit before submission. Explain that Higgsfield may return `400` when the account or model concurrency limit is full.
- Download completed outputs locally because hosted outputs may expire. Save prompt, model, estimate/cost, timestamp and local output path.
- Persist pending request metadata so a server restart does not lose a job.
- Fetch current Marketing Studio presets live; do not hard-code expiring preset IDs.
- Start with a curated, tested catalog rather than pretending every model is supported. Include at least these current choices when their official endpoint documentation is still available: Marketing Studio Image, Soul 2, Soul Standard, Ideogram 4, Recraft 4.1, Grok Imagine 2, Qwen Image 3, Z-Image Turbo, Kling 3 Standard/Pro/Turbo, Seedance 2.5/2.0 and Wan 3/3 Prime.
- Treat the official Higgsfield model documentation as the schema source of truth. Store a schema per model: provider, endpoint for each supported mode, required media roles, supported aspect ratios, resolution/quality, duration range, audio, prompt enhancement, end-frame support and any model-specific parameter names.
- Changing the model must immediately change the visible controls, helper text, required inputs and outbound endpoint/payload. Never show one generic form and silently send every model the same request.
- Clearly explain what each model is best for so a non-coder can make a quality decision. Mark one safe default for product ads, but never lock the user to it.
- If the official estimate response contains exact USD/credits, label it `Live Higgsfield estimate`. If an endpoint returns only a token-pricing description, calculate from the current published official rate and label it `Published offer estimate`; never display `$0.0000` as though the generation is free.
- Use large readable type, one primary action per step, no crowded dashboard, and no fake “viral” guarantee.
- Do not promise exact price, identical quality, or “cheapest” without current official evidence.

Use this workflow for every generation:

1. Choose model.
2. Add prompt/reference.
3. See the official live estimate.
4. Check the spending cap.
5. Generate.
6. Show queued/processing/completed.
7. Play or display the result.
8. Save it in Library with its proof data.

Testing requirements before you tell me it is ready:

- Run syntax and unit tests.
- Test incorrect credentials without exposing them.
- Test one real estimate for image and one for video without spending credits.
- Iterate through every model in the curated catalog and confirm that its estimate request succeeds with a valid model-specific payload. Do not submit a generation during this catalog test.
- Browser-test that switching models changes the relevant settings and required uploads, then switch back and confirm the default still works.
- Test that an intentionally tiny cap blocks a request before submission, then restore my chosen cap.
- Ask for my explicit confirmation immediately before the first real credit-spending generation.
- After confirmation, run one lowest-cost suitable real generation, poll it, download it and verify playback/file integrity.
- Open the app for me and give me a five-step actor card showing exactly what to click during a demo.

At the end, give me:

1. the working local app,
2. a safe `.env.example`,
3. a private-data-safe ZIP that excludes real credentials, settings, ledgers and generated media,
4. a README for non-coders,
5. a recording checklist that reminds me to hide keys, email, card and account identifiers.

Do not stop at mockups. Continue until the local app, official estimates, cap enforcement, status polling, local archive and basic browser flow are verified.

---

## What this prompt does not promise

It does not make every model magically compatible, guarantee virality, or generate a complete 20-second multi-shot campaign from one click. It builds a safe foundation. After it works, ask the coding agent to add only the specific Higgsfield endpoints and production features you actually need.
