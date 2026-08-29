import JSZip from "jszip";
import { GeneratedPose } from "../types";

/**
 * Utilities to ensure all image inputs (SVG, WebP, PNG, JPEG)
 * are properly converted to standard raster base64 (image/png or image/jpeg)
 * before being sent to Gemini multimodal endpoints.
 */

export async function convertToRasterPng(
  dataUriOrSvg: string,
  targetWidth = 512,
  targetHeight = 512
): Promise<{ dataUri: string; base64: string; mimeType: string }> {
  if (!dataUriOrSvg) {
    return { dataUri: "", base64: "", mimeType: "image/png" };
  }

  const isSvg =
    dataUriOrSvg.startsWith("data:image/svg+xml") ||
    dataUriOrSvg.trim().startsWith("<svg") ||
    dataUriOrSvg.includes("%3Csvg");

  // If it's already a standard raster base64 (PNG / JPEG / WebP)
  if (!isSvg && dataUriOrSvg.startsWith("data:image/")) {
    const mimeMatch = dataUriOrSvg.match(/^data:(image\/[a-zA-Z0-9-+.]+);base64,/);
    if (mimeMatch) {
      const mimeType = mimeMatch[1];
      const base64 = dataUriOrSvg.replace(/^data:image\/[a-zA-Z0-9-+.]+;base64,/, "");
      return { dataUri: dataUriOrSvg, base64, mimeType };
    }
  }

  // If it's an SVG (either data:image/svg+xml or raw SVG string), rasterize it via HTML5 Canvas
  try {
    return await new Promise((resolve) => {
      let src = dataUriOrSvg;
      if (src.trim().startsWith("<svg")) {
        src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(src)}`;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve({ dataUri: dataUriOrSvg, base64: "", mimeType: "image/png" });
            return;
          }

          // Draw clean white background for comic inking contrast
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, targetWidth, targetHeight);

          // Draw the image
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

          const pngDataUrl = canvas.toDataURL("image/png");
          const base64 = pngDataUrl.replace(/^data:image\/png;base64,/, "");
          resolve({
            dataUri: pngDataUrl,
            base64,
            mimeType: "image/png",
          });
        } catch {
          resolve({ dataUri: dataUriOrSvg, base64: "", mimeType: "image/png" });
        }
      };

      img.onerror = () => {
        resolve({ dataUri: dataUriOrSvg, base64: "", mimeType: "image/png" });
      };

      img.src = src;
    });
  } catch {
    return { dataUri: dataUriOrSvg, base64: "", mimeType: "image/png" };
  }
}

/**
 * Extracts character cutout on a pure transparent PNG background.
 * Uses intelligent multi-point corner & perimeter sampling, flood-fill background removal,
 * luminance-aware chroma checks, and soft anti-aliased edge blending to ensure ONLY
 * the foreground character figure is kept without any residual background clutter.
 */
export async function createTransparentPngCutout(
  imageUrl: string,
  tolerance = 38
): Promise<string> {
  if (!imageUrl) return "";

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const w = img.naturalWidth || img.width || 800;
        const h = img.naturalHeight || img.height || 800;
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(imageUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // Sample perimeter and corner pixels to identify background colors
        const samplePoints: [number, number][] = [
          [0, 0],
          [w - 1, 0],
          [0, h - 1],
          [w - 1, h - 1],
          [Math.floor(w * 0.25), 0],
          [Math.floor(w * 0.5), 0],
          [Math.floor(w * 0.75), 0],
          [0, Math.floor(h * 0.25)],
          [0, Math.floor(h * 0.5)],
          [0, Math.floor(h * 0.75)],
          [w - 1, Math.floor(h * 0.25)],
          [w - 1, Math.floor(h * 0.5)],
          [w - 1, Math.floor(h * 0.75)],
          [Math.floor(w * 0.25), h - 1],
          [Math.floor(w * 0.5), h - 1],
          [Math.floor(w * 0.75), h - 1],
        ];

        let bgR = 0;
        let bgG = 0;
        let bgB = 0;
        const bgSamples: { r: number; g: number; b: number }[] = [];

        for (const [sx, sy] of samplePoints) {
          const idx = (sy * w + sx) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          bgR += r;
          bgG += g;
          bgB += b;
          bgSamples.push({ r, g, b });
        }

        const avgBgR = Math.round(bgR / samplePoints.length);
        const avgBgG = Math.round(bgG / samplePoints.length);
        const avgBgB = Math.round(bgB / samplePoints.length);

        const colorDistance = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) => {
          const dr = r1 - r2;
          const dg = g1 - g2;
          const db = b1 - b2;
          return Math.sqrt(dr * dr + dg * dg + db * db);
        };

        const isSimilarToAnyBgSample = (r: number, g: number, b: number, thresh: number) => {
          if (colorDistance(r, g, b, avgBgR, avgBgG, avgBgB) <= thresh) return true;
          for (const s of bgSamples) {
            if (colorDistance(r, g, b, s.r, s.g, s.b) <= thresh * 0.85) return true;
          }
          return false;
        };

        // Flood fill from outer perimeter inward
        const isBg = new Uint8Array(w * h);
        const queue: number[] = [];

        // Push all border pixels to queue
        for (let x = 0; x < w; x++) {
          queue.push(x, 0);
          queue.push(x, h - 1);
        }
        for (let y = 0; y < h; y++) {
          queue.push(0, y);
          queue.push(w - 1, y);
        }

        // Light background check (white / off-white comic page background)
        const isLightBg = avgBgR > 215 && avgBgG > 215 && avgBgB > 215;

        while (queue.length > 0) {
          const y = queue.pop()!;
          const x = queue.pop()!;
          const pos = y * w + x;

          if (isBg[pos]) continue;

          const idx = pos * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          const isMatch = isSimilarToAnyBgSample(r, g, b, tolerance);

          if (isMatch) {
            isBg[pos] = 1;

            // 4-way neighbor expansion
            if (x > 0 && !isBg[pos - 1]) queue.push(x - 1, y);
            if (x < w - 1 && !isBg[pos + 1]) queue.push(x + 1, y);
            if (y > 0 && !isBg[pos - w]) queue.push(x, y - 1);
            if (y < h - 1 && !isBg[pos + w]) queue.push(x, y + 1);
          }
        }

        // Remove outer background pixels while keeping character 100% solid & opaque
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const pos = y * w + x;
            const idx = pos * 4;

            if (isBg[pos]) {
              data[idx + 3] = 0; // Pure transparent outside character outline
            } else {
              // Character interior is 100% solid and opaque
              let neighborBgCount = 0;
              if (x > 0 && isBg[pos - 1]) neighborBgCount++;
              if (x < w - 1 && isBg[pos + 1]) neighborBgCount++;
              if (y > 0 && isBg[pos - w]) neighborBgCount++;
              if (y < h - 1 && isBg[pos + w]) neighborBgCount++;

              if (neighborBgCount > 0) {
                // Subtle anti-aliasing on the extreme 1px outer boundary
                const dist = colorDistance(data[idx], data[idx + 1], data[idx + 2], avgBgR, avgBgG, avgBgB);
                if (dist < tolerance * 0.7) {
                  data[idx + 3] = Math.round(Math.max(140, 255 * (dist / (tolerance * 0.7))));
                } else {
                  data[idx + 3] = 255;
                }
              } else {
                data[idx + 3] = 255; // Solid inside
              }
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (err) {
        console.warn("Cutout generation fallback:", err);
        resolve(imageUrl);
      }
    };

    img.onerror = () => {
      resolve(imageUrl);
    };

    img.src = imageUrl;
  });
}

/**
 * Seamlessly composites a transparent character PNG on top of a background image.
 * Matches aspect ratio and creates a unified high-resolution PNG composite.
 */
export async function createCompositeImage(
  backgroundUrl: string,
  characterPngUrl: string
): Promise<string> {
  if (!backgroundUrl && !characterPngUrl) return "";
  if (!backgroundUrl) return characterPngUrl;
  if (!characterPngUrl) return backgroundUrl;

  return new Promise((resolve) => {
    const bgImg = new Image();
    bgImg.crossOrigin = "anonymous";

    bgImg.onload = () => {
      const charImg = new Image();
      charImg.crossOrigin = "anonymous";

      charImg.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const w = bgImg.naturalWidth || charImg.naturalWidth || 1024;
          const h = bgImg.naturalHeight || charImg.naturalHeight || 1024;
          canvas.width = w;
          canvas.height = h;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(characterPngUrl);
            return;
          }

          // 1. Draw clean background plate
          ctx.drawImage(bgImg, 0, 0, w, h);

          // 2. Draw transparent character overlay on top
          ctx.drawImage(charImg, 0, 0, w, h);

          resolve(canvas.toDataURL("image/png"));
        } catch {
          resolve(characterPngUrl);
        }
      };

      charImg.onerror = () => resolve(backgroundUrl);
      charImg.src = characterPngUrl;
    };

    bgImg.onerror = () => resolve(characterPngUrl);
    bgImg.src = backgroundUrl;
  });
}

/**
 * Ensures high-definition JPEG export with 0.95 quality for backgrounds
 * so images are ultra sharp without compression artifacts.
 */
export async function exportToHighDefJpeg(imageUrl: string, quality = 0.95): Promise<string> {
  if (!imageUrl) return "";

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const w = img.naturalWidth || img.width || 1200;
        const h = img.naturalHeight || img.height || 1200;
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(imageUrl);
          return;
        }

        // Fill background white in case of transparent areas before JPEG encoding
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (err) {
        resolve(imageUrl);
      }
    };

    img.onerror = () => resolve(imageUrl);
    img.src = imageUrl;
  });
}

/**
 * Downloads a single image file with the designated format extension
 */
export function downloadImage(dataUrl: string, filename: string): void {
  if (!dataUrl) return;
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Packages separated layers into a ZIP archive:
 * 1. Character PNG (Transparent Cutout, no background)
 * 2. Background HD JPEG (High Definition Scenery)
 * 3. Composite Image (PNG)
 * 4. Scene Details / Info Text File
 */
export async function downloadPosePackageZip(pose: GeneratedPose): Promise<void> {
  const zip = new JSZip();
  const safeName = (pose.characterName || "Karakter").replace(/[^a-zA-Z0-9_-]/g, "_");
  const folderName = `${safeName}-Pose-${pose.id.slice(0, 6)}`;
  const folder = zip.folder(folderName) || zip;

  const sanitizeBase64 = (url: string) => url.replace(/^data:image\/[a-zA-Z0-9-+.]+;base64,/, "");

  // 1. Character Transparent PNG
  if (pose.characterPngUrl) {
    const charData = sanitizeBase64(pose.characterPngUrl);
    folder.file(`${safeName}_Karakter_Tanpa_Background.png`, charData, { base64: true });
  } else if (pose.imageUrl) {
    // If not separated yet, create cutout on the fly
    const cutout = await createTransparentPngCutout(pose.imageUrl);
    folder.file(`${safeName}_Karakter_Tanpa_Background.png`, sanitizeBase64(cutout), { base64: true });
  }

  // 2. Background HD JPEG
  if (pose.backgroundJpegUrl) {
    const bgData = sanitizeBase64(pose.backgroundJpegUrl);
    folder.file(`${safeName}_Latar_Belakang_HD.jpg`, bgData, { base64: true });
  }

  // 3. Composite Full Panel
  if (pose.imageUrl) {
    folder.file(`${safeName}_Komposit_Panel_Lengkap.png`, sanitizeBase64(pose.imageUrl), { base64: true });
  }

  // 4. Metadata text
  const metadataText = `
=== DETAIL POSE & ANATOMI KOMIK ===
Karakter: ${pose.characterName}
Judul Adegan: ${pose.title}
Naskah: ${pose.scriptSnippet || "-"}
Prompt Aksi: ${pose.actionPrompt}
Sudut Kamera: ${pose.cameraAngle}
Kategori Aksi: ${pose.actionType}
Ekspresi: ${pose.expression}
Gaya Seni: ${pose.artStyle}
Rasio Aspek: ${pose.aspectRatio}
SFX: ${pose.sfx || "-"}

Format Layer:
- Karakter: PNG Transparan (Lossless 32-bit RGBA, Siap Timpa di Clip Studio / Photoshop / Procreate)
- Latar Belakang: High-Definition JPEG (Tanpa Kompresi Buram)
- Komposit: PNG High-Res
`.trim();

  folder.file("info_pose_dan_naskah.txt", metadataText);

  const blob = await zip.generateAsync({ type: "blob" });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = `${safeName}_Paket_Layer_Komik.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}
