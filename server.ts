import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Ensure output folder exists on persistent server storage
const OUTPUTS_DIR = path.join(process.cwd(), "outputs");
const MANIFEST_PATH = path.join(OUTPUTS_DIR, "manifest.json");

if (!fs.existsSync(OUTPUTS_DIR)) {
  try {
    fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create outputs directory:", err);
  }
}

if (!fs.existsSync(MANIFEST_PATH)) {
  try {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify({ items: [] }, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to create initial manifest.json:", err);
  }
}

interface OutputItemRecord {
  id: string;
  title: string;
  category: string;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  characterName?: string;
  scriptSnippet?: string;
  promptUsed?: string;
  cameraAngle?: string;
  artStyle?: string;
  aspectRatio?: string;
  fileSizeBytes?: number;
  formattedSize?: string;
  mimeType: string;
  createdAt: number;
  tags?: string[];
  isFavorite?: boolean;
}

function getOutputsManifest(): { items: OutputItemRecord[] } {
  try {
    if (fs.existsSync(MANIFEST_PATH)) {
      const data = fs.readFileSync(MANIFEST_PATH, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed?.items)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to read outputs manifest, resetting:", e);
  }
  return { items: [] };
}

function saveOutputsManifest(manifest: { items: OutputItemRecord[] }) {
  try {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write outputs manifest:", e);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function saveImageToDiskOutput(
  imageDataUriOrBase64: string,
  meta: {
    id?: string;
    title: string;
    category: string;
    characterName?: string;
    scriptSnippet?: string;
    promptUsed?: string;
    cameraAngle?: string;
    artStyle?: string;
    aspectRatio?: string;
    tags?: string[];
  }
): OutputItemRecord | null {
  if (!imageDataUriOrBase64 || typeof imageDataUriOrBase64 !== "string") {
    return null;
  }

  const id = meta.id || `out-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  let mime = "image/png";
  let ext = "png";
  let base64Data = imageDataUriOrBase64;

  const match = imageDataUriOrBase64.match(/^data:(image\/[a-zA-Z0-9-+.]+);base64,/);
  if (match) {
    mime = match[1];
    ext =
      mime.includes("jpeg") || mime.includes("jpg")
        ? "jpg"
        : mime.includes("webp")
        ? "webp"
        : "png";
    base64Data = imageDataUriOrBase64.replace(/^data:image\/[a-zA-Z0-9-+.]+;base64,/, "");
  }

  const safeTitle = (meta.title || "comic_output")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .substring(0, 30);
  const filename = `${safeTitle}_${id}.${ext}`;
  const filePath = path.join(OUTPUTS_DIR, filename);

  try {
    const buffer = Buffer.from(base64Data, "base64");
    fs.writeFileSync(filePath, buffer);
    const stats = fs.statSync(filePath);

    const item: OutputItemRecord = {
      id,
      title: meta.title || "Hasil Komik",
      category: meta.category || "pose",
      filename,
      url: `/outputs/${filename}`,
      characterName: meta.characterName || "Character",
      scriptSnippet: meta.scriptSnippet || "",
      promptUsed: meta.promptUsed || "",
      cameraAngle: meta.cameraAngle || "",
      artStyle: meta.artStyle || "",
      aspectRatio: meta.aspectRatio || "1:1",
      fileSizeBytes: stats.size,
      formattedSize: formatBytes(stats.size),
      mimeType: mime,
      createdAt: Date.now(),
      tags: meta.tags || [],
    };

    const manifest = getOutputsManifest();
    manifest.items = [item, ...manifest.items.filter((i) => i.id !== id)];
    saveOutputsManifest(manifest);

    return item;
  } catch (err) {
    console.error("Failed to write output image to disk:", err);
    return null;
  }
}


function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

/**
 * Parses Gemini API error for rate limits / quota exhaustion
 */
function parseGeminiError(error: any): {
  isQuotaError: boolean;
  retryAfterSeconds: number;
  message: string;
  originalMessage: string;
} {
  const rawMsg = error?.message || (typeof error === "string" ? error : JSON.stringify(error));
  const status = error?.status || error?.error?.status;
  const code = error?.code || error?.error?.code;

  const isQuota =
    status === "RESOURCE_EXHAUSTED" ||
    code === 429 ||
    rawMsg.includes("429") ||
    rawMsg.toLowerCase().includes("quota exceeded") ||
    rawMsg.toLowerCase().includes("resource_exhausted") ||
    rawMsg.toLowerCase().includes("rate limit");

  let retryAfterSeconds = 30;

  // Attempt to extract delay in seconds from error message e.g. "Please retry in 29.817s"
  const retryMatch = rawMsg.match(/retry in\s+([0-9.]+)\s*s/i);
  if (retryMatch && retryMatch[1]) {
    const parsed = Math.ceil(parseFloat(retryMatch[1]));
    if (!isNaN(parsed) && parsed > 0) {
      retryAfterSeconds = parsed;
    }
  }

  const friendlyMessage = isQuota
    ? `Batas kuota Gemini API (Rate Limit / Quota) sementara tercapai. Mohon tunggu sekitar ${retryAfterSeconds} detik sebelum mencoba kembali.`
    : rawMsg || "Terjadi kesalahan saat memproses permintaan AI.";

  return {
    isQuotaError: isQuota,
    retryAfterSeconds,
    message: friendlyMessage,
    originalMessage: rawMsg,
  };
}

/**
 * Validates and extracts a pure base64 payload suitable for Gemini inlineData
 */
function extractValidBase64(
  input: string | undefined,
  defaultMime = "image/png"
): {
  valid: boolean;
  base64Data: string;
  mimeType: string;
} {
  if (!input || typeof input !== "string") {
    return { valid: false, base64Data: "", mimeType: defaultMime };
  }

  // Reject SVG text or URL encoded SVG that would cause Base64 decoding failure in Gemini API
  if (
    input.includes("<svg") ||
    input.includes("%3Csvg") ||
    input.startsWith("data:image/svg")
  ) {
    return { valid: false, base64Data: "", mimeType: "image/png" };
  }

  let mimeType = defaultMime;
  const mimeMatch = input.match(/^data:(image\/[a-zA-Z0-9-+.]+);base64,/);
  if (mimeMatch) {
    mimeType = mimeMatch[1];
  }

  const cleanBase64 = input
    .replace(/^data:image\/[a-zA-Z0-9-+.]+;base64,/, "")
    .replace(/\s+/g, "");

  // Base64 format validation
  const isBase64Valid =
    /^[A-Za-z0-9+/=]+$/.test(cleanBase64) && cleanBase64.length > 20;

  // Gemini API accepts standard raster mime types
  const allowedMimes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/heic",
    "image/heif",
  ];
  const finalMime = allowedMimes.includes(mimeType)
    ? mimeType === "image/jpg"
      ? "image/jpeg"
      : mimeType
    : "image/png";

  return {
    valid: isBase64Valid,
    base64Data: cleanBase64,
    mimeType: finalMime,
  };
}

/**
 * Execute a Gemini call with retry on rate limit
 */
async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelayMs = 2000
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const parsed = parseGeminiError(err);
      if (parsed.isQuotaError && attempt < maxRetries) {
        // If suggested delay is very small, wait and retry
        const delay = Math.min(parsed.retryAfterSeconds * 1000, baseDelayMs * Math.pow(2, attempt));
        console.warn(`[Gemini API] Quota/Rate limit encountered. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit to handle base64 comic character drawings
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // 1. Generate Character Pose Endpoint
  app.post("/api/generate-pose", async (req, res) => {
    try {
      const {
        referenceImageBase64,
        mimeType = "image/png",
        script = "",
        actionPrompt = "",
        characterName = "Character",
        characterTraits = "",
        artStyle = "manga-screentone",
        cameraAngle = "eye-level",
        actionType = "dynamic-combat",
        customActionType = "",
        expression = "determined",
        customExpression = "",
        customFeatures = "",
        aspectRatio = "1:1",
        anatomyGuideOverlay = false,
        lightingMood = "dramatic-contrast",
      } = req.body;

      if (!actionPrompt && !script) {
        return res.status(400).json({ error: "Mohon sediakan naskah atau deskripsi pose." });
      }

      const effectiveAction = (actionType === "custom" && customActionType) ? customActionType : (customActionType || actionType);
      const effectiveExpression = (expression === "custom" && customExpression) ? customExpression : (customExpression || expression);

      const ai = getGeminiClient();

      // Formulate expert comic artist prompt that emphasizes strict character visual consistency + dynamic anatomy
      let styleInstruction = "";
      switch (artStyle) {
        case "manga-screentone":
          styleInstruction = "Authentic Japanese manga illustration style, crisp black and white ink line art with professional screentones, crosshatching, speed lines, and dynamic action inking.";
          break;
        case "clean-lineart":
          styleInstruction = "Ultra clean, sharp vector-like black line art on pure white background, perfectly drawn anatomical contours and clean strokes, ready for comic inking and coloring.";
          break;
        case "webtoon-color":
          styleInstruction = "Modern full-color digital Webtoon / Manhwa illustration style, rich vibrant cell shading, sharp lighting highlights, and polished comic coloring.";
          break;
        case "seinen-noir":
          styleInstruction = "High-contrast Seinen manga noir style, heavy dramatic black ink shadows (chiaroscuro), gritty textures, intricate crosshatching, and mature comic aesthetic.";
          break;
        case "american-comic":
          styleInstruction = "Dynamic Western Comic Book illustration style, bold expressive brush inks, energetic anatomy foreshortening, muscle tone rendering, and vintage comic aesthetic.";
          break;
        case "chibi-comic":
          styleInstruction = "Super-deformed Chibi comic style, cute 2.5-head proportions, exaggerated humorous anime expression, clean lines.";
          break;
        default:
          styleInstruction = "Professional comic book illustration, crisp inking and expressive anatomy.";
      }

      let cameraInstruction = "";
      switch (cameraAngle) {
        case "extreme-low-angle":
          cameraInstruction = "Worm's eye view / extreme low-angle perspective, dramatic dynamic foreshortening where feet/hands closer to camera look massive and powerful.";
          break;
        case "high-angle-bird":
          cameraInstruction = "High-angle / bird's-eye view looking down dramatically at the character and surrounding space.";
          break;
        case "dutch-angle":
          cameraInstruction = "Dutch tilt / canted cinematic angle (tilted horizon) emphasizing intense tension, disorientation, or explosive action.";
          break;
        case "over-the-shoulder":
          cameraInstruction = "Over-the-shoulder comic panel framing focused on the character's reaction and intense stance.";
          break;
        case "close-up-dramatic":
          cameraInstruction = "Intense dramatic close-up focusing on facial anatomy, micro-expressions, sweat/grit details, and fiery eyes.";
          break;
        case "full-body-dynamic":
          cameraInstruction = "Full-body dynamic gesture pose displaying complete anatomical line of action from head to toe, balanced weight distribution and center of gravity.";
          break;
        case "mid-shot":
        default:
          cameraInstruction = "Medium-shot comic framing highlighting torso anatomy, upper body movement, arm gesture, and facial expression.";
          break;
      }

      let anatomyGuideText = "";
      if (anatomyGuideOverlay) {
        anatomyGuideText = "Include subtle comic artist breakdown elements: dynamic line-of-action arrow, joint pivot indicators, and directional motion/speed line vectors for anatomy study.";
      }

      const comicDirectorPrompt = `
[TASK: ISOLATED SOLID CHARACTER POSE GENERATION - NO BACKGROUND SCENERY]
You are a master character artist, mangaka, and digital illustrator.
Generate a high-definition illustration of ONLY the character performing the EXACT pose and action described, completely isolated on a clean white blank studio canvas.

CRITICAL CHARACTER OPACITY & RENDERING MANDATE:
- 100% SOLID & OPAQUE CHARACTER: Render the character with full opacity, dense solid colors, crisp ink linework, opaque skin tones, detailed clothing textures, and rich shading. The character MUST NOT be transparent, ghostly, or see-through in any way.
- SUBJECT ONLY: Draw ONLY the solid character figure in the requested action and pose.
- PURE SOLID WHITE BLANK BACKGROUND (#FFFFFF): Absolutely ZERO background scenery. NO background buildings, NO landscapes, NO ground textures, NO room furniture, NO trees, NO background silhouettes.
- Clean, sharp outer silhouette contour separating the solid character from the blank white space.

CHARACTER CONSISTENCY MANDATE:
- Retain the exact same character identity from the reference image: same face structure, hairstyle, hair color, facial features, distinctive costume/clothing elements, and body proportions.
- Character Name: ${characterName}
- Key Character Visual Traits: ${characterTraits || "Match reference image exactly"}

NEW POSE & SCRIPT ACTION:
- Action & Gesture: "${actionPrompt || script}"
- Character Emotion/Expression: ${effectiveExpression}
- Action Category / Movement: ${effectiveAction}
- Camera Perspective & Framing: ${cameraInstruction}
- Art Style: ${styleInstruction}
- Character Lighting: ${lightingMood}
${customFeatures ? `- Additional Character Features & Effects: ${customFeatures}` : ""}
${anatomyGuideText ? `- Anatomy Guide: ${anatomyGuideText}` : ""}

ANATOMY & ARTISTIC QUALITY REQUIREMENTS:
- Precise anatomical accuracy (correct joints, believable muscle flexion, natural hand gestures with proper finger articulation).
- Exaggerated comic dynamic line of action and kinetic energy.
- Crisp clean solid character illustration on pure white blank studio background.
      `.trim();

      const parts: any[] = [];

      // If reference image provided and is valid base64 raster image, pass it inline to preserve character visual traits
      if (referenceImageBase64) {
        const validatedImg = extractValidBase64(referenceImageBase64, mimeType || "image/png");
        if (validatedImg.valid) {
          parts.push({
            inlineData: {
              data: validatedImg.base64Data,
              mimeType: validatedImg.mimeType,
            },
          });
        }
      }

      parts.push({
        text: comicDirectorPrompt,
      });

      // Use gemini-3.1-flash-lite-image as default image generation model
      const validAspectRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
      const selectedAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : "1:1";

      const response = await executeWithRetry(async () => {
        return await ai.models.generateContent({
          model: "gemini-3.1-flash-lite-image",
          contents: { parts },
          config: {
            imageConfig: {
              aspectRatio: selectedAspectRatio,
            },
          },
        });
      });

      let generatedImageUrl: string | null = null;
      let textFeedback: string = "";

      if (response.candidates && response.candidates.length > 0) {
        const candidateParts = response.candidates[0].content?.parts || [];
        for (const part of candidateParts) {
          if (part.inlineData && part.inlineData.data) {
            const outMime = part.inlineData.mimeType || "image/png";
            generatedImageUrl = `data:${outMime};base64,${part.inlineData.data}`;
          } else if (part.text) {
            textFeedback += part.text + " ";
          }
        }
      }

      if (!generatedImageUrl) {
        return res.status(500).json({
          error: "Model tidak menghasilkan gambar. Silakan coba kembali dengan deskripsi yang lebih spesifik.",
          details: textFeedback,
        });
      }

      // Check if separateLayers was requested (default to false for fast, dedicated character pose generation)
      const { separateLayers = false } = req.body;
      let generatedBgUrl: string | null = null;

      if (separateLayers && (script || actionPrompt)) {
        try {
          const bgDirectorPrompt = `
[TASK: HIGH DEFINITION COMIC BACKGROUND SCENERY GENERATION - MATCHING COMPOSITE SCENE PLATE]
You are a master comic book background artist and environment concept designer.
Look at the attached character image (this is the character figure that will be placed directly onto this background).
Generate ONLY the matching clean background scenery plate (NO human figures, NO foreground characters) that perfectly fits behind this character:

SCENE & ENVIRONMENTAL CONTEXT:
- Scene/Setting Description: "${script || actionPrompt}"
- Character Action & Pose in this scene: "${actionPrompt || script}"
- Camera Perspective, Angle & Framing: ${cameraInstruction}
- Comic Art Style: ${styleInstruction}
- Environmental Lighting & Atmospheric Mood: ${lightingMood}
${customFeatures ? `- Environmental & Atmospheric Effects: ${customFeatures}` : ""}

CRITICAL INTEGRATION & PERSPECTIVE ALIGNMENT MANDATES:
1. CLEAN BACKGROUND PLATE ONLY: Absolutely NO characters, NO human faces, NO hero silhouettes in the foreground.
2. GROUND PLANE & PERSPECTIVE HARMONY: Align the ground/floor perspective, vanishing lines, horizon height, and architectural scale to match the character's contact point and body posture in the reference image (whether standing, sitting, crouching, or leaping).
3. LIGHTING & ART STYLE SEAMLESSNESS: The environmental lighting direction, ink stroke weight, screentone shading, and color palette must naturally integrate with the character so when composited, the character and background form a unified, cohesive comic panel.
4. Production-ready background plate ready to place the isolated transparent character overlay on top without perspective or lighting mismatch.
          `.trim();

          const bgParts: any[] = [];
          if (generatedImageUrl) {
            const charImgRaster = extractValidBase64(generatedImageUrl, "image/png");
            if (charImgRaster.valid) {
              bgParts.push({
                inlineData: {
                  mimeType: charImgRaster.mimeType,
                  data: charImgRaster.base64Data,
                },
              });
            }
          }
          bgParts.push({ text: bgDirectorPrompt });

          const bgResponse = await executeWithRetry(async () => {
            return await ai.models.generateContent({
              model: "gemini-3.1-flash-lite-image",
              contents: { parts: bgParts },
              config: {
                imageConfig: {
                  aspectRatio: selectedAspectRatio,
                },
              },
            });
          });

          if (bgResponse.candidates && bgResponse.candidates.length > 0) {
            const bgCandidateParts = bgResponse.candidates[0].content?.parts || [];
            for (const part of bgCandidateParts) {
              if (part.inlineData && part.inlineData.data) {
                // Background as High-Definition JPEG
                generatedBgUrl = `data:image/jpeg;base64,${part.inlineData.data}`;
                break;
              }
            }
          }
        } catch (bgErr) {
          console.warn("Background layer generation skipped/failed:", bgErr);
        }
      }

      // Auto-save generated pose to persistent output folder on disk
      let savedOutputRecord: OutputItemRecord | null = null;
      try {
        if (generatedImageUrl) {
          savedOutputRecord = saveImageToDiskOutput(generatedImageUrl, {
            title: `Pose ${characterName || "Karakter"}`,
            category: "pose",
            characterName: characterName || "Character",
            scriptSnippet: script,
            promptUsed: comicDirectorPrompt,
            cameraAngle,
            artStyle,
            aspectRatio: selectedAspectRatio,
            tags: [artStyle, cameraAngle, actionType, expression],
          });
        }

        // Also save background if generated separately
        if (generatedBgUrl) {
          saveImageToDiskOutput(generatedBgUrl, {
            title: `Latar Belakang - ${characterName || "Scene"}`,
            category: "hd-background",
            characterName: characterName || "Character",
            scriptSnippet: script,
            promptUsed: comicDirectorPrompt,
            cameraAngle,
            artStyle,
            aspectRatio: selectedAspectRatio,
            tags: ["background", artStyle, cameraAngle],
          });
        }
      } catch (saveErr) {
        console.warn("Auto-save to output folder skipped:", saveErr);
      }

      res.json({
        success: true,
        imageUrl: generatedImageUrl,
        characterPngUrl: generatedImageUrl,
        backgroundJpegUrl: generatedBgUrl,
        hasSeparatedLayers: Boolean(generatedBgUrl),
        outputUrl: savedOutputRecord?.url,
        promptUsed: comicDirectorPrompt,
        script: script,
        actionPrompt: actionPrompt,
        characterName: characterName,
        style: artStyle,
        cameraAngle: cameraAngle,
        notes: textFeedback.trim(),
      });
    } catch (error: any) {
      console.error("Error generating pose:", error);
      const parsed = parseGeminiError(error);
      const statusCode = parsed.isQuotaError ? 429 : 500;
      res.status(statusCode).json({
        error: parsed.message,
        isQuotaError: parsed.isQuotaError,
        retryAfterSeconds: parsed.retryAfterSeconds,
        details: parsed.originalMessage,
      });
    }
  });

  // 1.5. Generate High-Definition Comic Background Scenery Endpoint
  app.post("/api/generate-hd-background", async (req, res) => {
    try {
      const {
        script = "",
        actionPrompt = "",
        environmentPrompt = "",
        characterImageBase64 = "",
        mimeType = "image/png",
        artStyle = "manga-screentone",
        cameraAngle = "eye-level",
        aspectRatio = "1:1",
        lightingMood = "dramatic-contrast",
        customFeatures = "",
      } = req.body;

      if (!script && !environmentPrompt && !actionPrompt) {
        return res.status(400).json({ error: "Deskripsi lokasi atau naskah latar belakang diperlukan." });
      }

      const ai = getGeminiClient();

      let styleInstruction = "";
      switch (artStyle) {
        case "manga-screentone":
          styleInstruction = "Authentic Japanese manga illustration style, crisp black and white ink line art with professional screentones, crosshatching, speed lines, and dynamic action inking.";
          break;
        case "clean-lineart":
          styleInstruction = "Ultra clean, sharp vector-like black line art on pure white background, perfectly drawn architectural contours.";
          break;
        case "webtoon-color":
          styleInstruction = "Modern full-color digital Webtoon / Manhwa illustration style, rich vibrant cell shading and dramatic scenery lighting.";
          break;
        case "seinen-noir":
          styleInstruction = "High-contrast Seinen manga noir style, heavy dramatic black ink shadows, gritty textures, and urban chiaroscuro.";
          break;
        case "american-comic":
          styleInstruction = "Dynamic Western Comic Book illustration style, bold expressive brush inks, perspective grids, and vintage comic aesthetic.";
          break;
        default:
          styleInstruction = "Professional comic book illustration scenery, crisp inking and rich depth.";
      }

      const bgDirectorPrompt = `
[TASK: HIGH DEFINITION COMIC BACKGROUND SCENERY GENERATION - MATCHING COMPOSITE SCENE PLATE]
You are a master comic book background artist and environment concept designer.
${characterImageBase64 ? "Look at the attached character image (this is the character that will be placed onto this background). Generate ONLY the matching clean background scenery plate (NO human figures, NO foreground characters) that perfectly fits behind this character." : "Generate a high-definition clean comic book background plate matching this scene."}

SCENE & ENVIRONMENTAL CONTEXT:
- Scene/Setting Description: "${script || environmentPrompt || actionPrompt}"
- Character Action & Pose: "${actionPrompt || script || "In scene"}"
- Camera Perspective & Perspective Angle: ${cameraAngle}
- Comic Art Style: ${styleInstruction}
- Environmental Lighting & Atmosphere: ${lightingMood}
${customFeatures ? `- Environmental & Atmospheric Effects: ${customFeatures}` : ""}

CRITICAL INTEGRATION & SEAMLESS PERSPECTIVE MANDATES:
1. CLEAN BACKGROUND PLATE ONLY: Absolutely NO human characters, NO figures, NO faces, NO foreground silhouettes of people.
2. GROUND CONTACT & HORIZON HARMONY: Align the ground/floor plane, horizon line, and room architecture to match the character's contact point and posture in the reference image (so the character stands, sits, or moves naturally in this space without floating).
3. ART STYLE & LIGHTING UNITY: High-definition environmental texture, architectural depth, perspective vanishing points, matching shadow angle, and comic screentones / shading.
4. Output format: High Definition JPEG, clear without blur, ready to overlay character layers.
      `.trim();

      const validAspectRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
      const selectedAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : "1:1";

      const bgParts: any[] = [];
      if (characterImageBase64) {
        const charImgRaster = extractValidBase64(characterImageBase64, mimeType || "image/png");
        if (charImgRaster.valid) {
          bgParts.push({
            inlineData: {
              mimeType: charImgRaster.mimeType,
              data: charImgRaster.base64Data,
            },
          });
        }
      }
      bgParts.push({ text: bgDirectorPrompt });

      const bgResponse = await executeWithRetry(async () => {
        return await ai.models.generateContent({
          model: "gemini-3.1-flash-lite-image",
          contents: { parts: bgParts },
          config: {
            imageConfig: {
              aspectRatio: selectedAspectRatio,
            },
          },
        });
      });

      let backgroundJpegUrl: string | null = null;
      if (bgResponse.candidates && bgResponse.candidates.length > 0) {
        const bgCandidateParts = bgResponse.candidates[0].content?.parts || [];
        for (const part of bgCandidateParts) {
          if (part.inlineData && part.inlineData.data) {
            backgroundJpegUrl = `data:image/jpeg;base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (!backgroundJpegUrl) {
        return res.status(500).json({ error: "Gagal menghasilkan latar belakang HD." });
      }

      // Auto-save generated background to output folder
      let savedBgRecord: OutputItemRecord | null = null;
      try {
        savedBgRecord = saveImageToDiskOutput(backgroundJpegUrl, {
          title: `Latar Belakang - ${script?.substring(0, 20) || "Scenery"}`,
          category: "hd-background",
          characterName: "Scenery",
          scriptSnippet: script || environmentPrompt,
          promptUsed: bgDirectorPrompt,
          cameraAngle,
          artStyle,
          aspectRatio: selectedAspectRatio,
          tags: ["background", artStyle, cameraAngle],
        });
      } catch (err) {
        console.warn("Auto-save background skipped:", err);
      }

      res.json({
        success: true,
        backgroundJpegUrl: backgroundJpegUrl,
        outputUrl: savedBgRecord?.url,
        promptUsed: bgDirectorPrompt,
      });
    } catch (error: any) {
      console.error("Error generating HD background:", error);
      const parsed = parseGeminiError(error);
      const statusCode = parsed.isQuotaError ? 429 : 500;
      res.status(statusCode).json({
        error: parsed.message,
        isQuotaError: parsed.isQuotaError,
        retryAfterSeconds: parsed.retryAfterSeconds,
        details: parsed.originalMessage,
      });
    }
  });

  // 1.8. Generate Official Master Character Portrait / Model Sheet Endpoint
  app.post("/api/generate-character-art", async (req, res) => {
    try {
      const {
        characterName = "Character",
        characterRole = "Protagonist",
        characterDescription = "",
        visualPrompt = "",
        artStyle = "clean-lineart",
        distinctiveFeatures = [],
        aspectRatio = "1:1",
      } = req.body;

      const ai = getGeminiClient();

      let styleInstruction = "";
      switch (artStyle) {
        case "manga-screentone":
          styleInstruction = "Authentic Japanese manga style, crisp black and white ink line art with screentones, crosshatching, professional comic inking.";
          break;
        case "clean-lineart":
          styleInstruction = "Clean black linework with simple flat cel shading, rich expressive outlines, vibrant colors, clear silhouette, ready for comic artist model sheet.";
          break;
        case "webtoon-color":
          styleInstruction = "Modern full-color digital Webtoon illustration style, smooth cell shading, polished digital coloring.";
          break;
        case "seinen-noir":
          styleInstruction = "High-contrast Seinen manga noir style, heavy dramatic black ink shadows, mature comic aesthetic.";
          break;
        case "american-comic":
          styleInstruction = "Dynamic Western Comic Book illustration style, bold expressive brush inking and muscular anatomy.";
          break;
        case "chibi-comic":
          styleInstruction = "Super-deformed Chibi comic style, cute proportions and expressive comic face.";
          break;
        default:
          styleInstruction = "Clean black linework with simple cel shading, expressive comic character design.";
      }

      // Build character-specific prompt with strict fidelity to cultural and folklore guidelines
      const charDirectorPrompt = `
[TASK: MASTER COMIC CHARACTER DESIGN & MODEL REFERENCE SHEET]
You are a master character designer and illustrator for graphic novels and comics.
Generate a high-quality master character model sheet / portrait illustration of this character:

CHARACTER PROFILE:
- Character Name: ${characterName}
- Role / Archetype: ${characterRole}
- Visual Concept & Appearance: ${visualPrompt || characterDescription}
- Distinctive Costume / Physical Features: ${Array.isArray(distinctiveFeatures) ? distinctiveFeatures.join(", ") : distinctiveFeatures}

STRICT VISUAL REQUIREMENTS & CULTURAL ADHERENCE:
1. ART STYLE: ${styleInstruction}.
2. ACCURATE DESIGN SPECIFICATIONS:
   - If Mendel (Husband): Anxious stressed Jewish husband in folk tale 'It Could Always Be Worse', wearing a dark skullcap/yarmulke on top of curly dark brown hair with sideburns, white collar buttoned shirt with rolled sleeves, brown vest with suspenders, dark trousers, large comedic expressive nose, wide comic eyes with sweat drops.
   - If The Rav (Rabbi): Venerable wise old Rabbi with serene knowing smile, thick long white beard and mustache flowing down chest, wire-rimmed round spectacles, traditional black fedora / wide-brim felt hat over skullcap, traditional long black frock coat.
   - If Sarah (Wife): Expressive traditional Jewish wife. STRICT MODESTY REQUIREMENTS: MUST wear a full TICHEL (tightly wrapped headscarf) completely covering all hair with ZERO FRONT HAIR VISIBLE AT THE FOREHEAD, high neckline long-sleeved dress covering elbows, modest skirt below knees, dark opaque stockings/tights, dramatic shocked/screaming comic expression.
   - If The Children (David & Leah): Boy wearing yarmulke and buttoned shirt; girl in modest knee-covering long-sleeved dress with stockings.
   - If The Farm Animals: Wild comic flapping chickens with flying feathers, mischievous horned goat chewing tablecloth, large dairy cow.
3. COMPOSITION: Expressive waist-up or full-body pose on a clean, solid, unobtrusive background.
      `.trim();

      const validAspectRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
      const selectedAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : "1:1";

      const response = await executeWithRetry(async () => {
        return await ai.models.generateContent({
          model: "gemini-3.1-flash-lite-image",
          contents: { parts: [{ text: charDirectorPrompt }] },
          config: {
            imageConfig: {
              aspectRatio: selectedAspectRatio,
            },
          },
        });
      });

      let generatedImageUrl: string | null = null;
      if (response.candidates && response.candidates.length > 0) {
        const candidateParts = response.candidates[0].content?.parts || [];
        for (const part of candidateParts) {
          if (part.inlineData && part.inlineData.data) {
            const outMime = part.inlineData.mimeType || "image/png";
            generatedImageUrl = `data:${outMime};base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (!generatedImageUrl) {
        return res.status(500).json({ error: "Model tidak menghasilkan gambar karakter." });
      }

      // Auto-save generated character model sheet to output folder
      let savedCharRecord: OutputItemRecord | null = null;
      try {
        savedCharRecord = saveImageToDiskOutput(generatedImageUrl, {
          title: `Model Sheet - ${characterName}`,
          category: "character-sheet",
          characterName,
          scriptSnippet: characterDescription || visualPrompt,
          promptUsed: charDirectorPrompt,
          artStyle,
          aspectRatio: selectedAspectRatio,
          tags: ["character-sheet", characterName, artStyle],
        });
      } catch (err) {
        console.warn("Auto-save character art skipped:", err);
      }

      res.json({
        success: true,
        imageUrl: generatedImageUrl,
        outputUrl: savedCharRecord?.url,
        promptUsed: charDirectorPrompt,
        characterName,
      });
    } catch (error: any) {
      console.error("Error generating character art:", error);
      const parsed = parseGeminiError(error);
      const statusCode = parsed.isQuotaError ? 429 : 500;
      res.status(statusCode).json({
        error: parsed.message,
        isQuotaError: parsed.isQuotaError,
        retryAfterSeconds: parsed.retryAfterSeconds,
        details: parsed.originalMessage,
      });
    }
  });

  // 2. Comic Script Parser & Storyboard Panel Analyzer Endpoint
  app.post("/api/parse-script", async (req, res) => {
    try {
      const { scriptText, characterNames = [] } = req.body;
      if (!scriptText || typeof scriptText !== "string" || scriptText.trim().length === 0) {
        return res.status(400).json({ error: "Teks naskah komik diperlukan." });
      }

      const ai = getGeminiClient();

      const prompt = `
Anda adalah asisten sutradara komik dan storyboard director profesional.
Analisis naskah/skrip komik berikut dan pisahkan menjadi breakdown panel per panel secara berurutan.
Untuk setiap panel, berikan deskripsi pose karakter, sudut kamera (camera angle), ekspresi wajah, anatomi dan gerakan, serta prompt gambar yang optimal untuk generator pose AI.

Naskah Komik:
"""
${scriptText}
"""

Karakter yang mungkin ada: ${characterNames.join(", ") || "Terdeteksi dari naskah"}
      `.trim();

      const response = await executeWithRetry(async () => {
        return await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Judul adegan atau bab" },
                summary: { type: Type.STRING, description: "Ringkasan adegan" },
                panels: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      panelNumber: { type: Type.INTEGER, description: "Nomor urut panel" },
                      characterName: { type: Type.STRING, description: "Nama karakter utama dalam panel" },
                      actionDescription: { type: Type.STRING, description: "Deskripsi aksi dan pose tubuh" },
                      dialogue: { type: Type.STRING, description: "Dialog atau monolog karakter jika ada" },
                      cameraAngle: {
                        type: Type.STRING,
                        description: "Sudut kamera: eye-level, extreme-low-angle, high-angle-bird, dutch-angle, over-the-shoulder, close-up-dramatic, full-body-dynamic",
                      },
                      expression: { type: Type.STRING, description: "Ekspresi wajah dan emosi karakter" },
                      recommendedAspectRatio: { type: Type.STRING, description: "Rekomendasi rasio: 1:1, 3:4, 4:3, 9:16, 16:9" },
                      aiPosePrompt: { type: Type.STRING, description: "Prompt deskriptif siap pakai untuk generate pose" },
                      soundEffect: { type: Type.STRING, description: "Efek suara komik (SFX) misal: DOKAAAN, SHING, HYUT" },
                      anatomyFocus: { type: Type.STRING, description: "Fokus anatomi (misal: foreshortening tangan, kelenturan punggung, posisi kuda-kuda kaki)" },
                    },
                    required: ["panelNumber", "characterName", "actionDescription", "cameraAngle", "expression", "aiPosePrompt"],
                  },
                },
              },
              required: ["title", "panels"],
            },
          },
        });
      });

      const parsedData = JSON.parse(response.text || "{}");
      res.json(parsedData);
    } catch (error: any) {
      console.error("Error parsing comic script:", error);
      const parsed = parseGeminiError(error);
      const statusCode = parsed.isQuotaError ? 429 : 500;
      res.status(statusCode).json({
        error: parsed.message,
        isQuotaError: parsed.isQuotaError,
        retryAfterSeconds: parsed.retryAfterSeconds,
      });
    }
  });

  // 3. Prompt Enhancer & Anatomy Coach Endpoint
  app.post("/api/enhance-prompt", async (req, res) => {
    try {
      const { userIdea, style = "manga-screentone", cameraAngle = "dynamic" } = req.body;
      if (!userIdea) {
        return res.status(400).json({ error: "Ide pose diperlukan." });
      }

      const ai = getGeminiClient();
      const prompt = `
Sebagai pakar anatomi komik dan koreografi aksi manga, ubah ide pose sederhana ini menjadi prompt pose komik profesional yang kaya akan detail anatomis, garis aksi (line of action), sudut perspektif, gesture tangan, dan ketegangan otot:

Ide dasar: "${userIdea}"
Gaya: ${style}
Sudut Kamera: ${cameraAngle}

Berikan output JSON dengan:
- enhancedPrompt: Deskripsi visual lengkap dalam bahasa Inggris untuk AI generator
- anatomyNotes: Catatan anatomi penting dalam bahasa Indonesia untuk panduan komikus (misal: garis berat badan, rotasi bahu, titik tumpu)
- sfxSuggestions: Rekomendasi efek suara komik (onomatopoeia)
- actionPacing: Kategori tempo (Slow/Tension/Explosive/Climax)
      `.trim();

      const response = await executeWithRetry(async () => {
        return await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                enhancedPrompt: { type: Type.STRING },
                anatomyNotes: { type: Type.STRING },
                sfxSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                actionPacing: { type: Type.STRING },
              },
              required: ["enhancedPrompt", "anatomyNotes", "sfxSuggestions", "actionPacing"],
            },
          },
        });
      });

      const result = JSON.parse(response.text || "{}");
      res.json(result);
    } catch (error: any) {
      console.error("Error enhancing prompt:", error);
      const parsed = parseGeminiError(error);
      const statusCode = parsed.isQuotaError ? 429 : 500;
      res.status(statusCode).json({
        error: parsed.message,
        isQuotaError: parsed.isQuotaError,
        retryAfterSeconds: parsed.retryAfterSeconds,
      });
    }
  });

  // 4. Character Visual Auto-Analysis Endpoint
  app.post("/api/analyze-character", async (req, res) => {
    try {
      const { imageBase64, mimeType = "image/png" } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "Gambar karakter diperlukan." });
      }

      const ai = getGeminiClient();
      const validatedImg = extractValidBase64(imageBase64, mimeType || "image/png");

      const parts: any[] = [];
      if (validatedImg.valid) {
        parts.push({
          inlineData: {
            data: validatedImg.base64Data,
            mimeType: validatedImg.mimeType,
          },
        });
      }

      parts.push({
        text: `Analisis gambar karakter komik ini dan berikan rincian ciri khas visual karakter untuk disimpan di database karakter (Model Sheet) agar dapat digunakan kembali untuk pose konsisten:
1. Karakteristik wajah (mata, rambut, bentuk rahang)
2. Pakaian dan aksesori utama
3. Proporsi tubuh (e.g. 7-head proportion, atletis, ramping)
4. Palet warna & gaya seni utama
5. Saran nama/tipe karakter jika belum ada`,
      });

      const response = await executeWithRetry(async () => {
        return await ai.models.generateContent({
          model: "gemini-3.7-flash",
          contents: { parts },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                suggestedName: { type: Type.STRING },
                hairStyleColor: { type: Type.STRING },
                eyeDetails: { type: Type.STRING },
                outfitBreakdown: { type: Type.STRING },
                bodyProportions: { type: Type.STRING },
                keyDistinctiveFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
                artStyleDetected: { type: Type.STRING },
                promptSummary: { type: Type.STRING, description: "Ringkasan atribut dalam bahasa Inggris untuk konsistensi prompt pose" },
              },
              required: [
                "suggestedName",
                "hairStyleColor",
                "eyeDetails",
                "outfitBreakdown",
                "bodyProportions",
                "keyDistinctiveFeatures",
                "promptSummary",
              ],
            },
          },
        });
      });

      const analysis = JSON.parse(response.text || "{}");
      res.json(analysis);
    } catch (error: any) {
      console.error("Error analyzing character:", error);
      const parsed = parseGeminiError(error);
      const statusCode = parsed.isQuotaError ? 429 : 500;
      res.status(statusCode).json({
        error: parsed.message,
        isQuotaError: parsed.isQuotaError,
        retryAfterSeconds: parsed.retryAfterSeconds,
      });
    }
  });

  // --- OUTPUT FOLDER & PERSISTENCE MANAGEMENT ENDPOINTS ---
  // Serve static files directly from outputs directory
  app.use("/outputs", express.static(OUTPUTS_DIR));

  // 5. Get all outputs and disk statistics
  app.get("/api/outputs", (_req, res) => {
    try {
      const manifest = getOutputsManifest();
      let totalBytes = 0;
      const categoryCounts: Record<string, number> = {
        pose: 0,
        "storyboard-panel": 0,
        "character-cutout": 0,
        "hd-background": 0,
        "character-sheet": 0,
        custom: 0,
      };

      const validItems = manifest.items.filter((item) => {
        const filePath = path.join(OUTPUTS_DIR, item.filename);
        const exists = fs.existsSync(filePath);
        if (exists) {
          totalBytes += item.fileSizeBytes || 0;
          if (categoryCounts[item.category] !== undefined) {
            categoryCounts[item.category]++;
          } else {
            categoryCounts[item.category] = 1;
          }
        }
        return exists;
      });

      if (validItems.length !== manifest.items.length) {
        manifest.items = validItems;
        saveOutputsManifest(manifest);
      }

      res.json({
        success: true,
        items: validItems,
        stats: {
          totalFiles: validItems.length,
          totalSizeBytes: totalBytes,
          formattedTotalSize: formatBytes(totalBytes),
          categoryCounts,
          latestUpdated: validItems[0]?.createdAt || Date.now(),
        },
      });
    } catch (err: any) {
      console.error("Error retrieving outputs:", err);
      res.status(500).json({ error: "Gagal memuat daftar folder output." });
    }
  });

  // 6. Explicit Save to Output Folder
  app.post("/api/outputs/save", (req, res) => {
    try {
      const {
        id,
        title,
        category = "pose",
        imageBase64,
        characterName,
        scriptSnippet,
        promptUsed,
        cameraAngle,
        artStyle,
        aspectRatio,
        tags,
      } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: "Data gambar diperlukan untuk disimpan ke folder output." });
      }

      const savedItem = saveImageToDiskOutput(imageBase64, {
        id,
        title: title || "Hasil Komik",
        category,
        characterName,
        scriptSnippet,
        promptUsed,
        cameraAngle,
        artStyle,
        aspectRatio,
        tags,
      });

      if (!savedItem) {
        return res.status(500).json({ error: "Gagal menulis file ke folder output server." });
      }

      res.json({ success: true, item: savedItem });
    } catch (err: any) {
      console.error("Error saving output:", err);
      res.status(500).json({ error: "Gagal menyimpan hasil ke folder output." });
    }
  });

  // 7. Delete Single Output
  app.delete("/api/outputs/:id", (req, res) => {
    try {
      const { id } = req.params;
      const manifest = getOutputsManifest();
      const itemToDelete = manifest.items.find((i) => i.id === id);

      if (itemToDelete) {
        const filePath = path.join(OUTPUTS_DIR, itemToDelete.filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            console.warn("Failed to delete file from disk:", e);
          }
        }
      }

      manifest.items = manifest.items.filter((i) => i.id !== id);
      saveOutputsManifest(manifest);

      res.json({ success: true, deletedId: id });
    } catch (err: any) {
      console.error("Error deleting output item:", err);
      res.status(500).json({ error: "Gagal menghapus file dari folder output." });
    }
  });

  // 8. Batch Delete Outputs
  app.post("/api/outputs/batch-delete", (req, res) => {
    try {
      const { ids = [] } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Daftar ID diperlukan." });
      }

      const idSet = new Set(ids);
      const manifest = getOutputsManifest();

      for (const item of manifest.items) {
        if (idSet.has(item.id)) {
          const filePath = path.join(OUTPUTS_DIR, item.filename);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (e) {
              // ignore
            }
          }
        }
      }

      manifest.items = manifest.items.filter((i) => !idSet.has(i.id));
      saveOutputsManifest(manifest);

      res.json({ success: true, deletedCount: ids.length });
    } catch (err: any) {
      console.error("Error batch deleting outputs:", err);
      res.status(500).json({ error: "Gagal menghapus beberapa file output." });
    }
  });

  // 9. Clear All Outputs
  app.post("/api/outputs/clear", (_req, res) => {
    try {
      const manifest = getOutputsManifest();
      for (const item of manifest.items) {
        const filePath = path.join(OUTPUTS_DIR, item.filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            // ignore
          }
        }
      }

      saveOutputsManifest({ items: [] });
      res.json({ success: true, message: "Folder output berhasil dikosongkan." });
    } catch (err: any) {
      console.error("Error clearing outputs:", err);
      res.status(500).json({ error: "Gagal mengosongkan folder output." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MangaPose AI Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
