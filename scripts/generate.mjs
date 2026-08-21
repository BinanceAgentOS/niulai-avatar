#!/usr/bin/env node

import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_REFERENCE = resolve(SKILL_DIR, "assets/niulai-reference.png");
const ENDPOINT = "https://api.openai.com/v1/images/edits";
const MODEL = "gpt-image-2";
const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const TIMEOUT_MS = 180_000;

const strengths = {
  light: "about 55% Niulai character and 45% uploaded-avatar traits",
  standard: "about 70% Niulai character and 30% uploaded-avatar traits",
  strong: "about 85% Niulai character and 15% uploaded-avatar traits",
};

const validQualities = new Set(["low", "medium", "high", "auto"]);
const validThemes = new Set(["classic", "binance"]);
const mimeTypes = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
]);

function usage() {
  return `Usage:
  node scripts/generate.mjs --input <avatar> --output <png> [options]

Required:
  --input <path>          Uploaded user avatar (PNG, JPEG, or WebP)
  --output <path>         New PNG output path

Options:
  --reference <path>      Niulai reference (default: bundled asset)
  --strength <value>      light | standard | strong (default: standard)
  --theme <value>         classic | binance (default: classic)
  --traits <text>         User-priority traits to retain
  --size <WxH>            Valid GPT Image 2 size (default: 1024x1024)
  --quality <value>       low | medium | high | auto (default: medium)
  --dry-run               Validate inputs and print the prompt without a network call
  --force                 Allow replacing an existing output file
  --json                  Print machine-readable output
  --help                  Show this help
`;
}

function fail(message, json = false, details = undefined, code = 1) {
  const payload = { success: false, error: message };
  if (details !== undefined) payload.details = details;
  if (json) {
    process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    process.stderr.write(`Error: ${message}\n`);
  }
  process.exit(code);
}

function takeValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return value;
}

function parseArgs(argv) {
  const args = {
    input: undefined,
    output: undefined,
    reference: DEFAULT_REFERENCE,
    strength: "standard",
    theme: "classic",
    traits: "",
    size: "1024x1024",
    quality: "medium",
    dryRun: false,
    force: false,
    json: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    switch (flag) {
      case "--input":
        args.input = takeValue(argv, i, flag);
        i += 1;
        break;
      case "--output":
        args.output = takeValue(argv, i, flag);
        i += 1;
        break;
      case "--reference":
        args.reference = takeValue(argv, i, flag);
        i += 1;
        break;
      case "--strength":
        args.strength = takeValue(argv, i, flag);
        i += 1;
        break;
      case "--theme":
        args.theme = takeValue(argv, i, flag);
        i += 1;
        break;
      case "--traits":
        args.traits = takeValue(argv, i, flag).trim();
        i += 1;
        break;
      case "--size":
        args.size = takeValue(argv, i, flag);
        i += 1;
        break;
      case "--quality":
        args.quality = takeValue(argv, i, flag);
        i += 1;
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--force":
        args.force = true;
        break;
      case "--json":
        args.json = true;
        break;
      case "--help":
      case "-h":
        args.help = true;
        break;
      default:
        throw new Error(`unknown option: ${flag}`);
    }
  }

  return args;
}

function validateSize(value) {
  const match = /^(\d+)x(\d+)$/.exec(value);
  if (!match) return false;
  const width = Number(match[1]);
  const height = Number(match[2]);
  const pixels = width * height;
  return (
    width <= 3840 &&
    height <= 3840 &&
    width % 16 === 0 &&
    height % 16 === 0 &&
    Math.max(width, height) / Math.min(width, height) <= 3 &&
    pixels >= 655_360 &&
    pixels <= 8_294_400
  );
}

async function ensureImage(path, label) {
  const extension = extname(path).toLowerCase();
  const mime = mimeTypes.get(extension);
  if (!mime) throw new Error(`${label} must be PNG, JPEG, or WebP`);

  await access(path, fsConstants.R_OK);
  const info = await stat(path);
  if (!info.isFile()) throw new Error(`${label} is not a file: ${path}`);
  if (info.size === 0) throw new Error(`${label} is empty: ${path}`);
  if (info.size > MAX_INPUT_BYTES) {
    throw new Error(`${label} exceeds the 20 MiB safety limit: ${path}`);
  }
  return { mime, size: info.size };
}

async function fileExists(path) {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function buildPrompt(args) {
  const traitInstruction = args.traits
    ? `Preserve these user-priority traits from Image 2: ${args.traits}.`
    : "Identify and preserve two to four high-signal traits from Image 2, prioritizing hair or headwear, eyewear, clothing silhouette, and dominant colors.";

  const themeInstruction =
    args.theme === "binance"
      ? "Apply a restrained Binance theme without losing the meme: add at most two subtle low-resolution yellow-and-black cues, such as a small black badge with a yellow Binance geometric diamond or a faint blurred diamond in the background. Add no words and imply no official endorsement."
      : "Use the classic Niulai palette. Add no brand marks, logos, letters, usernames, or captions.";

  return `Create one square social-profile avatar using two image references.

Image 1 is the dominant Niulai character and lo-fi meme-style reference. Preserve its tall blue-tipped horns, small side ears, narrow sleepy eyes, broad elongated blue-violet bovine muzzle, vacant awkward expression, muted olive-tan skin, warm yellow-orange background, primitive early-3D rendering, soft blur, washed-out contrast, color bleed, compression noise, slight asymmetry, and accidental old-screenshot feeling.

Image 2 is the user's uploaded avatar and supplies recognizable identity cues only. ${traitInstruction}

Use ${strengths[args.strength]}. Keep exactly one anthropomorphic bull. Frame a head-and-shoulders portrait with both horn tips fully inside the square and make the face readable at 64px. ${themeInstruction}

Do not polish, sharpen, beautify, modernize, or symmetrize the Niulai character. Avoid a generic cute cow, glossy corporate mascot, cinematic 3D, photorealistic fur, human facial anatomy, extra characters, extra horns, extra eyes, extra limbs, copied text, signatures, watermarks, or cropped horn tips.`;
}

function safeApiError(payload, requestId) {
  const error = payload?.error ?? {};
  return {
    message: typeof error.message === "string" ? error.message : "Image API request failed",
    type: error.type,
    code: error.code,
    moderation_details: error.moderation_details,
    request_id: requestId || undefined,
  };
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    fail(error.message, process.argv.includes("--json"));
  }

  if (args.help) {
    process.stdout.write(usage());
    return;
  }

  const nodeMajor = Number(process.versions.node.split(".")[0]);
  if (nodeMajor < 22) fail("Node.js 22 or newer is required", args.json);
  if (!args.input) fail("--input is required", args.json);
  if (!args.output) fail("--output is required", args.json);
  if (!(args.strength in strengths)) {
    fail("--strength must be light, standard, or strong", args.json);
  }
  if (!validThemes.has(args.theme)) {
    fail("--theme must be classic or binance", args.json);
  }
  if (!validQualities.has(args.quality)) {
    fail("--quality must be low, medium, high, or auto", args.json);
  }
  if (!validateSize(args.size)) fail("--size is not valid for GPT Image 2", args.json);

  args.input = resolve(args.input);
  args.output = resolve(args.output);
  args.reference = resolve(args.reference);

  if (extname(args.output).toLowerCase() !== ".png") {
    fail("--output must use a .png extension", args.json);
  }
  if (args.output === args.input || args.output === args.reference) {
    fail("refusing to overwrite an input or reference image", args.json);
  }

  let inputInfo;
  let referenceInfo;
  try {
    inputInfo = await ensureImage(args.input, "input image");
    referenceInfo = await ensureImage(args.reference, "reference image");
  } catch (error) {
    fail(error.message, args.json);
  }

  if (!args.force && (await fileExists(args.output))) {
    fail(`output already exists; choose a new path or pass --force: ${args.output}`, args.json);
  }

  const prompt = buildPrompt(args);
  const requestSummary = {
    success: true,
    dry_run: args.dryRun,
    model: MODEL,
    endpoint: ENDPOINT,
    input: args.input,
    reference: args.reference,
    output: args.output,
    strength: args.strength,
    theme: args.theme,
    size: args.size,
    quality: args.quality,
    prompt,
  };

  if (args.dryRun) {
    process.stdout.write(args.json ? `${JSON.stringify(requestSummary, null, 2)}\n` : `${prompt}\n`);
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    fail("OPENAI_API_KEY is not set; set it in the local environment and retry", args.json);
  }

  const [referenceBytes, inputBytes] = await Promise.all([
    readFile(args.reference),
    readFile(args.input),
  ]);

  const form = new FormData();
  form.append("model", MODEL);
  form.append(
    "image[]",
    new Blob([referenceBytes], { type: referenceInfo.mime }),
    basename(args.reference),
  );
  form.append(
    "image[]",
    new Blob([inputBytes], { type: inputInfo.mime }),
    basename(args.input),
  );
  form.append("prompt", prompt);
  form.append("size", args.size);
  form.append("quality", args.quality);
  form.append("output_format", "png");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    });
  } catch (error) {
    const message = error.name === "AbortError" ? "image request timed out" : error.message;
    fail(message, args.json);
  } finally {
    clearTimeout(timer);
  }

  const requestId = response.headers.get("x-request-id");
  let payload;
  try {
    payload = await response.json();
  } catch {
    fail("image API returned a non-JSON response", args.json, { request_id: requestId });
  }

  if (!response.ok) {
    const safeError = safeApiError(payload, requestId);
    fail(safeError.message, args.json, safeError);
  }

  const encoded = payload?.data?.[0]?.b64_json;
  if (typeof encoded !== "string" || encoded.length === 0) {
    fail("image API returned no base64 image", args.json, { request_id: requestId });
  }

  const outputBytes = Buffer.from(encoded, "base64");
  await mkdir(dirname(args.output), { recursive: true });
  await writeFile(args.output, outputBytes, { mode: 0o600 });

  const result = {
    success: true,
    output: args.output,
    bytes: outputBytes.length,
    model: MODEL,
    strength: args.strength,
    theme: args.theme,
    size: args.size,
    quality: args.quality,
    request_id: requestId || undefined,
  };
  process.stdout.write(args.json ? `${JSON.stringify(result, null, 2)}\n` : `${args.output}\n`);
}

await main();
