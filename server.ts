import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

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
        expression = "determined",
        aspectRatio = "1:1",
        anatomyGuideOverlay = false,
        lightingMood = "dramatic-contrast",
      } = req.body;

      if (!actionPrompt && !script) {
        return res.status(400).json({ error: "Mohon sediakan naskah atau deskripsi pose." });
      }

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
[TASK: COMIC CHARACTER POSE & ANATOMY GENERATION]
You are a master comic book artist and mangaka.
Generate a new illustration of the character in the reference image performing the EXACT pose and action described in the comic script.

CHARACTER CONSISTENCY MANDATE:
- Retain the exact same character identity from the reference image: same face structure, hairstyle, hair color, facial features, distinctive costume/clothing elements, and body proportions.
- Character Name: ${characterName}
- Key Character Visual Traits: ${characterTraits || "Match reference image exactly"}

NEW POSE & SCRIPT ACTION:
- Comic Script/Scene: "${script}"
- Requested Action & Pose: "${actionPrompt}"
- Character Emotion/Expression: ${expression}
- Action Category: ${actionType}
- Camera Perspective & Framing: ${cameraInstruction}
- Art Style: ${styleInstruction}
- Lighting & Atmosphere: ${lightingMood}
${anatomyGuideText ? `- Anatomy Guide: ${anatomyGuideText}` : ""}

ANATOMY & ARTISTIC QUALITY REQUIREMENTS:
- Precise anatomical accuracy (correct joints, believable muscle flexion, natural hand gestures with proper finger articulation).
- Exaggerated comic dynamic line of action and kinetic energy.
- Composition suitable as a master comic panel / character pose reference sheet.
- Pure subject rendering, no distracting background clutter unless relevant to the script.
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

      // Check if separateLayers was requested
      const { separateLayers = true } = req.body;
      let generatedBgUrl: string | null = null;

      if (separateLayers && (script || actionPrompt)) {
        try {
          const bgDirectorPrompt = `
[TASK: HIGH DEFINITION COMIC BACKGROUND SCENERY GENERATION]
You are a master comic book background artist and environment concept designer.
Generate a high-definition, highly detailed comic book background scene plate matching this comic panel:
- Scene/Setting Description: "${script || actionPrompt}"
- Camera Perspective & Angle: ${cameraInstruction}
- Art Style: ${styleInstruction}
- Lighting & Atmosphere: ${lightingMood}

CRITICAL RULES:
1. CLEAN BACKGROUND PLATE ONLY: Absolutely NO human characters, NO figures, NO faces, NO silhouettes of people.
2. High-definition environmental texture, architectural depth, perspective lines, dramatic lighting, and comic screentones / shading.
3. Perfect backdrop ready to place a character overlay on top in Photoshop, Procreate, or Clip Studio Paint.
          `.trim();

          const bgResponse = await executeWithRetry(async () => {
            return await ai.models.generateContent({
              model: "gemini-3.1-flash-lite-image",
              contents: { parts: [{ text: bgDirectorPrompt }] },
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

      res.json({
        success: true,
        imageUrl: generatedImageUrl,
        characterPngUrl: generatedImageUrl,
        backgroundJpegUrl: generatedBgUrl,
        hasSeparatedLayers: Boolean(generatedBgUrl),
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
        environmentPrompt = "",
        artStyle = "manga-screentone",
        cameraAngle = "eye-level",
        aspectRatio = "1:1",
        lightingMood = "dramatic-contrast",
      } = req.body;

      if (!script && !environmentPrompt) {
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
[TASK: HIGH DEFINITION COMIC BACKGROUND SCENERY GENERATION]
You are a master comic book background artist and environment concept designer.
Generate a high-definition, highly detailed comic book background scene plate matching this comic panel:
- Scene/Setting Description: "${script || environmentPrompt}"
- Camera Perspective & Angle: ${cameraAngle}
- Art Style: ${styleInstruction}
- Lighting & Atmosphere: ${lightingMood}

CRITICAL RULES:
1. CLEAN BACKGROUND PLATE ONLY: Absolutely NO human characters, NO figures, NO faces, NO silhouettes of people.
2. High-definition environmental texture, architectural depth, perspective lines, dramatic lighting, and comic screentones / shading.
3. Output format: High Definition JPEG, clear without blur.
      `.trim();

      const validAspectRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
      const selectedAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : "1:1";

      const bgResponse = await executeWithRetry(async () => {
        return await ai.models.generateContent({
          model: "gemini-3.1-flash-lite-image",
          contents: { parts: [{ text: bgDirectorPrompt }] },
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

      res.json({
        success: true,
        backgroundJpegUrl: backgroundJpegUrl,
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

      res.json({
        success: true,
        imageUrl: generatedImageUrl,
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
