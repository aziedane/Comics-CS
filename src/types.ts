export type ComicArtStyle =
  | "manga-screentone"
  | "clean-lineart"
  | "webtoon-color"
  | "seinen-noir"
  | "american-comic"
  | "chibi-comic";

export type CameraAngle =
  | "eye-level"
  | "extreme-low-angle"
  | "high-angle-bird"
  | "dutch-angle"
  | "over-the-shoulder"
  | "close-up-dramatic"
  | "full-body-dynamic"
  | "mid-shot";

export type ActionCategory =
  | "dynamic-combat"
  | "defensive-guard"
  | "acrobatic-jump"
  | "sprint-run"
  | "stealth-crouch"
  | "sword-draw"
  | "spellcasting-aura"
  | "casual-standing"
  | "seated-thinking"
  | "emotional-breakdown"
  | "dramatic-turnaround"
  | "custom"
  | (string & {});

export type CharacterEmotion =
  | "determined"
  | "intense-rage"
  | "shock-gasp"
  | "smug-confident"
  | "despair-crying"
  | "gentle-smile"
  | "exhausted-panting"
  | "sinister-grin"
  | "neutral-focused"
  | "custom"
  | (string & {});

export type PanelAspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

export interface ComicCharacter {
  id: string;
  name: string;
  role: string;
  seriesTitle?: string;
  avatarUrl?: string;
  baseImageData: string; // Base64 data URL or sample image
  mimeType?: string;
  description: string;
  visualPromptSummary: string;
  hairStyleColor?: string;
  eyeDetails?: string;
  outfitBreakdown?: string;
  bodyProportions?: string;
  keyDistinctiveFeatures?: string[];
  artStyle: ComicArtStyle;
  tags: string[];
  createdAt: number;
}

export interface GeneratedPose {
  id: string;
  characterId?: string;
  characterName: string;
  title: string;
  scriptSnippet: string;
  actionPrompt: string;
  imageUrl: string;
  characterPngUrl?: string; // Transparent PNG cutout of the character (no background)
  backgroundJpegUrl?: string; // High-Definition JPEG background scenery
  hasSeparatedLayers?: boolean;
  referenceImageUrl?: string;
  cameraAngle: CameraAngle;
  actionType: ActionCategory;
  customActionType?: string;
  expression: CharacterEmotion;
  customExpression?: string;
  customFeatures?: string;
  artStyle: ComicArtStyle;
  aspectRatio: PanelAspectRatio;
  notes?: string;
  anatomyNotes?: string;
  sfx?: string;
  actionPacing?: string;
  isFavorite?: boolean;
  createdAt: number;
  chapterTag?: string;
  panelNumber?: number;
}

export interface ScriptPanel {
  panelNumber: number;
  characterName: string;
  actionDescription: string;
  dialogue?: string;
  cameraAngle: CameraAngle;
  expression: CharacterEmotion;
  recommendedAspectRatio: PanelAspectRatio;
  aiPosePrompt: string;
  soundEffect?: string;
  anatomyFocus?: string;
  status?: "idle" | "generating" | "done" | "error";
  generatedImageUrl?: string;
  generatedCharacterPngUrl?: string;
  generatedBackgroundJpegUrl?: string;
  errorMessage?: string;
}

export interface ParsedComicScript {
  title: string;
  summary: string;
  panels: ScriptPanel[];
}

export interface PromptEnhanceResult {
  enhancedPrompt: string;
  anatomyNotes: string;
  sfxSuggestions: string[];
  actionPacing: string;
}

export interface CharacterAnalysisResult {
  suggestedName: string;
  hairStyleColor: string;
  eyeDetails: string;
  outfitBreakdown: string;
  bodyProportions: string;
  keyDistinctiveFeatures: string[];
  artStyleDetected: string;
  promptSummary: string;
}

export type OutputCategory =
  | "pose"
  | "storyboard-panel"
  | "character-cutout"
  | "hd-background"
  | "character-sheet"
  | "custom";

export interface OutputItem {
  id: string;
  title: string;
  category: OutputCategory;
  filename: string;
  url: string; // server static path /outputs/xyz or data uri
  thumbnailUrl?: string;
  characterName?: string;
  scriptSnippet?: string;
  promptUsed?: string;
  cameraAngle?: string;
  artStyle?: string;
  aspectRatio?: string;
  fileSizeBytes?: number;
  formattedSize?: string;
  mimeType: string;
  createdAt: number;
  tags?: string[];
  isFavorite?: boolean;
}

export interface OutputFolderStats {
  totalFiles: number;
  totalSizeBytes: number;
  formattedTotalSize: string;
  categoryCounts: Record<OutputCategory, number>;
  latestUpdated?: number;
}

export interface GeneratedBackground {
  id: string;
  title: string;
  environmentPrompt: string;
  scriptSnippet?: string;
  imageUrl: string; // High-Definition JPEG scenery plate
  artStyle: ComicArtStyle;
  cameraAngle: CameraAngle;
  aspectRatio: PanelAspectRatio;
  lightingMood?: string;
  category?: string;
  associatedCharacterId?: string;
  associatedCharacterName?: string;
  associatedPoseId?: string;
  createdAt: number;
  isFavorite?: boolean;
}


