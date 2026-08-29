import React, { useRef, useState } from "react";
import { X, Download, Copy, Check, Users, Sparkles, Layers } from "lucide-react";
import { ComicCharacter, GeneratedPose } from "../types";

interface CharacterSheetModalProps {
  character: ComicCharacter | null;
  poses: GeneratedPose[];
  onClose: () => void;
}

export const CharacterSheetModal: React.FC<CharacterSheetModalProps> = ({
  character,
  poses,
  onClose,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState<boolean>(false);

  if (!character) return null;

  const characterPoses = poses.filter((p) => p.characterId === character.id || p.characterName === character.name);

  const handleExportSheet = async () => {
    setDownloading(true);
    try {
      // Create a composite canvas for the whole model sheet
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 900;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        // Dark Manga Studio background
        ctx.fillStyle = "#09090b";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Grid lines texture
        ctx.strokeStyle = "#27272a";
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        // Header Title
        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 28px sans-serif";
        ctx.fillText(`MANGA CHARACTER MODEL SHEET: ${character.name.toUpperCase()}`, 40, 55);

        ctx.fillStyle = "#a1a1aa";
        ctx.font = "16px sans-serif";
        ctx.fillText(`Role: ${character.role}  |  Series: ${character.seriesTitle || "Original Comic"}  |  Style: ${character.artStyle}`, 40, 85);

        // Divider
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(40, 100);
        ctx.lineTo(1160, 100);
        ctx.stroke();

        // Left Card: Base Image
        ctx.fillStyle = "#18181b";
        ctx.fillRect(40, 120, 320, 420);
        ctx.strokeStyle = "#3f3f46";
        ctx.strokeRect(40, 120, 320, 420);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText("REFERENCE DRAWING", 50, 145);

        // Load & draw base image
        const baseImg = new Image();
        baseImg.crossOrigin = "anonymous";
        baseImg.src = character.baseImageData;
        await new Promise((resolve) => {
          baseImg.onload = resolve;
          baseImg.onerror = resolve;
        });
        if (baseImg.complete && baseImg.naturalWidth > 0) {
          ctx.drawImage(baseImg, 50, 160, 300, 360);
        }

        // Character Traits Info Box
        ctx.fillStyle = "#18181b";
        ctx.fillRect(40, 560, 320, 300);
        ctx.strokeRect(40, 560, 320, 300);

        ctx.fillStyle = "#f43f5e";
        ctx.font = "bold 15px sans-serif";
        ctx.fillText("ANATOMY & TRAIT DETAILS", 55, 590);

        ctx.fillStyle = "#e4e4e7";
        ctx.font = "13px sans-serif";
        ctx.fillText(`• Proporsi: ${character.bodyProportions || "7.5 Head Standard"}`, 55, 620);
        ctx.fillText(`• Rambut: ${character.hairStyleColor || "-"}`, 55, 650);
        ctx.fillText(`• Mata: ${character.eyeDetails || "-"}`, 55, 680);
        ctx.fillText(`• Kostum: ${character.outfitBreakdown || "-"}`, 55, 710);

        // Distinctive Features
        if (character.keyDistinctiveFeatures && character.keyDistinctiveFeatures.length > 0) {
          ctx.fillText(`• Ciri Khas: ${character.keyDistinctiveFeatures.join(", ")}`, 55, 740);
        }

        // Right side: Pose Gallery (Grid of 4 poses)
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 18px sans-serif";
        ctx.fillText(`DYNAMIC POSE DATABASE (${characterPoses.length} POSES)`, 390, 145);

        const poseSlots = [
          { x: 390, y: 160, w: 370, h: 330 },
          { x: 780, y: 160, w: 370, h: 330 },
          { x: 390, y: 520, w: 370, h: 330 },
          { x: 780, y: 520, w: 370, h: 330 },
        ];

        for (let i = 0; i < Math.min(poseSlots.length, characterPoses.length); i++) {
          const slot = poseSlots[i];
          const p = characterPoses[i];

          ctx.fillStyle = "#18181b";
          ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
          ctx.strokeStyle = "#3f3f46";
          ctx.strokeRect(slot.x, slot.y, slot.w, slot.h);

          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = p.imageUrl;
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });

          if (img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, slot.x + 10, slot.y + 10, slot.w - 20, slot.h - 50);
          }

          ctx.fillStyle = "#f43f5e";
          ctx.font = "bold 12px sans-serif";
          ctx.fillText(`[${p.cameraAngle.toUpperCase()}] ${p.actionType}`, slot.x + 10, slot.y + slot.h - 15);
        }

        // Trigger download
        const dataUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `ModelSheet-${character.name.replace(/\s+/g, "_")}.png`;
        a.click();
      }
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in text-zinc-100">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Model Sheet Karakter: {character.name}
              </h2>
              <p className="text-xs text-zinc-400">
                {character.role} • {character.seriesTitle || "Komik Utama"}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportSheet}
              disabled={downloading}
              className="flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? "Merender Sheet..." : "Export Lembar Model (PNG)"}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div ref={sheetRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-zinc-950">
          {/* Top Overview Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Reference Image Preview */}
            <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800 flex flex-col items-center">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                Gambar Acuan Karakter
              </span>
              <div className="w-full h-64 rounded-lg overflow-hidden bg-black/40 border border-zinc-800 flex items-center justify-center p-2">
                <img
                  src={character.baseImageData}
                  alt={character.name}
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain rounded"
                />
              </div>
              <div className="mt-3 text-center">
                <span className="px-2.5 py-1 text-xs rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
                  Gaya: {character.artStyle}
                </span>
              </div>
            </div>

            {/* Character Traits & Anatomy Blueprint */}
            <div className="md:col-span-2 bg-zinc-900/80 p-5 rounded-xl border border-zinc-800 space-y-4">
              <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Rincian Ciri Visual & Anatomi
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80">
                  <div className="text-zinc-500 font-semibold mb-1">Rambut & Bentuk Wajah</div>
                  <div className="text-zinc-200">{character.hairStyleColor || "Sesuai sketsa awal"}</div>
                </div>

                <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80">
                  <div className="text-zinc-500 font-semibold mb-1">Mata & Sorot Tatapan</div>
                  <div className="text-zinc-200">{character.eyeDetails || "Ekspresif manga"}</div>
                </div>

                <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80">
                  <div className="text-zinc-500 font-semibold mb-1">Pakaian & Kostum Utama</div>
                  <div className="text-zinc-200">{character.outfitBreakdown || "Kostum karakter khas"}</div>
                </div>

                <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80">
                  <div className="text-zinc-500 font-semibold mb-1">Proporsi Tubuh</div>
                  <div className="text-zinc-200">{character.bodyProportions || "7.5 unit kepala"}</div>
                </div>
              </div>

              {character.keyDistinctiveFeatures && character.keyDistinctiveFeatures.length > 0 && (
                <div>
                  <div className="text-xs text-zinc-400 mb-1.5 font-medium">Fitur Kunci / Aksesori Khas:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {character.keyDistinctiveFeatures.map((feat, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs font-mono"
                      >
                        ✓ {feat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 bg-zinc-950/40 rounded-lg border border-zinc-800 text-xs">
                <div className="text-zinc-500 font-semibold mb-1">Prompt Konsistensi AI (English):</div>
                <div className="text-zinc-300 font-mono text-[11px] leading-relaxed">
                  {character.visualPromptSummary}
                </div>
              </div>
            </div>
          </div>

          {/* Associated Generated Poses Gallery */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-rose-500" /> Pose Tergenerate ({characterPoses.length})
              </h3>
              <span className="text-xs text-zinc-500">
                Koleksi pose aksi untuk panel komik
              </span>
            </div>

            {characterPoses.length === 0 ? (
              <div className="p-8 text-center bg-zinc-900/50 rounded-xl border border-zinc-800 text-zinc-500 text-xs">
                Belum ada pose yang dibuat untuk karakter ini. Gunakan menu <strong>Studio Pose</strong> untuk mulai membuat variasi gerakan!
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {characterPoses.map((pose) => (
                  <div
                    key={pose.id}
                    className="group bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden flex flex-col hover:border-rose-500/40 transition-colors"
                  >
                    <div className="h-44 bg-zinc-950 p-2 flex items-center justify-center relative">
                      <img
                        src={pose.imageUrl}
                        alt={pose.title || "Pose"}
                        referrerPolicy="no-referrer"
                        className="max-h-full max-w-full object-contain rounded"
                      />
                    </div>
                    <div className="p-2.5 bg-zinc-900 border-t border-zinc-800 text-xs space-y-1">
                      <div className="font-semibold text-zinc-200 truncate">
                        {pose.title || pose.actionType}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <span className="capitalize">{pose.cameraAngle}</span>
                        <span className="text-rose-400">{pose.expression}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
