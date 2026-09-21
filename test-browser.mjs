import { spawn } from "node:child_process";
import { chromium } from "playwright";

const port = 4198;
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["server.mjs"], {
  cwd: new URL(".", import.meta.url).pathname,
  env: { ...process.env, PORT: String(port), HF_MODE: "demo", HF_API_KEY_ID: "", HF_API_KEY_SECRET: "" },
  stdio: "ignore",
});

let browser;
try {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(base);
      if (response.ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const consoleErrors = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.goto(base, { waitUntil: "networkidle" });

  if (!(await page.getByRole("link", { name: /Get Higgsfield API access/ }).isVisible())) {
    throw new Error("The guided Higgsfield signup step is missing.");
  }
  if (!(await page.getByRole("button", { name: /Connect and test/ }).isVisible())) {
    throw new Error("The one-step credential connection action is missing.");
  }

  await page.getByRole("button", { name: /Create B-roll/ }).click();
  await page.getByLabel("Paste one line from your script").fill("One API can replace a shelf full of expensive subscriptions.");
  await page.getByRole("button", { name: "Build my B-roll prompt" }).click();

  const prompt = await page.locator("#videoPrompt").inputValue();
  if (!prompt.includes("first-second pattern interrupt") || !prompt.includes("clean one-second hero hold")) {
    throw new Error("B-roll prompt builder did not create the expected cinematic prompt.");
  }
  if ((await page.locator("#videoModels").inputValue()) !== "seedance-2") {
    throw new Error("B-roll workflow did not select the safe Seedance starting model.");
  }
  if ((await page.locator(".brand small").innerText()) !== "by Nabila K") {
    throw new Error("The official Nabila K brand line is missing.");
  }

  await page.setViewportSize({ width: 390, height: 844 });
  if (!(await page.getByRole("button", { name: "Build my B-roll prompt" }).isVisible())) {
    throw new Error("B-roll action is not visible on a phone-sized viewport.");
  }
  if (consoleErrors.length) throw new Error(`Browser console errors: ${consoleErrors.join(" | ")}`);
  console.log("Browser check passed: guided onboarding, B-roll discovery, prompt building, model default, branding and mobile layout.");
} finally {
  await browser?.close();
  server.kill("SIGTERM");
}
