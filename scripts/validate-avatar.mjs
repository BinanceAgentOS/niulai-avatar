#!/usr/bin/env node

import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

function usage() {
  return `Usage:
  node scripts/validate-avatar.mjs --input <image> [--min-size 512] [--json]
`;
}

function fail(message, json = false, code = 1) {
  const text = json
    ? JSON.stringify({ success: false, error: message }, null, 2)
    : `Error: ${message}`;
  process.stderr.write(`${text}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  const args = { input: undefined, minSize: 512, json: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--input") {
      args.input = argv[++i];
    } else if (flag === "--min-size") {
      args.minSize = Number(argv[++i]);
    } else if (flag === "--json") {
      args.json = true;
    } else if (flag === "--help" || flag === "-h") {
      args.help = true;
    } else {
      throw new Error(`unknown option: ${flag}`);
    }
  }
  return args;
}

function pngDimensions(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== signature) return null;
  return { format: "png", width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > buffer.length) break;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) break;
    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isStartOfFrame && length >= 7) {
      return {
        format: "jpeg",
        width: buffer.readUInt16BE(offset + 5),
        height: buffer.readUInt16BE(offset + 3),
      };
    }
    offset += length;
  }
  return null;
}

function webpDimensions(buffer) {
  if (
    buffer.length < 30 ||
    buffer.subarray(0, 4).toString("ascii") !== "RIFF" ||
    buffer.subarray(8, 12).toString("ascii") !== "WEBP"
  ) {
    return null;
  }

  const chunk = buffer.subarray(12, 16).toString("ascii");
  if (chunk === "VP8X") {
    return {
      format: "webp",
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  if (chunk === "VP8 " && buffer.length >= 30) {
    return {
      format: "webp",
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === "VP8L" && buffer.length >= 25 && buffer[20] === 0x2f) {
    const b1 = buffer[21];
    const b2 = buffer[22];
    const b3 = buffer[23];
    const b4 = buffer[24];
    return {
      format: "webp",
      width: 1 + b1 + ((b2 & 0x3f) << 8),
      height: 1 + ((b2 & 0xc0) >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10),
    };
  }
  return null;
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
  if (!args.input) fail("--input is required", args.json);
  if (!Number.isInteger(args.minSize) || args.minSize < 1) {
    fail("--min-size must be a positive integer", args.json);
  }

  const path = resolve(args.input);
  let info;
  let buffer;
  try {
    [info, buffer] = await Promise.all([stat(path), readFile(path)]);
  } catch (error) {
    fail(error.message, args.json);
  }
  if (!info.isFile()) fail("input is not a file", args.json);

  const dimensions = pngDimensions(buffer) ?? jpegDimensions(buffer) ?? webpDimensions(buffer);
  if (!dimensions) fail("unsupported or unreadable image format", args.json, 2);

  const checks = {
    square: dimensions.width === dimensions.height,
    minimum_size: dimensions.width >= args.minSize && dimensions.height >= args.minSize,
    non_empty: info.size > 0,
  };
  const success = Object.values(checks).every(Boolean);
  const result = {
    success,
    path,
    format: dimensions.format,
    width: dimensions.width,
    height: dimensions.height,
    bytes: info.size,
    minimum_required: args.minSize,
    checks,
  };

  const output = args.json
    ? JSON.stringify(result, null, 2)
    : `${success ? "PASS" : "FAIL"}: ${dimensions.width}x${dimensions.height} ${dimensions.format}`;
  process.stdout.write(`${output}\n`);
  if (!success) process.exit(2);
}

await main();
