import React, { useState } from "react";
import {
  FileText,
  Sparkles,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertCircle,
  Download,
  Layers,
  Camera,
  Eye,
  Sliders,
  ChevronRight,
  Package,
  User,
  Trees,
  Info,
} from "lucide-react";
import JSZip from "jszip";
import { ComicCharacter, GeneratedPose, ParsedComicScript, ScriptPanel } from "../types";
import { SAMPLE_COMIC_SCRIPTS } from "../data/posePresets";
import { ApiError, generateComicPose, parseComicScript } from "../services/api";
import { QuotaCountdownAlert } from "./QuotaCountdownAlert";
import {
  createTransparentPngCutout,
  exportToHighDefJpeg,
  downloadImage,
} from "../utils/imageUtils";

interface ScriptToStoryboardProps {
  characters: ComicCharacter[];
  selectedCharacter: ComicCharacter | null;
  onSelectCharacter: (char: ComicCharacter) => void;
  onSavePose: (pose: GeneratedPose) => void;
  onOpenComparison: (pose: GeneratedPose) => void;
}

export const ScriptToStoryboard: React.FC<ScriptToStoryboardProps> = ({
  characters,
  selectedCharacter,
  onSelectCharacter,
  onSavePose,
  onOpenComparison,
}) => {
  const [scriptInput, setScriptInput] = useState<string>(SAMPLE_COMIC_SCRIPTS[0].script);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsedScript, setParsedScript] = useState<ParsedComicScript | null>(null);
  const [isBatchGenerating, setIsBatchGenerating] = useState<boolean>(false);
  const [currentGeneratingPanel, setCurrentGeneratingPanel] = useState<number | null>(null);
  const [isZippingStoryboard, setIsZippingStoryboard] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string>("");
  const [quotaInfo, setQuotaInfo] = useState<{
    seconds: number;
    message: string;
  } | null>(null);

  // Active character fallback
  const activeChar = selectedCharacter || characters[0];

  // Helper to match correct character for each folklore panel
  const getCharacterForPanel = (panel: ScriptPanel): ComicCharacter => {
    const pName = (panel.characterName || "").toLowerCase();
    const pDesc = (panel.actionDescription || "").toLowerCase();

    if (pName.includes("rav") || pName.includes("rabbi") || pDesc.includes("rav") || pDesc.includes("rabbi")) {
      const found = characters.find((c) => c.id === "char-rav" || c.name.toLowerCase().includes("rav"));
      if (found) return found;
    }
    if (pName.includes("wife") || pName.includes("sarah") || pName.includes("istri") || pDesc.includes("sarah") || pDesc.includes("istri") || pDesc.includes("tichel")) {
      const found = characters.find((c) => c.id === "char-sarah" || c.name.toLowerCase().includes("sarah"));
      if (found) return found;
    }
    if (
      pName.includes("animal") ||
      pName.includes("hewan") ||
      pName.includes("kambing") ||
      pName.includes("sapi") ||
      pName.includes("ayam") ||
      pName.includes("chicken") ||
      pName.includes("goat") ||
      pName.includes("cow") ||
      pDesc.includes("kambing") ||
      pDesc.includes("sapi") ||
      pDesc.includes("ayam") ||
      pDesc.includes("chicken") ||
      pDesc.includes("goat") ||
      pDesc.includes("cow")
    ) {
      const foundAnimal = characters.find((c) => c.id === "char-animals" || c.name.toLowerCase().includes("animal"));
      if (foundAnimal) return foundAnimal;
    }
    if (
      pName.includes("child") ||
      pName.includes("anak") ||
      pName.includes("david") ||
      pName.includes("leah") ||
      pDesc.includes("anak") ||
      pDesc.includes("children")
    ) {
      const found = characters.find((c) => c.id === "char-children" || c.name.toLowerCase().includes("children"));
      if (found) return found;
    }
    if (
      pName.includes("mendel") ||
      pName.includes("man") ||
      pName.includes("pria") ||
      pName.includes("suami") ||
      pDesc.includes("mendel") ||
      pDesc.includes("yarmulke")
    ) {
      const found = characters.find((c) => c.id === "char-mendel" || c.name.toLowerCase().includes("mendel"));
      if (found) return found;
    }

    return activeChar;
  };

  const [viewMode, setViewMode] = useState<"list" | "grid-page">("list");

  const handleParseScript = async () => {
    if (!scriptInput.trim()) return;
    setIsParsing(true);
    setParseError("");
    setQuotaInfo(null);
    try {
      const charNames = characters.map((c) => c.name);
      const res = await parseComicScript(scriptInput, charNames);
      // Initialize panels status
      const mappedPanels: ScriptPanel[] = res.panels.map((p) => ({
        ...p,
        status: "idle",
      }));
      setParsedScript({
        ...res,
        panels: mappedPanels,
      });
    } catch (err: any) {
      console.error("Parse script error:", err);
      if (err instanceof ApiError && err.isQuotaError) {
        setQuotaInfo({
          seconds: err.retryAfterSeconds || 30,
          message: err.message,
        });
      } else {
        setParseError(err.message || "Gagal menganalisis naskah komik.");
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleGeneratePanelPose = async (panel: ScriptPanel, index: number) => {
    if (!parsedScript) return false;
    setCurrentGeneratingPanel(panel.panelNumber);
    const updatedPanels = [...parsedScript.panels];
    updatedPanels[index] = { ...panel, status: "generating", errorMessage: undefined };
    setParsedScript({ ...parsedScript, panels: updatedPanels });
    setQuotaInfo(null);

    // Identify target character for this panel
    const targetChar = getCharacterForPanel(panel);

    try {
      const res = await generateComicPose({
        referenceImageBase64: targetChar ? targetChar.baseImageData : undefined,
        mimeType: targetChar ? targetChar.mimeType : "image/png",
        script: `[PANEL ${panel.panelNumber}] ${panel.actionDescription}. Dialogue: ${panel.dialogue || ""}`,
        actionPrompt: `${panel.aiPosePrompt}. Art Style: Clean black linework with simple cel shading, not overly painterly. Comic panel framing.`,
        characterName: targetChar?.name || panel.characterName || "Protagonis Komik",
        characterTraits: targetChar?.visualPromptSummary || "Clean linework, cel shaded comic character",
        artStyle: targetChar?.artStyle || "clean-lineart",
        cameraAngle: panel.cameraAngle || "mid-shot",
        actionType: "dynamic-combat",
        expression: panel.expression || "determined",
        aspectRatio: panel.recommendedAspectRatio || "1:1",
        separateLayers: true,
      });

      // Extract transparent character cutout
      const transparentCutoutPng = await createTransparentPngCutout(res.imageUrl);

      // Extract HD background JPEG
      let hdBackgroundJpeg = res.backgroundJpegUrl;
      if (hdBackgroundJpeg) {
        hdBackgroundJpeg = await exportToHighDefJpeg(hdBackgroundJpeg, 0.95);
      }

      // Update panel with image and separated layers
      updatedPanels[index] = {
        ...panel,
        status: "done",
        generatedImageUrl: res.imageUrl,
        generatedCharacterPngUrl: transparentCutoutPng,
        generatedBackgroundJpegUrl: hdBackgroundJpeg,
      };
      setParsedScript({ ...parsedScript, panels: updatedPanels });

      // Save to global pose database
      const poseRecord: GeneratedPose = {
        id: `storyboard-p${panel.panelNumber}-${Date.now()}`,
        characterId: targetChar?.id,
        characterName: targetChar?.name || panel.characterName || "Protagonis",
        title: `Panel ${panel.panelNumber}: ${panel.actionDescription.slice(0, 30)}...`,
        scriptSnippet: panel.actionDescription,
        actionPrompt: panel.aiPosePrompt,
        imageUrl: res.imageUrl,
        characterPngUrl: transparentCutoutPng,
        backgroundJpegUrl: hdBackgroundJpeg,
        hasSeparatedLayers: Boolean(hdBackgroundJpeg),
        referenceImageUrl: targetChar?.baseImageData,
        cameraAngle: panel.cameraAngle,
        actionType: "dynamic-combat",
        expression: panel.expression,
        artStyle: targetChar?.artStyle || "clean-lineart",
        aspectRatio: panel.recommendedAspectRatio || "1:1",
        sfx: panel.soundEffect,
        anatomyNotes: panel.anatomyFocus,
        createdAt: Date.now(),
        panelNumber: panel.panelNumber,
      };
      onSavePose(poseRecord);
      return true;
    } catch (err: any) {
      console.error(`Error generating panel ${panel.panelNumber}:`, err);
      if (err instanceof ApiError && err.isQuotaError) {
        setQuotaInfo({
          seconds: err.retryAfterSeconds || 30,
          message: err.message,
        });
      }
      updatedPanels[index] = {
        ...panel,
        status: "error",
        errorMessage: err.message || "Gagal menghasilkan pose.",
      };
      setParsedScript({ ...parsedScript, panels: updatedPanels });
      return false;
    } finally {
      setCurrentGeneratingPanel(null);
    }
  };

  const handleGenerateAllPanels = async () => {
    if (!parsedScript) return;
    setIsBatchGenerating(true);

    for (let i = 0; i < parsedScript.panels.length; i++) {
      const panel = parsedScript.panels[i];
      if (panel.status !== "done") {
        const success = await handleGeneratePanelPose(panel, i);
        if (!success) {
          // If rate limited, pause the batch so user can wait for cooldown
          break;
        }
        // Polite pacing pause between consecutive AI image requests
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    setIsBatchGenerating(false);
  };

  // Download all storyboard panels and layers in a clean ZIP package
  const handleDownloadStoryboardZip = async () => {
    if (!parsedScript) return;
    const completedPanels = parsedScript.panels.filter((p) => p.generatedImageUrl);
    if (completedPanels.length === 0) {
      setParseError("Belum ada panel pose yang selesai digenerate.");
      return;
    }

    setIsZippingStoryboard(true);
    try {
      const zip = new JSZip();
      const storyboardFolder = zip.folder(`Storyboard_${(parsedScript.title || "Komik").replace(/[^a-zA-Z0-9_-]/g, "_")}`) || zip;

      const sanitizeBase64 = (url: string) => url.replace(/^data:image\/[a-zA-Z0-9-+.]+;base64,/, "");

      for (const p of completedPanels) {
        const panelPrefix = `Panel_${p.panelNumber}`;

        // 1. Transparent PNG Character Cutout
        if (p.generatedCharacterPngUrl) {
          storyboardFolder.file(`${panelPrefix}_Karakter_Transparan.png`, sanitizeBase64(p.generatedCharacterPngUrl), { base64: true });
        } else if (p.generatedImageUrl) {
          const cutout = await createTransparentPngCutout(p.generatedImageUrl);
          storyboardFolder.file(`${panelPrefix}_Karakter_Transparan.png`, sanitizeBase64(cutout), { base64: true });
        }

        // 2. HD Background JPEG
        if (p.generatedBackgroundJpegUrl) {
          storyboardFolder.file(`${panelPrefix}_Latar_Belakang_HD.jpg`, sanitizeBase64(p.generatedBackgroundJpegUrl), { base64: true });
        }

        // 3. Composite Full Panel PNG
        if (p.generatedImageUrl) {
          storyboardFolder.file(`${panelPrefix}_Komposit_Lengkap.png`, sanitizeBase64(p.generatedImageUrl), { base64: true });
        }
      }

      // Script document
      let scriptSummary = `=== STORYBOARD NASKAH KOMIK ===\nJudul: ${parsedScript.title || "Storyboard"}\nRingkasan: ${parsedScript.summary || "-"}\n\n`;
      parsedScript.panels.forEach((p) => {
        scriptSummary += `[PANEL ${p.panelNumber}] - ${p.characterName}\nAksi: ${p.actionDescription}\nKamera: ${p.cameraAngle} | Ekspresi: ${p.expression}\nDialog: ${p.dialogue || "-"}\nSFX: ${p.soundEffect || "-"}\n\n`;
      });
      storyboardFolder.file("naskah_storyboard.txt", scriptSummary);

      const blob = await zip.generateAsync({ type: "blob" });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `Storyboard_${(parsedScript.title || "Komik").replace(/\s+/g, "_")}_Semua_Layer.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("ZIP Storyboard error:", err);
    } finally {
      setIsZippingStoryboard(false);
    }
  };

  return (
    <div className="space-y-6 text-zinc-100 animate-fade-in">
      {/* Header Info */}
      <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-rose-500" />
            Naskah Komik ke Storyboard Pose AI & Pemisahan Layer
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            AI membedah setiap adegan menjadi susunan panel pose anatomis, dan otomatis mengekstrak <strong>Karakter PNG Transparan</strong> & <strong>Background HD JPEG</strong>.
          </p>
        </div>

        {/* Character selector for scene */}
        <div className="flex items-center space-x-3 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
          <div className="text-xs text-zinc-400 font-medium">Karakter Utama:</div>
          <select
            value={activeChar?.id || ""}
            onChange={(e) => {
              const c = characters.find((char) => char.id === e.target.value);
              if (c) onSelectCharacter(c);
            }}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-rose-500 font-semibold"
          >
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Left Script Input & Right Storyboard Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Script Editor & Preset Selector (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-rose-500" />
                Input Naskah / Skrip Adegan
              </label>

              {/* Presets dropdown */}
              <select
                onChange={(e) => {
                  const val = e.target.value;
                  const found = SAMPLE_COMIC_SCRIPTS.find((s) => s.title === val);
                  if (found) setScriptInput(found.script);
                }}
                className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-[11px] text-zinc-300 focus:outline-none"
              >
                <option value="">Contoh Naskah...</option>
                {SAMPLE_COMIC_SCRIPTS.map((s) => (
                  <option key={s.title} value={s.title}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              rows={12}
              value={scriptInput}
              onChange={(e) => setScriptInput(e.target.value)}
              placeholder="Tuliskan naskah panel per panel di sini..."
              className="w-full p-3.5 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 leading-relaxed font-mono resize-y"
            />

            {/* Quota Countdown Notice */}
            {quotaInfo && (
              <QuotaCountdownAlert
                initialSeconds={quotaInfo.seconds}
                message={quotaInfo.message}
                onRetry={handleParseScript}
                onDismiss={() => setQuotaInfo(null)}
              />
            )}

            {/* In-app error notice */}
            {parseError && (
              <div className="p-3 bg-red-950/40 border border-red-800 rounded-xl text-red-300 text-xs flex items-start space-x-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Parse Script Action Button */}
            <button
              onClick={handleParseScript}
              disabled={isParsing || !scriptInput.trim()}
              className="w-full py-3 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-rose-950/40 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {isParsing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI Sutradara Sedang Membedah Panel & Anatomi...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>BEDAH PANEL & KOREOGRAFI POSE (AI DIRECTOR)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Parsed Panels & Storyboard Visualizer (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {parsedScript ? (
            <div className="space-y-4 animate-fade-in">
              {/* Header Action Bar */}
              <div className="bg-zinc-900/90 border border-zinc-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {parsedScript.title || "Storyboard Naskah"} ({parsedScript.panels.length} Panel)
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{parsedScript.summary}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* View Mode Toggle */}
                  <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                    <button
                      onClick={() => setViewMode("list")}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                        viewMode === "list"
                          ? "bg-rose-600 text-white shadow"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      Detail List
                    </button>
                    <button
                      onClick={() => setViewMode("grid-page")}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                        viewMode === "grid-page"
                          ? "bg-rose-600 text-white shadow"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      Halaman Komik (Grid)
                    </button>
                  </div>

                  <button
                    onClick={handleGenerateAllPanels}
                    disabled={isBatchGenerating}
                    className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/40 transition-colors disabled:opacity-50"
                  >
                    {isBatchGenerating ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-white" />
                    )}
                    <span>{isBatchGenerating ? "Mengerjakan..." : "Generate Semua Panel"}</span>
                  </button>

                  <button
                    onClick={handleDownloadStoryboardZip}
                    disabled={isZippingStoryboard}
                    className="flex items-center space-x-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                    title="Unduh semua panel dan layer terpisah dalam format ZIP"
                  >
                    {isZippingStoryboard ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Package className="w-3.5 h-3.5" />
                    )}
                    <span>Unduh Storyboard ZIP</span>
                  </button>
                </div>
              </div>

              {/* View 1: 9-Panel Comic Page Grid */}
              {viewMode === "grid-page" ? (
                <div className="bg-zinc-950 border-2 border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-2xl">
                  {/* Comic Header / Title Banner */}
                  <div className="text-center pb-4 mb-4 border-b-2 border-zinc-800">
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-amber-400 font-serif">
                      {parsedScript.title || "It Could Always Be Worse"}
                    </h2>
                    <p className="text-xs text-zinc-400 italic mt-1 font-sans">
                      Jewish Folk Tale • Clean Linework & Cel Shaded Comic Page Layout
                    </p>
                  </div>

                  {/* 3x3 Grid or Adaptive Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {parsedScript.panels.map((panel, idx) => {
                      const panelChar = getCharacterForPanel(panel);
                      return (
                        <div
                          key={panel.panelNumber}
                          className="bg-zinc-900 border-2 border-zinc-700 rounded-xl overflow-hidden flex flex-col justify-between shadow-lg relative group transition-all hover:border-amber-500/80"
                        >
                          {/* Top Header Tag */}
                          <div className="bg-zinc-950 px-3 py-1.5 border-b border-zinc-800 flex items-center justify-between">
                            <span className="text-[11px] font-black text-rose-400 font-mono">
                              PANEL #{panel.panelNumber}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-medium truncate max-w-[140px]">
                              {panelChar?.name || panel.characterName}
                            </span>
                          </div>

                          {/* Image Display Area */}
                          <div className="w-full aspect-square bg-zinc-950 flex items-center justify-center relative overflow-hidden">
                            {panel.status === "generating" ? (
                              <div className="flex flex-col items-center space-y-2 p-4 text-center">
                                <RefreshCw className="w-8 h-8 text-rose-500 animate-spin" />
                                <span className="text-[11px] text-zinc-300 font-medium">
                                  Menggambar Panel {panel.panelNumber}...
                                </span>
                              </div>
                            ) : panel.generatedImageUrl ? (
                              <img
                                src={panel.generatedCharacterPngUrl || panel.generatedImageUrl}
                                alt={`Panel ${panel.panelNumber}`}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                                {panelChar?.baseImageData ? (
                                  <img
                                    src={panelChar.baseImageData}
                                    alt="Sketch preview"
                                    className="w-24 h-24 object-contain opacity-40 rounded"
                                  />
                                ) : (
                                  <Camera className="w-8 h-8 text-zinc-700" />
                                )}
                                <span className="text-[11px] text-zinc-400 font-semibold">
                                  {panel.actionDescription.slice(0, 50)}...
                                </span>
                                <button
                                  onClick={() => handleGeneratePanelPose(panel, idx)}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded-lg shadow"
                                >
                                  Generate Panel
                                </button>
                              </div>
                            )}

                            {/* SFX Decal Overlay */}
                            {panel.soundEffect && (
                              <div className="absolute top-2 right-2 px-2 py-0.5 bg-amber-400 text-black text-[10px] font-black italic rounded transform rotate-3 shadow-md border border-amber-600">
                                {panel.soundEffect}
                              </div>
                            )}

                            {/* Dialogue Bubble at Bottom */}
                            {panel.dialogue && (
                              <div className="absolute bottom-2 left-2 right-2 bg-white/95 text-zinc-950 p-2 rounded-xl text-[11px] font-semibold leading-tight shadow-md border border-zinc-400">
                                <span className="text-zinc-600 font-bold block text-[9px] uppercase">
                                  {panel.characterName || "Dialogue"}
                                </span>
                                "{panel.dialogue}"
                              </div>
                            )}
                          </div>

                          {/* Footer Controls */}
                          <div className="bg-zinc-950 p-2 border-t border-zinc-800 flex items-center justify-between text-[11px]">
                            <div className="flex items-center space-x-1">
                              {panel.generatedCharacterPngUrl && (
                                <button
                                  onClick={() =>
                                    downloadImage(
                                      panel.generatedCharacterPngUrl!,
                                      `Panel-${panel.panelNumber}-Karakter-Transparan.png`
                                    )
                                  }
                                  className="px-1.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded text-[10px] font-bold"
                                  title="Unduh PNG Transparan"
                                >
                                  PNG
                                </button>
                              )}
                              {panel.generatedBackgroundJpegUrl && (
                                <button
                                  onClick={() =>
                                    downloadImage(
                                      panel.generatedBackgroundJpegUrl!,
                                      `Panel-${panel.panelNumber}-Latar-HD.jpg`
                                    )
                                  }
                                  className="px-1.5 py-0.5 bg-sky-950 text-sky-300 border border-sky-800 rounded text-[10px] font-bold"
                                  title="Unduh Latar HD JPEG"
                                >
                                  HD Latar
                                </button>
                              )}
                            </div>

                            <button
                              onClick={() => handleGeneratePanelPose(panel, idx)}
                              disabled={panel.status === "generating"}
                              className="text-rose-400 hover:text-rose-300 font-bold text-[10px] flex items-center gap-1"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>{panel.generatedImageUrl ? "Re-Gen" : "Generate"}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* View 2: Panels List */
                <div className="space-y-4">
                  {parsedScript.panels.map((panel, idx) => (
                  <div
                    key={panel.panelNumber}
                    className={`bg-zinc-900/90 border rounded-2xl p-4 flex flex-col md:flex-row gap-4 transition-all ${
                      panel.status === "generating"
                        ? "border-rose-500 ring-1 ring-rose-500"
                        : panel.status === "done"
                        ? "border-zinc-700"
                        : "border-zinc-800"
                    }`}
                  >
                    {/* Left: Render Box */}
                    <div className="w-full md:w-48 h-48 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex items-center justify-center relative flex-shrink-0">
                      {panel.status === "generating" ? (
                        <div className="flex flex-col items-center space-y-2 p-3 text-center">
                          <RefreshCw className="w-6 h-6 text-rose-500 animate-spin" />
                          <span className="text-[10px] text-zinc-300 font-medium">
                            Menggambar Pose Panel {panel.panelNumber}...
                          </span>
                        </div>
                      ) : panel.generatedImageUrl ? (
                        <img
                          src={panel.generatedCharacterPngUrl || panel.generatedImageUrl}
                          alt={`Panel ${panel.panelNumber}`}
                          referrerPolicy="no-referrer"
                          className="max-h-full max-w-full object-contain rounded"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center text-zinc-500 space-y-1">
                          <Camera className="w-6 h-6 opacity-30" />
                          <span className="text-[10px]">Panel {panel.panelNumber} Ready</span>
                        </div>
                      )}

                      {/* Badge Panel Number */}
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 text-rose-400 text-[10px] font-bold rounded font-mono border border-zinc-800">
                        P{panel.panelNumber}
                      </div>

                      {panel.soundEffect && (
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[9px] font-black font-mono rounded border border-amber-500/30">
                          SFX: {panel.soundEffect}
                        </div>
                      )}
                    </div>

                    {/* Right: Panel Director Breakdown Details */}
                    <div className="flex-1 flex flex-col justify-between space-y-3 text-xs">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm">
                            Panel {panel.panelNumber}: {panel.characterName}
                          </span>
                          <div className="flex items-center space-x-1.5">
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-mono capitalize">
                              📷 {panel.cameraAngle.replace("-", " ")}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-rose-950/50 text-rose-300 border border-rose-800 text-[10px] font-mono">
                              🎭 {panel.expression}
                            </span>
                          </div>
                        </div>

                        <p className="text-zinc-300 leading-relaxed">{panel.actionDescription}</p>

                        {panel.dialogue && (
                          <div className="p-2 bg-zinc-950/80 rounded-lg border border-zinc-800/80 text-zinc-400 italic text-[11px]">
                            💬 "{panel.dialogue}"
                          </div>
                        )}

                        {panel.anatomyFocus && (
                          <div className="text-[11px] text-amber-400/90 font-medium">
                            ⚡ Fokus Anatomi: {panel.anatomyFocus}
                          </div>
                        )}
                      </div>

                      {/* Panel Action Buttons */}
                      <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[10px] text-zinc-500 font-mono">
                          Rasio: {panel.recommendedAspectRatio || "1:1"}
                        </span>

                        <div className="flex items-center space-x-2">
                          {panel.generatedImageUrl && (
                            <>
                              <button
                                onClick={() => {
                                  const charUrl = panel.generatedCharacterPngUrl || panel.generatedImageUrl!;
                                  downloadImage(charUrl, `Panel-${panel.panelNumber}-Karakter-Transparan.png`);
                                }}
                                className="px-2 py-1 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 rounded-lg text-xs transition-colors flex items-center gap-1 font-medium"
                                title="Unduh Karakter PNG Transparan"
                              >
                                <User className="w-3 h-3" />
                                <span>PNG</span>
                              </button>

                              {panel.generatedBackgroundJpegUrl && (
                                <button
                                  onClick={() => {
                                    downloadImage(panel.generatedBackgroundJpegUrl!, `Panel-${panel.panelNumber}-Latar-HD.jpg`);
                                  }}
                                  className="px-2 py-1 bg-sky-900/60 hover:bg-sky-800 text-sky-300 rounded-lg text-xs transition-colors flex items-center gap-1 font-medium"
                                  title="Unduh Background HD JPEG"
                                >
                                  <Trees className="w-3 h-3" />
                                  <span>Latar HD</span>
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  const poseRecord: GeneratedPose = {
                                    id: `storyboard-${panel.panelNumber}`,
                                    characterName: panel.characterName,
                                    title: `Panel ${panel.panelNumber}`,
                                    scriptSnippet: panel.actionDescription,
                                    actionPrompt: panel.aiPosePrompt,
                                    imageUrl: panel.generatedImageUrl!,
                                    characterPngUrl: panel.generatedCharacterPngUrl,
                                    backgroundJpegUrl: panel.generatedBackgroundJpegUrl,
                                    hasSeparatedLayers: Boolean(panel.generatedBackgroundJpegUrl),
                                    cameraAngle: panel.cameraAngle,
                                    actionType: "dynamic-combat",
                                    expression: panel.expression,
                                    artStyle: activeChar?.artStyle || "manga-screentone",
                                    aspectRatio: panel.recommendedAspectRatio || "1:1",
                                    createdAt: Date.now(),
                                  };
                                  onOpenComparison(poseRecord);
                                }}
                                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs transition-colors"
                              >
                                Komparasi
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleGeneratePanelPose(panel, idx)}
                            disabled={panel.status === "generating"}
                            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
                          >
                            {panel.status === "generating" ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                            <span>
                              {panel.generatedImageUrl ? "Generate Ulang" : "Generate Pose Panel"}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
            <div className="h-full min-h-[380px] bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col items-center justify-center p-8 text-center text-zinc-500 space-y-2">
              <FileText className="w-12 h-12 opacity-30" />
              <div className="text-sm font-semibold text-zinc-300">Belum ada naskah yang dibedah</div>
              <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
                Tuliskan naskah komik di sebelah kiri lalu tekan tombol <strong>Bedah Panel & Koreografi Pose</strong> untuk menghasilkan susunan storyboard otomatis dengan layer terpisah.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
