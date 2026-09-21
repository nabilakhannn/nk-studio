import test from "node:test";
import assert from "node:assert/strict";
import { buildPayload, parseHiggsfieldCredentials, resolveEndpoint, safeRequestUrl, summarizeSpend, validateGeneration, MODEL_CATALOG } from "../server.mjs";
import { readFile } from "node:fs/promises";

test("image payload maps safe controls", () => {
  const model = MODEL_CATALOG.image[0];
  const payload = buildPayload("image", model, { prompt: "Premium coffee hero image", ratio: "16:9", resolution: "2k", enhancePrompt: true, referenceUrl: "https://example.com/a.png", presetId: "preset-1" });
  assert.equal(payload.aspect_ratio, "16:9");
  assert.equal(payload.resolution, "2k");
  assert.deepEqual(payload.image_urls, ["https://example.com/a.png"]);
  assert.equal(payload.preset_id, "preset-1");
});

test("Marketing Studio exposes only its accepted aspect ratios", () => {
  const model = MODEL_CATALOG.image.find((entry) => entry.id === "marketing-studio-image");
  const ratio = model.settings.find((setting) => setting.id === "ratio");
  assert.deepEqual(ratio.options, ["auto", "1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16", "21:9"]);
  const payload = buildPayload("image", model, {
    prompt: "Premium product campaign",
    ratio: "4:5",
    resolution: "2k",
    presetId: "preset-1",
    referenceUrl: "https://example.com/product.jpg",
  });
  assert.equal(payload.aspect_ratio, "1:1");
});

test("a copied Higgsfield credential is split safely at its first colon", () => {
  assert.deepEqual(parseHiggsfieldCredentials("Key account-id:private-secret"), {
    apiKeyId: "account-id",
    apiKeySecret: "private-secret",
  });
  assert.deepEqual(parseHiggsfieldCredentials("Authorization: Key account-id:secret:with:colons"), {
    apiKeyId: "account-id",
    apiKeySecret: "secret:with:colons",
  });
  assert.deepEqual(parseHiggsfieldCredentials('HF_CREDENTIALS="account-id:private-secret"'), {
    apiKeyId: "account-id",
    apiKeySecret: "private-secret",
  });
  assert.throws(() => parseHiggsfieldCredentials("incomplete-key"), /Copy API Key/i);
  assert.throws(() => parseHiggsfieldCredentials("a04d••••0daf"), /masked preview/i);
});

test("video generation requires a starting image", () => {
  assert.throws(() => validateGeneration({ kind: "video", modelId: "kling-3-image-video", prompt: "Slow cinematic push in" }), /starting image/i);
});

test("catalog exposes a meaningful choice of current models", () => {
  assert.equal(MODEL_CATALOG.image.length, 8);
  assert.equal(MODEL_CATALOG.video.length, 7);
  assert.ok(MODEL_CATALOG.video.every((model) => model.settings.length >= 3));
});

test("Kling changes route and payload between image and text modes", () => {
  const model = MODEL_CATALOG.video.find((entry) => entry.id === "kling-3-image-video");
  const settings = { duration: 6, ratio: "9:16", sound: false, cfgScale: 0.65, multiShots: true };
  const imageBody = { prompt: "Cinematic product reveal with a final hero hold", mode: "image", referenceUrl: "https://example.com/start.jpg", endReferenceUrl: "https://example.com/end.jpg", settings };
  const textBody = { prompt: "Cinematic product reveal with a final hero hold", mode: "text", settings };
  assert.equal(resolveEndpoint("video", model, imageBody), "/kling-video/v3.0/std/image-to-video");
  assert.equal(resolveEndpoint("video", model, textBody), "/kling-video/v3.0/std/text-to-video");
  assert.equal(buildPayload("video", model, imageBody).last_image_url, "https://example.com/end.jpg");
  assert.equal(buildPayload("video", model, textBody).aspect_ratio, "9:16");
});

test("Seedance uses its own settings instead of Kling fields", () => {
  const model = MODEL_CATALOG.video.find((entry) => entry.id === "seedance-2.5");
  const payload = buildPayload("video", model, {
    prompt: "Luxury shoe moves through a cinematic warehouse scene",
    mode: "image",
    referenceUrl: "https://example.com/start.jpg",
    settings: { duration: 10, resolution: "720p", ratio: "16:9", generateAudio: true, outputFormat: "mp4", bitrateMode: "high" },
  });
  assert.equal(payload.image_url, "https://example.com/start.jpg");
  assert.equal(payload.generate_audio, true);
  assert.equal(payload.bitrate_mode, "high");
  assert.equal(payload.sound, undefined);
});

test("Seedance 2 text-to-video matches the documented starting schema", () => {
  const model = MODEL_CATALOG.video.find((entry) => entry.id === "seedance-2");
  const body = {
    prompt: "A cinematic tracking shot along a sunlit coastal road",
    mode: "text",
    settings: { resolution: "720p", generateAudio: true, duration: 5, ratio: "16:9" },
  };
  assert.equal(resolveEndpoint("video", model, body), "/bytedance/seedance-2.0/text-to-video");
  assert.deepEqual(buildPayload("video", model, body), {
    prompt: body.prompt,
    duration: 5,
    resolution: "720p",
    generate_audio: true,
    aspect_ratio: "16:9",
  });
});

test("rolling spend is computed from completed records", () => {
  const now = new Date();
  const old = new Date(now.getTime() - 40 * 86400000);
  const spend = summarizeSpend([{ usd: "1.25", createdAt: now.toISOString() }, { usd: "3.00", createdAt: old.toISOString() }]);
  assert.equal(spend.rolling30Days, 1.25);
  assert.equal(spend.allTime, 4.25);
});

test("request lifecycle URLs accept Higgsfield's documented URL and a trailing slash", () => {
  const requestId = "d7e6c0f3-6699-4f6c-bb45-2ad7fd9158ff";
  const documented = `https://api.higgsfield.ai/requests/${requestId}/status`;
  assert.equal(safeRequestUrl(documented, requestId, "status"), documented);
  assert.equal(safeRequestUrl(`${documented}/`, requestId, "status"), documented);
});

test("request lifecycle URLs safely fall back after an accepted generation", () => {
  const requestId = "d7e6c0f3-6699-4f6c-bb45-2ad7fd9158ff";
  const documented = `https://api.higgsfield.ai/requests/${requestId}/status`;
  assert.equal(safeRequestUrl("", requestId, "status"), documented);
  assert.equal(safeRequestUrl("not a valid URL%", requestId, "status"), documented);
  assert.equal(safeRequestUrl("https://example.com/steal", requestId, "status"), documented);
  assert.equal(safeRequestUrl("https://api.higgsfield.ai/unexpected/path", requestId, "status"), documented);
});

test("the recording UI exposes a clear B-roll generator with Nabila K branding", async () => {
  const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
  assert.match(html, /B-roll Generator/);
  assert.match(html, /Turn one script line into a cinematic shot/);
  assert.match(app, /function buildBrollPrompt/);
  assert.match(html, /<small>by Nabila K<\/small>/);
});
