import React, { useState } from "react";
import { X, Sliders, SplitSquareVertical, Eye, Grid, Download, Copy, Check } from "lucide-react";
import { GeneratedPose } from "../types";

interface PoseComparisonModalProps {
  pose: GeneratedPose | null;
  referenceImage?: string;
  onClose: () => void;
}

export const PoseComparisonModal: React.FC<PoseComparisonModalProps> = ({
  pose,
  referenceImage,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<"split" | "slider" | "onion">("split");
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [onionOpacity, setOnionOpacity] = useState<number>(0.5);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  if (!pose) return null;

  const originalImg = pose.referenceImageUrl || referenceImage;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(pose.actionPrompt || pose.scriptSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = pose.imageUrl;
    link.download = `${pose.characterName || "manga-pose"}-${pose.id}.png`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in text-zinc-100">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-rose-500" />
              Komparasi Anatomi & Konsistensi Karakter
            </h2>
            <p className="text-xs text-zinc-400">
              {pose.characterName} • {pose.title || "Pose Baru"} ({pose.cameraAngle} - {pose.actionType})
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode Switcher */}
            <div className="flex bg-zinc-800 p-1 rounded-lg border border-zinc-700 text-xs">
              <button
                onClick={() => setViewMode("split")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  viewMode === "split" ? "bg-rose-600 text-white font-medium" : "text-zinc-400 hover:text-white"
                }`}
              >
                Split
              </button>
              <button
                onClick={() => setViewMode("slider")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  viewMode === "slider" ? "bg-rose-600 text-white font-medium" : "text-zinc-400 hover:text-white"
                }`}
              >
                Slider
              </button>
              <button
                onClick={() => setViewMode("onion")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  viewMode === "onion" ? "bg-rose-600 text-white font-medium" : "text-zinc-400 hover:text-white"
                }`}
              >
                Onion Skin
              </button>
            </div>

            {/* Grid Toggle */}
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 rounded-lg border transition-colors ${
                showGrid
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white"
              }`}
              title="Toggle Grid Anatomi"
            >
              <Grid className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        <div className="flex-1 bg-zinc-950 p-6 flex flex-col items-center justify-center overflow-auto relative">
          {/* Grid Overlay */}
          {showGrid && (
            <div className="absolute inset-0 pointer-events-none z-20 grid grid-cols-6 grid-rows-6 opacity-30 border border-amber-500/30">
              {Array.from({ length: 36 }).map((_, i) => (
                <div key={i} className="border-r border-b border-amber-500/20" />
              ))}
            </div>
          )}

          {/* Mode 1: Split View */}
          {viewMode === "split" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl max-h-[60vh]">
              {/* Reference */}
              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
                  Gambar Referensi Asal
                </span>
                <div className="w-full h-80 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center p-2">
                  {originalImg ? (
                    <img
                      src={originalImg}
                      alt="Referensi Asal"
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full object-contain rounded-lg shadow-md"
                    />
                  ) : (
                    <div className="text-xs text-zinc-500">Tidak ada gambar referensi</div>
                  )}
                </div>
              </div>

              {/* Generated Pose */}
              <div className="flex flex-col items-center">
                <span className="text-xs font-semibold text-rose-400 mb-2 uppercase tracking-wider">
                  Pose Baru (AI Generated)
                </span>
                <div className="w-full h-80 rounded-xl overflow-hidden bg-zinc-900 border border-rose-900/40 flex items-center justify-center p-2">
                  <img
                    src={pose.imageUrl}
                    alt="Pose Baru"
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain rounded-lg shadow-md"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Mode 2: Interactive Split Slider */}
          {viewMode === "slider" && (
            <div className="relative w-full max-w-lg h-96 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 select-none">
              {/* Background: Generated Pose */}
              <img
                src={pose.imageUrl}
                alt="Pose Baru"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-contain"
              />

              {/* Foreground: Reference Image clipped */}
              {originalImg && (
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${sliderPos}%` }}
                >
                  <img
                    src={originalImg}
                    alt="Referensi Asal"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ width: "100%", maxWidth: "none" }}
                  />
                </div>
              )}

              {/* Slider Line & Handle */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-rose-500 shadow-lg cursor-ew-resize z-10 flex items-center justify-center"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="w-6 h-6 rounded-full bg-rose-600 border-2 border-white shadow flex items-center justify-center text-[10px] font-bold text-white">
                  ⟷
                </div>
              </div>

              {/* Invisible slider input */}
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
              />

              {/* Labels */}
              <div className="absolute bottom-2 left-2 z-10 px-2 py-0.5 bg-black/70 text-zinc-300 text-[10px] rounded font-mono">
                Referensi ({sliderPos}%)
              </div>
              <div className="absolute bottom-2 right-2 z-10 px-2 py-0.5 bg-black/70 text-rose-300 text-[10px] rounded font-mono">
                Pose AI
              </div>
            </div>
          )}

          {/* Mode 3: Onion Skin Ghosting */}
          {viewMode === "onion" && (
            <div className="flex flex-col items-center w-full max-w-lg space-y-4">
              <div className="relative w-full h-96 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 flex items-center justify-center">
                {/* Base reference image */}
                {originalImg && (
                  <img
                    src={originalImg}
                    alt="Referensi Asal"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-contain grayscale"
                  />
                )}
                {/* Overlay generated pose with variable opacity */}
                <img
                  src={pose.imageUrl}
                  alt="Pose Baru"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{ opacity: onionOpacity }}
                />
              </div>

              {/* Opacity Control */}
              <div className="flex items-center space-x-3 w-full px-6 py-2 bg-zinc-900 rounded-xl border border-zinc-800">
                <span className="text-xs text-zinc-400 font-mono">Referensi (0%)</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={onionOpacity}
                  onChange={(e) => setOnionOpacity(Number(e.target.value))}
                  className="flex-1 accent-rose-500 cursor-pointer"
                />
                <span className="text-xs text-rose-400 font-mono">Pose AI (100%)</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Details & Action Buttons */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="text-zinc-300 font-medium truncate max-w-lg">
              <span className="text-rose-400 font-bold">Naskah/Aksi: </span>
              {pose.scriptSnippet || pose.actionPrompt}
            </div>
            {pose.notes && (
              <div className="text-zinc-500 italic text-[11px] truncate max-w-lg">
                Catatan AI: {pose.notes}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyPrompt}
              className="flex items-center space-x-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Tersalin!" : "Salin Prompt"}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium shadow-md shadow-rose-950/40 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Gambar Pose</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
