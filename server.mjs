import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC = join(ROOT, "public");
const DATA = join(ROOT, "data");
const GENERATED = join(PUBLIC, "generated");
const SETTINGS_PATH = join(DATA, "settings.json");
const LEDGER_PATH = join(DATA, "ledger.json");
const PENDING_PATH = join(DATA, "pending.json");
const API_BASE = "https://api.higgsfield.ai";
const LOCAL_OWNER_ID = "local-owner";
const PORT = Number(process.env.PORT || 4180);
const MODE = process.env.HF_MODE === "demo" ? "demo" : "live";
const MAX_BODY_BYTES = 24 * 1024 * 1024;

loadEnv(join(ROOT, ".env"));
if (process.env.NK_CREDENTIALS_ENV) loadEnv(process.env.NK_CREDENTIALS_ENV);

const IMAGE_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"];
const VIDEO_RATIOS = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"];
const selectSetting = (id, label, options, defaultValue, advanced = false) => ({ id, label, type: "select", options, default: defaultValue, advanced });
const toggleSetting = (id, label, defaultValue, advanced = false) => ({ id, label, type: "toggle", default: defaultValue, advanced });
const numberSetting = (id, label, min, max, defaultValue, step = 1, advanced = false) => ({ id, label, type: "number", min, max, default: defaultValue, step, advanced });

const MODEL_CATALOG = {
  image: [
    {
      id: "marketing-studio-image",
      provider: "Higgsfield",
      label: "Marketing Studio Image",
      endpoint: "/marketing-studio/image",
      description: "Turn one product photo into a campaign-ready composition.",
      bestFor: "Product ads and polished hero frames",
      badge: "Recommended for ads",
      priceHint: "From $0.0121/image before account discounts",
      startImage: "required",
      settings: [
        selectSetting("ratio", "Shape", ["auto", "1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16", "21:9"], "1:1"),
        selectSetting("resolution", "Quality", ["1k", "2k", "4k"], "2k"),
        toggleSetting("enhancePrompt", "Improve my prompt", true, true),
      ],
    },
    {
      id: "soul-2-standard",
      provider: "Higgsfield",
      label: "Soul 2",
      endpoint: "/higgsfield-ai/soul/v2/standard",
      description: "Fast, low-cost cinematic people and lifestyle images.",
      bestFor: "Concept tests, people and lifestyle scenes",
      badge: "Lowest cost",
      priceHint: "From $0.0032/image",
      startImage: "none",
      settings: [
        selectSetting("ratio", "Shape", IMAGE_RATIOS, "1:1"),
        selectSetting("resolution", "Quality", ["720p", "1080p"], "720p"),
        selectSetting("count", "Results", ["1", "4"], "1", true),
        toggleSetting("enhancePrompt", "Improve my prompt", true, true),
      ],
    },
    {
      id: "soul-standard",
      provider: "Higgsfield",
      label: "Soul Standard",
      endpoint: "/higgsfield-ai/soul/standard",
      description: "The original premium Soul image model.",
      bestFor: "High-fidelity editorial and cinematic stills",
      priceHint: "Live estimate varies by resolution",
      startImage: "none",
      settings: [
        selectSetting("ratio", "Shape", IMAGE_RATIOS, "1:1"),
        selectSetting("resolution", "Quality", ["720p", "1080p"], "720p"),
        selectSetting("count", "Results", ["1", "4"], "1", true),
        toggleSetting("enhancePrompt", "Improve my prompt", true, true),
      ],
    },
    {
      id: "ideogram-4",
      provider: "Ideogram",
      label: "Ideogram 4.0",
      endpoint: "/ideogram/v4.0",
      description: "Strong typography and graphic-ad composition.",
      bestFor: "Posters, text inside images and graphic ads",
      priceHint: "$0.03/image before account discounts",
      startImage: "none",
      settings: [
        selectSetting("ratio", "Shape", ["1:1", "16:9", "9:16", "4:3", "3:4"], "1:1"),
        selectSetting("renderingSpeed", "Rendering", ["TURBO", "DEFAULT", "QUALITY"], "DEFAULT", true),
      ],
    },
    {
      id: "recraft-4.1",
      provider: "Recraft",
      label: "Recraft 4.1",
      endpoint: "/recraft/v4.1/text-to-image",
      description: "Design-led images with clean commercial styling.",
      bestFor: "Brand graphics and polished campaign visuals",
      priceHint: "$0.035/image at 1K before discounts",
      startImage: "none",
      settings: [
        selectSetting("ratio", "Shape", ["1:1", "16:9", "9:16", "4:3", "3:4"], "1:1"),
        selectSetting("resolution", "Quality", ["1k"], "1k"),
        selectSetting("outputFormat", "File type", ["jpg", "png", "webp"], "jpg", true),
      ],
    },
    {
      id: "grok-imagine-2",
      provider: "xAI",
      label: "Grok Imagine 2.0",
      endpoint: "/xai/grok-imagine-image-2.0",
      description: "Flexible image creation for fast visual exploration.",
      bestFor: "Creative variations and visual ideation",
      priceHint: "From $0.04/image",
      startImage: "none",
      settings: [
        selectSetting("ratio", "Shape", ["auto", "1:1", "16:9", "9:16", "4:3", "3:4"], "auto"),
        selectSetting("resolution", "Quality", ["1k", "2k"], "1k"),
        selectSetting("quality", "Detail", ["low", "medium"], "medium", true),
      ],
    },
    {
      id: "qwen-image-3",
      provider: "Alibaba",
      label: "Qwen Image 3",
      endpoint: "/alibaba/qwen-image-3/text-to-image",
      description: "Strong English and Chinese text rendering.",
      bestFor: "Ads that need readable words or labels",
      priceHint: "From $0.04/image",
      startImage: "none",
      settings: [
        selectSetting("ratio", "Shape", ["1:1", "16:9", "9:16", "4:3", "3:4"], "1:1"),
        selectSetting("resolution", "Quality", ["1k", "2k"], "1k"),
        toggleSetting("promptExtend", "Expand my prompt", true, true),
        toggleSetting("enableThinking", "Reason before creating", true, true),
      ],
    },
    {
      id: "z-image-turbo",
      provider: "Alibaba",
      label: "Z-Image Turbo",
      endpoint: "/z-image/turbo",
      description: "Fast image generation with reliable text rendering.",
      bestFor: "Cheap drafts and rapid variations",
      badge: "Fast",
      priceHint: "$0.015/image",
      startImage: "none",
      settings: [
        selectSetting("ratio", "Shape", ["1:1", "16:9", "9:16", "4:3", "3:4"], "1:1"),
        selectSetting("resolution", "Quality", ["1k", "2k"], "1k"),
        toggleSetting("promptExtend", "Expand my prompt", false, true),
      ],
    },
  ],
  video: [
    {
      id: "kling-3-image-video",
      provider: "Kling",
      label: "Kling 3.0 Standard",
      paths: { text: "/kling-video/v3.0/std/text-to-video", image: "/kling-video/v3.0/std/image-to-video" },
      description: "Reliable cinematic movement from one still.",
      bestFor: "Your product-ad demo: controlled, realistic motion",
      badge: "Recommended",
      priceHint: "50% offer shown on eligible accounts",
      supportsEndImage: true,
      settings: [
        selectSetting("ratio", "Shape", ["16:9", "9:16", "1:1"], "16:9"),
        numberSetting("duration", "Seconds", 3, 15, 5),
        toggleSetting("sound", "Generate sound", true),
        numberSetting("cfgScale", "Prompt strength", 0, 1, 0.5, 0.05, true),
        toggleSetting("multiShots", "Let model direct multiple shots", false, true),
      ],
    },
    {
      id: "kling-3-pro",
      provider: "Kling",
      label: "Kling 3.0 Pro",
      paths: { text: "/kling-video/v3.0/pro/text-to-video", image: "/kling-video/v3.0/pro/image-to-video" },
      description: "Higher-detail Kling output for important final shots.",
      bestFor: "Premium hero clips when quality matters more than price",
      priceHint: "Live estimate changes with sound and duration",
      supportsEndImage: true,
      settings: [
        selectSetting("ratio", "Shape", ["16:9", "9:16", "1:1"], "16:9"),
        numberSetting("duration", "Seconds", 3, 15, 5),
        toggleSetting("sound", "Generate sound", true),
        numberSetting("cfgScale", "Prompt strength", 0, 1, 0.5, 0.05, true),
        toggleSetting("multiShots", "Let model direct multiple shots", false, true),
      ],
    },
    {
      id: "kling-3-turbo",
      provider: "Kling",
      label: "Kling 3.0 Turbo",
      paths: { text: "/kling-video/v3.0-turbo/text-to-video", image: "/kling-video/v3.0-turbo/image-to-video" },
      description: "Fast Kling generations with 720p or 1080p output.",
      bestFor: "Quick testing before a final render",
      badge: "Fast test",
      priceHint: "Live estimate changes with resolution",
      supportsEndImage: false,
      settings: [
        selectSetting("ratio", "Shape", ["16:9", "9:16", "1:1"], "16:9"),
        selectSetting("resolution", "Quality", ["720p", "1080p"], "720p"),
        numberSetting("duration", "Seconds", 3, 15, 5),
      ],
    },
    {
      id: "seedance-2.5",
      provider: "ByteDance",
      label: "Seedance 2.5",
      paths: { text: "/bytedance/seedance-2.5/text-to-video", image: "/bytedance/seedance-2.5/image-to-video" },
      description: "Longer clips with optional native audio and broad motion.",
      bestFor: "4–30 second story-led ads",
      badge: "Up to 30s",
      priceHint: "30% offer shown on eligible accounts",
      fallbackRate: { "480p": 0.144, "720p": 0.3236 },
      supportsEndImage: true,
      settings: [
        selectSetting("ratio", "Shape", VIDEO_RATIOS, "16:9"),
        selectSetting("resolution", "Quality", ["480p", "720p"], "720p"),
        numberSetting("duration", "Seconds", 4, 30, 5),
        toggleSetting("generateAudio", "Generate audio", true),
        selectSetting("outputFormat", "File type", ["mp4", "mov"], "mp4", true),
        selectSetting("bitrateMode", "Bitrate", ["high", "standard"], "high", true),
      ],
    },
    {
      id: "seedance-2",
      provider: "ByteDance",
      label: "Seedance 2.0",
      paths: { text: "/bytedance/seedance-2.0/text-to-video", image: "/bytedance/seedance-2.0/image-to-video" },
      description: "Flexible resolution up to 4K with optional audio.",
      bestFor: "Resolution tests and cinematic scenes",
      priceHint: "30% offer shown on eligible accounts",
      fallbackRate: { "480p": 0.0985, "720p": 0.2117, "1080p": 0.4763, "4k": 1.0887 },
      supportsEndImage: true,
      settings: [
        selectSetting("ratio", "Shape", VIDEO_RATIOS, "16:9"),
        selectSetting("resolution", "Quality", ["480p", "720p", "1080p", "4k"], "720p"),
        numberSetting("duration", "Seconds", 4, 15, 5),
        toggleSetting("generateAudio", "Generate audio", true),
      ],
    },
    {
      id: "wan-3",
      provider: "Alibaba",
      label: "Wan 3.0",
      paths: { text: "/alibaba/wan-3.0/text-to-video", image: "/alibaba/wan-3.0/image-to-video" },
      description: "Cost-efficient video generation across three resolutions.",
      bestFor: "Budget-friendly iterations and longer tests",
      badge: "Budget option",
      priceHint: "From $0.03/second after eligible discount",
      fallbackRate: { "480p": 0.03, "720p": 0.06, "1080p": 0.12 },
      supportsEndImage: false,
      settings: [
        selectSetting("ratio", "Shape", ["adaptive", "16:9", "9:16", "1:1"], "adaptive"),
        selectSetting("resolution", "Quality", ["480p", "720p", "1080p"], "720p"),
        numberSetting("duration", "Seconds", 2, 30, 5),
        toggleSetting("generateAudio", "Generate audio", true),
        toggleSetting("enableThinking", "Reason before creating", false, true),
      ],
    },
    {
      id: "wan-3-prime",
      provider: "Alibaba",
      label: "Wan 3.0 Prime",
      paths: { text: "/alibaba/wan-3.0-prime/text-to-video", image: "/alibaba/wan-3.0-prime/image-to-video" },
      description: "Higher-quality Wan output for final campaign clips.",
      bestFor: "Final renders with more visual fidelity",
      priceHint: "30% offer shown on eligible accounts",
      fallbackRate: { "480p": 0.0476, "720p": 0.098, "1080p": 0.196 },
      supportsEndImage: false,
      settings: [
        selectSetting("ratio", "Shape", ["adaptive", "16:9", "9:16", "1:1"], "adaptive"),
        selectSetting("resolution", "Quality", ["480p", "720p", "1080p"], "720p"),
        numberSetting("duration", "Seconds", 2, 30, 5),
        toggleSetting("generateAudio", "Generate audio", true),
        toggleSetting("enableThinking", "Reason before creating", false, true),
      ],
    },
  ],
};

await mkdir(DATA, { recursive: true });
await mkdir(GENERATED, { recursive: true });

const liveRequests = new Map();
let presetCache = { fetchedAt: 0, items: [] };

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && url.pathname === "/api/bootstrap") {
      const settings = await readSettings();
      const ledger = await readLedger();
      const presets = hasCredentials(settings) ? await getMarketingPresets(settings) : [];
      return json(res, 200, {
        name: "NK Studio",
        mode: MODE,
        connected: hasCredentials(settings),
        models: publicCatalog(),
        presets,
        settings: publicSettings(settings),
        spend: summarizeSpend(ledger),
        library: ledger.slice().reverse(),
      });
    }

    if (req.method === "POST" && url.pathname === "/api/settings") {
      const body = await readJson(req);
      const existing = await readSettings();
      const next = {
        spendCapUsd: optionalPositive(body.spendCapUsd, existing.spendCapUsd ?? 10),
        concurrentRequests: clampInt(body.concurrentRequests, 1, 4, existing.concurrentRequests ?? 2),
        apiKeyId: cleanSecret(body.apiKeyId) || existing.apiKeyId || "",
        apiKeySecret: cleanSecret(body.apiKeySecret) || existing.apiKeySecret || "",
      };
      await writePrivateJson(SETTINGS_PATH, next);
      return json(res, 200, { connected: hasCredentials(next), settings: publicSettings(next) });
    }

    if (req.method === "POST" && url.pathname === "/api/connect") {
      const body = await readJson(req);
      const existing = await readSettings();
      const credentials = parseHiggsfieldCredentials(body.credentials);
      const candidate = { ...existing, ...credentials };
      assertConnected(candidate);
      const result = await testHiggsfieldConnection(candidate);
      await writePrivateJson(SETTINGS_PATH, candidate);
      return json(res, 200, { connected: true, settings: publicSettings(candidate), ...result });
    }

    if (req.method === "POST" && url.pathname === "/api/test-connection") {
      const settings = await readSettings();
      assertConnected(settings);
      return json(res, 200, await testHiggsfieldConnection(settings));
    }

    if (req.method === "POST" && url.pathname === "/api/upload") {
      const body = await readJson(req);
      const parsed = parseDataUrl(body.dataUrl);
      const settings = await readSettings();
      assertConnected(settings);
      const upload = await hfJson("/files/generate-upload-url", {
        method: "POST",
        body: { content_type: parsed.contentType },
        settings,
      });
      const uploadResponse = await fetch(upload.upload_url, {
        method: "PUT",
        headers: upload.upload_headers,
        body: parsed.buffer,
      });
      if (!uploadResponse.ok) throw new HttpError(502, `Upload failed (${uploadResponse.status}).`);
      return json(res, 200, { publicUrl: upload.public_url });
    }

    if (req.method === "POST" && url.pathname === "/api/estimate") {
      const body = await readJson(req);
      const { kind, model } = validateGeneration(body);
      const settings = await readSettings();
      assertConnected(settings);
      const payload = buildPayload(kind, model, body);
      const endpoint = resolveEndpoint(kind, model, body);
      const estimate = await hfJson(`/estimate${endpoint}`, { method: "POST", body: payload, settings });
      return json(res, 200, {
        estimate: normalizeEstimate(estimate, model, payload),
        model: model.label,
        willBlock: await wouldExceedCap(estimate.usd, settings),
      });
    }

    if (req.method === "POST" && url.pathname === "/api/generate") {
      const body = await readJson(req);
      const { kind, model } = validateGeneration(body);
      const settings = await readSettings();
      assertConnected(settings);
      const payload = buildPayload(kind, model, body);
      const endpoint = resolveEndpoint(kind, model, body);
      const estimateRaw = await hfJson(`/estimate${endpoint}`, { method: "POST", body: payload, settings });
      const estimate = normalizeEstimate(estimateRaw, model, payload);
      if (await wouldExceedCap(estimate.usd, settings)) {
        throw new HttpError(402, "Stopped by your 30-day spending cap. Raise the cap in Settings only if you intend to spend more.");
      }
      const pending = await readPending();
      const fingerprint = requestFingerprint(kind, model.id, endpoint, payload);
      const active = Object.values(pending).filter((item) => item.ownerId === LOCAL_OWNER_ID);
      if (active.some((item) => item.fingerprint === fingerprint)) {
        throw new HttpError(409, "This exact generation is already running. Wait for its result instead of paying twice.");
      }
      if (active.length >= Number(settings.concurrentRequests || 2)) {
        throw new HttpError(429, `Your ${settings.concurrentRequests || 2}-job safety limit is full. Wait for an active generation to finish.`);
      }
      const submitted = await hfJson(endpoint, { method: "POST", body: payload, settings });
      if (!submitted.request_id) throw new HttpError(502, "Higgsfield accepted the request without returning a request ID.");
      const requestMeta = {
        ownerId: LOCAL_OWNER_ID,
        kind,
        model,
        estimate,
        prompt: body.prompt,
        fingerprint,
        submittedAt: new Date().toISOString(),
        statusUrl: safeRequestUrl(submitted.status_url, submitted.request_id, "status"),
        cancelUrl: safeRequestUrl(submitted.cancel_url, submitted.request_id, "cancel"),
        correlationId: submitted._correlationId || "",
      };
      liveRequests.set(submitted.request_id, requestMeta);
      pending[submitted.request_id] = requestMeta;
      await writePrivateJson(PENDING_PATH, pending);
      return json(res, 202, { requestId: submitted.request_id, status: submitted.status, estimate });
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/status/")) {
      const requestId = url.pathname.slice("/api/status/".length);
      if (!/^[a-zA-Z0-9-]{6,120}$/.test(requestId)) throw new HttpError(400, "Invalid request ID.");
      const ledger = await readLedger();
      const archived = ledger.find((item) => item.id === requestId);
      if (archived) return json(res, 200, { status: "completed", outputUrl: archived.outputUrl, progress: 100, error: null });
      const pending = await readPending();
      const meta = liveRequests.get(requestId) || pending[requestId];
      if (!meta || meta.ownerId !== LOCAL_OWNER_ID) throw new HttpError(404, "This generation does not belong to this local studio.");
      const settings = await readSettings();
      assertConnected(settings);
      const raw = await hfJson(meta.statusUrl || safeRequestUrl("", requestId, "status"), { method: "GET", settings });
      const normalized = normalizeStatus(raw);
      if (normalized.status === "completed" && normalized.outputUrl && meta && !meta.recorded) {
        const localUrl = await archiveOutput(normalized.outputUrl, requestId, meta.kind);
        const record = {
          id: requestId,
          kind: meta.kind,
          model: meta.model.label,
          modelId: meta.model.id,
          prompt: meta.prompt,
          usd: meta.estimate.usd,
          credits: meta.estimate.credits,
          createdAt: new Date().toISOString(),
          outputUrl: localUrl,
        };
        ledger.push(record);
        await writePrivateJson(LEDGER_PATH, ledger);
        meta.recorded = true;
        delete pending[requestId];
        await writePrivateJson(PENDING_PATH, pending);
        normalized.outputUrl = localUrl;
      }
      if (["failed", "nsfw", "canceled"].includes(normalized.status)) {
        delete pending[requestId];
        liveRequests.delete(requestId);
        await writePrivateJson(PENDING_PATH, pending);
      }
      return json(res, 200, normalized);
    }

    if (req.method === "GET") return await serveStatic(url.pathname, res);
    throw new HttpError(404, "Not found.");
  } catch (error) {
    const code = error instanceof HttpError ? error.statusCode : 500;
    if (code >= 500) console.error(error);
    return json(res, code, { error: error instanceof Error ? error.message : "Unexpected error." });
  }
});

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`NK Studio: http://127.0.0.1:${PORT}`);
    console.log(`Mode: ${MODE}`);
  });
}

function publicCatalog() {
  return Object.fromEntries(Object.entries(MODEL_CATALOG).map(([kind, models]) => [kind, models.map(({ endpoint, paths, ...model }) => model)]));
}

function getModel(kind, id) {
  return MODEL_CATALOG[kind]?.find((model) => model.id === id);
}

function validateGeneration(body) {
  const kind = body.kind === "video" ? "video" : "image";
  const model = getModel(kind, String(body.modelId || ""));
  if (!model) throw new HttpError(400, "Choose a supported model.");
  if (!body.prompt || String(body.prompt).trim().length < 8) throw new HttpError(400, "Describe the result in at least eight characters.");
  if (model.id === "marketing-studio-image" && !body.referenceUrl) throw new HttpError(400, "Marketing Studio needs one product/reference image.");
  if (model.id === "marketing-studio-image" && !body.presetId) throw new HttpError(400, "Choose an ad layout.");
  if (kind === "video") {
    const mode = body.mode === "text" ? "text" : "image";
    if (mode === "image" && !body.referenceUrl) throw new HttpError(400, "Image-to-video needs a starting image.");
    if (mode === "image" && !model.paths?.image) throw new HttpError(400, `${model.label} does not support image-to-video in this studio.`);
    if (mode === "text" && !model.paths?.text) throw new HttpError(400, `${model.label} does not support text-to-video in this studio.`);
    if (body.endReferenceUrl && !model.supportsEndImage) throw new HttpError(400, `${model.label} does not accept an ending image.`);
  }
  return { kind, model };
}

function buildPayload(kind, model, body) {
  const settings = sanitizeModelSettings(model, body.settings || body);
  const payload = { prompt: String(body.prompt).trim() };
  if (kind === "image") {
    if (model.id === "marketing-studio-image") {
      payload.aspect_ratio = settings.ratio;
      payload.resolution = settings.resolution;
      payload.enhance_prompt = settings.enhancePrompt;
      payload.preset_id = String(body.presetId);
      payload.image_urls = [body.referenceUrl];
    } else if (model.id === "soul-2-standard" || model.id === "soul-standard") {
      payload.aspect_ratio = settings.ratio;
      payload.resolution = settings.resolution;
      payload.batch_size = Number(settings.count);
      payload.enhance_prompt = settings.enhancePrompt;
    } else if (model.id === "ideogram-4") {
      payload.aspect_ratio = settings.ratio;
      payload.rendering_speed = settings.renderingSpeed;
    } else if (model.id === "recraft-4.1") {
      payload.aspect_ratio = settings.ratio;
      payload.resolution = settings.resolution;
      payload.output_format = settings.outputFormat;
    } else if (model.id === "grok-imagine-2") {
      payload.aspect_ratio = settings.ratio;
      payload.resolution = settings.resolution;
      payload.quality = settings.quality;
    } else if (model.id === "qwen-image-3") {
      payload.aspect_ratio = settings.ratio;
      payload.resolution = settings.resolution;
      payload.prompt_extend = settings.promptExtend;
      payload.enable_thinking = settings.enableThinking;
      payload.prompt_extend_mode = "direct";
    } else if (model.id === "z-image-turbo") {
      payload.aspect_ratio = settings.ratio;
      payload.resolution = settings.resolution;
      payload.prompt_extend = settings.promptExtend;
    }
  } else {
    const usesImage = body.mode !== "text";
    payload.duration = settings.duration;
    if (model.id.startsWith("kling-3")) {
      if (model.id === "kling-3-turbo") {
        payload.resolution = settings.resolution;
      } else {
        payload.sound = settings.sound ? "on" : "off";
        payload.cfg_scale = settings.cfgScale;
        payload.multi_shots = settings.multiShots;
      }
    } else if (model.id.startsWith("seedance")) {
      payload.resolution = settings.resolution;
      payload.generate_audio = settings.generateAudio;
      if (model.id === "seedance-2.5") {
        payload.bitrate_mode = settings.bitrateMode;
        payload.output_format = settings.outputFormat;
      }
    } else if (model.id.startsWith("wan-3")) {
      payload.resolution = settings.resolution;
      payload.aspect_ratio = settings.ratio;
      payload.generate_audio = settings.generateAudio;
      payload.enable_thinking = settings.enableThinking;
    }
    if (usesImage) {
      payload.image_url = body.referenceUrl;
      if (body.endReferenceUrl && model.supportsEndImage) {
        payload[model.id.startsWith("seedance") ? "end_image_url" : "last_image_url"] = body.endReferenceUrl;
      }
    } else if (!model.id.startsWith("wan-3")) {
      payload.aspect_ratio = settings.ratio;
    }
  }
  return payload;
}

function resolveEndpoint(kind, model, body) {
  if (kind === "image") return model.endpoint;
  return body.mode === "text" ? model.paths.text : model.paths.image;
}

function sanitizeModelSettings(model, raw) {
  return Object.fromEntries(model.settings.map((field) => {
    const supplied = raw[field.id];
    if (field.type === "toggle") {
      const value = supplied === undefined ? field.default : supplied === true || supplied === "true";
      return [field.id, value];
    }
    if (field.type === "number") {
      const number = Number(supplied);
      const safe = Number.isFinite(number) ? Math.min(field.max, Math.max(field.min, number)) : field.default;
      return [field.id, Number(safe.toFixed(4))];
    }
    const value = String(supplied ?? field.default);
    return [field.id, field.options.includes(value) ? value : field.default];
  }));
}

async function getMarketingPresets(settings) {
  if (presetCache.items.length && Date.now() - presetCache.fetchedAt < 10 * 60 * 1000) return presetCache.items;
  const response = await hfJson("/marketing-studio/image/presets?size=50", { method: "GET", settings });
  const preferred = ["Ingredient Halo", "Fruit Orbit", "Sand Dune Plinth", "Giant Pack Stage", "Concentric Rings", "Problem → Solution"];
  const items = Array.isArray(response.items) ? response.items : [];
  presetCache = {
    fetchedAt: Date.now(),
    items: preferred.map((name) => items.find((item) => item.name === name)).filter(Boolean).map((item) => ({ id: item.id, name: item.name, group: item.metadata?.group_name || "Ad layout", cover: item.cover_image?.url || "" })),
  };
  return presetCache.items;
}

async function hfJson(path, { method, body, settings }) {
  const credentials = getCredentials(settings);
  const target = safeApiUrl(path);
  const options = {
    method,
    headers: {
      Authorization: `Key ${credentials.id}:${credentials.secret}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
  const response = await fetchHiggsfield(target, options);
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new HttpError(502, `Higgsfield returned a non-JSON response (${response.status}).`);
  }
  if (!response.ok) {
    const detail = readableApiError(payload.detail || payload.message || payload.error || "Request failed");
    const correlationId = response.headers.get("x-correlation-id") || "";
    const suffix = correlationId ? ` Support ID: ${correlationId}.` : "";
    throw new HttpError(response.status, `Higgsfield: ${detail}.${suffix}`);
  }
  if (payload && typeof payload === "object") {
    Object.defineProperty(payload, "_correlationId", { value: response.headers.get("x-correlation-id") || "", enumerable: false });
  }
  return payload;
}

async function fetchHiggsfield(target, options) {
  const attempts = options.method === "GET" ? 4 : 1;
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(target, { ...options, signal: AbortSignal.timeout(30_000) });
      if (response.status < 500 || attempt === attempts - 1) return response;
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1) throw new HttpError(504, "Higgsfield did not respond before the request timed out.");
    }
    await wait(500 * (2 ** attempt) + Math.floor(Math.random() * 250));
  }
  throw lastError || new HttpError(502, "Higgsfield request failed.");
}

function safeApiUrl(pathOrUrl) {
  const target = new URL(String(pathOrUrl || ""), API_BASE);
  if (target.origin !== API_BASE) throw new HttpError(400, "Blocked an unexpected API host.");
  return target.href;
}

function safeRequestUrl(value, requestId, action) {
  const expectedPath = `/requests/${requestId}/${action}`;
  const fallback = new URL(expectedPath, `${API_BASE}/`).href;
  if (!value) return fallback;

  let target;
  try {
    target = new URL(String(value), `${API_BASE}/`);
  } catch {
    return fallback;
  }

  const normalizedPath = target.pathname.replace(/\/+$/, "") || "/";
  if (target.origin !== API_BASE || normalizedPath !== expectedPath) {
    return fallback;
  }
  target.pathname = expectedPath;
  target.hash = "";
  return target.href;
}

function requestFingerprint(kind, modelId, endpoint, payload) {
  return createHash("sha256").update(JSON.stringify({ kind, modelId, endpoint, payload })).digest("hex");
}

function readableApiError(value) {
  if (typeof value === "string") return value.replace(/[.\s]+$/, "");
  if (Array.isArray(value)) return value.map(readableApiError).join("; ");
  if (value && typeof value === "object") return Object.values(value).map(readableApiError).filter(Boolean).join(": ");
  return "Request failed";
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCredentials(settings) {
  return {
    id: settings.apiKeyId || process.env.HF_API_KEY_ID || "",
    secret: settings.apiKeySecret || process.env.HF_API_KEY_SECRET || "",
  };
}

function hasCredentials(settings) {
  const value = getCredentials(settings);
  return Boolean(value.id && value.secret);
}

function assertConnected(settings) {
  if (!hasCredentials(settings)) throw new HttpError(503, "Connect your Higgsfield API key in Settings first.");
}

function normalizeEstimate(value, model, payload) {
  const exactUsd = Number(value.usd || 0);
  if (exactUsd > 0) {
    return { usd: exactUsd.toFixed(4), credits: Number(value.credits || 0).toFixed(3), source: "Live Higgsfield estimate" };
  }
  const rate = Number(model?.fallbackRate?.[payload?.resolution] || 0);
  if (rate > 0 && Number(payload?.duration) > 0) {
    return {
      usd: (rate * Number(payload.duration)).toFixed(4),
      credits: "—",
      source: "Published offer estimate",
      note: "This model returns pricing rules instead of an exact preflight total. NK Studio calculates the displayed amount from Higgsfield's published per-second offer rate.",
    };
  }
  throw new HttpError(502, "Higgsfield did not return an exact estimate for this configuration. Choose another model so the spending cap remains trustworthy.");
}

function normalizeStatus(value) {
  const status = String(value.status || "processing").toLowerCase();
  const outputUrl = value.output_url || value.url || value.video?.url || value.image?.url || value.outputs?.[0]?.url || value.images?.[0]?.url || value.videos?.[0]?.url || "";
  return { status, outputUrl, progress: value.progress ?? null, error: value.error || null };
}

async function archiveOutput(remoteUrl, requestId, kind) {
  const response = await fetch(remoteUrl);
  if (!response.ok) return remoteUrl;
  const contentType = response.headers.get("content-type") || "";
  const extension = contentType.includes("video") || kind === "video" ? ".mp4" : contentType.includes("png") ? ".png" : ".jpg";
  const filename = `${requestId}${extension}`;
  await writeFile(join(GENERATED, filename), Buffer.from(await response.arrayBuffer()));
  return `/generated/${filename}`;
}

async function wouldExceedCap(usd, settings) {
  const cap = Number(settings.spendCapUsd || 0);
  if (!cap) return false;
  const spend = summarizeSpend(await readLedger()).rolling30Days;
  return spend + Number(usd || 0) > cap;
}

function summarizeSpend(ledger) {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
  const total = (items) => items.reduce((sum, item) => sum + Number(item.usd || 0), 0);
  return {
    today: total(ledger.filter((item) => Date.parse(item.createdAt) >= dayAgo)),
    rolling30Days: total(ledger.filter((item) => Date.parse(item.createdAt) >= monthAgo)),
    allTime: total(ledger),
  };
}

async function readSettings() {
  return readJsonFile(SETTINGS_PATH, { spendCapUsd: 10, concurrentRequests: 2 });
}

async function readLedger() {
  return readJsonFile(LEDGER_PATH, []);
}

async function readPending() {
  return readJsonFile(PENDING_PATH, {});
}

async function readJsonFile(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}

async function writePrivateJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await chmod(path, 0o600);
}

function publicSettings(settings) {
  return {
    spendCapUsd: Number(settings.spendCapUsd || 0),
    concurrentRequests: Number(settings.concurrentRequests || 2),
    apiKeyIdMask: getCredentials(settings).id ? `${getCredentials(settings).id.slice(0, 4)}••••` : "Not connected",
  };
}

function loadEnv(path) {
  if (!path || !existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const equals = line.indexOf("=");
    if (equals < 1) continue;
    const key = line.slice(0, equals).trim();
    const value = line.slice(equals + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

function parseDataUrl(value) {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(value || ""));
  if (!match) throw new HttpError(400, "Upload a PNG, JPG, or WebP image.");
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > 12 * 1024 * 1024) throw new HttpError(400, "Image must be smaller than 12 MB.");
  return { contentType: match[1], buffer };
}

function cleanSecret(value) {
  const text = String(value || "").trim();
  return text && text.length <= 500 ? text : "";
}

function parseHiggsfieldCredentials(value) {
  const raw = cleanSecret(value)
    .replace(/^HF_CREDENTIALS\s*=\s*/i, "")
    .replace(/^(['"])(.*)\1$/, "$2")
    .replace(/^Authorization:\s*Key\s+/i, "")
    .replace(/^Key\s+/i, "");
  const separator = raw.indexOf(":");
  const apiKeyId = separator > 0 ? cleanSecret(raw.slice(0, separator)) : "";
  const apiKeySecret = separator > 0 ? cleanSecret(raw.slice(separator + 1)) : "";
  if (!apiKeyId || !apiKeySecret || /[•●]/.test(raw)) {
    throw new HttpError(400, "In Higgsfield, click Copy API Key, then paste the complete copied key here. Do not copy the masked preview.");
  }
  return { apiKeyId, apiKeySecret };
}

async function testHiggsfieldConnection(settings) {
  const model = MODEL_CATALOG.image[1];
  const payload = buildPayload("image", model, {
    prompt: "Clean studio product photograph on a warm neutral background",
    ratio: "1:1",
    resolution: "720p",
  });
  const estimate = await hfJson(`/estimate${model.endpoint}`, { method: "POST", body: payload, settings });
  return { ok: true, estimate: normalizeEstimate(estimate, model, payload), model: model.label };
}

function cleanRatio(value) {
  return ["1:1", "16:9", "9:16", "4:5", "3:2", "2:3"].includes(value) ? value : "1:1";
}

function optionalPositive(value, fallback) {
  if (value === "" || value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, "Request is too large.");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}

async function serveStatic(pathname, res) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const safe = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const full = join(PUBLIC, safe);
  if (!full.startsWith(PUBLIC) || !existsSync(full)) throw new HttpError(404, "Not found.");
  const type = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".mp4": "video/mp4", ".svg": "image/svg+xml" }[extname(full)] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": type, "Cache-Control": requested.startsWith("/generated/") ? "public, max-age=31536000" : "no-store" });
  res.end(await readFile(full));
}

function json(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(payload));
}

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export { buildPayload, parseHiggsfieldCredentials, resolveEndpoint, safeRequestUrl, sanitizeModelSettings, summarizeSpend, validateGeneration, MODEL_CATALOG };
