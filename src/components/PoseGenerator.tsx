import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
  Upload,
  Camera,
  Wand2,
  Sliders,
  Maximize2,
  Grid,
  Download,
  Copy,
  RefreshCw,
  Eye,
  Activity,
  ArrowRight,
  SplitSquareVertical,
  Check,
  Info,
  User,
  Trees,
  PenTool,
  Smile,
  Zap,
  X,
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
import { ApiError, enhancePromptWithAnatomy, generateComicPose } from "../services/api";
import { QuotaCountdownAlert } from "./QuotaCountdownAlert";
import { createTransparentPngCutout, downloadImage } from "../utils/imageUtils";

interface PoseGeneratorProps {
  characters: ComicCharacter[];
  selectedCharacter: ComicCharacter | null;
  onSelectCharacter: (char: ComicCharacter | null) => void;
  onSaveGeneratedPose: (pose: GeneratedPose) => void;
  onOpenComparison: (pose: GeneratedPose) => void;
  onOpenInBackgroundStudio?: (pose: GeneratedPose) => void;
}

const STORAGE_KEY_ACTIVE_POSE = "mangapose_active_pose_v2";
const STORAGE_KEY_STUDIO_INPUTS = "mangapose_studio_inputs_v2";

export const PoseGenerator: React.FC<PoseGeneratorProps> = ({
  characters,
  selectedCharacter,
  onSelectCharacter,
  onSaveGeneratedPose,
  onOpenComparison,
  onOpenInBackgroundStudio,
}) => {
  // Restore cached inputs if available
  const savedInputs = useMemo(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_STUDIO_INPUTS);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return null;
  }, []);

  // Custom image input if not selecting a saved character
  const [customImage, setCustomImage] = useState<string>("" );
  const [customMimeType, setCustomMimeType] = useState<string>("image/png");

  // Script & Pose Prompt Inputs
  const [comicScript, setComicScript] = useState<string>(
    savedInputs?.comicScript ||
      "Panel 3: Karakter melompat dari gedung tinggi sambil menarik pedang di udara, sudut kamera Low-Angle dramatis dengan speed lines tajam."
  );
  const [actionPrompt, setActionPrompt] = useState<string>(
    savedInputs?.actionPrompt ||
      "Dynamic aerial sword draw pose, diving down from high rooftop, katana blade unsheathing with circular speed lines, coat fluttering violently, intense downward battle glare."
  );

  // Configuration controls
  const [artStyle, setArtStyle] = useState<ComicArtStyle>(savedInputs?.artStyle || "manga-screentone");
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>(savedInputs?.cameraAngle || "extreme-low-angle");
  const [actionType, setActionType] = useState<ActionCategory>(savedInputs?.actionType || "dynamic-combat");
  const [customActionText, setCustomActionText] = useState<string>(savedInputs?.customActionText || "");
  const [expression, setExpression] = useState<CharacterEmotion>(savedInputs?.expression || "determined");
  const [customExpressionText, setCustomExpressionText] = useState<string>(savedInputs?.customExpressionText || "");
  const [customFeatures, setCustomFeatures] = useState<string>(savedInputs?.customFeatures || "");
  const [aspectRatio, setAspectRatio] = useState<PanelAspectRatio>(savedInputs?.aspectRatio || "1:1");
  const [anatomyGuideOverlay] = useState<boolean>(false);

  // Canvas backdrop mode for preview: 'transparent' (outside line transparent), 'dark', or 'white'
  const [canvasBgMode, setCanvasBgMode] = useState<"transparent" | "dark" | "white">("transparent");

  // Status & output
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [currentPose, setCurrentPose] = useState<GeneratedPose | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_POSE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.imageUrl) return parsed;
      }
    } catch (e) {}
    return null;
  });
  const [enhanceDetails, setEnhanceDetails] = useState<PromptEnhanceResult | null>(null);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [contrastFilter, setContrastFilter] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [successNotice, setSuccessNotice] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [quotaInfo, setQuotaInfo] = useState<{
    seconds: number;
    message: string;
  } | null>(null);

  // Save inputs to localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_STUDIO_INPUTS,
        JSON.stringify({
          comicScript,
          actionPrompt,
          artStyle,
          cameraAngle,
          actionType,
          customActionText,
          expression,
          customExpressionText,
          customFeatures,
          aspectRatio,
        })
      );
    } catch (e) {}
  }, [
    comicScript,
    actionPrompt,
    artStyle,
    cameraAngle,
    actionType,
    customActionText,
    expression,
    customExpressionText,
    customFeatures,
    aspectRatio,
  ]);

  // Save active pose to localStorage
  useEffect(() => {
    try {
      if (currentPose) {
        localStorage.setItem(STORAGE_KEY_ACTIVE_POSE, JSON.stringify(currentPose));
      }
    } catch (e) {}
  }, [currentPose]);

  // Ensure characterPngUrl is ready if loaded from previous session
  useEffect(() => {
    if (
      currentPose &&
      currentPose.imageUrl &&
      (!currentPose.characterPngUrl || currentPose.characterPngUrl === currentPose.imageUrl)
    ) {
      createTransparentPngCutout(currentPose.imageUrl, 32)
        .then((cutout) => {
          if (cutout && cutout !== currentPose.imageUrl) {
            setCurrentPose((prev) =>
              prev ? { ...prev, characterPngUrl: cutout, hasSeparatedLayers: true } : null
            );
          }
        })
        .catch(() => {});
    }
  }, [currentPose?.imageUrl]);

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

  // Generate Character Pose (100% Solid, Non-Transparent)
  const handleGenerate = async () => {
    if (!actionPrompt && !comicScript) {
      setErrorMessage("Mohon isi deskripsi naskah atau aksi pose.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage("");
    setQuotaInfo(null);

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
        customActionType: actionType === "custom" ? customActionText : undefined,
        expression: expression,
        customExpression: expression === "custom" ? customExpressionText : undefined,
        customFeatures: customFeatures.trim() ? customFeatures.trim() : undefined,
        aspectRatio: aspectRatio,
        anatomyGuideOverlay: anatomyGuideOverlay,
        separateLayers: false,
      });

      const displayActionTitle =
        actionType === "custom" && customActionText.trim()
          ? customActionText.trim()
          : actionType.replace("-", " ");

      const newGeneratedPose: GeneratedPose = {
        id: `pose-${Date.now()}`,
        characterId: selectedCharacter ? selectedCharacter.id : undefined,
        characterName: selectedCharacter ? selectedCharacter.name : "Karakter Komik",
        title: `${displayActionTitle} (${cameraAngle})`,
        scriptSnippet: comicScript,
        actionPrompt: actionPrompt,
        imageUrl: result.imageUrl,
        characterPngUrl: result.imageUrl,
        hasSeparatedLayers: false,
        referenceImageUrl: activeReferenceImage,
        cameraAngle: cameraAngle,
        actionType: actionType,
        customActionType: actionType === "custom" ? customActionText : undefined,
        expression: expression,
        customExpression: expression === "custom" ? customExpressionText : undefined,
        customFeatures: customFeatures.trim() ? customFeatures.trim() : undefined,
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
      setSuccessNotice("Pose karakter solid berhasil digenerate!");
      setTimeout(() => setSuccessNotice(""), 3500);

      // Generate clean transparent background cutout in background
      try {
        const cutoutPng = await createTransparentPngCutout(result.imageUrl, 32);
        if (cutoutPng && cutoutPng !== result.imageUrl) {
          const updatedPose: GeneratedPose = {
            ...newGeneratedPose,
            characterPngUrl: cutoutPng,
            hasSeparatedLayers: true,
          };
          setCurrentPose(updatedPose);
          onSaveGeneratedPose(updatedPose);
        }
      } catch (err) {
        console.warn("Cutout background extraction notice:", err);
      }
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

  const handleCopyPromptText = () => {
    navigator.clipboard.writeText(actionPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Download Character Cutout (Transparent Background outside character line)
  const handleDownloadTransparentCutout = () => {
    if (!currentPose) return;
    const cleanName = currentPose.characterName.replace(/[^a-zA-Z0-9_-]/g, "_");
    downloadImage(
      currentPose.characterPngUrl || currentPose.imageUrl,
      `${cleanName}-Character-Transparent-${currentPose.id.slice(-6)}.png`
    );
  };

  // Download Solid Full Canvas Pose
  const handleDownloadSolidPose = () => {
    if (!currentPose) return;
    const cleanName = currentPose.characterName.replace(/[^a-zA-Z0-9_-]/g, "_");
    downloadImage(
      currentPose.imageUrl,
      `${cleanName}-Pose-Solid-${currentPose.id.slice(-6)}.png`
    );
  };

  const handleUseAsNewReference = () => {
    if (!currentPose) return;
    setCustomImage(currentPose.imageUrl);
    setCustomMimeType("image/png");
    onSelectCharacter(null);
    setSuccessNotice("Pose ini dijadikan sebagai acuan visual baru untuk gerakan selanjutnya!");
    setTimeout(() => setSuccessNotice(""), 3500);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/80 border border-zinc-800 p-5 rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded">
              Pose Karakter Studio
            </span>
            <h1 className="text-xl font-black tracking-tight text-white">
              Studio Pose Karakter Komik
            </h1>
          </div>
          <p className="text-xs text-zinc-400 max-w-2xl">
            Hasilkan variasi pose dinamis, anatomi solid, dan perspektif kamera sinematik sesuai karakter acuan di database tanpa distorsi transparansi.
          </p>
        </div>

        {/* Quick Stats / Active Character badge */}
        <div className="flex items-center space-x-3 text-xs">
          {selectedCharacter ? (
            <div className="flex items-center space-x-2 bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-800">
              <img
                src={selectedCharacter.baseImageData}
                alt={selectedCharacter.name}
                className="w-8 h-8 rounded-lg object-cover border border-zinc-700"
              />
              <div className="text-left">
                <div className="text-zinc-200 font-bold leading-none">{selectedCharacter.name}</div>
                <div className="text-[10px] text-zinc-400 capitalize">{selectedCharacter.role}</div>
              </div>
            </div>
          ) : customImage ? (
            <div className="flex items-center space-x-2 bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-800">
              <img
                src={customImage}
                alt="Custom Upload"
                className="w-8 h-8 rounded-lg object-cover border border-zinc-700"
              />
              <div className="text-left">
                <div className="text-zinc-200 font-bold leading-none">Karakter Kustom</div>
                <div className="text-[10px] text-emerald-400">File Unggahan Sendiri</div>
              </div>
            </div>
          ) : (
            <div className="text-zinc-500 text-xs italic bg-zinc-950/50 px-3 py-2 rounded-xl border border-zinc-800">
              Pilih karakter acuan di bawah
            </div>
          )}
        </div>
      </div>

      {successNotice && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-700 rounded-xl text-emerald-200 text-xs flex items-center space-x-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Character Reference Selector */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-rose-500" />
                1. Pilih Karakter Acuan (Reference)
              </label>
              <span className="text-[11px] text-zinc-400">
                {characters.length} Karakter Tersedia
              </span>
            </div>

            {/* Horizontal Scroll of Preset Characters */}
            <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-thin">
              {characters.map((char) => {
                const isSelected = selectedCharacter?.id === char.id;
                return (
                  <button
                    key={char.id}
                    onClick={() => {
                      onSelectCharacter(char);
                      setCustomImage("");
                    }}
                    className={`flex-shrink-0 flex flex-col items-center p-2 rounded-xl border transition-all text-center group ${
                      isSelected
                        ? "bg-rose-950/60 border-rose-500 ring-2 ring-rose-500/40"
                        : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                    }`}
                    style={{ width: "96px" }}
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-zinc-700 mb-1.5 relative">
                      <img
                        src={char.baseImageData}
                        alt={char.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-rose-500/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-white drop-shadow-md" />
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-zinc-200 truncate w-full">
                      {char.name}
                    </span>
                    <span className="text-[9px] text-zinc-500 capitalize truncate w-full">
                      {char.artStyle}
                    </span>
                  </button>
                );
              })}

              {/* Upload Custom Character Button */}
              <label className="flex-shrink-0 flex flex-col items-center justify-center p-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-950/50 hover:bg-zinc-800/40 hover:border-zinc-500 cursor-pointer transition-all text-center w-24">
                <Upload className="w-5 h-5 text-zinc-400 mb-1" />
                <span className="text-[10px] font-medium text-zinc-300">Upload Kustom</span>
                <span className="text-[8px] text-zinc-500">PNG / JPG</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCustomUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Script & Pose Prompt Section */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <PenTool className="w-4 h-4 text-rose-500" />
                2. Naskah Panel & Aksi Gerakan (Script to Pose)
              </label>
              <button
                type="button"
                onClick={handleEnhancePrompt}
                disabled={isEnhancing || (!actionPrompt && !comicScript)}
                className="flex items-center space-x-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
              >
                {isEnhancing ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Wand2 className="w-3 h-3" />
                )}
                <span>{isEnhancing ? "Mengoptimalkan..." : "AI Enhance Anatomi"}</span>
              </button>
            </div>

            {/* Script input */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-zinc-400 font-medium">
                Konteks Naskah Komik / Cerita:
              </label>
              <textarea
                value={comicScript}
                onChange={(e) => setComicScript(e.target.value)}
                placeholder="Contoh: Panel 2: Raden meloncat menghindar dari sambaran pedang lawan, melayang di udara sambil membalikkan badan..."
                rows={2}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 resize-none leading-relaxed"
              />
            </div>

            {/* Action Prompt input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] text-zinc-300 font-semibold flex items-center gap-1.5">
                  <span>Deskripsi Pose & Gerakan Tubuh (Action Prompt):</span>
                </label>
                <button
                  type="button"
                  onClick={handleCopyPromptText}
                  className="text-[10px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                >
                  {copiedPrompt ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedPrompt ? "Tersalin" : "Salin"}</span>
                </button>
              </div>
              <textarea
                value={actionPrompt}
                onChange={(e) => setActionPrompt(e.target.value)}
                placeholder="Deskripsikan pose spesifik, gestur tangan, arah kepala, ketegangan otot, dan sudut pandang..."
                rows={3}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 resize-none leading-relaxed font-mono"
              />
            </div>

            {/* Anatomy Guidelines notice if enhanced */}
            {enhanceDetails && (
              <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-xs space-y-1 animate-fade-in">
                <div className="font-bold text-amber-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Catatan Anatomi & Dinamika Panel (AI Enhanced):</span>
                </div>
                {enhanceDetails.anatomyNotes && (
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    <strong>Anatomi:</strong> {enhanceDetails.anatomyNotes}
                  </p>
                )}
                {enhanceDetails.sfxSuggestions && enhanceDetails.sfxSuggestions.length > 0 && (
                  <p className="text-[11px] text-zinc-400">
                    <strong>Efek Suara (SFX):</strong> {enhanceDetails.sfxSuggestions.join(", ")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Configuration Matrix (Category, Angle, Expression, Style, Aspect Ratio) */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-rose-500" />
              3. Parameter Pose & Sinematografi Panel
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Action Category */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-rose-400" />
                  Kategori Gerakan:
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as ActionCategory)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="dynamic-combat">Pertarungan Dinamis (Action / Combat)</option>
                  <option value="aerial-leap">Melompat / Di Udara (Aerial Leap)</option>
                  <option value="martial-arts">Silat / Seni Bela Diri (Martial Arts)</option>
                  <option value="running-sprint">Lari Kencang (Sprint / Dash)</option>
                  <option value="stealth-crouch">Mengendap-endap / Jongkok (Stealth)</option>
                  <option value="dramatic-stand">Berdiri Karismatik / Menantang (Stance)</option>
                  <option value="weapon-draw">Menghunus Senjata (Weapon Draw)</option>
                  <option value="casting-spell">Merapal Mantra / Kekuatan (Magic / Aura)</option>
                  <option value="injured-falling">Terlempar / Terluka (Falling / Hit)</option>
                  <option value="emotional-reaction">Reaksi Emosional (Emotional Drama)</option>
                  <option value="custom">Kustom (Tulis Sendiri)...</option>
                </select>
                {actionType === "custom" && (
                  <input
                    type="text"
                    value={customActionText}
                    onChange={(e) => setCustomActionText(e.target.value)}
                    placeholder="Contoh: Tendangan sabit berputar 360 derajat..."
                    className="w-full mt-1.5 px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                  />
                )}
              </div>

              {/* Camera Angle & Perspective */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-rose-400" />
                  Sudut Kamera & Perspektif:
                </label>
                <select
                  value={cameraAngle}
                  onChange={(e) => setCameraAngle(e.target.value as CameraAngle)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 font-medium"
                >
                  <option value="extreme-low-angle">Extreme Low-Angle (Katak / Bawah Dramatis)</option>
                  <option value="worm-eye-view">Worm's Eye View (Perspektif Tanah / 3-Titik)</option>
                  <option value="birds-eye-view">Bird's Eye View (Dari Atas Menukik)</option>
                  <option value="dutch-tilt">Dutch Tilt (Miring Dinamis / Tegang)</option>
                  <option value="dynamic-foreshortening">Foreshortening Ekstrim (Tangan/Kaki Menusuk Kamera)</option>
                  <option value="close-up">Close-Up (Wajah & Ekspresi Tajam)</option>
                  <option value="over-the-shoulder">Over-the-Shoulder (Sudut Balik Bahu)</option>
                  <option value="eye-level">Eye-Level (Sejajar Mata Standar)</option>
                  <option value="wide-shot">Full Body Wide Shot (Pose Tubuh Penuh)</option>
                </select>
              </div>

              {/* Facial Expression & Emotion */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                  <Smile className="w-3.5 h-3.5 text-rose-400" />
                  Ekspresi Wajah:
                </label>
                <select
                  value={expression}
                  onChange={(e) => setExpression(e.target.value as CharacterEmotion)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="determined">Tekad Baja / Fokus (Determined)</option>
                  <option value="furious-shout">Teriakan Amarah / Bertarung (Furious Shout)</option>
                  <option value="smug-confident">Percaya Diri / Tersenyum Miring (Smug)</option>
                  <option value="shocked-intense">Kaget / Mata Membelalak (Shocked)</option>
                  <option value="calm-cold">Dingin / Tenang Menusuk (Cold Calm)</option>
                  <option value="exhausted-panting">Kelelahan / Nafas Terengah (Exhausted)</option>
                  <option value="maniacal-laugh">Tawa Gila / Psikopat (Maniacal)</option>
                  <option value="crying-sorrow">Menangis / Duka Mendalam (Grief)</option>
                  <option value="custom">Kustom (Tulis Sendiri)...</option>
                </select>
                {expression === "custom" && (
                  <input
                    type="text"
                    value={customExpressionText}
                    onChange={(e) => setCustomExpressionText(e.target.value)}
                    placeholder="Contoh: Menggigit bibir bawah dengan peluh dingin..."
                    className="w-full mt-1.5 px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                  />
                )}
              </div>

              {/* Art Style */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                  <PenTool className="w-3.5 h-3.5 text-rose-400" />
                  Gaya Gambar (Art Style):
                </label>
                <select
                  value={artStyle}
                  onChange={(e) => setArtStyle(e.target.value as ComicArtStyle)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="manga-screentone">Manga Klasik Shonen (Hitam Putih Screentone)</option>
                  <option value="webtoon-color">Webtoon Korea Modern (Full Color & Shading Halus)</option>
                  <option value="indonesian-nusantara">Komik Nusantara / Silat Indonesia</option>
                  <option value="american-hero">American Superhero Ink (Dynamic Shadow & Heavy Crosshatch)</option>
                  <option value="seinen-rough">Seinen / Dark Fantasy (Arsir Tinta Kasar & Detail)</option>
                  <option value="chibi-cute">Chibi / SD (Super Deformed Lucu)</option>
                </select>
              </div>
            </div>

            {/* Aspect Ratio Selector */}
            <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
              <label className="text-xs text-zinc-300 font-semibold flex items-center gap-1">
                <Maximize2 className="w-3.5 h-3.5 text-rose-400" />
                Rasio Panel:
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { label: "1:1", desc: "Persegi" },
                  { label: "3:4", desc: "Vertikal" },
                  { label: "4:3", desc: "Horizontal" },
                  { label: "9:16", desc: "Webtoon" },
                  { label: "16:9", desc: "Sinematik" },
                ].map((ratio) => (
                  <button
                    key={ratio.label}
                    type="button"
                    onClick={() => setAspectRatio(ratio.label as PanelAspectRatio)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center ${
                      aspectRatio === ratio.label
                        ? "bg-rose-950/80 border-rose-500 text-rose-200 shadow-sm"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <span>{ratio.label}</span>
                    <span className="text-[9px] font-normal text-zinc-500">{ratio.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Features & Visual Effects */}
            <div className="space-y-2 pt-2 border-t border-zinc-800/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Fitur Tambahan & Efek Visual Karakter (Custom Text):</span>
                </label>
                {customFeatures && (
                  <button
                    type="button"
                    onClick={() => setCustomFeatures("")}
                    className="text-[10px] text-zinc-400 hover:text-rose-400 flex items-center gap-0.5"
                  >
                    <X className="w-3 h-3" /> Bersihkan
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={customFeatures}
                  onChange={(e) => setCustomFeatures(e.target.value)}
                  placeholder="Ketik efek visual (misal: Aura petir emas membara, bayangan chiaroscuro kontras, jubah berkibar kencang...)"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 leading-relaxed font-medium"
                />
              </div>

              {/* Quick Tags for Additional Features */}
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-400">Pilihan Cepat Tag Efek:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "⚡ Aura Listrik / Petir",
                    "🔥 Api Membara",
                    "💨 Speedlines Melingkar",
                    "🌑 Chiaroscuro Hitam Pekat",
                    "✨ Partikel Kilauan",
                    "🗡️ Slash Trail Pedang",
                    "💥 Gelombang Kejut",
                    "🩸 Goresan Tempur",
                    "🍂 Daun & Debu Berputar",
                  ].map((tag) => {
                    const isSelected = customFeatures.toLowerCase().includes(tag.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, "").trim().slice(0, 10));
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          const cleanTag = tag.trim();
                          setCustomFeatures((prev) => {
                            if (!prev.trim()) return cleanTag;
                            if (prev.includes(cleanTag)) {
                              return prev
                                .split(",")
                                .map((s) => s.trim())
                                .filter((s) => s && s !== cleanTag)
                                .join(", ");
                            }
                            return `${prev.trim()}, ${cleanTag}`;
                          });
                        }}
                        className={`text-[10px] px-2 py-1 rounded-md border transition-all flex items-center gap-1 ${
                          isSelected
                            ? "bg-rose-950/80 border-rose-500 text-rose-200 font-semibold"
                            : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                        }`}
                      >
                        <span>{tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
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
              className="w-full py-4 bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl font-black text-sm tracking-wide shadow-xl shadow-rose-950/50 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>AI Sedang Menggambar Pose Karakter Solid...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>GENERATE POSE KARAKTER</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Output Pose & Character Workbench (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 flex flex-col h-full space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Eye className="w-4 h-4 text-rose-500" />
                Preview Pose Karakter
              </label>

              {currentPose && (
                <div className="flex items-center space-x-1.5">
                  {/* Canvas Backdrop switch */}
                  <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 text-[10px]">
                    <button
                      onClick={() => setCanvasBgMode("transparent")}
                      className={`px-2 py-1 rounded font-medium transition-all ${
                        canvasBgMode === "transparent"
                          ? "bg-emerald-600 text-white font-bold shadow-sm"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                      title="Latar Transparan (Hanya Karakter yang Terlihat)"
                    >
                      Transparan
                    </button>
                    <button
                      onClick={() => setCanvasBgMode("dark")}
                      className={`px-2 py-1 rounded font-medium transition-all ${
                        canvasBgMode === "dark"
                          ? "bg-zinc-800 text-white font-bold"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                      title="Latar Gelap Studio Solid"
                    >
                      Gelap
                    </button>
                    <button
                      onClick={() => setCanvasBgMode("white")}
                      className={`px-2 py-1 rounded font-medium transition-all ${
                        canvasBgMode === "white"
                          ? "bg-zinc-800 text-white font-bold"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                      title="Latar Putih Kanvas Solid"
                    >
                      Putih
                    </button>
                  </div>

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

            {/* Image Canvas Display */}
            <div className={`flex-1 min-h-[380px] border border-zinc-800 rounded-xl overflow-hidden flex items-center justify-center p-3 relative group transition-colors ${
              canvasBgMode === "transparent"
                ? "bg-[#18181b] bg-[linear-gradient(45deg,#27272a_25%,transparent_25%),linear-gradient(-45deg,#27272a_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#27272a_75%),linear-gradient(-45deg,transparent_75%,#27272a_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0px]"
                : canvasBgMode === "white"
                ? "bg-white"
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

              {/* Status indicator overlay */}
              {currentPose && (
                <div className="absolute top-2.5 left-2.5 z-10">
                  {canvasBgMode === "transparent" ? (
                    <span className="px-2.5 py-1 text-[10px] font-bold rounded bg-zinc-900/90 text-emerald-300 border border-emerald-500/40 backdrop-blur-sm flex items-center gap-1.5 shadow-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Transparan di Luar Line Karakter
                    </span>
                  ) : canvasBgMode === "white" ? (
                    <span className="px-2.5 py-1 text-[10px] font-bold rounded bg-zinc-900/90 text-zinc-300 border border-zinc-600/50 backdrop-blur-sm flex items-center gap-1.5 shadow-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      Kanvas Putih Bersih
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 text-[10px] font-bold rounded bg-zinc-900/90 text-rose-300 border border-rose-500/40 backdrop-blur-sm flex items-center gap-1.5 shadow-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      Studio Gelap Solid
                    </span>
                  )}
                </div>
              )}

              {isGenerating ? (
                <div className="flex flex-col items-center justify-center space-y-3 p-6 text-center">
                  <div className="w-12 h-12 rounded-full border-4 border-rose-500/20 border-t-rose-500 animate-spin" />
                  <div className="text-sm font-bold text-zinc-200">Merender Pose Karakter...</div>
                  <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                    AI sedang menggambar pose karakter anatomi dengan kerapatan warna solid dan transparansi luar yang bersih.
                  </p>
                </div>
              ) : currentPose ? (
                <img
                  src={
                    canvasBgMode === "transparent"
                      ? (currentPose.characterPngUrl || currentPose.imageUrl)
                      : currentPose.imageUrl
                  }
                  alt={`${currentPose.title} - Pose Karakter`}
                  referrerPolicy="no-referrer"
                  className={`max-h-full max-w-full object-contain drop-shadow-[0_16px_24px_rgba(0,0,0,0.6)] transition-all ${
                    contrastFilter ? "contrast-150 grayscale" : ""
                  }`}
                />
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2 p-6 text-center text-zinc-500">
                  <Camera className="w-10 h-10 opacity-30" />
                  <div className="text-xs font-semibold text-zinc-400">Belum ada pose yang digenerate</div>
                  <p className="text-[11px] text-zinc-500 max-w-xs leading-relaxed">
                    Pilih karakter di sebelah kiri, masukkan naskah adegan, lalu klik <strong>GENERATE POSE KARAKTER</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Generated Pose Info & Direct Actions */}
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

                {/* Primary Action Buttons */}
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Download Transparent Character Cutout */}
                    <button
                      onClick={handleDownloadTransparentCutout}
                      className="flex items-center justify-center space-x-1.5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                      title="Unduh Hanya Karakter dengan Latar Transparan (PNG Alpha Cutout)"
                    >
                      <Download className="w-4 h-4 text-emerald-200" />
                      <span>Unduh Transparan (PNG)</span>
                    </button>

                    {/* Download Solid Full Image */}
                    <button
                      onClick={handleDownloadSolidPose}
                      className="flex items-center justify-center space-x-1.5 py-3 bg-rose-700 hover:bg-rose-600 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                      title="Unduh Pose Utuh Format Solid Kanvas Penuh"
                    >
                      <Download className="w-4 h-4 text-rose-200" />
                      <span>Unduh Solid (PNG)</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {/* Open in Studio Latar */}
                    {onOpenInBackgroundStudio ? (
                      <button
                        onClick={() => onOpenInBackgroundStudio(currentPose)}
                        className="flex items-center justify-center space-x-1.5 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-all"
                        title="Buka pose karakter ini di Studio Latar Belakang khusus untuk memasangkan latar lingkungan HD"
                      >
                        <Trees className="w-4 h-4 text-sky-200" />
                        <span>Pasang Latar Lingkungan di Studio Latar</span>
                      </button>
                    ) : null}

                    {/* Secondary Utility Button */}
                    <button
                      onClick={handleUseAsNewReference}
                      className="w-full flex items-center justify-center space-x-1.5 py-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium border border-zinc-700 transition-colors"
                      title="Jadikan pose karakter ini sebagai gambar acuan untuk panel selanjutnya"
                    >
                      <ArrowRight className="w-4 h-4 text-rose-400" />
                      <span>Jadikan Karakter Acuan Baru (Panel Selanjutnya)</span>
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
