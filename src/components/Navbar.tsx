import React from "react";
import {
  Sparkles,
  BookOpen,
  Layers,
  Users,
  Image as ImageIcon,
  Compass,
  FileText,
  CheckCircle2,
  AlertCircle,
  Folder,
} from "lucide-react";

export type ActiveTab = "generator" | "backgrounds" | "script" | "characters" | "gallery" | "outputs";

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenAnatomyGuide: () => void;
  savedPosesCount: number;
  savedBackgroundsCount?: number;
  charactersCount: number;
  outputsCount?: number;
  hasApiKey: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAnatomyGuide,
  savedPosesCount,
  savedBackgroundsCount = 0,
  charactersCount,
  outputsCount = 0,
  hasApiKey,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 text-zinc-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTab("generator")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-950/50 ring-1 ring-white/20">
              <span className="font-black text-base tracking-wider text-white font-mono">CS</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-white font-mono">
                  Comic <span className="text-rose-500">CS</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Studio Komikus
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-sans hidden sm:block">
                Generator Anatomi & Database Pose Karakter Komik
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
            <button
              id="tab-generator-btn"
              onClick={() => onSelectTab("generator")}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === "generator"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-950/40"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span className="whitespace-nowrap">Studio Pose</span>
            </button>

            <button
              id="tab-backgrounds-btn"
              onClick={() => onSelectTab("backgrounds")}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === "backgrounds"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-950/40"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              }`}
            >
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              <span className="whitespace-nowrap">Studio Latar</span>
            </button>

            <button
              id="tab-script-btn"
              onClick={() => onSelectTab("script")}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === "script"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-950/40"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span className="whitespace-nowrap">Naskah ke Storyboard</span>
            </button>

            <button
              id="tab-characters-btn"
              onClick={() => onSelectTab("characters")}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === "characters"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-950/40"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="whitespace-nowrap">Karakter ({charactersCount})</span>
            </button>

            <button
              id="tab-gallery-btn"
              onClick={() => onSelectTab("gallery")}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === "gallery"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-950/40"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span className="whitespace-nowrap">Database Pose ({savedPosesCount})</span>
            </button>

            <button
              id="tab-outputs-btn"
              onClick={() => onSelectTab("outputs")}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === "outputs"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-950/40"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              }`}
            >
              <Folder className="w-4 h-4 text-amber-400" />
              <span className="whitespace-nowrap">Folder Output {outputsCount > 0 ? `(${outputsCount})` : ""}</span>
            </button>
          </nav>

          {/* Quick Tools & Server Health */}
          <div className="flex items-center space-x-3">
            <button
              id="open-anatomy-guide-btn"
              onClick={onOpenAnatomyGuide}
              className="hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 transition-colors shadow-sm"
              title="Buka panduan proporsi dan anatomi komik"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Panduan Anatomi</span>
            </button>

            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono border ${
                hasApiKey
                  ? "bg-emerald-950/40 text-emerald-400 border-emerald-800/60"
                  : "bg-amber-950/40 text-amber-400 border-amber-800/60"
              }`}
              title={hasApiKey ? "Gemini Engine Siap" : "Koneksi API Standby"}
            >
              {hasApiKey ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden md:inline">Gemini AI Ready</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden md:inline">AI Config</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
