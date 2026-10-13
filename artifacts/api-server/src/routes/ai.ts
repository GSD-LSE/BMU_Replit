import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import OpenAI, { toFile } from "openai";

const router: IRouter = Router();
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const AUDIO_TYPES = new Set([
  "audio/mp4",
  "audio/m4a",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
]);
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const AI_REQUESTS_PER_MINUTE = 20;
let aiRequestWindowStart = Date.now();
let aiRequestCount = 0;

type AiRequest = {
  audioBase64?: unknown;
  imageBase64?: unknown;
  mimeType?: unknown;
  filename?: unknown;
};

function getConfiguredClient(): OpenAI | null {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  if (!apiKey || !baseURL) return null;
  return new OpenAI({ apiKey, baseURL });
}

function decodeBase64(value: unknown, maxBytes: number): Buffer | null {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(value) ||
    value.length % 4 !== 0
  ) {
    return null;
  }
  const buffer = Buffer.from(value, "base64");
  if (buffer.length === 0 || buffer.length > maxBytes) return null;
  return buffer;
}

function isAllowedMimeType(value: unknown, allowlist: Set<string>): value is string {
  return typeof value === "string" && allowlist.has(value.toLowerCase());
}

function limitAiRequests(_req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  if (now - aiRequestWindowStart >= 60_000) {
    aiRequestWindowStart = now;
    aiRequestCount = 0;
  }
  if (aiRequestCount >= AI_REQUESTS_PER_MINUTE) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "The AI suggestion limit has been reached. Try again shortly." });
    return;
  }
  aiRequestCount += 1;
  next();
}

router.post("/ai/transcribe", limitAiRequests, async (req, res) => {
  const client = getConfiguredClient();
  if (!client) {
    res.status(503).json({ error: "AI transcription is not configured on the server." });
    return;
  }

  const body = req.body as AiRequest;
  if (
    typeof body?.audioBase64 === "string" &&
    body.audioBase64.length > 4 * Math.ceil(MAX_AUDIO_BYTES / 3)
  ) {
    res.status(413).json({ error: "Audio must be 25 MB or smaller." });
    return;
  }
  const audio = decodeBase64(body?.audioBase64, MAX_AUDIO_BYTES);
  if (
    !audio ||
    !isAllowedMimeType(body?.mimeType, AUDIO_TYPES) ||
    typeof body?.filename !== "string" ||
    !/^[\w.-]{1,100}$/.test(body.filename)
  ) {
    res.status(400).json({ error: "Provide a supported audio file and valid filename." });
    return;
  }

  if (audio.length > MAX_AUDIO_BYTES) {
    res.status(413).json({ error: "Audio must be 25 MB or smaller." });
    return;
  }

  try {
    const file = await toFile(audio, body.filename, { type: body.mimeType });
    const result = await client.audio.transcriptions.create({
      file,
      model: "gpt-4o-mini-transcribe",
      response_format: "json",
    });
    const transcript = result.text.trim();
    if (!transcript) {
      res.status(502).json({ error: "The transcription service returned no transcript." });
      return;
    }
    res.json({ transcript });
  } catch (error) {
    req.log.error({ err: error }, "AI audio transcription failed");
    res.status(502).json({ error: "Transcription failed. The local recording is unchanged." });
  }
});

router.post("/ai/suggest-species", limitAiRequests, async (req, res) => {
  const client = getConfiguredClient();
  if (!client) {
    res.status(503).json({ error: "AI image suggestions are not configured on the server." });
    return;
  }

  const body = req.body as AiRequest;
  if (
    typeof body?.imageBase64 === "string" &&
    body.imageBase64.length > 4 * Math.ceil(MAX_IMAGE_BYTES / 3)
  ) {
    res.status(413).json({ error: "Image must be 12 MB or smaller." });
    return;
  }
  const image = decodeBase64(body?.imageBase64, MAX_IMAGE_BYTES);
  if (!image || !isAllowedMimeType(body?.mimeType, IMAGE_TYPES)) {
    res.status(400).json({ error: "Provide a supported JPEG, PNG, or WebP image." });
    return;
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-5.6-luna",
      max_completion_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are assisting a fisheries official reviewing a landing draft. Inspect only what is visible in the image. Never infer catch weight, price, vessel, fishing location, or other facts not visually established. Fish identification is uncertain: return null names and confidence 'none' if no fish is clearly visible; use 'low' for ambiguous views. Return only JSON with localName (string or null), speciesGroup (string or null), confidence (none, low, medium, or high), and a short explanation. This is an unverified suggestion, not an approved identification.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Suggest a possible fish group for this image. State uncertainty plainly." },
            {
              type: "image_url",
              image_url: {
                url: `data:${body.mimeType};base64,${image.toString("base64")}`,
                detail: "high",
              },
            },
          ],
        },
      ],
    });
    const text = response.choices[0]?.message?.content;
    const parsed = typeof text === "string" ? JSON.parse(text) as Record<string, unknown> : null;
    if (
      !parsed ||
      !(parsed.localName === null || typeof parsed.localName === "string") ||
      !(parsed.speciesGroup === null || typeof parsed.speciesGroup === "string") ||
      !["none", "low", "medium", "high"].includes(String(parsed.confidence)) ||
      typeof parsed.explanation !== "string"
    ) {
      res.status(502).json({ error: "The image service returned an invalid suggestion." });
      return;
    }
    res.json({
      localName: parsed.localName,
      speciesGroup: parsed.speciesGroup,
      confidence: parsed.confidence,
      explanation: parsed.explanation,
    });
  } catch (error) {
    req.log.error({ err: error }, "AI image suggestion failed");
    res.status(502).json({ error: "Image analysis failed. The local photo is unchanged." });
  }
});

export default router;
