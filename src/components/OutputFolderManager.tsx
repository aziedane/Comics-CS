import React, { useState, useEffect, useMemo } from "react";
import {
  Folder,
  FolderOpen,
  Download,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Sparkles,
  Layers,
  FileText,
  Image as ImageIcon,
  HardDrive,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  Info,
  SlidersHorizontal,
  PackageCheck,
  AlertTriangle,
  X,
  Maximize2,
} from "lucide-react";
import JSZip from "jszip";
import { ComicCharacter, GeneratedPose, OutputCategory, OutputFolderStats, OutputItem } from "../types";
import {
  fetchOutputsList,
  deleteOutputFromFolder,
  batchDeleteOutputsFromFolder,
  clearAllOutputsFromFolder,
  saveOutputToFolder,
} from "../services/api";
import { downloadImage } from "../utils/imageUtils";

interface OutputFolderManagerProps {
  characters: ComicCharacter[];
  savedPoses: GeneratedPose[];
  onOpenInStudio?: (output: OutputItem) => void;
  onOpenComparison?: (pose: GeneratedPose) => void;
}

const CATEGORY_LABELS: Record<OutputCategory, { label: string; color: string; icon: any }> = {
  pose: { label: "Studio Pose", color: "bg-rose-500/20 text-rose-300 border-rose-500/30", icon: Sparkles },
  "storyboard-panel": { label: "Panel Storyboard", color: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: FileText },
  "character-cutout": { label: "Cutout PNG Transparan", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", icon: Layers },
  "hd-background": { label: "Latar Belakang HD", color: "bg-amber-500/20 text-amber-300 border-amber-500/30", icon: ImageIcon },
  "character-sheet": { label: "Model Sheet Karakter", color: "bg-purple-500/20 text-purple-300 border-purple-500/30", icon: FolderOpen },
  custom: { label: "Kustom / Lainnya", color: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30", icon: Folder },
};

export const OutputFolderManager: React.FC<OutputFolderManagerProps> = ({
  characters,
  savedPoses,
  onOpenInStudio,
}) => {
  const [outputs, setOutputs] = useState<OutputItem[]>([]);
  const [stats, setStats] = useState<OutputFolderStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCharacter, setSelectedCharacter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "size" | "name">("newest");
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [activePreviewItem, setActivePreviewItem] = useState<OutputItem | null>(null);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState<boolean>(false);

  // Load outputs from server and merge with any offline local backups
  const loadOutputs = async () => {
    setIsLoading(true);
    try {
      const res = await fetchOutputsList();
      if (res.success) {
        setOutputs(res.items);
        setStats(res.stats);
      }
    } catch (err: any) {
      console.warn("Failed to load server outputs, using local gallery backup:", err);
      // Fallback: build from savedPoses if server has not saved anything yet
      if (savedPoses.length > 0) {
        const localItems: OutputItem[] = savedPoses.map((p) => ({
          id: p.id,
          title: p.title || `Pose ${p.characterName}`,
          category: (p.chapterTag?.includes("panel") ? "storyboard-panel" : "pose") as OutputCategory,
          filename: `${(p.title || "pose").toLowerCase().replace(/[^a-z0-9]/g, "_")}_${p.id}.png`,
          url: p.imageUrl,
          characterName: p.characterName,
          scriptSnippet: p.scriptSnippet,
          promptUsed: p.actionPrompt,
          cameraAngle: p.cameraAngle,
          artStyle: p.artStyle,
          aspectRatio: p.aspectRatio,
          mimeType: "image/png",
          createdAt: p.createdAt,
          tags: [p.artStyle, p.cameraAngle, p.actionType],
        }));
        setOutputs(localItems);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOutputs();
  }, [savedPoses]);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Filter and sort items
  const filteredItems = useMemo(() => {
    return outputs
      .filter((item) => {
        if (selectedCategory !== "all" && item.category !== selectedCategory) {
          return false;
        }
        if (selectedCharacter !== "all") {
          const charName = (item.characterName || "").toLowerCase();
          if (!charName.includes(selectedCharacter.toLowerCase())) {
            return false;
          }
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = (item.title || "").toLowerCase().includes(q);
          const matchChar = (item.characterName || "").toLowerCase().includes(q);
          const matchPrompt = (item.promptUsed || "").toLowerCase().includes(q);
          const matchScript = (item.scriptSnippet || "").toLowerCase().includes(q);
          const matchTags = (item.tags || []).some((t) => t.toLowerCase().includes(q));
          if (!matchTitle && !matchChar && !matchPrompt && !matchScript && !matchTags) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") return b.createdAt - a.createdAt;
        if (sortBy === "oldest") return a.createdAt - b.createdAt;
        if (sortBy === "size") return (b.fileSizeBytes || 0) - (a.fileSizeBytes || 0);
        if (sortBy === "name") return (a.title || "").localeCompare(b.title || "");
        return 0;
      });
  }, [outputs, selectedCategory, selectedCharacter, searchQuery, sortBy]);

  // Copy prompt helper
  const handleCopyPrompt = (item: OutputItem) => {
    const textToCopy = item.promptUsed || item.scriptSnippet || item.title;
    navigator.clipboard.writeText(textToCopy);
    setCopiedPromptId(item.id);
    showToast("Prompt berhasil disalin ke clipboard!");
    setTimeout(() => setCopiedPromptId(null), 2500);
  };

  // Delete single item
  const handleDeleteItem = async (item: OutputItem) => {
    try {
      await deleteOutputFromFolder(item.id);
      setOutputs((prev) => prev.filter((i) => i.id !== item.id));
      showToast(`File "${item.title}" dihapus dari folder output.`);
      if (activePreviewItem?.id === item.id) {
        setActivePreviewItem(null);
      }
    } catch (err: any) {
      showToast("Gagal menghapus file dari folder output.", "error");
    }
  };

  // Batch delete selected items
  const handleBatchDelete = async () => {
    if (selectedItemIds.size === 0) return;
    const ids: string[] = Array.from(selectedItemIds);
    try {
      await batchDeleteOutputsFromFolder(ids);
      setOutputs((prev) => prev.filter((i) => !selectedItemIds.has(i.id)));
      setSelectedItemIds(new Set());
      showToast(`${ids.length} file berhasil dihapus.`);
    } catch (err: any) {
      showToast("Gagal menghapus beberapa file terpilih.", "error");
    }
  };

  // Clear all outputs
  const handleClearAll = async () => {
    try {
      await clearAllOutputsFromFolder();
      setOutputs([]);
      setIsConfirmingClear(false);
      showToast("Folder output berhasil dikosongkan.");
    } catch (err: any) {
      showToast("Gagal mengosongkan folder output.", "error");
    }
  };

  // Download all as ZIP
  const handleDownloadAllZip = async () => {
    if (outputs.length === 0) {
      showToast("Belum ada file di folder output untuk diunduh.", "info");
      return;
    }

    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folderPoses = zip.folder("01_Studio_Poses");
      const folderStoryboards = zip.folder("02_Storyboard_Panels");
      const folderBgs = zip.folder("03_HD_Backgrounds");
      const folderModelSheets = zip.folder("04_Model_Sheets");
      const folderOther = zip.folder("05_Other_Assets");

      // Generate a markdown manifest
      let manifestMd = `# Comic CS Studio - Folder Output Manifest\n\n`;
      manifestMd += `Generated: ${new Date().toLocaleString()}\n`;
      manifestMd += `Total Files: ${outputs.length}\n\n`;
      manifestMd += `| No | Kategori | Karakter | Judul File | Dimensi / Rasio | Tanggal |\n`;
      manifestMd += `|---|---|---|---|---|---|\n`;

      let index = 1;
      for (const item of outputs) {
        manifestMd += `| ${index} | ${item.category} | ${item.characterName || "-"} | ${item.filename} | ${item.aspectRatio || "1:1"} | ${new Date(item.createdAt).toLocaleDateString()} |\n`;
        index++;

        // Determine target folder
        let targetFolder = folderPoses;
        if (item.category === "storyboard-panel") targetFolder = folderStoryboards;
        else if (item.category === "hd-background") targetFolder = folderBgs;
        else if (item.category === "character-sheet") targetFolder = folderModelSheets;
        else if (item.category === "custom" || item.category === "character-cutout") targetFolder = folderOther;

        // Fetch or parse image data
        if (item.url.startsWith("data:")) {
          const base64Data = item.url.replace(/^data:image\/[a-zA-Z0-9-+.]+;base64,/, "");
          targetFolder?.file(item.filename, base64Data, { base64: true });
        } else {
          try {
            const resp = await fetch(item.url);
            const blob = await resp.blob();
            targetFolder?.file(item.filename, blob);
          } catch (e) {
            console.warn(`Failed to fetch image for zip ${item.filename}:`, e);
          }
        }
      }

      zip.file("README_MANIFEST.md", manifestMd);

      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `comic_cs_studio_outputs_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast("Berhasil mengemas seluruh folder output ke dalam file ZIP!");
    } catch (err: any) {
      console.error("Zip error:", err);
      showToast("Gagal membuat file ZIP folder output.", "error");
    } finally {
      setIsZipping(false);
    }
  };

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedItemIds.size === filteredItems.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-3 text-sm font-medium border animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            notification.type === "success"
              ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/40"
              : notification.type === "error"
              ? "bg-rose-950/90 text-rose-200 border-rose-500/40"
              : "bg-zinc-900/90 text-zinc-200 border-zinc-700"
          }`}
        >
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-rose-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <Folder className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  Folder Output Studio
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono font-normal">
                    Auto-Save Aktif
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Semua hasil generasi pose, panel storyboard, latar belakang HD, dan model sheet otomatis tersimpan di server & cache lokal agar tidak hilang saat reload halaman.
                </p>
              </div>
            </div>
          </div>

          {/* Top action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="refresh-output-folder-btn"
              onClick={loadOutputs}
              disabled={isLoading}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all shadow-sm"
              title="Sinkronkan ulang daftar file dari server"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-rose-400" : ""}`} />
              <span>Sinkronkan</span>
            </button>

            <button
              id="download-all-outputs-zip-btn"
              onClick={handleDownloadAllZip}
              disabled={isZipping || outputs.length === 0}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-lg shadow-rose-950/50 transition-all disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isZipping ? "Mengemas ZIP..." : `Unduh Semua ZIP (${outputs.length})`}</span>
            </button>

            {outputs.length > 0 && (
              <button
                id="clear-all-outputs-btn"
                onClick={() => setIsConfirmingClear(true)}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-900/80 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-300 border border-zinc-800 hover:border-rose-800/60 transition-colors"
                title="Hapus semua file output"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kosongkan</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Live Disk Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Total File</span>
            <HardDrive className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-mono font-bold text-white">{outputs.length}</span>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {stats?.formattedTotalSize || "0 B"} di disk
            </p>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-400 text-xs">
            <span>Studio Pose</span>
            <Sparkles className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-mono font-bold text-white">
              {outputs.filter((i) => i.category === "pose").length}
            </span>
            <p className="text-[10px] text-zinc-500 mt-0.5">Pose dinamis</p>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-400 text-xs">
            <span>Storyboard</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-mono font-bold text-white">
              {outputs.filter((i) => i.category === "storyboard-panel").length}
            </span>
            <p className="text-[10px] text-zinc-500 mt-0.5">Panel naskah</p>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-400 text-xs">
            <span>Latar Belakang</span>
            <ImageIcon className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-mono font-bold text-white">
              {outputs.filter((i) => i.category === "hd-background").length}
            </span>
            <p className="text-[10px] text-zinc-500 mt-0.5">Scenery HD</p>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-400 text-xs">
            <span>Model Sheet</span>
            <FolderOpen className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-mono font-bold text-white">
              {outputs.filter((i) => i.category === "character-sheet").length}
            </span>
            <p className="text-[10px] text-zinc-500 mt-0.5">Desain karakter</p>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400 text-xs">
            <span>Status Penyimpanan</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-sm font-semibold text-emerald-400 flex items-center gap-1">
              Disk /outputs
            </span>
            <p className="text-[10px] text-zinc-500 mt-0.5">Tidak hilang saat reload</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan judul, nama karakter, prompt, atau tag..."
              className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Character & Sort Dropdowns */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <select
                value={selectedCharacter}
                onChange={(e) => setSelectedCharacter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-rose-500 appearance-none pr-8 cursor-pointer"
              >
                <option value="all">Semua Karakter</option>
                {characters.map((char) => (
                  <option key={char.id} value={char.name}>
                    {char.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-rose-500 appearance-none pr-8 cursor-pointer"
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="size">Ukuran File Terbesar</option>
                <option value="name">Nama File (A-Z)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs scrollbar-none">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
              selectedCategory === "all"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
            }`}
          >
            Semua ({outputs.length})
          </button>
          {Object.entries(CATEGORY_LABELS).map(([catKey, info]) => {
            const count = outputs.filter((i) => i.category === catKey).length;
            const Icon = info.icon;
            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === catKey
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{info.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-300">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Multi-select bar */}
        {selectedItemIds.size > 0 && (
          <div className="flex items-center justify-between bg-rose-950/40 border border-rose-500/30 rounded-xl px-4 py-2 text-xs">
            <span className="text-rose-300 font-semibold">
              {selectedItemIds.size} file terpilih
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBatchDelete}
                className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-sm transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Terpilih</span>
              </button>
              <button
                onClick={() => setSelectedItemIds(new Set())}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Gallery Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl">
          <RefreshCw className="w-8 h-8 text-rose-500 animate-spin mb-3" />
          <p className="text-sm font-semibold text-zinc-300">Memuat berkas dari folder output...</p>
          <p className="text-xs text-zinc-500 mt-1">Memeriksa manifest dan cache disk</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-zinc-900/20 border border-dashed border-zinc-800 rounded-2xl">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800/60 flex items-center justify-center text-zinc-500 mb-4">
            <FolderOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-zinc-200">Folder Output Masih Kosong</h3>
          <p className="text-xs text-zinc-400 max-w-md mt-1 mb-5">
            Setiap kali Anda men-generate pose di Studio Pose atau membuat panel di Naskah Storyboard, hasilnya akan otomatis tersimpan di sini secara permanen dan tidak akan hilang saat reload.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={loadOutputs}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Muat Ulang Folder</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const catInfo = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.custom;
            const isSelected = selectedItemIds.has(item.id);

            return (
              <div
                key={item.id}
                className={`group bg-zinc-900 border rounded-xl overflow-hidden transition-all duration-200 hover:border-zinc-700 hover:shadow-xl flex flex-col ${
                  isSelected ? "ring-2 ring-rose-500 border-rose-500" : "border-zinc-800"
                }`}
              >
                {/* Image Container with Overlay Controls */}
                <div className="relative aspect-square bg-zinc-950 overflow-hidden flex items-center justify-center">
                  <img
                    src={item.url}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Top Overlay Badges */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border backdrop-blur-md pointer-events-auto ${catInfo.color}`}
                    >
                      {catInfo.label}
                    </span>

                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(item.id)}
                      className="w-4 h-4 rounded text-rose-600 bg-zinc-900/80 border-zinc-700 focus:ring-0 cursor-pointer pointer-events-auto shadow"
                      title="Pilih item ini"
                    />
                  </div>

                  {/* Quick Action Hover Bar */}
                  <div className="absolute inset-0 bg-zinc-950/70 opacity-0 group-hover:opacity-100 backdrop-blur-xs transition-opacity duration-200 flex flex-col items-center justify-center p-3 gap-2">
                    <button
                      onClick={() => setActivePreviewItem(item)}
                      className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-white text-zinc-900 hover:bg-zinc-100 flex items-center justify-center space-x-1.5 shadow-lg transition-transform active:scale-95"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Lihat Detail Resolusi Tinggi</span>
                    </button>

                    <div className="flex items-center gap-1.5 w-full">
                      <button
                        onClick={() => downloadImage(item.url, item.filename)}
                        className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 flex items-center justify-center space-x-1 border border-zinc-700 transition-colors"
                        title="Unduh file"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Unduh</span>
                      </button>

                      {onOpenInStudio && item.category === "pose" && (
                        <button
                          onClick={() => onOpenInStudio(item)}
                          className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center space-x-1 transition-colors"
                          title="Buka di studio untuk variasi baru"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Studio</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Content & Metadata */}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                  <div>
                    <div className="flex items-start justify-between gap-1.5">
                      <h4 className="text-xs font-bold text-zinc-100 line-clamp-1 group-hover:text-rose-400 transition-colors">
                        {item.title}
                      </h4>
                    </div>

                    <div className="flex items-center space-x-1.5 mt-1 text-[11px] text-zinc-400">
                      <span className="font-semibold text-zinc-300">
                        {item.characterName || "Karakter"}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-zinc-500 text-[10px]">
                        {item.aspectRatio || "1:1"}
                      </span>
                    </div>

                    {item.promptUsed && (
                      <p className="text-[10px] text-zinc-500 line-clamp-2 mt-1 italic">
                        "{item.promptUsed}"
                      </p>
                    )}
                  </div>

                  {/* Footer metadata & Delete */}
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleCopyPrompt(item)}
                        className="p-1 hover:text-zinc-300 transition-colors rounded"
                        title="Salin prompt"
                      >
                        {copiedPromptId === item.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>

                      <button
                        onClick={() => handleDeleteItem(item)}
                        className="p-1 hover:text-rose-400 transition-colors rounded"
                        title="Hapus dari folder"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Clear All */}
      {isConfirmingClear && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Kosongkan Seluruh Folder Output?</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Tindakan ini akan menghapus semua {outputs.length} file gambar hasil yang tersimpan di disk server dan cache browser. File yang sudah dihapus tidak dapat dikembalikan.
              </p>
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsConfirmingClear(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-Resolution Preview Modal */}
      {activePreviewItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
              <div className="flex items-center space-x-2.5">
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border ${
                    CATEGORY_LABELS[activePreviewItem.category]?.color || ""
                  }`}
                >
                  {CATEGORY_LABELS[activePreviewItem.category]?.label || activePreviewItem.category}
                </span>
                <h3 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                  {activePreviewItem.title}
                </h3>
              </div>
              <button
                onClick={() => setActivePreviewItem(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Image Preview Canvas */}
              <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 flex items-center justify-center min-h-[280px]">
                <img
                  src={activePreviewItem.url}
                  alt={activePreviewItem.title}
                  referrerPolicy="no-referrer"
                  className="max-h-[420px] w-auto max-w-full object-contain rounded-lg shadow-xl"
                />
              </div>

              {/* Metadata Details */}
              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                    Karakter & Cerita
                  </label>
                  <p className="text-sm font-bold text-zinc-100">
                    {activePreviewItem.characterName || "Karakter"}
                  </p>
                  {activePreviewItem.scriptSnippet && (
                    <div className="mt-1.5 p-2.5 bg-zinc-950 border border-zinc-800/80 rounded-lg text-zinc-300">
                      <span className="text-[10px] text-zinc-500 block mb-0.5 font-mono">
                        Konteks Naskah:
                      </span>
                      "{activePreviewItem.scriptSnippet}"
                    </div>
                  )}
                </div>

                {activePreviewItem.promptUsed && (
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                        Prompt AI yang Digunakan
                      </label>
                      <button
                        onClick={() => handleCopyPrompt(activePreviewItem)}
                        className="text-rose-400 hover:text-rose-300 flex items-center space-x-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Salin Prompt</span>
                      </button>
                    </div>
                    <p className="p-2.5 mt-1 bg-zinc-950 border border-zinc-800/80 rounded-lg text-zinc-400 font-mono text-[11px] leading-relaxed select-all">
                      {activePreviewItem.promptUsed}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg">
                    <span className="text-zinc-500 block text-[10px]">Rasio Panel</span>
                    <span className="font-mono text-zinc-200">
                      {activePreviewItem.aspectRatio || "1:1"}
                    </span>
                  </div>

                  <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg">
                    <span className="text-zinc-500 block text-[10px]">Ukuran / Format</span>
                    <span className="font-mono text-zinc-200">
                      {activePreviewItem.formattedSize || activePreviewItem.mimeType}
                    </span>
                  </div>

                  <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg">
                    <span className="text-zinc-500 block text-[10px]">Gaya Seni</span>
                    <span className="text-zinc-200">{activePreviewItem.artStyle || "-"}</span>
                  </div>

                  <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-lg">
                    <span className="text-zinc-500 block text-[10px]">Lokasi Penyimpanan</span>
                    <span className="font-mono text-emerald-400 text-[10px]">
                      /outputs/{activePreviewItem.filename}
                    </span>
                  </div>
                </div>

                {/* Modal Action Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() =>
                      downloadImage(activePreviewItem.url, activePreviewItem.filename)
                    }
                    className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center space-x-2 shadow-lg shadow-rose-950/40 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Gambar Full Resolusi</span>
                  </button>

                  <button
                    onClick={() => handleDeleteItem(activePreviewItem)}
                    className="p-2.5 rounded-xl bg-zinc-800 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-300 border border-zinc-700 transition-colors"
                    title="Hapus file ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
