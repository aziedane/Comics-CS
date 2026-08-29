import React, { useState } from "react";
import {
  Sparkles,
  Upload,
  Camera,
  Layers,
  Wand2,
  Sliders,
  Maximize2,
  Grid,
  Download,
  Copy,
  Bookmark,
  BookmarkCheck,
  RefreshCw,
  Eye,
  Activity,
  ArrowRight,
  SplitSquareVertical,
  Check,
  Info,
  Package,
  Image as ImageIcon,
  User,
  Trees,
  FileDown,
} from "lucide-react";
import {
  ActionCategory,
  CameraAngle,
  CharacterEmotion,
  ComicArtStyle,
  ComicCharacter,
  GeneratedPose,
  PanelAspectRatio,
  PromptEnhanceResult,
} from "../types";
import { ApiError, enhancePromptWithAnatomy, generateComicPose, generateHdBackground } from "../services/api";
import { QuotaCountdownAlert } from "./QuotaCountdownAlert";
import {
  createTransparentPngCutout,
  exportToHighDefJpeg,
  downloadImage,
  downloadPosePackageZip,
} from "../utils/imageUtils";

interface PoseGeneratorProps {
  characters: ComicCharacter[];
  selectedCharacter: ComicCharacter | null;
  onSelectCharacter: (char: ComicCharacter | null) => void;
  onSaveGeneratedPose: (pose: GeneratedPose) => void;
  onOpenComparison: (pose: GeneratedPose) => void;
}

export const PoseGenerator: React.FC<PoseGeneratorProps> = ({
  characters,
  selectedCharacter,
  onSelectCharacter,
  onSaveGeneratedPose,
  onOpenComparison,
}) => {
  // Custom image input if not selecting a saved character
  const [customImage, setCustomImage] = useState<string>("");
  const [customMimeType, setCustomMimeType] = useState<string>("image/png");

  // Script & Pose Prompt Inputs
  const [comicScript, setComicScript] = useState<string>(
    "Panel 3: Karakter melompat dari gedung tinggi sambil menarik pedang di udara, sudut kamera Low-Angle dramatis dengan speed lines tajam."
  );
  const [actionPrompt, setActionPrompt] = useState<string>(
    "Dynamic aerial sword draw pose, diving down from high rooftop, katana blade unsheathing with circular speed lines, coat fluttering violently, intense downward battle glare."
  );

  // Configuration controls
  const [artStyle, setArtStyle] = useState<ComicArtStyle>("manga-screentone");
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>("extreme-low-angle");
  const [actionType, setActionType] = useState<ActionCategory>("dynamic-combat");
  const [expression, setExpression] = useState<CharacterEmotion>("determined");
  const [aspectRatio, setAspectRatio] = useState<PanelAspectRatio>("1:1");
  const [anatomyGuideOverlay, setAnatomyGuideOverlay] = useState<boolean>(false);
  const [separateLayers, setSeparateLayers] = useState<boolean>(true);

  // Status & output
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [isGeneratingBg, setIsGeneratingBg] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [currentPose, setCurrentPose] = useState<GeneratedPose | null>(null);
  const [activeLayerTab, setActiveLayerTab] = useState<"composite" | "character" | "background">("composite");
  const [cutoutTolerance, setCutoutTolerance] = useState<number>(38);
  const [enhanceDetails, setEnhanceDetails] = useState<PromptEnhanceResult | null>(null);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [contrastFilter, setContrastFilter] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [successNotice, setSuccessNotice] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [quotaInfo, setQuotaInfo] = useState<{
    seconds: number;
    message: string;
  } | null>(null);

  // Determine active reference image
  const activeReferenceImage = selectedCharacter ? selectedCharacter.baseImageData : customImage;
  const activeMimeType = selectedCharacter ? (selectedCharacter.mimeType || "image/png") : customMimeType;

  // Handle custom upload
  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCustomImage(reader.result as string);
      setCustomMimeType(file.type || "image/png");
      onSelectCharacter(null); // Deselect preset character
    };
    reader.readAsDataURL(file);
  };

  // AI Prompt Enhancement
  const handleEnhancePrompt = async () => {
    if (!actionPrompt && !comicScript) return;
    setIsEnhancing(true);
    setErrorMessage("");
    setQuotaInfo(null);
    try {
      const res = await enhancePromptWithAnatomy(actionPrompt || comicScript, artStyle, cameraAngle);
      if (res && res.enhancedPrompt) {
        setActionPrompt(res.enhancedPrompt);
        setEnhanceDetails(res);
      }
    } catch (err: any) {
      console.error("Enhance failed:", err);
      if (err instanceof ApiError && err.isQuotaError) {
        setQuotaInfo({
          seconds: err.retryAfterSeconds || 30,
          message: err.message,
        });
      } else {
        setErrorMessage(err.message || "Gagal mengoptimalkan prompt.");
      }
    } finally {
      setIsEnhancing(false);
    }
  };

  // Generate Pose with optional Layer Separation (Character PNG + HD JPEG Background)
  const handleGenerate = async () => {
    if (!actionPrompt && !comicScript) {
      setErrorMessage("Mohon isi deskripsi naskah atau aksi pose.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage("");
    setQuotaInfo(null);
    setIsSaved(false);

    try {
      const result = await generateComicPose({
        referenceImageBase64: activeReferenceImage,
        mimeType: activeMimeType,
        script: comicScript,
        actionPrompt: actionPrompt,
        characterName: selectedCharacter ? selectedCharacter.name : "Comic Protagonist",
        characterTraits: selectedCharacter ? selectedCharacter.visualPromptSummary : "",
        artStyle: artStyle,
        cameraAngle: cameraAngle,
        actionType: actionType,
        expression: expression,
        aspectRatio: aspectRatio,
        anatomyGuideOverlay: anatomyGuideOverlay,
        separateLayers: separateLayers,
      });

      // Process transparent PNG cutout for character
      const transparentCutoutPng = await createTransparentPngCutout(result.imageUrl, cutoutTolerance);

      // Ensure high quality JPEG for background if available
      let hdBackgroundJpeg = result.backgroundJpegUrl;
      if (hdBackgroundJpeg) {
        hdBackgroundJpeg = await exportToHighDefJpeg(hdBackgroundJpeg, 0.95);
      }

      const newGeneratedPose: GeneratedPose = {
        id: `pose-${Date.now()}`,
        characterId: selectedCharacter ? selectedCharacter.id : undefined,
        characterName: selectedCharacter ? selectedCharacter.name : "Karakter Komik",
        title: `${actionType.replace("-", " ")} (${cameraAngle})`,
        scriptSnippet: comicScript,
        actionPrompt: actionPrompt,
        imageUrl: result.imageUrl,
        characterPngUrl: transparentCutoutPng,
        backgroundJpegUrl: hdBackgroundJpeg,
        hasSeparatedLayers: Boolean(hdBackgroundJpeg),
        referenceImageUrl: activeReferenceImage,
        cameraAngle: cameraAngle,
        actionType: actionType,
        expression: expression,
        artStyle: artStyle,
        aspectRatio: aspectRatio,
        notes: result.notes,
        anatomyNotes: enhanceDetails?.anatomyNotes,
        sfx: enhanceDetails?.sfxSuggestions?.[0],
        actionPacing: enhanceDetails?.actionPacing,
        createdAt: Date.now(),
      };

      setCurrentPose(newGeneratedPose);
      onSaveGeneratedPose(newGeneratedPose);
      setIsSaved(true);
      setActiveLayerTab("composite");
    } catch (err: any) {
      console.error("Generate error:", err);
      if (err instanceof ApiError && err.isQuotaError) {
        setQuotaInfo({
          seconds: err.retryAfterSeconds || 30,
          message: err.message,
        });
      } else {
        setErrorMessage(err.message || "Gagal menghasilkan pose karakter. Silakan coba kembali.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate HD Background layer for current pose if missing
  const handleGenerateBackgroundForCurrentPose = async () => {
    if (!currentPose) return;
    setIsGeneratingBg(true);
    setErrorMessage("");
    try {
      const res = await generateHdBackground({
        script: currentPose.scriptSnippet || currentPose.actionPrompt,
        artStyle: currentPose.artStyle,
        cameraAngle: currentPose.cameraAngle,
        aspectRatio: currentPose.aspectRatio,
      });

      const hdJpeg = await exportToHighDefJpeg(res.backgroundJpegUrl, 0.95);
      const updated: GeneratedPose = {
        ...currentPose,
        backgroundJpegUrl: hdJpeg,
        hasSeparatedLayers: true,
      };

      setCurrentPose(updated);
      onSaveGeneratedPose(updated);
      setActiveLayerTab("background");
      setSuccessNotice("Latar belakang HD berhasil digenerate & dipisahkan!");
      setTimeout(() => setSuccessNotice(""), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal membuat background HD.");
    } finally {
      setIsGeneratingBg(false);
    }
  };

  // Live recalculate transparent cutout when tolerance changes
  const handleRecalculateCutout = async (newTolerance: number) => {
    setCutoutTolerance(newTolerance);
    if (!currentPose) return;
    const newCutout = await createTransparentPngCutout(currentPose.imageUrl, newTolerance);
    const updated = { ...currentPose, characterPngUrl: newCutout };
    setCurrentPose(updated);
    onSaveGeneratedPose(updated);
  };

  const handleCopyPromptText = () => {
    navigator.clipboard.writeText(actionPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Download Handlers
  const handleDownloadComposite = () => {
    if (!currentPose) return;
    downloadImage(currentPose.imageUrl, `${currentPose.characterName.replace(/\s+/g, "_")}-Komposit-${currentPose.id.slice(0, 6)}.png`);
  };

  const handleDownloadCharacterPng = () => {
    if (!currentPose) return;
    const url = currentPose.characterPngUrl || currentPose.imageUrl;
    downloadImage(url, `${currentPose.characterName.replace(/\s+/g, "_")}-Karakter-Transparan.png`);
  };

  const handleDownloadBackgroundJpeg = () => {
    if (!currentPose || !currentPose.backgroundJpegUrl) return;
    downloadImage(currentPose.backgroundJpegUrl, `${currentPose.characterName.replace(/\s+/g, "_")}-Latar-Belakang-HD.jpg`);
  };

  const handleDownloadFullZip = async () => {
    if (!currentPose) return;
    setIsZipping(true);
    try {
      await downloadPosePackageZip(currentPose);
      setSuccessNotice("Paket ZIP (Karakter PNG + Background HD JPEG + Komposit) berhasil diunduh!");
      setTimeout(() => setSuccessNotice(""), 4000);
    } catch (err) {
      console.error("ZIP Error:", err);
    } finally {
      setIsZipping(false);
    }
  };

  const handleUseAsNewReference = () => {
    if (!currentPose) return;
    // Prefer clean character PNG as reference to avoid background pollution in next poses!
    const targetRef = currentPose.characterPngUrl || currentPose.imageUrl;
    setCustomImage(targetRef);
    onSelectCharacter(null);
    setSuccessNotice("Karakter hasil sekarang dijadikan gambar acuan baru! Latar belakang bersih siap untuk rangkaian adegan berikutnya.");
    setTimeout(() => setSuccessNotice(""), 4000);
  };

  return (
    <div className="space-y-6 text-zinc-100 animate-fade-in">
      {successNotice && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button onClick={() => setSuccessNotice("")} className="text-emerald-400 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* Main Studio Grid: Left (Reference & Script) & Right (Output & Canvas) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Reference Selection & Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Reference Image Selector */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-rose-500" />
                1. Gambar Referensi Karakter (Acuan Wajah, Kostum & Proporsi)
              </label>
              {selectedCharacter && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                  {selectedCharacter.name}
                </span>
              )}
            </div>

            {/* Character Selector Horizontal Strip */}
            <div className="space-y-2">
              <div className="text-xs text-zinc-400">Pilih dari Database Karakter:</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-36 overflow-y-auto pr-1">
                {characters.map((char) => {
                  const isSelected = selectedCharacter?.id === char.id;
                  return (
                    <button
                      key={char.id}
                      onClick={() => {
                        onSelectCharacter(char);
                        setCustomImage("");
                      }}
                      className={`flex flex-col items-center p-2 rounded-xl border text-center transition-all ${
                        isSelected
                          ? "bg-rose-950/40 border-rose-500 ring-1 ring-rose-500"
                          : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <div className="w-12 h-12 rounded-lg bg-zinc-900 overflow-hidden flex items-center justify-center mb-1.5 border border-zinc-800">
                        {char.baseImageData ? (
                          <img
                            src={char.baseImageData}
                            alt={char.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Camera className="w-5 h-5 text-zinc-600" />
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-zinc-200 truncate w-full">
                        {char.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Or Upload Custom Image */}
            <div className="pt-2 border-t border-zinc-800/80">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                <span>Atau Unggah Sketsa / Gambar Karakter Sendiri:</span>
                {customImage && (
                  <button
                    onClick={() => setCustomImage("")}
                    className="text-[10px] text-rose-400 hover:underline"
                  >
                    Hapus Custom Image
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <label className="flex-1 cursor-pointer flex items-center justify-center space-x-2 py-3 px-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-950/50 hover:bg-zinc-950 hover:border-rose-500 transition-colors text-xs text-zinc-300">
                  <Upload className="w-4 h-4 text-rose-500" />
                  <span>{customImage ? "Ganti Gambar Unggahan" : "Unggah Gambar / Sketsa (PNG/JPG)"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCustomUpload}
                    className="hidden"
                  />
                </label>

                {customImage && (
                  <div className="w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-700 overflow-hidden flex-shrink-0">
                    <img
                      src={customImage}
                      alt="Custom Reference"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Script Input & Pose Choreography */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-amber-500" />
                2. Naskah Komik & Koreografi Gerakan Pose
              </label>

              <button
                onClick={handleEnhancePrompt}
                disabled={isEnhancing || (!actionPrompt && !comicScript)}
                className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all disabled:opacity-50"
              >
                {isEnhancing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{isEnhancing ? "Mengoptimalkan..." : "Optimalisasi AI (Anatomi & SFX)"}</span>
              </button>
            </div>

            {/* Comic Script Input */}
            <div>
              <span className="block text-xs font-semibold text-zinc-300 mb-1">
                Konteks Naskah Panel Komik (Scene Script):
              </span>
              <textarea
                rows={2}
                value={comicScript}
                onChange={(e) => setComicScript(e.target.value)}
                placeholder="Contoh: Panel 2: Ryuji berbalik menahan tebasan musuh dengan sarung pedangnya, wajah penuh konsentrasi."
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 leading-relaxed"
              />
            </div>

            {/* Detailed AI Pose Prompt */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-zinc-300">Deskripsi Detail Pose & Anatomi (Prompt):</span>
                <button
                  onClick={handleCopyPromptText}
                  className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1"
                >
                  {copiedPrompt ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedPrompt ? "Tersalin!" : "Salin Prompt"}</span>
                </button>
              </div>
              <textarea
                rows={3}
                value={actionPrompt}
                onChange={(e) => setActionPrompt(e.target.value)}
                placeholder="Deskripsi pose aksi, garis gerakan, gesture tangan, dan sudut pandang..."
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-rose-500 leading-relaxed"
              />
            </div>

            {/* AI Enhanced Anatomy Notes Box */}
            {enhanceDetails && (
              <div className="bg-amber-950/20 border border-amber-500/30 p-3.5 rounded-xl text-xs space-y-1.5 animate-fade-in">
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5" /> Catatan Koreografi Anatomi AI:
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  {enhanceDetails.anatomyNotes}
                </p>
                {enhanceDetails.sfxSuggestions && enhanceDetails.sfxSuggestions.length > 0 && (
                  <div className="flex items-center gap-2 pt-1 text-[11px]">
                    <span className="text-zinc-400">Saran SFX:</span>
                    <span className="font-bold text-rose-400 font-mono">
                      {enhanceDetails.sfxSuggestions.join(" • ")}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Fine-Tuning Selectors Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 text-xs">
              {/* Camera Angle */}
              <div>
                <label className="block text-zinc-400 font-medium mb-1">Sudut Kamera</label>
                <select
                  value={cameraAngle}
                  onChange={(e) => setCameraAngle(e.target.value as CameraAngle)}
                  className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white focus:border-rose-500 focus:outline-none"
                >
                  <option value="extreme-low-angle">Worm's Eye (Low Angle)</option>
                  <option value="high-angle-bird">Bird's Eye (High Angle)</option>
                  <option value="dutch-angle">Dutch Tilt (Miring 30°)</option>
                  <option value="over-the-shoulder">Over The Shoulder</option>
                  <option value="close-up-dramatic">Dramatic Close-Up</option>
                  <option value="full-body-dynamic">Full Body Dynamic</option>
                  <option value="mid-shot">Medium Torso Shot</option>
                  <option value="eye-level">Eye Level (Sejajar Mata)</option>
                </select>
              </div>

              {/* Action Category */}
              <div>
                <label className="block text-zinc-400 font-medium mb-1">Kategori Gerakan</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as ActionCategory)}
                  className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white focus:border-rose-500 focus:outline-none"
                >
                  <option value="dynamic-combat">Pertarungan / Serangan</option>
                  <option value="defensive-guard">Bertahan / Tangkisan</option>
                  <option value="acrobatic-jump">Lompatan Akrobatik</option>
                  <option value="sprint-run">Lari / Menerjang Cepat</option>
                  <option value="sword-draw">Hunus Pedang (Iaijutsu)</option>
                  <option value="spellcasting-aura">Sihir / Aura Energi</option>
                  <option value="stealth-crouch">Mengendap / Jongkok</option>
                  <option value="dramatic-turnaround">Menoleh Dramatis</option>
                  <option value="emotional-breakdown">Jatuh / Putus Asa</option>
                  <option value="casual-standing">Berdiri Santai</option>
                </select>
              </div>

              {/* Expression */}
              <div>
                <label className="block text-zinc-400 font-medium mb-1">Ekspresi & Emosi</label>
                <select
                  value={expression}
                  onChange={(e) => setExpression(e.target.value as CharacterEmotion)}
                  className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white focus:border-rose-500 focus:outline-none"
                >
                  <option value="determined">Membara / Determinasi</option>
                  <option value="intense-rage">Amarah Menggebu</option>
                  <option value="shock-gasp">Syok / Terperangah</option>
                  <option value="smug-confident">Seringai Percaya Diri</option>
                  <option value="despair-crying">Tangis Keputusasaan</option>
                  <option value="gentle-smile">Senyum Lembut</option>
                  <option value="exhausted-panting">Kelelahan Terengah</option>
                  <option value="sinister-grin">Seringai Licik</option>
                  <option value="neutral-focused">Tenang Fokus</option>
                </select>
              </div>

              {/* Art Style */}
              <div>
                <label className="block text-zinc-400 font-medium mb-1">Gaya Tinta / Seni</label>
                <select
                  value={artStyle}
                  onChange={(e) => setArtStyle(e.target.value as ComicArtStyle)}
                  className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white focus:border-rose-500 focus:outline-none"
                >
                  <option value="manga-screentone">Manga B&W Screentone</option>
                  <option value="clean-lineart">Clean Lineart (Sketsa)</option>
                  <option value="webtoon-color">Webtoon Full Color</option>
                  <option value="seinen-noir">Seinen Noir Kontras</option>
                  <option value="american-comic">American Comic Book</option>
                  <option value="chibi-comic">Chibi / SD Gag</option>
                </select>
              </div>

              {/* Panel Aspect Ratio */}
              <div>
                <label className="block text-zinc-400 font-medium mb-1">Rasio Panel Komik</label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as PanelAspectRatio)}
                  className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white focus:border-rose-500 focus:outline-none"
                >
                  <option value="1:1">1:1 (Square Panel)</option>
                  <option value="9:16">9:16 (Vertical Webtoon)</option>
                  <option value="16:9">16:9 (Cinematic Spread)</option>
                  <option value="3:4">3:4 (Tall Panel)</option>
                  <option value="4:3">4:3 (Wide Manga Panel)</option>
                </select>
              </div>

              {/* Anatomy Guide Toggle */}
              <div>
                <label className="block text-zinc-400 font-medium mb-1">Fitur Tambahan</label>
                <label className="flex items-center space-x-2 cursor-pointer bg-zinc-950 border border-zinc-700 px-3 py-2 rounded-lg hover:border-zinc-500 transition-colors">
                  <input
                    type="checkbox"
                    checked={anatomyGuideOverlay}
                    onChange={(e) => setAnatomyGuideOverlay(e.target.checked)}
                    className="accent-rose-500"
                  />
                  <span className="text-zinc-300 text-[11px] font-medium">Garis Panduan Anatomi</span>
                </label>
              </div>
            </div>

            {/* Layer Separation Toggle Banner */}
            <div className="p-3.5 bg-zinc-950/90 border border-rose-500/30 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>Pisahkan Karakter (PNG Transparan) & Latar Belakang (JPEG HD)</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 rounded">HD Export</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Otomatis mengekstrak karakter PNG tanpa background dan latar belakang JPEG kualitas tinggi tanpa pecah.
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={separateLayers}
                onChange={(e) => setSeparateLayers(e.target.checked)}
                className="w-4 h-4 accent-rose-500 cursor-pointer"
              />
            </div>

            {/* Quota Countdown Notice */}
            {quotaInfo && (
              <QuotaCountdownAlert
                initialSeconds={quotaInfo.seconds}
                message={quotaInfo.message}
                onRetry={handleGenerate}
                onDismiss={() => setQuotaInfo(null)}
              />
            )}

            {/* Error banner */}
            {errorMessage && (
              <div className="p-3 bg-red-950/40 border border-red-800 rounded-xl text-red-300 text-xs flex items-start space-x-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Big Generate Action Button */}
            <button
              id="generate-pose-btn"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3.5 bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl font-bold text-sm shadow-xl shadow-rose-950/50 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>AI Sedang Menggambar Pose & Memisahkan Layer...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>GENERATE POSE KARAKTER & LAPISAN HD</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Output Pose & Comic Workbench (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 flex flex-col h-full space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Eye className="w-4 h-4 text-rose-500" />
                Workbench Output & Layer Studio
              </label>

              {currentPose && (
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => setShowGrid(!showGrid)}
                    className={`p-1.5 rounded-lg border text-xs transition-colors ${
                      showGrid ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-zinc-800 text-zinc-400 border-zinc-700"
                    }`}
                    title="Grid Proporsi Komik"
                  >
                    <Grid className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setContrastFilter(!contrastFilter)}
                    className={`p-1.5 rounded-lg border text-xs transition-colors ${
                      contrastFilter ? "bg-rose-500/20 text-rose-300 border-rose-500/40" : "bg-zinc-800 text-zinc-400 border-zinc-700"
                    }`}
                    title="Mode Tinta Kontras Tinggi (Manga Inking)"
                  >
                    <Activity className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onOpenComparison(currentPose)}
                    className="flex items-center space-x-1 px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium border border-zinc-700"
                    title="Bandingkan Gambar Acuan vs Pose Baru"
                  >
                    <SplitSquareVertical className="w-3.5 h-3.5 text-rose-400" />
                    <span>Komparasi</span>
                  </button>
                </div>
              )}
            </div>

            {/* Layer Selection Tab Bar */}
            {currentPose && (
              <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
                <button
                  onClick={() => setActiveLayerTab("composite")}
                  className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-lg font-medium transition-all ${
                    activeLayerTab === "composite"
                      ? "bg-rose-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Komposit</span>
                </button>

                <button
                  onClick={() => setActiveLayerTab("character")}
                  className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-lg font-medium transition-all ${
                    activeLayerTab === "character"
                      ? "bg-rose-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Karakter (PNG)</span>
                </button>

                <button
                  onClick={() => setActiveLayerTab("background")}
                  className={`flex-1 flex items-center justify-center space-x-1.5 py-1.5 rounded-lg font-medium transition-all ${
                    activeLayerTab === "background"
                      ? "bg-rose-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Trees className="w-3.5 h-3.5" />
                  <span>Latar HD (JPEG)</span>
                </button>
              </div>
            )}

            {/* Image Canvas Display */}
            <div className={`flex-1 min-h-[380px] border border-zinc-800 rounded-xl overflow-hidden flex items-center justify-center p-3 relative group ${
              activeLayerTab === "character"
                ? "bg-zinc-950 [background-image:linear-gradient(45deg,#1f1f23_25%,transparent_25%),linear-gradient(-45deg,#1f1f23_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1f1f23_75%),linear-gradient(-45deg,transparent_75%,#1f1f23_75%)] [background-size:16px_16px] [background-position:0_0,0_8px,8px_-8px,-8px_0px]"
                : "bg-zinc-950"
            }`}>
              {/* Grid overlay */}
              {showGrid && (
                <div className="absolute inset-0 pointer-events-none z-20 grid grid-cols-6 grid-rows-6 opacity-30 border border-amber-500/30">
                  {Array.from({ length: 36 }).map((_, i) => (
                    <div key={i} className="border-r border-b border-amber-500/20" />
                  ))}
                </div>
              )}

              {/* Layer status indicator overlay */}
              {currentPose && (
                <div className="absolute top-2.5 left-2.5 z-10">
                  {activeLayerTab === "composite" && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-black/80 text-zinc-300 border border-zinc-700 backdrop-blur-sm">
                      Lapisan Komposit (Full View)
                    </span>
                  )}
                  {activeLayerTab === "character" && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-950/90 text-emerald-300 border border-emerald-700/60 backdrop-blur-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      PNG Transparan (Tanpa Background)
                    </span>
                  )}
                  {activeLayerTab === "background" && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-sky-950/90 text-sky-300 border border-sky-700/60 backdrop-blur-sm">
                      Latar Belakang HD (JPEG Kualitas Tinggi)
                    </span>
                  )}
                </div>
              )}

              {isGenerating ? (
                <div className="flex flex-col items-center justify-center space-y-3 p-6 text-center">
                  <div className="w-12 h-12 rounded-full border-4 border-rose-500/20 border-t-rose-500 animate-spin" />
                  <div className="text-sm font-bold text-zinc-200">Merender Pose & Memisahkan Layer...</div>
                  <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                    AI sedang mengekstrak karakter PNG transparan dan menghasilkan latar belakang HD tanpa kompresi buram.
                  </p>
                </div>
              ) : currentPose ? (
                <>
                  {activeLayerTab === "composite" && (
                    <img
                      src={currentPose.imageUrl}
                      alt={currentPose.title}
                      referrerPolicy="no-referrer"
                      className={`max-h-full max-w-full object-contain rounded-lg shadow-2xl transition-all ${
                        contrastFilter ? "contrast-150 grayscale" : ""
                      }`}
                    />
                  )}

                  {activeLayerTab === "character" && (
                    <img
                      src={currentPose.characterPngUrl || currentPose.imageUrl}
                      alt={`${currentPose.title} - Karakter Transparan`}
                      referrerPolicy="no-referrer"
                      className={`max-h-full max-w-full object-contain drop-shadow-2xl transition-all ${
                        contrastFilter ? "contrast-150 grayscale" : ""
                      }`}
                    />
                  )}

                  {activeLayerTab === "background" && (
                    currentPose.backgroundJpegUrl ? (
                      <img
                        src={currentPose.backgroundJpegUrl}
                        alt={`${currentPose.title} - Latar Belakang HD`}
                        referrerPolicy="no-referrer"
                        className={`max-h-full max-w-full object-contain rounded-lg shadow-2xl transition-all ${
                          contrastFilter ? "contrast-150 grayscale" : ""
                        }`}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-3 p-6 text-center text-zinc-400">
                        <Trees className="w-10 h-10 text-zinc-600" />
                        <div className="text-xs font-semibold text-zinc-300">
                          Latar Belakang HD Belum Digenerate
                        </div>
                        <p className="text-[11px] text-zinc-500 max-w-xs">
                          Buat latar belakang pemandangan resolusi tinggi yang cocok dengan naskah adegan ini.
                        </p>
                        <button
                          onClick={handleGenerateBackgroundForCurrentPose}
                          disabled={isGeneratingBg}
                          className="flex items-center space-x-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
                        >
                          {isGeneratingBg ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                          <span>{isGeneratingBg ? "Merender Latar HD..." : "Hasilkan Latar Belakang HD Sekarang"}</span>
                        </button>
                      </div>
                    )
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2 p-6 text-center text-zinc-500">
                  <Camera className="w-10 h-10 opacity-30" />
                  <div className="text-xs font-semibold text-zinc-400">Belum ada pose yang digenerate</div>
                  <p className="text-[11px] text-zinc-500 max-w-xs leading-relaxed">
                    Pilih karakter di sebelah kiri, masukkan naskah adegan, lalu klik <strong>Generate Pose Karakter & Lapisan HD</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Cutout Fine-Tuning Slider (Only visible in Character Cutout tab) */}
            {currentPose && activeLayerTab === "character" && (
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2 animate-fade-in text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300 font-semibold flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-rose-400" />
                    Sensitivitas Potongan Alpha (Transparansi):
                  </span>
                  <span className="font-mono text-rose-400 font-bold">{cutoutTolerance}</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="80"
                  value={cutoutTolerance}
                  onChange={(e) => handleRecalculateCutout(parseInt(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>Presisi Garis Halus (15)</span>
                  <span>Standar (38)</span>
                  <span>Hapus Latar Tebal (80)</span>
                </div>
              </div>
            )}

            {/* Generated Pose Info & Quick Layer Actions */}
            {currentPose && (
              <div className="space-y-3 pt-1">
                <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white truncate">{currentPose.characterName}</span>
                    <span className="px-2 py-0.5 text-[10px] rounded bg-rose-950/50 text-rose-300 border border-rose-800 font-mono">
                      {currentPose.aspectRatio} • {currentPose.artStyle}
                    </span>
                  </div>
                  <div className="text-zinc-400 text-[11px] line-clamp-2">
                    <span className="text-rose-400 font-semibold">Naskah: </span>
                    {currentPose.scriptSnippet}
                  </div>
                </div>

                {/* Individual & Package Download Grid */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Download Character PNG */}
                    <button
                      onClick={handleDownloadCharacterPng}
                      className="flex items-center justify-center space-x-1.5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
                      title="Unduh Karakter Format PNG Transparan Tanpa Background"
                    >
                      <User className="w-4 h-4 text-emerald-200" />
                      <span>Unduh Karakter (PNG)</span>
                    </button>

                    {/* Download Background HD JPEG */}
                    {currentPose.backgroundJpegUrl ? (
                      <button
                        onClick={handleDownloadBackgroundJpeg}
                        className="flex items-center justify-center space-x-1.5 py-2.5 bg-sky-700 hover:bg-sky-600 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
                        title="Unduh Latar Belakang Kualitas HD JPEG"
                      >
                        <Trees className="w-4 h-4 text-sky-200" />
                        <span>Unduh Latar HD (JPG)</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleGenerateBackgroundForCurrentPose}
                        disabled={isGeneratingBg}
                        className="flex items-center justify-center space-x-1.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium border border-zinc-700 transition-colors"
                        title="Buat Latar Belakang HD"
                      >
                        <Trees className="w-4 h-4 text-zinc-400" />
                        <span>{isGeneratingBg ? "Membuat HD..." : "+ Buat Latar HD"}</span>
                      </button>
                    )}
                  </div>

                  {/* Complete ZIP Package Download */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleDownloadFullZip}
                      disabled={isZipping}
                      className="flex items-center justify-center space-x-1.5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                      title="Unduh Paket Lengkap (ZIP: Karakter PNG + Latar HD JPEG + Komposit + Metadata)"
                    >
                      {isZipping ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                      <span>{isZipping ? "Mengompres..." : "Paket Lengkap (.ZIP)"}</span>
                    </button>

                    <button
                      onClick={handleUseAsNewReference}
                      className="flex items-center justify-center space-x-1.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold transition-colors"
                      title="Gunakan karakter bersih ini sebagai acuan gerakan panel selanjutnya"
                    >
                      <ArrowRight className="w-4 h-4 text-rose-400" />
                      <span>Karakter Jadi Acuan Baru</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
