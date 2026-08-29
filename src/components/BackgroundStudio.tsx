import React, { useState } from "react";
import {
  Image as ImageIcon,
  Sparkles,
  Layers,
  Download,
  Eye,
  Camera,
  Sun,
  Palette,
  Ratio,
  Maximize2,
  RefreshCw,
  FolderDown,
  Compass,
  CheckCircle2,
  AlertTriangle,
  Move,
  FlipHorizontal,
  ChevronRight,
  Shield,
  Sliders,
  Users,
  Check,
  Zap,
} from "lucide-react";
import {
  ComicArtStyle,
  CameraAngle,
  PanelAspectRatio,
  ComicCharacter,
  GeneratedPose,
  GeneratedBackground,
} from "../types";
import { generateHdBackground, ApiError } from "../services/api";
import {
  exportToHighDefJpeg,
  createCompositeImage,
  downloadImage,
  downloadPosePackageZip,
} from "../utils/imageUtils";

interface BackgroundStudioProps {
  characters: ComicCharacter[];
  savedPoses: GeneratedPose[];
  savedBackgrounds: GeneratedBackground[];
  onSaveBackground: (bg: GeneratedBackground) => void;
  onDeleteBackground?: (id: string) => void;
  initialCharacterPose?: GeneratedPose | null;
}

const ENVIRONMENT_PRESETS = [
  {
    category: "🏫 Sekolah & Akademi",
    items: [
      {
        name: "Ruang Kelas Sore Hari",
        prompt: "Japanese high school classroom during golden hour sunset, wooden student desks and chairs, large windows with sunlight casting long shadows, chalkboard with chalk notes, curtains slightly swaying",
      },
      {
        name: "Lorong Sekolah & Loker",
        prompt: "High school hallway with rows of metal lockers, polished reflective wooden floor, classroom doors along the corridor, dynamic one-point perspective",
      },
      {
        name: "Atap Sekolah (Rooftop)",
        prompt: "School rooftop enclosed by tall chain-link wire fence, view of city rooftops and open sky, concrete floor with weather stains, dramatic windy atmosphere",
      },
      {
        name: "Gerbang Masuk Sekolah",
        prompt: "Japanese school main entrance gate with stone pillars, cherry blossom trees in full bloom petals drifting, paved walkway leading toward main school building",
      },
    ],
  },
  {
    category: "🏰 Fantasi & Kerajaan",
    items: [
      {
        name: "Aula Singgasana Megah",
        prompt: "Grand royal palace throne room, towering marble pillars, ornate golden arches, red velvet carpet leading to majestic elevated throne, high stained glass windows",
      },
      {
        name: "Kuil Kuno Puncak Gunung",
        prompt: "Ancient Asian temple pavilion atop mist-covered mountain cliff, ornate tiled pagoda roofs, stone lanterns, bonsai pine trees, dramatic clouds below",
      },
      {
        name: "Lorong Bawah Tanah / Dungeon",
        prompt: "Dark stone dungeon corridor, rough cobblestone floor, flickering wall torches casting flickering shadows, ancient iron-barred prison gates",
      },
      {
        name: "Hutan Peri Bercahaya",
        prompt: "Enchanted fantasy forest at night, colossal ancient trees with glowing moss, bioluminescent floating motes of light, winding mystical pathway",
      },
    ],
  },
  {
    category: "🏙️ Kota & Cyberpunk",
    items: [
      {
        name: "Gang Hujan Berlampu Neon",
        prompt: "Cyberpunk rainy narrow back alley, glowing neon kanji signs reflecting on wet asphalt puddles, air conditioning vents, tangled overhead power cables",
      },
      {
        name: "Pemandangan Pencakar Langit",
        prompt: "Ultra-modern metropolis skyline viewed from a high balcony, towering glass skyscrapers, holographic billboards, busy sky traffic in the distance",
      },
      {
        name: "Kamar Apartemen Sederhana",
        prompt: "Cozy urban apartment bedroom, window overlooking night city lights, computer desk with monitors, bookshelf packed with manga, unmade bed",
      },
      {
        name: "Kafe Kaca Modern",
        prompt: "Chic modern street corner cafe interior, floor-to-ceiling glass windows showing bustling street outside, wooden tables, warm hanging pendant lights",
      },
    ],
  },
  {
    category: "⚔️ Arena Tempur & Reruntuhan",
    items: [
      {
        name: "Arena Pertarungan Kuno",
        prompt: "Massive open-air martial arts colosseum arena, cracked stone platform floor with impact craters, grand spectator seating tiers surrounding the pit",
      },
      {
        name: "Kota Reruntuhan Pasca-Perang",
        prompt: "Post-apocalyptic destroyed city ruins, shattered concrete highway overpasses, crumbling skyscraper frames, dust and debris smoke rising",
      },
      {
        name: "Gurun Gersang Berbatu",
        prompt: "Vast barren rocky desert wasteland, towering jagged red canyon cliffs, cracked dry earth ground, lone dusty wind swirling",
      },
      {
        name: "Kuil Reruntuhan Hutan",
        prompt: "Overgrown ancient stone ruins deep in the jungle, massive roots engulfing carved stone statues and cracked stone steps, dappled sunlight",
      },
    ],
  },
  {
    category: "🚀 Sci-Fi & Futuristik",
    items: [
      {
        name: "Jembatan Kapal Antariksa",
        prompt: "Spaceship command bridge, huge panoramic viewport showing starry nebula space and alien planet, holographic control consoles, sleek metallic crew stations",
      },
      {
        name: "Laboratorium Siber Canggih",
        prompt: "High-tech futuristic cybernetics laboratory, glowing cylindrical stasis glass tubes, holographic data readouts, clean white and chrome interior",
      },
      {
        name: "Koridor Stasiun Angkasa",
        prompt: "Sci-fi space station circular tunnel corridor, hexagonal blast doors, warning hazard floor stripes, recessed blue ambient strip lighting",
      },
    ],
  },
];

export const BackgroundStudio: React.FC<BackgroundStudioProps> = ({
  characters,
  savedPoses,
  savedBackgrounds,
  onSaveBackground,
  onDeleteBackground,
  initialCharacterPose,
}) => {
  // Main background prompts & parameters
  const [environmentPrompt, setEnvironmentPrompt] = useState<string>(
    "Ruang kelas sekolah komik jepang sore hari, cahaya senja masuk dari jendela kaca besar menyinari meja dan kursi kayu murid, papan tulis berdebu kapur"
  );
  const [sceneScript, setSceneScript] = useState<string>("");
  const [artStyle, setArtStyle] = useState<ComicArtStyle>("manga-screentone");
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>("eye-level");
  const [aspectRatio, setAspectRatio] = useState<PanelAspectRatio>("1:1");
  const [lightingMood, setLightingMood] = useState<string>("golden-hour");
  const [customAtmosphere, setCustomAtmosphere] = useState<string>("");

  // Alignment with Character Pose
  const [selectedPoseForAlignment, setSelectedPoseForAlignment] = useState<GeneratedPose | null>(
    initialCharacterPose || (savedPoses.length > 0 ? savedPoses[0] : null)
  );

  // Active Generated Background state
  const [currentBackground, setCurrentBackground] = useState<GeneratedBackground | null>(
    savedBackgrounds.length > 0 ? savedBackgrounds[0] : null
  );

  // Composite View settings
  const [activeTab, setActiveTab] = useState<"background" | "composite">("background");
  const [characterScale, setCharacterScale] = useState<number>(100);
  const [characterPositionX, setCharacterPositionX] = useState<number>(50); // 50% = center
  const [characterPositionY, setCharacterPositionY] = useState<number>(50);
  const [characterFlipped, setCharacterFlipped] = useState<boolean>(false);
  const [hasDropShadow, setHasDropShadow] = useState<boolean>(true);
  const [contrastFilter, setContrastFilter] = useState<boolean>(false);

  // Status & Progress
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successNotice, setSuccessNotice] = useState<string>("");
  const [quotaInfo, setQuotaInfo] = useState<{ seconds: number; message: string } | null>(null);

  // Handle Preset Selection
  const handleSelectPreset = (presetPrompt: string, title: string) => {
    setEnvironmentPrompt(presetPrompt);
    setSuccessNotice(`Template latar "${title}" dipilih.`);
    setTimeout(() => setSuccessNotice(""), 2500);
  };

  // Generate HD Background
  const handleGenerateBackground = async () => {
    if (!environmentPrompt.trim() && !sceneScript.trim()) {
      setErrorMessage("Mohon masukkan deskripsi lokasi atau latar komik.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage("");
    setQuotaInfo(null);

    try {
      const res = await generateHdBackground({
        script: sceneScript.trim(),
        environmentPrompt: environmentPrompt.trim(),
        actionPrompt: selectedPoseForAlignment?.actionPrompt,
        characterImageBase64: selectedPoseForAlignment?.characterPngUrl || selectedPoseForAlignment?.imageUrl,
        artStyle: artStyle,
        cameraAngle: cameraAngle,
        aspectRatio: aspectRatio,
        lightingMood: lightingMood,
        customFeatures: customAtmosphere.trim() || undefined,
      });

      const hdJpeg = await exportToHighDefJpeg(res.backgroundJpegUrl, 0.95);

      const newBg: GeneratedBackground = {
        id: `bg-${Date.now()}`,
        title: environmentPrompt.slice(0, 45) + (environmentPrompt.length > 45 ? "..." : ""),
        environmentPrompt: environmentPrompt.trim(),
        scriptSnippet: sceneScript.trim() || undefined,
        imageUrl: hdJpeg,
        artStyle: artStyle,
        cameraAngle: cameraAngle,
        aspectRatio: aspectRatio,
        lightingMood: lightingMood,
        associatedCharacterId: selectedPoseForAlignment?.characterId,
        associatedCharacterName: selectedPoseForAlignment?.characterName,
        associatedPoseId: selectedPoseForAlignment?.id,
        createdAt: Date.now(),
      };

      setCurrentBackground(newBg);
      onSaveBackground(newBg);
      setSuccessNotice("Latar belakang HD berhasil digenerate!");
      setTimeout(() => setSuccessNotice(""), 3500);
    } catch (err: any) {
      console.error("Background generate error:", err);
      if (err instanceof ApiError && err.isQuotaError) {
        setQuotaInfo({
          seconds: err.retryAfterSeconds || 30,
          message: err.message,
        });
      } else {
        setErrorMessage(err.message || "Gagal menghasilkan latar belakang HD.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Downloads
  const handleDownloadBackgroundHd = () => {
    if (!currentBackground) return;
    downloadImage(
      currentBackground.imageUrl,
      `Latar_${currentBackground.artStyle}_${currentBackground.id.slice(-6)}.jpg`
    );
  };

  const handleDownloadCompositePng = async () => {
    if (!currentBackground) return;
    const charPng = selectedPoseForAlignment?.characterPngUrl || selectedPoseForAlignment?.imageUrl;
    if (!charPng) {
      handleDownloadBackgroundHd();
      return;
    }
    const mergedUrl = await createCompositeImage(currentBackground.imageUrl, charPng);
    downloadImage(
      mergedUrl,
      `Komposit_${selectedPoseForAlignment?.characterName || "Karakter"}_${currentBackground.id.slice(-6)}.png`
    );
  };

  const handleDownloadFullZip = async () => {
    if (!currentBackground) return;
    const charPng = selectedPoseForAlignment?.characterPngUrl || selectedPoseForAlignment?.imageUrl || "";
    const mergedUrl = charPng ? await createCompositeImage(currentBackground.imageUrl, charPng) : currentBackground.imageUrl;

    await downloadPosePackageZip({
      id: currentBackground.id,
      characterName: selectedPoseForAlignment?.characterName || "Latar Komik",
      title: currentBackground.title,
      imageUrl: mergedUrl,
      characterPngUrl: charPng,
      backgroundJpegUrl: currentBackground.imageUrl,
      artStyle: currentBackground.artStyle,
      cameraAngle: currentBackground.cameraAngle,
      actionType: selectedPoseForAlignment?.actionType || "Scenery",
      expression: selectedPoseForAlignment?.expression || "Neutral",
      scriptSnippet: currentBackground.scriptSnippet,
      actionPrompt: currentBackground.environmentPrompt,
      aspectRatio: currentBackground.aspectRatio,
      createdAt: currentBackground.createdAt,
    });
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-zinc-900 to-zinc-950 p-6 rounded-2xl border border-emerald-800/40 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-radial from-emerald-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <ImageIcon className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-mono">
                Studio Latar Belakang Komik <span className="text-emerald-400">HD</span>
              </h1>
              <span className="text-xs uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                Dedicated Environment Plate
              </span>
            </div>
            <p className="text-sm text-zinc-300 max-w-2xl">
              Hasilkan pelat latar belakang pemandangan, interior, dan ruang komik definisi tinggi (*High-Definition JPEG 0.95 Quality*) secara terpisah tanpa sosok karakter. Padukan dengan pose karakter transparan PNG untuk hasil komposit komik profesional.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="bg-zinc-900/90 px-3.5 py-2 rounded-xl border border-zinc-800 text-xs">
              <span className="text-zinc-400">Tersimpan:</span>{" "}
              <strong className="text-emerald-400 font-mono font-bold">
                {savedBackgrounds.length} Latar
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Quota / Rate Limit Alert */}
      {quotaInfo && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-sm flex items-start space-x-3 animate-pulse">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-amber-300">Batas Kuota / Antrean API</h4>
            <p className="text-xs text-amber-200/80 mt-0.5">{quotaInfo.message}</p>
          </div>
        </div>
      )}

      {/* Error / Success Notifications */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage("")} className="text-rose-400 hover:text-rose-200 text-xs font-mono">
            Tutup
          </button>
        </div>
      )}

      {successNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-800/60 text-emerald-200 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Background Prompts & Parameters (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Section 1: Character Pose Alignment (Optional Reference) */}
          <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center space-x-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Penyelarasan dengan Karakter (Opsional)</span>
              </label>
              {selectedPoseForAlignment && (
                <button
                  onClick={() => setSelectedPoseForAlignment(null)}
                  className="text-[11px] text-zinc-400 hover:text-rose-400 transition-colors"
                >
                  Latar Murni Saja
                </button>
              )}
            </div>

            <p className="text-xs text-zinc-400">
              Pilih karakter pose yang sudah dibuat di Studio Pose agar horizon garis lantai, sudut kamera, dan arah bayangan latar belakang otomatis disinkronkan secara presisi.
            </p>

            {savedPoses.length > 0 ? (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-36 overflow-y-auto pr-1">
                {savedPoses.map((pose) => (
                  <button
                    key={pose.id}
                    onClick={() => setSelectedPoseForAlignment(pose)}
                    className={`relative rounded-xl border p-1 transition-all overflow-hidden aspect-square flex flex-col items-center justify-center ${
                      selectedPoseForAlignment?.id === pose.id
                        ? "border-emerald-500 bg-emerald-950/30 ring-2 ring-emerald-500/30"
                        : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                    }`}
                  >
                    <img
                      src={pose.characterPngUrl || pose.imageUrl}
                      alt={pose.characterName}
                      className="w-full h-full object-contain"
                    />
                    {selectedPoseForAlignment?.id === pose.id && (
                      <span className="absolute bottom-1 right-1 bg-emerald-500 text-zinc-950 rounded-full p-0.5">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-400 flex items-center justify-between">
                <span>Belum ada pose di database.</span>
                <span className="text-emerald-400 font-mono text-[11px]">Generate Latar Mandiri</span>
              </div>
            )}

            {selectedPoseForAlignment && (
              <div className="flex items-center space-x-3 p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-xs text-emerald-300">
                <img
                  src={selectedPoseForAlignment.characterPngUrl || selectedPoseForAlignment.imageUrl}
                  alt={selectedPoseForAlignment.characterName}
                  className="w-10 h-10 object-contain rounded-lg bg-zinc-950 p-1 border border-emerald-500/30"
                />
                <div className="flex-1 truncate">
                  <strong className="block truncate font-bold text-white">
                    {selectedPoseForAlignment.characterName}
                  </strong>
                  <span className="text-[11px] text-zinc-400">
                    {selectedPoseForAlignment.title} • {selectedPoseForAlignment.cameraAngle}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Environment Description & Presets */}
          <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center space-x-2">
                <Compass className="w-4 h-4 text-emerald-400" />
                <span>Deskripsi Setting & Lokasi Latar</span>
              </label>
            </div>

            <textarea
              id="bg-environment-prompt"
              rows={3}
              value={environmentPrompt}
              onChange={(e) => setEnvironmentPrompt(e.target.value)}
              placeholder="Contoh: Ruang kelas sekolah komik jepang sore hari, cahaya senja masuk dari jendela kaca besar menyinari meja dan kursi kayu murid..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs sm:text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans leading-relaxed"
            />

            {/* Template Presets Accordion / Quick Select */}
            <div className="space-y-2 pt-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Katalog Template Lokasi Komik Populer:
              </label>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {ENVIRONMENT_PRESETS.map((cat, idx) => (
                  <div key={idx} className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80 space-y-1.5">
                    <span className="text-xs font-bold text-emerald-300 block">{cat.category}</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {cat.items.map((item, itemIdx) => (
                        <button
                          key={itemIdx}
                          onClick={() => handleSelectPreset(item.prompt, item.name)}
                          className="text-left px-2.5 py-1.5 rounded-lg text-[11px] bg-zinc-900 hover:bg-emerald-950/40 hover:text-emerald-300 border border-zinc-800/80 hover:border-emerald-700/50 text-zinc-300 transition-all truncate"
                          title={item.prompt}
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Visual & Perspective Settings */}
          <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 p-5 space-y-4 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Parameter Visual & Sudut Pandang</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Camera Perspective */}
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1 font-medium">
                  Perspektif Kamera
                </label>
                <select
                  value={cameraAngle}
                  onChange={(e) => setCameraAngle(e.target.value as CameraAngle)}
                  className="w-full px-2.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="eye-level">Eye-Level (Sejajar Mata)</option>
                  <option value="extreme-low-angle">Low-Angle (Menjulang Megah)</option>
                  <option value="high-angle-bird">Bird's-Eye (Dari Atas)</option>
                  <option value="dutch-angle">Dutch Angle (Miring Dramatis)</option>
                  <option value="over-the-shoulder">Over the Shoulder (Kedalaman)</option>
                  <option value="full-body-dynamic">Wide Scenic Spread (Luas)</option>
                </select>
              </div>

              {/* Art Style */}
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1 font-medium">
                  Gaya Gambar Komik
                </label>
                <select
                  value={artStyle}
                  onChange={(e) => setArtStyle(e.target.value as ComicArtStyle)}
                  className="w-full px-2.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="manga-screentone">Manga B&W + Screentone</option>
                  <option value="clean-lineart">Clean Lineart Kontur</option>
                  <option value="webtoon-color">Webtoon Full Color</option>
                  <option value="seinen-noir">Seinen Manga Noir</option>
                  <option value="american-comic">American Comic Dynamic</option>
                </select>
              </div>

              {/* Lighting Mood */}
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1 font-medium">
                  Suasana Pencahayaan
                </label>
                <select
                  value={lightingMood}
                  onChange={(e) => setLightingMood(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="golden-hour">Senja Emas (Golden Hour Sunset)</option>
                  <option value="bright-daylight">Siang Terik (Bright Sunlight)</option>
                  <option value="night-starry">Malam Berbintang / Bulan</option>
                  <option value="rain-storm-lightning">Hujan Badai & Kilat Petir</option>
                  <option value="neon-cyberpunk">Lampu Neon Cyberpunk</option>
                  <option value="dramatic-contrast">Kontras Noir Gelap</option>
                </select>
              </div>

              {/* Aspect Ratio */}
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1 font-medium">
                  Aspek Rasio Panel
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as PanelAspectRatio)}
                  className="w-full px-2.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:border-emerald-500 focus:outline-none"
                >
                  <option value="1:1">1:1 (Square Panel Komik)</option>
                  <option value="3:4">3:4 (Portrait Standard)</option>
                  <option value="4:3">4:3 (Landscape Manga Panel)</option>
                  <option value="9:16">9:16 (Webtoon Scroll / Tall)</option>
                  <option value="16:9">16:9 (Double Page / Spread)</option>
                </select>
              </div>
            </div>

            {/* Custom Atmosphere Notes */}
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1 font-medium">
                Efek Partikel & Suasana Tambahan (Opsional)
              </label>
              <input
                type="text"
                value={customAtmosphere}
                onChange={(e) => setCustomAtmosphere(e.target.value)}
                placeholder="Contoh: Daun berguguran tertiup angin, kabut tebal di dasar lantai..."
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Generate Action Button */}
            <button
              id="generate-hd-background-btn"
              onClick={handleGenerateBackground}
              disabled={isGenerating}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all shadow-lg ${
                isGenerating
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-950/50 active:scale-[0.99]"
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-300" />
                  <span>Sedang Menggambar Latar Belakang HD...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>Hasilkan Latar Belakang HD (Plate)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Preview, Interactive Composite, and Export (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 p-5 shadow-xl flex flex-col min-h-[580px]">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800">
              {/* Tab Selector: Latar HD vs Komposit */}
              <div className="flex items-center space-x-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
                <button
                  onClick={() => setActiveTab("background")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
                    activeTab === "background"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Pelat Latar HD (JPEG)</span>
                </button>
                <button
                  onClick={() => setActiveTab("composite")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
                    activeTab === "composite"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Komposit Karakter + Latar</span>
                </button>
              </div>

              {/* View Filters */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setContrastFilter(!contrastFilter)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                    contrastFilter
                      ? "bg-zinc-800 text-white border-zinc-600"
                      : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                  }`}
                  title="Inking Ink Check"
                >
                  High Contrast
                </button>
              </div>
            </div>

            {/* Main Stage Canvas Area */}
            <div className="flex-1 flex items-center justify-center p-4 relative min-h-[380px] bg-zinc-950/70 rounded-xl my-4 overflow-hidden border border-zinc-800/60">
              {isGenerating ? (
                <div className="text-center space-y-4 p-8">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-center mx-auto animate-pulse">
                    <Sparkles className="w-7 h-7 text-emerald-400 animate-spin" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white font-mono">
                      Merender Latar Belakang Komik HD...
                    </h4>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
                      Menghitung garis lenyap perspektif, tekstur arsitektur, dan shading screentone tanpa karakter...
                    </p>
                  </div>
                </div>
              ) : currentBackground ? (
                <div className="relative max-h-[460px] max-w-full flex items-center justify-center overflow-hidden rounded-xl shadow-2xl">
                  {/* Mode 1: Background Plate Only */}
                  {activeTab === "background" && (
                    <img
                      src={currentBackground.imageUrl}
                      alt={currentBackground.title}
                      className={`max-h-[460px] max-w-full object-contain rounded-lg transition-all ${
                        contrastFilter ? "contrast-150 grayscale" : ""
                      }`}
                    />
                  )}

                  {/* Mode 2: Interactive Composite (Character + Background) */}
                  {activeTab === "composite" && (
                    <div className="relative max-h-[460px] max-w-full flex items-center justify-center overflow-hidden rounded-lg">
                      {/* Background Image Layer */}
                      <img
                        src={currentBackground.imageUrl}
                        alt={currentBackground.title}
                        className={`max-h-[460px] max-w-full object-contain rounded-lg transition-all ${
                          contrastFilter ? "contrast-150 grayscale" : ""
                        }`}
                      />

                      {/* Character Layer (PNG Cutout) */}
                      {selectedPoseForAlignment ? (
                        <div
                          className="absolute inset-0 flex items-center justify-center pointer-events-none"
                          style={{
                            transform: `translate(${characterPositionX - 50}%, ${characterPositionY - 50}%) scale(${characterScale / 100}) ${
                              characterFlipped ? "scaleX(-1)" : ""
                            }`,
                          }}
                        >
                          <img
                            src={selectedPoseForAlignment.characterPngUrl || selectedPoseForAlignment.imageUrl}
                            alt={selectedPoseForAlignment.characterName}
                            className={`max-h-[440px] max-w-full object-contain transition-all ${
                              hasDropShadow ? "drop-shadow-[0_16px_32px_rgba(0,0,0,0.65)]" : ""
                            } ${contrastFilter ? "contrast-150 grayscale" : ""}`}
                          />
                        </div>
                      ) : (
                        <div className="absolute top-4 right-4 bg-zinc-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-amber-300">
                          Pilih pose karakter di kolom kiri untuk melihat komposit
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-3 p-8">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-300">Belum Ada Latar Belakang</h4>
                    <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-1">
                      Pilih template lokasi di sebelah kiri atau ketik deskripsi latar kustom lalu tekan tombol generate.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Composite Interactive Alignment Controls */}
            {activeTab === "composite" && currentBackground && selectedPoseForAlignment && (
              <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800/80 space-y-3 mb-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-300 flex items-center space-x-1.5">
                    <Move className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Kontrol Posisi & Skala Karakter:</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCharacterFlipped(!characterFlipped)}
                      className={`px-2 py-1 rounded border text-[11px] font-mono flex items-center space-x-1 transition-all ${
                        characterFlipped ? "bg-emerald-950 text-emerald-300 border-emerald-700" : "bg-zinc-900 text-zinc-400 border-zinc-800"
                      }`}
                    >
                      <FlipHorizontal className="w-3 h-3" />
                      <span>Flip Hadap</span>
                    </button>
                    <button
                      onClick={() => setHasDropShadow(!hasDropShadow)}
                      className={`px-2 py-1 rounded border text-[11px] font-mono transition-all ${
                        hasDropShadow ? "bg-emerald-950 text-emerald-300 border-emerald-700" : "bg-zinc-900 text-zinc-400 border-zinc-800"
                      }`}
                    >
                      Bayangan Kontak
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-0.5">
                      Ukuran Karakter ({characterScale}%)
                    </label>
                    <input
                      type="range"
                      min={50}
                      max={150}
                      value={characterScale}
                      onChange={(e) => setCharacterScale(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-0.5">
                      Posisi Horisontal (X: {characterPositionX}%)
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      value={characterPositionX}
                      onChange={(e) => setCharacterPositionX(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-0.5">
                      Posisi Vertikal / Lantai (Y: {characterPositionY}%)
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      value={characterPositionY}
                      onChange={(e) => setCharacterPositionY(Number(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Export Action Buttons */}
            {currentBackground && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-zinc-800">
                <button
                  id="download-bg-hd-btn"
                  onClick={handleDownloadBackgroundHd}
                  className="py-2.5 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Unduh Latar HD Saja (JPEG)</span>
                </button>

                <button
                  id="download-composite-png-btn"
                  onClick={handleDownloadCompositePng}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-emerald-950/40"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Unduh Komposit Karakter (PNG)</span>
                </button>

                <button
                  id="download-full-zip-btn"
                  onClick={handleDownloadFullZip}
                  className="py-2.5 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all shadow-sm"
                >
                  <FolderDown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Unduh Paket ZIP (Semua Layer)</span>
                </button>
              </div>
            )}
          </div>

          {/* Saved Backgrounds History Shelf */}
          {savedBackgrounds.length > 0 && (
            <div className="bg-zinc-900/90 rounded-2xl border border-zinc-800 p-4 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center space-x-2">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Koleksi Latar Belakang Komik Tersimpan ({savedBackgrounds.length})</span>
                </h4>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 overflow-x-auto pb-1">
                {savedBackgrounds.map((bg) => (
                  <div
                    key={bg.id}
                    onClick={() => setCurrentBackground(bg)}
                    className={`group relative rounded-xl border p-1 cursor-pointer transition-all overflow-hidden aspect-video flex flex-col justify-end ${
                      currentBackground?.id === bg.id
                        ? "border-emerald-500 bg-emerald-950/40 ring-2 ring-emerald-500/30"
                        : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                    }`}
                  >
                    <img
                      src={bg.imageUrl}
                      alt={bg.title}
                      className="absolute inset-0 w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    <span className="relative z-10 text-[10px] text-white font-medium truncate px-1 pb-0.5">
                      {bg.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
