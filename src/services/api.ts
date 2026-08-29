import {
  CharacterAnalysisResult,
  GeneratedPose,
  OutputFolderStats,
  OutputItem,
  ParsedComicScript,
  PromptEnhanceResult,
} from "../types";
import { convertToRasterPng } from "../utils/imageUtils";

export class ApiError extends Error {
  isQuotaError: boolean;
  retryAfterSeconds: number;
  statusCode: number;

  constructor(
    message: string,
    isQuotaError: boolean = false,
    retryAfterSeconds: number = 30,
    statusCode: number = 500
  ) {
    super(message);
    this.name = "ApiError";
    this.isQuotaError = isQuotaError;
    this.retryAfterSeconds = retryAfterSeconds;
    this.statusCode = statusCode;
  }
}

export interface GeneratePosePayload {
  referenceImageBase64?: string;
  mimeType?: string;
  script?: string;
  actionPrompt: string;
  characterName?: string;
  characterTraits?: string;
  artStyle?: string;
  cameraAngle?: string;
  actionType?: string;
  customActionType?: string;
  expression?: string;
  customExpression?: string;
  customFeatures?: string;
  aspectRatio?: string;
  anatomyGuideOverlay?: boolean;
  lightingMood?: string;
  separateLayers?: boolean;
}

export interface GeneratePoseResponse {
  success: boolean;
  imageUrl: string;
  characterPngUrl?: string;
  backgroundJpegUrl?: string;
  hasSeparatedLayers?: boolean;
  promptUsed: string;
  notes?: string;
}

export async function checkServerHealth(): Promise<{ status: string; hasApiKey: boolean }> {
  try {
    const res = await fetch("/api/health");
    if (!res.ok) throw new Error("Server not responding");
    return await res.json();
  } catch (err: any) {
    return { status: "error", hasApiKey: false };
  }
}

async function handleApiResponse<T>(res: Response, fallbackErrMsg: string): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const isQuota =
      res.status === 429 ||
      Boolean(data?.isQuotaError) ||
      (data?.error && String(data.error).includes("429")) ||
      (data?.error && String(data.error).toLowerCase().includes("quota"));

    const retrySec = Number(data?.retryAfterSeconds) || (isQuota ? 30 : 0);
    const msg = data?.error || fallbackErrMsg;

    throw new ApiError(msg, isQuota, retrySec, res.status);
  }
  return data as T;
}

export async function generateComicPose(payload: GeneratePosePayload): Promise<GeneratePoseResponse> {
  let processedPayload = { ...payload, separateLayers: payload.separateLayers ?? false };

  // If a reference image is present, convert SVG/unsupported formats to raster PNG base64
  if (payload.referenceImageBase64) {
    const rasterResult = await convertToRasterPng(payload.referenceImageBase64);
    if (rasterResult.base64) {
      processedPayload.referenceImageBase64 = rasterResult.base64;
      processedPayload.mimeType = rasterResult.mimeType || "image/png";
    }
  }

  const res = await fetch("/api/generate-pose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(processedPayload),
  });

  return await handleApiResponse(res, "Gagal menghasilkan pose karakter dari AI.");
}

export async function generateHdBackground(payload: {
  script?: string;
  actionPrompt?: string;
  environmentPrompt?: string;
  characterImageBase64?: string;
  artStyle?: string;
  cameraAngle?: string;
  aspectRatio?: string;
  lightingMood?: string;
  customFeatures?: string;
}): Promise<{ success: boolean; backgroundJpegUrl: string; promptUsed: string }> {
  let processedPayload = { ...payload };

  if (payload.characterImageBase64) {
    const raster = await convertToRasterPng(payload.characterImageBase64);
    if (raster.base64) {
      processedPayload.characterImageBase64 = raster.base64;
    }
  }

  const res = await fetch("/api/generate-hd-background", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(processedPayload),
  });

  return await handleApiResponse(res, "Gagal menghasilkan latar belakang HD.");
}

export async function generateCharacterArt(payload: {
  characterName: string;
  characterRole?: string;
  characterDescription?: string;
  visualPrompt?: string;
  artStyle?: string;
  distinctiveFeatures?: string[];
  aspectRatio?: string;
}): Promise<{ success: boolean; imageUrl: string; promptUsed: string; characterName: string }> {
  const res = await fetch("/api/generate-character-art", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return await handleApiResponse(res, "Gagal menghasilkan gambar karakter dari AI.");
}

export async function parseComicScript(
  scriptText: string,
  characterNames: string[] = []
): Promise<ParsedComicScript> {
  const res = await fetch("/api/parse-script", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scriptText, characterNames }),
  });

  return await handleApiResponse(res, "Gagal membedah naskah komik.");
}

export async function enhancePromptWithAnatomy(
  userIdea: string,
  style?: string,
  cameraAngle?: string
): Promise<PromptEnhanceResult> {
  const res = await fetch("/api/enhance-prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userIdea, style, cameraAngle }),
  });

  return await handleApiResponse(res, "Gagal mengoptimalkan prompt pose.");
}

export async function analyzeCharacterImage(
  imageBase64: string,
  mimeType: string = "image/png"
): Promise<CharacterAnalysisResult> {
  let finalBase64 = imageBase64;
  let finalMime = mimeType;

  if (imageBase64) {
    const rasterResult = await convertToRasterPng(imageBase64);
    if (rasterResult.base64) {
      finalBase64 = rasterResult.base64;
      finalMime = rasterResult.mimeType || "image/png";
    }
  }

  const res = await fetch("/api/analyze-character", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64: finalBase64, mimeType: finalMime }),
  });

  return await handleApiResponse(res, "Gagal menganalisis karakter.");
}

export async function fetchOutputsList(): Promise<{
  success: boolean;
  items: OutputItem[];
  stats: OutputFolderStats;
}> {
  const res = await fetch("/api/outputs");
  return await handleApiResponse(res, "Gagal memuat daftar folder output.");
}

export async function saveOutputToFolder(payload: {
  id?: string;
  title: string;
  category: string;
  imageBase64: string;
  characterName?: string;
  scriptSnippet?: string;
  promptUsed?: string;
  cameraAngle?: string;
  artStyle?: string;
  aspectRatio?: string;
  tags?: string[];
}): Promise<{ success: boolean; item: OutputItem }> {
  const res = await fetch("/api/outputs/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return await handleApiResponse(res, "Gagal menyimpan file ke folder output.");
}

export async function deleteOutputFromFolder(id: string): Promise<{ success: boolean; deletedId: string }> {
  const res = await fetch(`/api/outputs/${id}`, {
    method: "DELETE",
  });

  return await handleApiResponse(res, "Gagal menghapus file dari folder output.");
}

export async function batchDeleteOutputsFromFolder(ids: string[]): Promise<{ success: boolean; deletedCount: number }> {
  const res = await fetch("/api/outputs/batch-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });

  return await handleApiResponse(res, "Gagal menghapus beberapa file output.");
}

export async function clearAllOutputsFromFolder(): Promise<{ success: boolean; message: string }> {
  const res = await fetch("/api/outputs/clear", {
    method: "POST",
  });

  return await handleApiResponse(res, "Gagal mengosongkan folder output.");
}

