import React, { useState } from "react";
import {
  Layers,
  Search,
  Star,
  Download,
  Trash2,
  Sliders,
  Copy,
  Check,
  SplitSquareVertical,
  Filter,
  Grid,
  AlertTriangle,
  Package,
  User,
  Trees,
  ChevronDown,
} from "lucide-react";
import { ActionCategory, CameraAngle, GeneratedPose } from "../types";
import {
  createTransparentPngCutout,
  downloadImage,
  downloadPosePackageZip,
} from "../utils/imageUtils";

interface PoseGalleryProps {
  poses: GeneratedPose[];
  onDeletePose: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onOpenComparison: (pose: GeneratedPose) => void;
}

export const PoseGallery: React.FC<PoseGalleryProps> = ({
  poses,
  onDeletePose,
  onToggleFavorite,
  onOpenComparison,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [poseToDelete, setPoseToDelete] = useState<GeneratedPose | null>(null);
  const [downloadMenuPoseId, setDownloadMenuPoseId] = useState<string | null>(null);
  const [zippingPoseId, setZippingPoseId] = useState<string | null>(null);

  const filteredPoses = poses.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      p.characterName.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q) ||
      p.scriptSnippet.toLowerCase().includes(q) ||
      p.actionPrompt.toLowerCase().includes(q) ||
      p.actionType.toLowerCase().includes(q);

    const matchesCategory = selectedCategory === "all" || p.actionType === selectedCategory;
    const matchesFav = !onlyFavorites || p.isFavorite;

    return matchesSearch && matchesCategory && matchesFav;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadCharacterPng = async (pose: GeneratedPose) => {
    let charUrl = pose.characterPngUrl;
    if (!charUrl) {
      charUrl = await createTransparentPngCutout(pose.imageUrl);
    }
    downloadImage(charUrl, `${pose.characterName.replace(/\s+/g, "_")}-Karakter-Transparan.png`);
    setDownloadMenuPoseId(null);
  };

  const handleDownloadBgJpeg = (pose: GeneratedPose) => {
    if (pose.backgroundJpegUrl) {
      downloadImage(pose.backgroundJpegUrl, `${pose.characterName.replace(/\s+/g, "_")}-Latar-Belakang-HD.jpg`);
    } else {
      downloadImage(pose.imageUrl, `${pose.characterName.replace(/\s+/g, "_")}-Latar-Belakang.jpg`);
    }
    setDownloadMenuPoseId(null);
  };

  const handleDownloadZipPackage = async (pose: GeneratedPose) => {
    setZippingPoseId(pose.id);
    try {
      await downloadPosePackageZip(pose);
    } catch (err) {
      console.error("ZIP Error:", err);
    } finally {
      setZippingPoseId(null);
      setDownloadMenuPoseId(null);
    }
  };

  const handleDownloadComposite = (pose: GeneratedPose) => {
    downloadImage(pose.imageUrl, `${pose.characterName.replace(/\s+/g, "_")}-Komposit-${pose.id.slice(0, 6)}.png`);
    setDownloadMenuPoseId(null);
  };

  const confirmDeletePose = () => {
    if (!poseToDelete) return;
    onDeletePose(poseToDelete.id);
    setPoseToDelete(null);
  };

  return (
    <div className="space-y-6 text-zinc-100 animate-fade-in relative">
      {/* Delete Confirmation Modal */}
      {poseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-400">
              <div className="p-3 bg-red-950/60 border border-red-800/60 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Hapus Pose?</h3>
                <p className="text-xs text-zinc-400">Pose ini akan dihapus dari koleksi galeri.</p>
              </div>
            </div>

            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center space-x-3">
              <img
                src={poseToDelete.imageUrl}
                alt={poseToDelete.title}
                className="w-12 h-12 object-contain rounded bg-zinc-900"
              />
              <div className="text-xs truncate">
                <div className="font-bold text-white truncate">{poseToDelete.title}</div>
                <div className="text-zinc-400 truncate">Karakter: {poseToDelete.characterName}</div>
              </div>
            </div>

            <p className="text-xs text-zinc-400">
              Apakah Anda yakin ingin menghapus pose{" "}
              <strong className="text-white">"{poseToDelete.title}"</strong>?
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setPoseToDelete(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmDeletePose}
                className="flex items-center space-x-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-red-950/50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Hapus Pose</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header & Filters */}
      <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Layers className="w-6 h-6 text-rose-500" />
              Database Pose & Perpustakaan Gerakan Komik ({poses.length})
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Koleksi seluruh pose karakter siap diekspor dalam format <strong>PNG Karakter Transparan</strong>, <strong>JPEG Background HD</strong>, atau <strong>Paket ZIP</strong>.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari naskah, nama, aksi..."
              className="pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 w-full sm:w-64"
            />
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800/80 text-xs">
          <div className="flex items-center space-x-2 overflow-x-auto pb-1">
            <span className="text-zinc-500 font-medium flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Kategori:
            </span>
            {[
              { id: "all", label: "Semua Pose" },
              { id: "dynamic-combat", label: "Pertarungan" },
              { id: "acrobatic-jump", label: "Lompatan" },
              { id: "sword-draw", label: "Hunus Pedang" },
              { id: "spellcasting-aura", label: "Sihir/Aura" },
              { id: "sprint-run", label: "Lari" },
              { id: "emotional-breakdown", label: "Emosi/Jatuh" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? "bg-rose-600 text-white font-semibold"
                    : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg border transition-colors ${
              onlyFavorites
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold"
                : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white"
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${onlyFavorites ? "fill-amber-400 text-amber-400" : ""}`} />
            <span>Favorit ({poses.filter((p) => p.isFavorite).length})</span>
          </button>
        </div>
      </div>

      {/* Poses Grid */}
      {filteredPoses.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/50 rounded-2xl border border-zinc-800 text-zinc-500 space-y-2">
          <Layers className="w-12 h-12 mx-auto opacity-30" />
          <p className="text-sm font-semibold text-zinc-300">Tidak ada pose yang cocok</p>
          <p className="text-xs text-zinc-500">
            Coba ganti kata kunci pencarian atau buat pose baru di tab <strong>Studio Pose</strong>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredPoses.map((pose) => (
            <div
              key={pose.id}
              className="group bg-zinc-900/90 rounded-2xl border border-zinc-800 hover:border-rose-500/50 flex flex-col overflow-hidden transition-all duration-200 shadow-lg hover:shadow-rose-950/20 relative"
            >
              {/* Image Preview */}
              <div className="h-60 bg-zinc-950 p-2.5 flex items-center justify-center relative overflow-hidden">
                <img
                  src={pose.characterPngUrl || pose.imageUrl}
                  alt={pose.title}
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain rounded group-hover:scale-105 transition-transform duration-300"
                />

                {/* Top Badges */}
                <div className="absolute top-2.5 left-2.5 flex items-center space-x-1.5">
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-zinc-950/90 text-rose-300 border border-rose-500/30 backdrop-blur-sm">
                    {pose.characterName}
                  </span>
                  {pose.backgroundJpegUrl && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-sky-950/90 text-sky-300 border border-sky-700/60 backdrop-blur-sm">
                      Layer HD
                    </span>
                  )}
                </div>

                <div className="absolute top-2.5 right-2.5 flex items-center space-x-1">
                  <button
                    onClick={() => onToggleFavorite(pose.id)}
                    className="p-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 backdrop-blur-sm transition-colors"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        pose.isFavorite ? "fill-amber-400 text-amber-400" : ""
                      }`}
                    />
                  </button>
                </div>

                {/* Camera angle badge */}
                <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded bg-black/80 text-[10px] text-zinc-300 font-mono capitalize">
                  📷 {pose.cameraAngle.replace("-", " ")}
                </div>
              </div>

              {/* Info Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3 text-xs">
                <div className="space-y-1.5">
                  <div className="font-bold text-white text-sm truncate">{pose.title}</div>
                  <p className="text-zinc-400 text-[11px] line-clamp-2 leading-relaxed">
                    <span className="text-rose-400 font-semibold">Naskah: </span>
                    {pose.scriptSnippet || pose.actionPrompt}
                  </p>

                  {pose.sfx && (
                    <div className="text-[10px] font-mono text-amber-400 font-bold">
                      SFX: {pose.sfx}
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-1.5 relative">
                  <button
                    onClick={() => onOpenComparison(pose)}
                    className="flex-1 flex items-center justify-center space-x-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold transition-colors"
                    title="Bandingkan Gambar Asal vs Pose Ini"
                  >
                    <SplitSquareVertical className="w-3.5 h-3.5 text-rose-400" />
                    <span>Bandingkan</span>
                  </button>

                  <button
                    onClick={() => handleCopy(pose.id, pose.actionPrompt)}
                    className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                    title="Salin Prompt"
                  >
                    {copiedId === pose.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Download Menu Toggle Button */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setDownloadMenuPoseId(downloadMenuPoseId === pose.id ? null : pose.id)
                      }
                      className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-0.5"
                      title="Menu Unduh Layer (PNG Transparan / JPEG HD / ZIP)"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <ChevronDown className="w-2.5 h-2.5" />
                    </button>

                    {/* Popover Download Menu */}
                    {downloadMenuPoseId === pose.id && (
                      <div className="absolute right-0 bottom-full mb-2 w-52 bg-zinc-950 border border-zinc-700 rounded-xl p-1.5 shadow-2xl z-30 space-y-1 text-[11px] animate-fade-in">
                        <div className="px-2 py-1 font-bold text-zinc-400 text-[10px] uppercase border-b border-zinc-800">
                          Pilihan Unduh Format:
                        </div>
                        <button
                          onClick={() => handleDownloadCharacterPng(pose)}
                          className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-emerald-950/60 text-emerald-300 rounded-lg transition-colors text-left"
                        >
                          <User className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Karakter Saja (.PNG Transparan)</span>
                        </button>

                        <button
                          onClick={() => handleDownloadBgJpeg(pose)}
                          className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-sky-950/60 text-sky-300 rounded-lg transition-colors text-left"
                        >
                          <Trees className="w-3.5 h-3.5 text-sky-400" />
                          <span>Latar Belakang (.JPG HD)</span>
                        </button>

                        <button
                          onClick={() => handleDownloadZipPackage(pose)}
                          disabled={zippingPoseId === pose.id}
                          className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-amber-950/60 text-amber-300 rounded-lg transition-colors text-left font-semibold"
                        >
                          <Package className="w-3.5 h-3.5 text-amber-400" />
                          <span>{zippingPoseId === pose.id ? "Mengompres..." : "Paket Lengkap (.ZIP)"}</span>
                        </button>

                        <button
                          onClick={() => handleDownloadComposite(pose)}
                          className="w-full flex items-center space-x-2 px-2.5 py-1.5 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-colors text-left border-t border-zinc-800/80"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Komposit Penuh (.PNG)</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setPoseToDelete(pose)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Hapus Pose"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
