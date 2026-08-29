import React, { useEffect, useState } from "react";
import { ActiveTab, Navbar } from "./components/Navbar";
import { PoseGenerator } from "./components/PoseGenerator";
import { BackgroundStudio } from "./components/BackgroundStudio";
import { ScriptToStoryboard } from "./components/ScriptToStoryboard";
import { CharacterDatabase } from "./components/CharacterDatabase";
import { PoseGallery } from "./components/PoseGallery";
import { OutputFolderManager } from "./components/OutputFolderManager";
import { AnatomyGuideModal } from "./components/AnatomyGuideModal";
import { PoseComparisonModal } from "./components/PoseComparisonModal";
import { CharacterSheetModal } from "./components/CharacterSheetModal";
import { ComicCharacter, GeneratedPose, GeneratedBackground, OutputItem } from "./types";
import { PRESET_CHARACTERS } from "./data/presetCharacters";
import { checkServerHealth, fetchOutputsList } from "./services/api";

const STORAGE_KEY_CHARACTERS = "mangapose_characters_v1";
const STORAGE_KEY_POSES = "mangapose_saved_poses_v1";
const STORAGE_KEY_BACKGROUNDS = "mangapose_saved_backgrounds_v1";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("generator");
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);
  const [outputsCount, setOutputsCount] = useState<number>(0);

  // Characters State
  const [characters, setCharacters] = useState<ComicCharacter[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHARACTERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge missing presets so all folklore comic characters are always in the database
          const existingIds = new Set(parsed.map((c: any) => c.id));
          const missingPresets = PRESET_CHARACTERS.filter((p) => !existingIds.has(p.id));
          return [...parsed, ...missingPresets];
        }
      }
    } catch (e) {
      console.warn("Failed to load characters from storage:", e);
    }
    return PRESET_CHARACTERS;
  });

  // Selected character for Studio Pose
  const [selectedCharacter, setSelectedCharacter] = useState<ComicCharacter | null>(
    PRESET_CHARACTERS[0]
  );

  // Generated Poses Database State
  const [savedPoses, setSavedPoses] = useState<GeneratedPose[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_POSES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn("Failed to load poses from storage:", e);
    }
    return [];
  });

  // Generated Backgrounds Database State
  const [savedBackgrounds, setSavedBackgrounds] = useState<GeneratedBackground[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BACKGROUNDS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn("Failed to load backgrounds from storage:", e);
    }
    return [];
  });

  // Selected Pose for Background Studio alignment
  const [poseForBgStudio, setPoseForBgStudio] = useState<GeneratedPose | null>(null);

  // Modals state
  const [isAnatomyGuideOpen, setIsAnatomyGuideOpen] = useState<boolean>(false);
  const [activeComparisonPose, setActiveComparisonPose] = useState<GeneratedPose | null>(null);
  const [activeModelSheetChar, setActiveModelSheetChar] = useState<ComicCharacter | null>(null);

  // Save characters to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CHARACTERS, JSON.stringify(characters));
    } catch (e) {
      console.warn("Failed to save characters:", e);
    }
  }, [characters]);

  // Save poses to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_POSES, JSON.stringify(savedPoses));
    } catch (e) {
      console.warn("Failed to save poses:", e);
    }
  }, [savedPoses]);

  // Save backgrounds to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BACKGROUNDS, JSON.stringify(savedBackgrounds));
    } catch (e) {
      console.warn("Failed to save backgrounds:", e);
    }
  }, [savedBackgrounds]);

  // Check health and output count on mount
  useEffect(() => {
    checkServerHealth().then((health) => {
      setHasApiKey(health.hasApiKey);
    });

    fetchOutputsList()
      .then((res) => {
        if (res.success) {
          setOutputsCount(res.items.length);
        }
      })
      .catch(() => {});
  }, []);

  // Handlers
  const handleAddCharacter = (newChar: ComicCharacter) => {
    setCharacters((prev) => [newChar, ...prev]);
    setSelectedCharacter(newChar);
  };

  const handleUpdateCharacter = (updatedChar: ComicCharacter) => {
    setCharacters((prev) =>
      prev.map((c) => (c.id === updatedChar.id ? updatedChar : c))
    );
    if (selectedCharacter?.id === updatedChar.id) {
      setSelectedCharacter(updatedChar);
    }
  };

  const handleDeleteCharacter = (id: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
    if (selectedCharacter?.id === id) {
      setSelectedCharacter(characters[0] || null);
    }
  };

  const handleSavePose = (newPose: GeneratedPose) => {
    setSavedPoses((prev) => [newPose, ...prev]);
    setOutputsCount((prev) => prev + 1);
  };

  const handleDeletePose = (id: string) => {
    setSavedPoses((prev) => prev.filter((p) => p.id !== id));
  };

  const handleToggleFavoritePose = (id: string) => {
    setSavedPoses((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p))
    );
  };

  const handleSaveBackground = (newBg: GeneratedBackground) => {
    setSavedBackgrounds((prev) => [newBg, ...prev]);
    setOutputsCount((prev) => prev + 1);
  };

  const handleDeleteBackground = (id: string) => {
    setSavedBackgrounds((prev) => prev.filter((b) => b.id !== id));
  };

  const handleSelectCharacterForPose = (char: ComicCharacter) => {
    setSelectedCharacter(char);
    setActiveTab("generator");
  };

  const handleOpenPoseInBackgroundStudio = (pose: GeneratedPose) => {
    setPoseForBgStudio(pose);
    setActiveTab("backgrounds");
  };

  const handleOpenOutputInStudio = (output: OutputItem) => {
    if (output.category === "hd-background") {
      setActiveTab("backgrounds");
      return;
    }
    const foundChar = characters.find(
      (c) => c.name.toLowerCase() === (output.characterName || "").toLowerCase()
    );
    if (foundChar) {
      setSelectedCharacter(foundChar);
    }
    setActiveTab("generator");
  };

  const handleSyncFolkloreCharacters = () => {
    setCharacters((prev) => {
      const existingIds = new Set(prev.map((c) => c.id));
      const toAdd = PRESET_CHARACTERS.filter((p) => !existingIds.has(p.id));
      const updated = prev.map((c) => {
        const preset = PRESET_CHARACTERS.find((p) => p.id === c.id);
        return preset ? { ...preset, ...c, baseImageData: preset.baseImageData, visualPromptSummary: preset.visualPromptSummary, description: preset.description, outfitBreakdown: preset.outfitBreakdown } : c;
      });
      return [...toAdd, ...updated];
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenAnatomyGuide={() => setIsAnatomyGuideOpen(true)}
        savedPosesCount={savedPoses.length}
        savedBackgroundsCount={savedBackgrounds.length}
        charactersCount={characters.length}
        outputsCount={outputsCount}
        hasApiKey={hasApiKey}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "generator" && (
          <PoseGenerator
            characters={characters}
            selectedCharacter={selectedCharacter}
            onSelectCharacter={setSelectedCharacter}
            onSaveGeneratedPose={handleSavePose}
            onOpenComparison={(pose) => setActiveComparisonPose(pose)}
            onOpenInBackgroundStudio={handleOpenPoseInBackgroundStudio}
          />
        )}

        {activeTab === "backgrounds" && (
          <BackgroundStudio
            characters={characters}
            savedPoses={savedPoses}
            savedBackgrounds={savedBackgrounds}
            onSaveBackground={handleSaveBackground}
            onDeleteBackground={handleDeleteBackground}
            initialCharacterPose={poseForBgStudio}
          />
        )}

        {activeTab === "script" && (
          <ScriptToStoryboard
            characters={characters}
            selectedCharacter={selectedCharacter}
            onSelectCharacter={setSelectedCharacter}
            onSavePose={handleSavePose}
            onOpenComparison={(pose) => setActiveComparisonPose(pose)}
          />
        )}

        {activeTab === "characters" && (
          <CharacterDatabase
            characters={characters}
            onAddCharacter={handleAddCharacter}
            onUpdateCharacter={handleUpdateCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            onSelectCharacterForPose={handleSelectCharacterForPose}
            onOpenModelSheet={(char) => setActiveModelSheetChar(char)}
            onSyncFolkloreCharacters={handleSyncFolkloreCharacters}
          />
        )}

        {activeTab === "gallery" && (
          <PoseGallery
            poses={savedPoses}
            onDeletePose={handleDeletePose}
            onToggleFavorite={handleToggleFavoritePose}
            onOpenComparison={(pose) => setActiveComparisonPose(pose)}
          />
        )}

        {activeTab === "outputs" && (
          <OutputFolderManager
            characters={characters}
            savedPoses={savedPoses}
            onOpenInStudio={handleOpenOutputInStudio}
            onOpenComparison={(pose) => setActiveComparisonPose(pose)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/80 py-6 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-mono font-bold text-zinc-400">Comic CS Studio</span>
            <span>•</span>
            <span>AI Comic Character Pose, Anatomy & Background Studio for Mangakas & Comic Artists</span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsAnatomyGuideOpen(true)}
              className="hover:text-rose-400 transition-colors"
            >
              Panduan Anatomi Komik
            </button>
            <span>•</span>
            <span>Folder Output: <code className="text-zinc-400 font-mono">/outputs</code> (Auto-Persist)</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AnatomyGuideModal
        isOpen={isAnatomyGuideOpen}
        onClose={() => setIsAnatomyGuideOpen(false)}
      />

      <PoseComparisonModal
        pose={activeComparisonPose}
        referenceImage={selectedCharacter?.baseImageData}
        onClose={() => setActiveComparisonPose(null)}
      />

      <CharacterSheetModal
        character={activeModelSheetChar}
        poses={savedPoses}
        onClose={() => setActiveModelSheetChar(null)}
      />
    </div>
  );
}

