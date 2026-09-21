const state = {
  bootstrap: null,
  selectedModel: { image: "marketing-studio-image", video: "kling-3-image-video" },
  referenceUrl: { image: "", video: "" },
  endReferenceUrl: "",
  estimate: { image: null, video: null },
  videoPurpose: "ad",
};

const views = {
  home: ["YOUR CONTROL ROOM", "Create without subscription anxiety."],
  image: ["IMAGE WORKFLOW", "Describe it. Price it. Create it."],
  video: ["VIDEO + B-ROLL", "Create a cinematic shot without prompt guesswork."],
  library: ["YOUR OUTPUTS", "Everything stays easy to find."],
  settings: ["PRIVATE + CONTROLLED", "Connect once. Set your limit."],
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindNavigation();
  bindForms();
  await refresh();
}

async function refresh() {
  state.bootstrap = await api("/api/bootstrap");
  renderConnection();
  renderModels("image");
  renderModels("video");
  renderPresets();
  renderSpend();
  renderLibrary();
  document.querySelector('#limitsForm [name="spendCapUsd"]').value = state.bootstrap.settings.spendCapUsd;
  document.querySelector('#limitsForm [name="concurrentRequests"]').value = state.bootstrap.settings.concurrentRequests;
}

function bindNavigation() {
  document.querySelectorAll("[data-view], [data-go]").forEach((button) => button.addEventListener("click", () => {
    showView(button.dataset.view || button.dataset.go);
    if (button.dataset.videoPurpose) setVideoPurpose(button.dataset.videoPurpose);
  }));
  document.getElementById("openSettings").addEventListener("click", () => showView("settings"));
}

function showView(name) {
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === `view-${name}`));
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === name));
  document.getElementById("viewEyebrow").textContent = views[name][0];
  document.getElementById("viewTitle").textContent = views[name][1];
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindForms() {
  ["image", "video"].forEach((kind) => {
    const form = document.getElementById(`${kind}Form`);
    form.querySelector("[data-action='estimate']").addEventListener("click", () => estimate(kind));
    form.addEventListener("submit", (event) => { event.preventDefault(); generate(kind); });
    form.reference.addEventListener("change", () => uploadReference(kind, "start"));
    form.addEventListener("input", () => resetEstimate(kind));
  });
  document.querySelector('#videoForm [name="endReference"]').addEventListener("change", () => uploadReference("video", "end"));
  document.getElementById("videoMode").addEventListener("change", () => {
    renderVideoInputs();
    resetEstimate("video");
  });
  document.querySelectorAll("[data-video-purpose]").forEach((button) => button.addEventListener("click", () => setVideoPurpose(button.dataset.videoPurpose)));
  document.getElementById("buildBrollPrompt").addEventListener("click", buildBrollPrompt);

  document.getElementById("settingsForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const submit = event.currentTarget.querySelector("button[type='submit']");
    submit.disabled = true;
    const original = submit.textContent;
    submit.textContent = "Connecting safely...";
    try {
      const result = await api("/api/connect", { method: "POST", body: { credentials: form.get("credentials") } });
      event.currentTarget.reset();
      await refresh();
      toast(`Connected. Live ${result.model} estimate: $${result.estimate.usd}`);
    } catch (error) {
      toast(`Not connected. ${error.message}`, true);
    } finally {
      submit.disabled = false;
      submit.textContent = original;
    }
  });
  document.getElementById("limitsForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api("/api/settings", { method: "POST", body: { spendCapUsd: form.get("spendCapUsd"), concurrentRequests: form.get("concurrentRequests") } });
    await refresh();
    toast("Spending cap saved.");
  });
  document.getElementById("testConnection").addEventListener("click", async () => {
    try {
      const result = await api("/api/test-connection", { method: "POST", body: {} });
      toast(`Connected. Live ${result.model} estimate: $${result.estimate.usd}`);
    } catch (error) { toast(error.message, true); }
  });
  document.getElementById("libraryFilter").addEventListener("change", renderLibrary);
}

function renderConnection() {
  const connected = state.bootstrap.connected;
  document.getElementById("connectionDot").classList.toggle("on", connected);
  document.getElementById("connectionText").textContent = connected ? "Connected" : "Not connected";
  document.getElementById("capBadge").textContent = state.bootstrap.settings.spendCapUsd ? `$${state.bootstrap.settings.spendCapUsd}` : "Off";
}

function renderModels(kind) {
  const select = document.getElementById(`${kind}Models`);
  const models = state.bootstrap.models[kind];
  if (!models.some((model) => model.id === state.selectedModel[kind])) state.selectedModel[kind] = models[0]?.id || "";
  select.innerHTML = models.map((model) => `<option value="${model.id}" ${state.selectedModel[kind] === model.id ? "selected" : ""}>${escapeHtml(model.provider)} · ${escapeHtml(model.label)}</option>`).join("");
  select.onchange = () => {
    state.selectedModel[kind] = select.value;
    resetEstimate(kind);
    renderModels(kind);
    if (kind === "image") renderPresets();
  };
  const model = selectedModel(kind);
  const summary = document.getElementById(`${kind}ModelSummary`);
  summary.innerHTML = `<div><span>${escapeHtml(model.provider)}</span>${model.badge ? `<b>${escapeHtml(model.badge)}</b>` : ""}</div><strong>${escapeHtml(model.label)}</strong><p>${escapeHtml(model.description)}</p><small><b>Best for:</b> ${escapeHtml(model.bestFor)}</small><small><b>Price:</b> ${escapeHtml(model.priceHint)} · exact price appears before generation</small>`;
  renderSettings(kind, model);
  if (kind === "video") renderVideoInputs();
}

function selectedModel(kind) {
  return state.bootstrap.models[kind].find((model) => model.id === state.selectedModel[kind]);
}

function renderSettings(kind, model) {
  const root = document.getElementById(`${kind}Settings`);
  const primary = model.settings.filter((field) => !field.advanced).map(settingControl).join("");
  const advanced = model.settings.filter((field) => field.advanced).map(settingControl).join("");
  root.innerHTML = `<div class="setting-grid">${primary}</div>${advanced ? `<details class="advanced-settings"><summary>More model controls</summary><div class="setting-grid">${advanced}</div></details>` : ""}`;
}

function settingControl(field) {
  if (field.type === "toggle") {
    return `<label class="toggle-setting"><input data-setting="${field.id}" type="checkbox" ${field.default ? "checked" : ""}/><span>${escapeHtml(field.label)}</span></label>`;
  }
  if (field.type === "number") {
    return `<label>${escapeHtml(field.label)}<input data-setting="${field.id}" type="number" min="${field.min}" max="${field.max}" step="${field.step}" value="${field.default}" /></label>`;
  }
  return `<label>${escapeHtml(field.label)}<select data-setting="${field.id}">${field.options.map((value) => `<option value="${escapeHtml(value)}" ${value === field.default ? "selected" : ""}>${escapeHtml(prettyValue(value))}</option>`).join("")}</select></label>`;
}

function renderPresets() {
  const isMarketing = state.selectedModel.image === "marketing-studio-image";
  document.getElementById("presetField").hidden = !isMarketing;
  document.getElementById("imageUploadBox").hidden = !isMarketing;
  const select = document.getElementById("presetSelect");
  select.innerHTML = (state.bootstrap.presets || []).map((preset) => `<option value="${preset.id}">${escapeHtml(preset.name)} · ${escapeHtml(preset.group)}</option>`).join("");
}

function renderVideoInputs() {
  const model = selectedModel("video");
  const imageMode = document.getElementById("videoMode").value === "image";
  document.getElementById("videoUploadBox").hidden = !imageMode;
  document.getElementById("videoEndUploadBox").hidden = !imageMode || !model.supportsEndImage;
  document.getElementById("videoUploadLabel").textContent = state.videoPurpose === "broll"
    ? "Character or starting image · required"
    : "Starting image · required";
  document.getElementById("videoModeHint").textContent = imageMode
    ? "The uploaded character, clothing and scene become the first frame and visual anchor."
    : "Text only lets the model invent the character and is less consistent.";
}

function setVideoPurpose(purpose) {
  state.videoPurpose = purpose === "broll" ? "broll" : "ad";
  const broll = state.videoPurpose === "broll";
  if (broll && state.selectedModel.video === "kling-3-image-video") {
    state.selectedModel.video = "seedance-2";
    renderModels("video");
  }
  document.querySelectorAll(".purpose-option").forEach((button) => button.classList.toggle("active", button.dataset.videoPurpose === state.videoPurpose));
  document.getElementById("brollBuilder").hidden = !broll;
  document.getElementById("videoModeField").hidden = false;
  document.getElementById("videoMode").value = "image";
  document.getElementById("videoPromptLabel").textContent = broll ? "Generated B-roll prompt" : "How should the image move?";
  document.getElementById("videoPromptHint").textContent = broll ? "Review or edit this prompt before checking the price." : "Describe camera motion, subject motion and the final hold.";
  document.getElementById("videoPreviewTitle").textContent = broll ? "B-roll preview" : "Video preview";
  document.getElementById("videoEmptyHint").textContent = broll ? "Paste one script line, build the prompt, then see the real price." : "Upload one still, describe motion, then create.";
  renderVideoInputs();
  resetEstimate("video");
}

function buildBrollPrompt() {
  const line = document.getElementById("brollLine").value.trim();
  if (!line) return toast("Paste one script line first.", true);
  const style = document.getElementById("brollStyle").value;
  const duration = document.querySelector('#videoSettings [data-setting="duration"]')?.value || 5;
  const usesReference = document.getElementById("videoMode").value === "image";
  const referenceRule = usesReference
    ? "Treat the uploaded image as a strict character and wardrobe reference. Preserve the same blank face, clothing, colors, body proportions and setting. Animate it without redesigning or replacing the subject."
    : "Create one visually clear subject and keep its identity, wardrobe and proportions unchanged for the entire shot.";
  document.getElementById("videoPrompt").value = `Create one continuous ${duration}-second ${style} B-roll shot that visually communicates: "${line}". ${referenceRule} Use one location, one subject action and one smooth motivated camera move. Begin with an immediately readable close detail, reveal the meaning through controlled camera movement, and finish on a stable one-second hold. Premium cinematic lighting, strong depth, restrained motion and physically coherent realism. No scene changes, no additional characters, no captions, no readable text, no logos, no interface, no watermark, no face generation, no wardrobe change, no duplicate subject, no body morphing, no extra limbs, no flicker and no camera shake. 16:9, premium commercial color grade, 24 fps.`;
  resetEstimate("video");
  toast("B-roll prompt ready. Review it, then see the real price.");
}

function renderSpend() {
  document.getElementById("spendToday").textContent = money(state.bootstrap.spend.today);
  document.getElementById("spendMonth").textContent = money(state.bootstrap.spend.rolling30Days);
  document.getElementById("spendAll").textContent = money(state.bootstrap.spend.allTime);
}

function renderLibrary() {
  const filter = document.getElementById("libraryFilter")?.value || "all";
  const items = (state.bootstrap?.library || []).filter((item) => filter === "all" || item.kind === filter);
  const markup = items.length ? items.map(libraryCard).join("") : '<div class="empty-library">Your completed generations will appear here—with the prompt, model and real cost.</div>';
  document.getElementById("libraryGrid").innerHTML = markup;
  document.getElementById("recentGrid").innerHTML = items.length ? items.slice(0, 3).map(libraryCard).join("") : '<div class="empty-library">No completed generations yet.</div>';
}

function libraryCard(item) {
  const media = item.kind === "video" ? `<video src="${item.outputUrl}" muted playsinline controls></video>` : `<img src="${item.outputUrl}" alt="Generated result" />`;
  return `<article class="library-card"><div class="library-media">${media}</div><div class="library-body"><small>${escapeHtml(item.model)}</small><strong>${escapeHtml(item.prompt)}</strong><div class="library-meta"><span>${new Date(item.createdAt).toLocaleDateString()}</span><span>$${Number(item.usd).toFixed(4)}</span></div></div></article>`;
}

async function uploadReference(kind, slot = "start") {
  const form = document.getElementById(`${kind}Form`);
  const input = slot === "end" ? form.endReference : form.reference;
  const file = input.files[0];
  if (!file) return;
  const statusId = slot === "end" ? "videoEndFileName" : `${kind}FileName`;
  document.getElementById(statusId).textContent = `Uploading ${file.name}…`;
  try {
    const dataUrl = await fileToDataUrl(file);
    const uploaded = await api("/api/upload", { method: "POST", body: { dataUrl } });
    if (slot === "end") state.endReferenceUrl = uploaded.publicUrl;
    else state.referenceUrl[kind] = uploaded.publicUrl;
    document.getElementById(statusId).textContent = `Ready · ${file.name}`;
    resetEstimate(kind);
    toast(`${slot === "end" ? "Ending" : "Starting"} image uploaded.`);
  } catch (error) {
    document.getElementById(statusId).textContent = "Upload failed—choose the file again";
    toast(error.message, true);
  }
}

function requestBody(kind) {
  const form = document.getElementById(`${kind}Form`);
  const data = new FormData(form);
  const settings = {};
  form.querySelectorAll("[data-setting]").forEach((control) => {
    settings[control.dataset.setting] = control.type === "checkbox" ? control.checked : control.value;
  });
  return {
    kind,
    modelId: state.selectedModel[kind],
    prompt: data.get("prompt"),
    mode: kind === "video" ? data.get("mode") : undefined,
    settings,
    presetId: data.get("presetId"),
    referenceUrl: state.referenceUrl[kind],
    endReferenceUrl: kind === "video" ? state.endReferenceUrl : "",
  };
}

async function estimate(kind) {
  setStatus(kind, "Checking price…");
  try {
    const result = await api("/api/estimate", { method: "POST", body: requestBody(kind) });
    state.estimate[kind] = result.estimate;
    const button = document.getElementById(`${kind}Form`).querySelector(".generate");
    button.disabled = result.willBlock;
    button.innerHTML = result.willBlock ? "Blocked by spending cap" : `2. Generate for $${result.estimate.usd} <span>→</span>`;
    document.getElementById(`${kind}Proof`).textContent = `${result.estimate.source || "Higgsfield estimate"} · ${result.model} · $${result.estimate.usd}${result.estimate.credits === "—" ? "" : ` · ${result.estimate.credits} credits`}${result.willBlock ? " · Over your cap" : ""}${result.estimate.note ? ` · ${result.estimate.note}` : ""}`;
    setStatus(kind, result.willBlock ? "Cap blocked" : "Price ready");
  } catch (error) { setStatus(kind, "Needs attention"); toast(error.message, true); }
}

function resetEstimate(kind) {
  state.estimate[kind] = null;
  const button = document.getElementById(`${kind}Form`).querySelector(".generate");
  button.disabled = true;
  button.innerHTML = `2. Generate ${kind} <span>→</span>`;
}

async function generate(kind) {
  if (!state.estimate[kind]) return toast("See the real price first.", true);
  const button = document.getElementById(`${kind}Form`).querySelector(".generate");
  button.disabled = true;
  setStatus(kind, "Submitting…");
  try {
    const result = await api("/api/generate", { method: "POST", body: requestBody(kind) });
    document.getElementById(`${kind}Proof`).textContent = `Request ${result.requestId} · approved estimate $${result.estimate.usd}`;
    await poll(kind, result.requestId);
  } catch (error) { setStatus(kind, "Failed"); toast(error.message, true); resetEstimate(kind); }
}

async function poll(kind, requestId) {
  const deadline = Date.now() + 15 * 60 * 1000;
  let delay = 2000;
  while (Date.now() < deadline) {
    const result = await api(`/api/status/${requestId}`);
    const terminalFailure = ["failed", "nsfw", "canceled"].includes(result.status);
    setStatus(kind, result.status === "completed" ? "Complete" : terminalFailure ? prettyValue(result.status) : "Generating…");
    if (result.status === "completed" && result.outputUrl) {
      const stage = document.getElementById(`${kind}Stage`);
      stage.innerHTML = kind === "video" ? `<video src="${result.outputUrl}" controls autoplay playsinline></video>` : `<img src="${result.outputUrl}" alt="Generated image" />`;
      await refresh();
      toast(`${kind === "video" ? "Video" : "Image"} saved to your library.`);
      resetEstimate(kind);
      return;
    }
    if (terminalFailure || result.error) {
      const message = result.status === "nsfw" ? "Higgsfield's safety system rejected this generation. Try a different image or prompt." : result.status === "canceled" ? "This generation was canceled before processing." : result.error || "Generation failed.";
      throw new Error(message);
    }
    await new Promise((resolve) => setTimeout(resolve, delay + Math.floor(Math.random() * 500)));
    delay = Math.min(Math.round(delay * 1.5), 10_000);
  }
  throw new Error("This generation is taking longer than 15 minutes. Its request ID is saved, so you can safely check again without resubmitting.");
}

function setStatus(kind, value) { document.getElementById(`${kind}Status`).textContent = value; }

async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) }, body: options.body ? JSON.stringify(options.body) : undefined });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
  return payload;
}

function toast(message, error = false) {
  const root = document.getElementById("toast");
  root.textContent = message;
  root.classList.toggle("error", error);
  root.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => root.classList.remove("show"), 4200);
}

function fileToDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); }
function money(value) { return `$${Number(value || 0).toFixed(2)}`; }
function prettyValue(value) { return String(value).replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()); }
function escapeHtml(value) { return String(value || "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]); }
