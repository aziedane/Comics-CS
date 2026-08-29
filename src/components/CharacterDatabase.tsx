import React, { useState } from "react";
import {
  Users,
  Plus,
  Trash2,
  Edit,
  Sparkles,
  Search,
  Upload,
  BookOpen,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  Info,
  Wand2,
} from "lucide-react";
import { ComicArtStyle, ComicCharacter } from "../types";
import { ApiError, analyzeCharacterImage, generateCharacterArt } from "../services/api";
import { QuotaCountdownAlert } from "./QuotaCountdownAlert";

interface CharacterDatabaseProps {
  characters: ComicCharacter[];
  onAddCharacter: (character: ComicCharacter) => void;
  onUpdateCharacter?: (character: ComicCharacter) => void;
  onDeleteCharacter: (id: string) => void;
  onSelectCharacterForPose: (character: ComicCharacter) => void;
  onOpenModelSheet: (character: ComicCharacter) => void;
  onSyncFolkloreCharacters?: () => void;
}

export const CharacterDatabase: React.FC<CharacterDatabaseProps> = ({
  characters,
  onAddCharacter,
  onUpdateCharacter,
  onDeleteCharacter,
  onSelectCharacterForPose,
  onOpenModelSheet,
  onSyncFolkloreCharacters,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  
  // Modal / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
  const [characterToDelete, setCharacterToDelete] = useState<ComicCharacter | null>(null);
  
  // Form fields
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [series, setSeries] = useState("");
  const [artStyle, setArtStyle] = useState<ComicArtStyle>("clean-lineart");
  const [description, setDescription] = useState("");
  const [promptSummary, setPromptSummary] = useState("");
  const [hair, setHair] = useState("");
  const [eyes, setEyes] = useState("");
  const [outfit, setOutfit] = useState("");
  const [proportions, setProportions] = useState("7.5 unit kepala (Standar Komik)");
  const [features, setFeatures] = useState("");
  const [imageData, setImageData] = useState("");
  const [mimeType, setMimeType] = useState("image/png");
  const [formValidationWarning, setFormValidationWarning] = useState("");

  // AI Art Generation state
  const [generatingArtCharId, setGeneratingArtCharId] = useState<string | null>(null);
  const [generatingFormArt, setGeneratingFormArt] = useState(false);
  const [batchGenerating, setBatchGenerating] = useState(false);

  // AI Scanning state
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<{
    seconds: number;
    message: string;
  } | null>(null);
  const [analysisError, setAnalysisError] = useState<string>("");

  const filteredCharacters = characters.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      (c.seriesTitle && c.seriesTitle.toLowerCase().includes(q)) ||
      c.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const resetForm = () => {
    setEditingCharacterId(null);
    setName("");
    setRole("");
    setSeries("");
    setArtStyle("clean-lineart");
    setDescription("");
    setPromptSummary("");
    setHair("");
    setEyes("");
    setOutfit("");
    setProportions("7.5 unit kepala (Standar Komik)");
    setFeatures("");
    setImageData("");
    setMimeType("image/png");
    setFormValidationWarning("");
    setAnalysisError("");
    setQuotaInfo(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (char: ComicCharacter) => {
    resetForm();
    setEditingCharacterId(char.id);
    setName(char.name);
    setRole(char.role);
    setSeries(char.seriesTitle || "");
    setArtStyle(char.artStyle || "clean-lineart");
    setDescription(char.description || "");
    setPromptSummary(char.visualPromptSummary || "");
    setHair(char.hairStyleColor || "");
    setEyes(char.eyeDetails || "");
    setOutfit(char.outfitBreakdown || "");
    setProportions(char.bodyProportions || "7.5 unit kepala (Standar Komik)");
    setFeatures(char.keyDistinctiveFeatures?.join(", ") || "");
    setImageData(char.baseImageData || "");
    setMimeType(char.mimeType || "image/png");
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    resetForm();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImageData(result);
      setMimeType(file.type || "image/png");
      setFormValidationWarning("");
    };
    reader.readAsDataURL(file);
  };

  // Generate Character Art with Gemini for Single Character
  const handleGenerateAiArtForCharacter = async (char: ComicCharacter) => {
    if (generatingArtCharId || batchGenerating) return;
    setGeneratingArtCharId(char.id);
    setQuotaInfo(null);

    try {
      const res = await generateCharacterArt({
        characterName: char.name,
        characterRole: char.role,
        characterDescription: char.description,
        visualPrompt: char.visualPromptSummary,
        artStyle: char.artStyle || "clean-lineart",
        distinctiveFeatures: char.keyDistinctiveFeatures || [],
        aspectRatio: "1:1",
      });

      if (res && res.imageUrl) {
        const updated: ComicCharacter = {
          ...char,
          baseImageData: res.imageUrl,
          mimeType: "image/png",
        };

        if (onUpdateCharacter) {
          onUpdateCharacter(updated);
        }

        setSyncNotice(`Gambar AI untuk "${char.name}" berhasil dibuat & diperbarui!`);
        setTimeout(() => setSyncNotice(null), 4000);
      }
    } catch (err: any) {
      console.error("Failed to generate character AI art:", err);
      if (err instanceof ApiError && err.isQuotaError) {
        setQuotaInfo({
          seconds: err.retryAfterSeconds || 30,
          message: err.message,
        });
      } else {
        alert(err.message || "Gagal membuat gambar karakter dengan AI.");
      }
    } finally {
      setGeneratingArtCharId(null);
    }
  };

  // Generate Character Art inside Form
  const handleGenerateFormArt = async () => {
    if (!name.trim()) {
      setFormValidationWarning("Masukkan nama karakter sebelum men-generate gambar AI.");
      return;
    }

    setGeneratingFormArt(true);
    setFormValidationWarning("");
    setQuotaInfo(null);

    try {
      const featureList = features
        ? features.split(",").map((f) => f.trim()).filter(Boolean)
        : [];

      const res = await generateCharacterArt({
        characterName: name.trim(),
        characterRole: role.trim() || "Karakter Komik",
        characterDescription: description.trim(),
        visualPrompt: promptSummary.trim(),
        artStyle: artStyle,
        distinctiveFeatures: featureList,
        aspectRatio: "1:1",
      });

      if (res && res.imageUrl) {
        setImageData(res.imageUrl);
        setMimeType("image/png");
      }
    } catch (err: any) {
      console.error("Form AI Art generation failed:", err);
      if (err instanceof ApiError && err.isQuotaError) {
        setQuotaInfo({
          seconds: err.retryAfterSeconds || 30,
          message: err.message,
        });
      } else {
        setFormValidationWarning(err.message || "Gagal men-generate gambar karakter dengan AI.");
      }
    } finally {
      setGeneratingFormArt(false);
    }
  };

  // Batch generate AI art for all characters
  const handleBatchGenerateAllAiArt = async () => {
    if (batchGenerating || characters.length === 0) return;
    setBatchGenerating(true);
    setQuotaInfo(null);

    try {
      let count = 0;
      for (const char of characters) {
        try {
          const res = await generateCharacterArt({
            characterName: char.name,
            characterRole: char.role,
            characterDescription: char.description,
            visualPrompt: char.visualPromptSummary,
            artStyle: char.artStyle || "clean-lineart",
            distinctiveFeatures: char.keyDistinctiveFeatures || [],
            aspectRatio: "1:1",
          });

          if (res && res.imageUrl && onUpdateCharacter) {
            onUpdateCharacter({
              ...char,
              baseImageData: res.imageUrl,
              mimeType: "image/png",
            });
            count++;
          }
        } catch (charErr: any) {
          console.warn(`Error generating for ${char.name}:`, charErr);
          if (charErr instanceof ApiError && charErr.isQuotaError) {
            setQuotaInfo({
              seconds: charErr.retryAfterSeconds || 30,
              message: charErr.message,
            });
            break;
          }
        }
      }

      setSyncNotice(`${count} karakter komik berhasil diperbarui dengan ilustrasi AI resolusi tinggi!`);
      setTimeout(() => setSyncNotice(null), 5000);
    } finally {
      setBatchGenerating(false);
    }
  };

  const handleAutoAnalyze = async () => {
    if (!imageData) return;
    setAnalyzingImage(true);
    setAnalysisError("");
    setQuotaInfo(null);
    try {
      const res = await analyzeCharacterImage(imageData, mimeType);
      if (res) {
        if (!name && res.suggestedName) setName(res.suggestedName);
        if (res.hairStyleColor) setHair(res.hairStyleColor);
        if (res.eyeDetails) setEyes(res.eyeDetails);
        if (res.outfitBreakdown) setOutfit(res.outfitBreakdown);
        if (res.bodyProportions) setProportions(res.bodyProportions);
        if (res.promptSummary) setPromptSummary(res.promptSummary);
        if (res.keyDistinctiveFeatures && res.keyDistinctiveFeatures.length > 0) {
          setFeatures(res.keyDistinctiveFeatures.join(", "));
        }
      }
    } catch (err: any) {
      console.error("Auto analysis failed:", err);
      if (err instanceof ApiError && err.isQuotaError) {
        setQuotaInfo({
          seconds: err.retryAfterSeconds || 30,
          message: err.message,
        });
      } else {
        setAnalysisError(err.message || "Gagal menganalisis karakter.");
      }
    } finally {
      setAnalyzingImage(false);
    }
  };

  const handleSaveCharacter = () => {
    if (!name.trim()) {
      setFormValidationWarning("Mohon masukkan nama karakter.");
      return;
    }
    if (!imageData) {
      setFormValidationWarning("Mohon sediakan gambar acuan (unggah file atau klik '✨ Generate Gambar Karakter AI').");
      return;
    }

    setFormValidationWarning("");

    const featureList = features
      ? features.split(",").map((f) => f.trim()).filter(Boolean)
      : [];

    if (editingCharacterId) {
      // Edit existing character
      const existingChar = characters.find((c) => c.id === editingCharacterId);
      const updated: ComicCharacter = {
        id: editingCharacterId,
        name: name.trim(),
        role: role.trim() || "Karakter Komik",
        seriesTitle: series.trim() || "Proyek Komik",
        baseImageData: imageData,
        mimeType: mimeType,
        description: description.trim() || `${name} - ${role}`,
        visualPromptSummary:
          promptSummary.trim() ||
          `${name}, comic character, ${hair}, ${eyes}, wearing ${outfit}`,
        hairStyleColor: hair.trim(),
        eyeDetails: eyes.trim(),
        outfitBreakdown: outfit.trim(),
        bodyProportions: proportions.trim(),
        keyDistinctiveFeatures: featureList,
        artStyle: artStyle,
        tags: [role.trim(), artStyle].filter(Boolean),
        createdAt: existingChar?.createdAt || Date.now(),
      };

      if (onUpdateCharacter) {
        onUpdateCharacter(updated);
      }
    } else {
      // Add new character
      const created: ComicCharacter = {
        id: `char-${Date.now()}`,
        name: name.trim(),
        role: role.trim() || "Karakter Komik",
        seriesTitle: series.trim() || "Proyek Komik",
        baseImageData: imageData,
        mimeType: mimeType,
        description: description.trim() || `${name} - ${role}`,
        visualPromptSummary:
          promptSummary.trim() ||
          `${name}, comic character, ${hair}, ${eyes}, wearing ${outfit}`,
        hairStyleColor: hair.trim(),
        eyeDetails: eyes.trim(),
        outfitBreakdown: outfit.trim(),
        bodyProportions: proportions.trim(),
        keyDistinctiveFeatures: featureList,
        artStyle: artStyle,
        tags: [role.trim(), artStyle].filter(Boolean),
        createdAt: Date.now(),
      };

      onAddCharacter(created);
    }

    handleCloseForm();
  };

  const confirmDeleteCharacter = () => {
    if (!characterToDelete) return;
    onDeleteCharacter(characterToDelete.id);
    setCharacterToDelete(null);
  };

  return (
    <div className="space-y-6 animate-fade-in text-zinc-100 relative">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/80 p-5 rounded-2xl border border-zinc-800">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-rose-500" />
            Database Karakter & Model Sheet
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Kelola, tambah, edit, dan generate ilustrasi acuan karakter AI agar konsisten dengan naskah cerita rakyat dan kaidah visual.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari karakter / peran / judul..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 w-44 sm:w-56"
            />
          </div>

          <button
            onClick={handleBatchGenerateAllAiArt}
            disabled={batchGenerating}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-950/40 transition-all disabled:opacity-50 whitespace-nowrap"
            title="Generate gambar ilustrasi AI untuk semua karakter dalam database"
          >
            {batchGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4 text-amber-200" />
            )}
            <span>{batchGenerating ? "Menghasilkan AI..." : "✨ Generate Semua AI"}</span>
          </button>

          {onSyncFolkloreCharacters && (
            <button
              onClick={() => {
                onSyncFolkloreCharacters();
                setSyncNotice("Seluruh set karakter cerita rakyat (Mendel, The Rav, Sarah, Anak-anak & Hewan) berhasil disinkronkan!");
                setTimeout(() => setSyncNotice(null), 3500);
              }}
              className="flex items-center space-x-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap"
              title="Masukkan/Pulihkan Semua Karakter Cerita Rakyat"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Sinkron Naskah</span>
            </button>
          )}

          <button
            onClick={handleOpenAddModal}
            className="flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-950/40 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Karakter</span>
          </button>
        </div>
      </div>

      {/* Reference Compliance Guidelines Card */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2.5">
          <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Panduan Kepatuhan Visual Karakter Sesuai Dokumen Cerita Rakyat:
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-[11px] text-zinc-300">
          <div className="p-2.5 bg-zinc-950/70 border border-zinc-800/80 rounded-xl space-y-1">
            <span className="font-bold text-rose-400 block">1. Mendel (Suami)</span>
            <p className="text-zinc-400 leading-snug">
              Wajib mengenakan <strong>yarmulke</strong> hitam di puncak rambut ikal, kemeja putih berlengan panjang, rompi/suspender cokelat, ekspresi panik komedi.
            </p>
          </div>
          <div className="p-2.5 bg-zinc-950/70 border border-zinc-800/80 rounded-xl space-y-1">
            <span className="font-bold text-amber-400 block">2. The Rav (Rabbi)</span>
            <p className="text-zinc-400 leading-snug">
              Topi hitam fedora bertepi lebar, janggut & kumis putih panjang lebat terawat, kacamata bulat, jubah jas hitam, senyum bijak.
            </p>
          </div>
          <div className="p-2.5 bg-zinc-950/70 border border-rose-500/30 rounded-xl space-y-1 bg-rose-950/10">
            <span className="font-bold text-pink-400 block">3. Sarah (Istri) - Wajib Sopan</span>
            <p className="text-zinc-300 leading-snug">
              Wajib memakai kain penutup kepala <strong>tichel rapat TANPA ada rambut terlihat di dahi</strong>, busana menutup siku & bawah lutut, berstoking.
            </p>
          </div>
          <div className="p-2.5 bg-zinc-950/70 border border-zinc-800/80 rounded-xl space-y-1">
            <span className="font-bold text-cyan-400 block">4. David & Leah (Anak)</span>
            <p className="text-zinc-400 leading-snug">
              Anak laki-laki ber-yarmulke & kemeja; anak perempuan bergaun sopan menutup lutut & siku dengan stoking.
            </p>
          </div>
          <div className="p-2.5 bg-zinc-950/70 border border-zinc-800/80 rounded-xl space-y-1">
            <span className="font-bold text-emerald-400 block">5. Hewan Ternak</span>
            <p className="text-zinc-400 leading-snug">
              Ayam berkepak liar beterbangan bulu, kambing nakal mengunyah taplak meja, sapi perah besar memenuhi ruangan.
            </p>
          </div>
        </div>
      </div>

      {syncNotice && (
        <div className="bg-emerald-950/80 border border-emerald-600 text-emerald-200 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between animate-fade-in shadow-lg">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{syncNotice}</span>
          </div>
          <button onClick={() => setSyncNotice(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {quotaInfo && (
        <QuotaCountdownAlert
          retryAfterSeconds={quotaInfo.seconds}
          customMessage={quotaInfo.message}
          onCountdownComplete={() => setQuotaInfo(null)}
        />
      )}

      {/* Modal Confirmation Delete */}
      {characterToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-400">
              <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Hapus Karakter?</h3>
                <p className="text-xs text-zinc-400">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center space-x-3">
              <img
                src={characterToDelete.baseImageData}
                alt={characterToDelete.name}
                className="w-12 h-12 object-contain rounded bg-zinc-900"
              />
              <div className="text-xs truncate">
                <div className="font-bold text-white truncate">{characterToDelete.name}</div>
                <div className="text-zinc-400 truncate">{characterToDelete.role}</div>
              </div>
            </div>

            <p className="text-xs text-zinc-400">
              Apakah Anda yakin ingin menghapus data karakter{" "}
              <strong className="text-white">"{characterToDelete.name}"</strong> dari database studio Anda?
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setCharacterToDelete(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmDeleteCharacter}
                className="flex items-center space-x-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-red-950/50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Karakter</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Form Add & Edit Character */}
      {isFormOpen && (
        <div className="bg-zinc-900 border-2 border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-6 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              {editingCharacterId ? (
                <>
                  <Edit className="w-5 h-5 text-rose-500" /> Edit Data Karakter
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-rose-500" /> Registrasi Karakter Komik Baru
                </>
              )}
            </h2>
            <button
              onClick={handleCloseForm}
              className="text-xs text-zinc-400 hover:text-white p-1 hover:bg-zinc-800 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {formValidationWarning && (
            <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{formValidationWarning}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Image Upload & AI Generation & Auto-Scan */}
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-zinc-300">
                Gambar Acuan / Model Sheet Karakter *
              </label>

              <div className="w-full h-64 border-2 border-dashed border-zinc-700 hover:border-rose-500/50 rounded-xl flex flex-col items-center justify-center p-4 bg-zinc-950 relative overflow-hidden transition-colors">
                {imageData ? (
                  <>
                    <img
                      src={imageData}
                      alt="Preview"
                      referrerPolicy="no-referrer"
                      className="max-h-full max-w-full object-contain rounded"
                    />
                    <label className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/80 hover:bg-black text-[10px] text-zinc-300 rounded cursor-pointer border border-zinc-700">
                      Ganti Gambar
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </>
                ) : (
                  <label className="flex flex-col items-center justify-center cursor-pointer w-full h-full text-center">
                    <Upload className="w-8 h-8 text-zinc-500 mb-2" />
                    <span className="text-xs font-medium text-zinc-300">
                      Klik atau Drag & Drop Sketsa/Gambar Karakter
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-1">
                      PNG, JPG, WebP, SVG
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Action Buttons for Image */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleGenerateFormArt}
                  disabled={generatingFormArt || !name.trim()}
                  className="w-full flex items-center justify-center space-x-2 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-40"
                  title="Generate gambar ilustrasi acuan karakter ini menggunakan AI Gemini"
                >
                  {generatingFormArt ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                  <span>{generatingFormArt ? "Menghasilkan Gambar AI..." : "✨ Generate Gambar Karakter AI"}</span>
                </button>

                {imageData && (
                  <button
                    onClick={handleAutoAnalyze}
                    disabled={analyzingImage}
                    className="w-full flex items-center justify-center space-x-2 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{analyzingImage ? "Memindai Ciri Anatomi AI..." : "Pindai Ciri Otomatis (Gemini Vision)"}</span>
                  </button>
                )}
              </div>

              {analysisError && (
                <p className="text-[11px] text-red-400 bg-red-950/40 p-2 rounded-lg border border-red-800">
                  {analysisError}
                </p>
              )}
            </div>

            {/* Right: Character Info Details */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Nama Karakter *
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Mendel, The Rav, Sarah"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Peran dalam Cerita / Naskah
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Protagonis / Suami yang Tertekan"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Judul Proyek / Naskah Komik
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: It Could Always Be Worse"
                    value={series}
                    onChange={(e) => setSeries(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Gaya Gambar Komik (Art Style)
                  </label>
                  <select
                    value={artStyle}
                    onChange={(e) => setArtStyle(e.target.value as ComicArtStyle)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white focus:border-rose-500 focus:outline-none"
                  >
                    <option value="clean-lineart">Clean Lineart & Cel Shading (Folklore/Comic)</option>
                    <option value="manga-screentone">Manga Classic Screentone</option>
                    <option value="webtoon-color">Webtoon Full Color</option>
                    <option value="seinen-noir">Seinen Dark Noir</option>
                    <option value="american-comic">American Comic Book</option>
                    <option value="chibi-comic">Chibi Cute Comic</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Deskripsi Karakter & Ekspresi Khas
                </label>
                <textarea
                  rows={2}
                  placeholder="Deskripsikan kepribadian, latar belakang, dan ekspresi khas karakter..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* Specific Visual Anatomy Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Gaya / Warna Rambut & Penutup Kepala
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Rambut ikal cokelat + yarmulke hitam / Tichel rapat"
                    value={hair}
                    onChange={(e) => setHair(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Bentuk & Warna Mata
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Mata bulat ekspresif panik tertekan / Kacamata bulat bijak"
                    value={eyes}
                    onChange={(e) => setEyes(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Busana / Kostum Standar
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Kemeja putih, rompi/suspender cokelat, celana sopan"
                    value={outfit}
                    onChange={(e) => setOutfit(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Proporsi Tubuh
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 7.5 unit kepala (Standar Komik)"
                    value={proportions}
                    onChange={(e) => setProportions(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Ciri Khas Visual Paling Menonjol (pisahkan koma)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Yarmulke di kepala, suspender cokelat, kumis, keringat panik"
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  AI Consistency Prompt (English Visual Summary)
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Jewish husband named Mendel, wearing black skullcap (yarmulke) on curly brown hair, white shirt, suspenders, clean lineart cel shading"
                  value={promptSummary}
                  onChange={(e) => setPromptSummary(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white font-mono placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={handleCloseForm}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveCharacter}
                  className="flex items-center space-x-1.5 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingCharacterId ? "Simpan Perubahan Karakter" : "Simpan Karakter ke Database"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Characters Grid */}
      {filteredCharacters.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/50 rounded-2xl border border-zinc-800 text-zinc-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium text-zinc-300">Tidak ada karakter ditemukan</p>
          <p className="text-xs text-zinc-500 mt-1">
            Gunakan tombol "Tambah Karakter" di atas untuk mendaftarkan karakter komik Anda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredCharacters.map((char) => {
            const isGeneratingThis = generatingArtCharId === char.id;
            return (
              <div
                key={char.id}
                className="group bg-zinc-900/90 rounded-2xl border border-zinc-800 hover:border-rose-500/50 flex flex-col overflow-hidden transition-all duration-200 shadow-lg hover:shadow-rose-950/20"
              >
                {/* Image Preview */}
                <div className="h-56 bg-zinc-950 p-3 flex items-center justify-center relative overflow-hidden">
                  <img
                    src={char.baseImageData}
                    alt={char.name}
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain rounded-lg group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3 flex items-center space-x-1.5">
                    <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded bg-zinc-900/90 text-rose-300 border border-rose-500/30 backdrop-blur-sm">
                      {char.artStyle.replace("-", " ")}
                    </span>
                  </div>

                  {/* AI Quick Generate Overlay Button */}
                  <button
                    onClick={() => handleGenerateAiArtForCharacter(char)}
                    disabled={isGeneratingThis || batchGenerating}
                    className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/85 hover:bg-black text-amber-300 hover:text-amber-200 border border-amber-500/40 rounded-lg text-[10px] font-bold flex items-center space-x-1 backdrop-blur-sm transition-all shadow-md"
                    title="Generate atau perbarui gambar acuan karakter ini menggunakan Gemini Image AI"
                  >
                    {isGeneratingThis ? (
                      <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
                    ) : (
                      <Wand2 className="w-3 h-3 text-amber-400" />
                    )}
                    <span>{isGeneratingThis ? "Generating..." : "Generate AI Art"}</span>
                  </button>
                </div>

                {/* Info Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-white text-base tracking-tight truncate">
                        {char.name}
                      </h3>
                    </div>
                    <p className="text-xs text-rose-400 font-medium truncate">{char.role}</p>
                    {char.seriesTitle && (
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                        📖 {char.seriesTitle}
                      </p>
                    )}

                    <p className="text-xs text-zinc-400 line-clamp-2 mt-2 leading-relaxed">
                      {char.description}
                    </p>

                    {/* Key traits */}
                    {char.keyDistinctiveFeatures && char.keyDistinctiveFeatures.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {char.keyDistinctiveFeatures.slice(0, 3).map((feat, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300 font-mono"
                          >
                            {feat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-zinc-800/80 space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenModelSheet(char)}
                        className="flex-1 flex items-center justify-center space-x-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold transition-colors"
                        title="Buka Lembar Model & Pose Sheet"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Model Sheet</span>
                      </button>

                      <button
                        onClick={() => onSelectCharacterForPose(char)}
                        className="flex-1 flex items-center justify-center space-x-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-md transition-colors"
                        title="Buat Pose Baru untuk Karakter Ini"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Buat Pose</span>
                      </button>
                    </div>

                    {/* Edit & Delete Control Row */}
                    <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-zinc-800/50">
                      <button
                        onClick={() => handleOpenEditModal(char)}
                        className="flex items-center space-x-1 px-2.5 py-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg text-xs transition-colors"
                        title="Edit Data Karakter"
                      >
                        <Edit className="w-3.5 h-3.5 text-amber-400" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => setCharacterToDelete(char)}
                        className="flex items-center space-x-1 px-2.5 py-1 text-zinc-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg text-xs transition-colors"
                        title="Hapus Karakter"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
