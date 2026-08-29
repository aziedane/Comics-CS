import { ComicCharacter } from "../types";

// High-quality SVG base64 character sketches for comic artist templates
function createComicCharacterSvg(type: "mendel" | "rav" | "sarah" | "children" | "animals" | "swordsman" | "cyberpunk" | "mage" | "detective"): string {
  let innerSvg = "";
  if (type === "mendel") {
    innerSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="400" height="400" fill="#f8fafc"/>
        <!-- Background panel frame -->
        <rect x="20" y="20" width="360" height="360" rx="8" fill="#ffffff" stroke="#09090b" stroke-width="4"/>
        <!-- Character Torso & Shirt -->
        <path d="M130 240 L270 240 L290 380 L110 380 Z" fill="#e2e8f0" stroke="#09090b" stroke-width="3.5"/>
        <!-- Suspenders / Vest -->
        <line x1="160" y1="240" x2="155" y2="380" stroke="#78350f" stroke-width="8"/>
        <line x1="240" y1="240" x2="245" y2="380" stroke="#78350f" stroke-width="8"/>
        <!-- White Collar -->
        <polygon points="175,240 200,280 225,240" fill="#ffffff" stroke="#09090b" stroke-width="3"/>
        <!-- Head & Neck -->
        <rect x="185" y="195" width="30" height="45" fill="#fed7aa" stroke="#09090b" stroke-width="3"/>
        <!-- Head Outline -->
        <path d="M150 130 Q200 95 250 130 Q255 200 200 225 Q145 200 150 130 Z" fill="#ffedd5" stroke="#09090b" stroke-width="4"/>
        <!-- Yarmulke / Kippah (Skullcap) -->
        <path d="M165 95 Q200 65 235 95 Q200 85 165 95 Z" fill="#1e293b" stroke="#09090b" stroke-width="3.5"/>
        <!-- Curly Brown Hair around skullcap -->
        <path d="M145 130 Q135 150 148 170 Q138 190 152 195 M255 130 Q265 150 252 170 Q262 190 248 195" fill="none" stroke="#78350f" stroke-width="4"/>
        <!-- Comedic Stressed Eyebrows -->
        <path d="M165 145 Q180 135 190 145" fill="none" stroke="#09090b" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M210 145 Q220 135 235 145" fill="none" stroke="#09090b" stroke-width="3.5" stroke-linecap="round"/>
        <!-- Big Expressive Eyes -->
        <ellipse cx="178" cy="155" rx="8" ry="11" fill="#ffffff" stroke="#09090b" stroke-width="2.5"/>
        <circle cx="178" cy="155" r="4" fill="#09090b"/>
        <ellipse cx="222" cy="155" rx="8" ry="11" fill="#ffffff" stroke="#09090b" stroke-width="2.5"/>
        <circle cx="222" cy="155" r="4" fill="#09090b"/>
        <!-- Big Round Nose -->
        <path d="M195 155 Q200 178 208 178 Q212 178 210 170" fill="none" stroke="#09090b" stroke-width="3.5"/>
        <!-- Open Comedic Stressed Mouth -->
        <path d="M185 195 Q200 215 215 195 Z" fill="#be123c" stroke="#09090b" stroke-width="3"/>
        <!-- Sweat drops (Stress / Comic Chaos) -->
        <path d="M250 115 Q255 125 250 130 Q245 125 250 115 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="1.5"/>
        <text x="200" y="365" font-family="sans-serif" font-size="13" font-weight="bold" fill="#0f172a" text-anchor="middle">MENDEL (HUSBAND) - YARMULKE</text>
      </svg>
    `;
  } else if (type === "rav") {
    innerSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="400" height="400" fill="#f8fafc"/>
        <rect x="20" y="20" width="360" height="360" rx="8" fill="#ffffff" stroke="#09090b" stroke-width="4"/>
        <!-- Black Frock Coat -->
        <path d="M120 250 L280 250 L300 380 L100 380 Z" fill="#18181b" stroke="#09090b" stroke-width="4"/>
        <path d="M175 250 L200 310 L225 250 Z" fill="#f8fafc" stroke="#09090b" stroke-width="2"/>
        <!-- Head -->
        <path d="M155 130 Q200 100 245 130 Q250 190 200 210 Q150 190 155 130 Z" fill="#ffedd5" stroke="#09090b" stroke-width="3.5"/>
        <!-- Traditional Black Rabbi Hat / Fedora -->
        <ellipse cx="200" cy="115" rx="90" ry="18" fill="#18181b" stroke="#09090b" stroke-width="3.5"/>
        <path d="M145 115 L150 45 L250 45 L255 115 Z" fill="#18181b" stroke="#09090b" stroke-width="3.5"/>
        <rect x="145" y="105" width="110" height="10" fill="#3f3f46"/>
        <!-- Long White Beard -->
        <path d="M150 170 Q130 250 170 310 Q200 340 230 310 Q270 250 250 170 Q200 200 150 170 Z" fill="#f4f4f5" stroke="#09090b" stroke-width="3.5"/>
        <!-- Round Glasses / Spectacles -->
        <circle cx="178" cy="148" r="14" fill="#ffffff" stroke="#09090b" stroke-width="3" opacity="0.9"/>
        <circle cx="222" cy="148" r="14" fill="#ffffff" stroke="#09090b" stroke-width="3" opacity="0.9"/>
        <line x1="192" y1="148" x2="208" y2="148" stroke="#09090b" stroke-width="3"/>
        <circle cx="178" cy="148" r="3.5" fill="#09090b"/>
        <circle cx="222" cy="148" r="3.5" fill="#09090b"/>
        <!-- Wise Smiling Wrinkles & Eyebrows -->
        <path d="M165 130 Q178 122 190 128" fill="none" stroke="#a1a1aa" stroke-width="3.5"/>
        <path d="M210 128 Q222 122 235 130" fill="none" stroke="#a1a1aa" stroke-width="3.5"/>
        <!-- Gentle Smile in Beard -->
        <path d="M188 182 Q200 195 212 182" fill="none" stroke="#09090b" stroke-width="3.5" stroke-linecap="round"/>
        <text x="200" y="365" font-family="sans-serif" font-size="13" font-weight="bold" fill="#0f172a" text-anchor="middle">THE RAV (RABBI) - WISE HAT & BEARD</text>
      </svg>
    `;
  } else if (type === "sarah") {
    innerSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="400" height="400" fill="#f8fafc"/>
        <rect x="20" y="20" width="360" height="360" rx="8" fill="#ffffff" stroke="#09090b" stroke-width="4"/>
        <!-- Modest High-Neckline Dress with Elbow Sleeves -->
        <path d="M125 240 L275 240 L295 380 L105 380 Z" fill="#ec4899" stroke="#09090b" stroke-width="3.5"/>
        <!-- High Collar & Long Apron -->
        <path d="M160 240 L200 260 L240 240 Z" fill="#ffffff" stroke="#09090b" stroke-width="2.5"/>
        <path d="M160 260 L240 260 L250 380 L150 380 Z" fill="#fdf2f8" stroke="#09090b" stroke-width="2.5"/>
        <!-- Head -->
        <path d="M155 135 Q200 105 245 135 Q250 195 200 220 Q150 195 155 135 Z" fill="#ffedd5" stroke="#09090b" stroke-width="3.5"/>
        <!-- Modest Tichel (Head Scarf Wrap - NO hair showing in front) -->
        <path d="M145 145 Q140 75 200 70 Q260 75 255 145 Q245 130 200 130 Q155 130 145 145 Z" fill="#be185d" stroke="#09090b" stroke-width="4"/>
        <path d="M245 140 Q260 170 265 210 Q255 210 245 170 Z" fill="#9d174d" stroke="#09090b" stroke-width="3"/>
        <!-- Expressive Shocked Eyebrows -->
        <path d="M165 140 L185 130" stroke="#09090b" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M215 130 L235 140" stroke="#09090b" stroke-width="3.5" stroke-linecap="round"/>
        <!-- Wide Shocked Eyes -->
        <circle cx="176" cy="152" r="10" fill="#ffffff" stroke="#09090b" stroke-width="2.5"/>
        <circle cx="176" cy="152" r="4.5" fill="#09090b"/>
        <circle cx="224" cy="152" r="10" fill="#ffffff" stroke="#09090b" stroke-width="2.5"/>
        <circle cx="224" cy="152" r="4.5" fill="#09090b"/>
        <!-- Screaming / Frustrated Comic Mouth -->
        <ellipse cx="200" cy="188" rx="14" ry="18" fill="#be123c" stroke="#09090b" stroke-width="3.5"/>
        <path d="M190 180 Q200 185 210 180" fill="#ffffff" stroke="#09090b" stroke-width="2"/>
        <text x="200" y="365" font-family="sans-serif" font-size="13" font-weight="bold" fill="#0f172a" text-anchor="middle">SARAH (WIFE) - TICHEL & MODEST DRESS</text>
      </svg>
    `;
  } else if (type === "children") {
    innerSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="400" height="400" fill="#f8fafc"/>
        <rect x="20" y="20" width="360" height="360" rx="8" fill="#ffffff" stroke="#09090b" stroke-width="4"/>
        <!-- Boy on Left with Yarmulke -->
        <g transform="translate(-40, 30)">
          <!-- Body -->
          <rect x="140" y="220" width="60" height="90" rx="6" fill="#0284c7" stroke="#09090b" stroke-width="3"/>
          <!-- Head -->
          <circle cx="170" cy="160" r="35" fill="#ffedd5" stroke="#09090b" stroke-width="3"/>
          <!-- Yarmulke -->
          <path d="M150 135 Q170 115 190 135 Z" fill="#1e293b" stroke="#09090b" stroke-width="2.5"/>
          <!-- Eyes & Happy/Panicking Mouth -->
          <circle cx="160" cy="158" r="3.5" fill="#09090b"/>
          <circle cx="180" cy="158" r="3.5" fill="#09090b"/>
          <path d="M162 175 Q170 188 178 175 Z" fill="#e11d48" stroke="#09090b" stroke-width="2"/>
        </g>
        <!-- Girl on Right in Modest Dress -->
        <g transform="translate(110, 40)">
          <!-- Long Dress covering knees, long sleeves -->
          <path d="M140 210 L190 210 L205 310 L125 310 Z" fill="#10b981" stroke="#09090b" stroke-width="3"/>
          <!-- Head -->
          <circle cx="165" cy="155" r="32" fill="#ffedd5" stroke="#09090b" stroke-width="3"/>
          <!-- Modest Ponytail/Hair -->
          <path d="M138 150 Q165 125 192 150 M192 150 Q215 180 210 210" fill="none" stroke="#78350f" stroke-width="5"/>
          <!-- Eyes & Expression -->
          <circle cx="156" cy="155" r="3" fill="#09090b"/>
          <circle cx="174" cy="155" r="3" fill="#09090b"/>
          <ellipse cx="165" cy="172" rx="6" ry="8" fill="#e11d48" stroke="#09090b" stroke-width="2"/>
        </g>
        <text x="200" y="365" font-family="sans-serif" font-size="13" font-weight="bold" fill="#0f172a" text-anchor="middle">CHILDREN - MODEST & YARMULKE</text>
      </svg>
    `;
  } else if (type === "animals") {
    innerSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="400" height="400" fill="#f8fafc"/>
        <rect x="20" y="20" width="360" height="360" rx="8" fill="#ffffff" stroke="#09090b" stroke-width="4"/>
        
        <!-- Big Cow in Center/Background -->
        <g transform="translate(30, 20)">
          <!-- Cow Body -->
          <ellipse cx="180" cy="220" rx="110" ry="70" fill="#ffffff" stroke="#09090b" stroke-width="3.5"/>
          <!-- Black spots -->
          <path d="M130 180 Q160 170 170 200 Q150 230 120 210 Z" fill="#18181b"/>
          <path d="M210 200 Q240 190 260 220 Q230 250 200 230 Z" fill="#18181b"/>
          <!-- Cow Head -->
          <path d="M80 150 Q110 120 140 150 Q150 200 110 220 Q70 200 80 150 Z" fill="#ffffff" stroke="#09090b" stroke-width="3.5"/>
          <!-- Horns & Ears -->
          <path d="M85 130 Q70 110 65 115 Q75 135 85 135" fill="#fef08a" stroke="#09090b" stroke-width="2"/>
          <path d="M135 130 Q150 110 155 115 Q145 135 135 135" fill="#fef08a" stroke="#09090b" stroke-width="2"/>
          <ellipse cx="110" cy="195" rx="20" ry="12" fill="#fbcfe8" stroke="#09090b" stroke-width="2"/>
          <!-- Eyes -->
          <circle cx="95" cy="160" r="4" fill="#09090b"/>
          <circle cx="125" cy="160" r="4" fill="#09090b"/>
        </g>

        <!-- Mischievous Goat on Left -->
        <g transform="translate(40, 180)">
          <!-- Goat Body & Head -->
          <ellipse cx="90" cy="110" rx="40" ry="25" fill="#e2e8f0" stroke="#09090b" stroke-width="3"/>
          <path d="M60 80 Q75 60 90 80 Q95 110 75 115 Z" fill="#f1f5f9" stroke="#09090b" stroke-width="2.5"/>
          <!-- Horns & Beard -->
          <path d="M65 65 Q55 45 50 50" stroke="#09090b" stroke-width="3" fill="none"/>
          <path d="M75 65 Q80 45 85 50" stroke="#09090b" stroke-width="3" fill="none"/>
          <polygon points="70,115 75,128 80,115" fill="#ffffff" stroke="#09090b" stroke-width="2"/>
          <!-- Tablecloth in mouth -->
          <path d="M75 105 Q90 115 110 110 L115 125 L75 112 Z" fill="#ef4444" stroke="#991b1b" stroke-width="2"/>
        </g>

        <!-- Flapping Chicken on Right -->
        <g transform="translate(250, 200)">
          <!-- Body -->
          <ellipse cx="60" cy="90" rx="35" ry="25" fill="#fef08a" stroke="#09090b" stroke-width="3"/>
          <circle cx="35" cy="70" r="16" fill="#fef08a" stroke="#09090b" stroke-width="3"/>
          <!-- Beak & Red Comb -->
          <polygon points="20,70 10,74 20,78" fill="#f97316" stroke="#09090b" stroke-width="2"/>
          <path d="M30 54 Q35 45 40 54 Q45 45 50 54" fill="#ef4444" stroke="#09090b" stroke-width="2"/>
          <!-- Flapping Wing & Feathers -->
          <path d="M50 85 Q75 60 90 80 Q70 100 50 85 Z" fill="#fde047" stroke="#09090b" stroke-width="2.5"/>
          <!-- Feathers floating -->
          <path d="M15 40 Q25 35 20 45 Z" fill="#ffffff" stroke="#09090b" stroke-width="1.5"/>
        </g>

        <text x="200" y="375" font-family="sans-serif" font-size="12" font-weight="bold" fill="#0f172a" text-anchor="middle">ANIMALS - CHICKENS, GOAT & COW</text>
      </svg>
    `;
  } else if (type === "swordsman") {
    innerSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="400" height="400" fill="#18181b"/>
        <path d="M140 220 L260 220 L280 380 L120 380 Z" fill="#09090b" stroke="#ffffff" stroke-width="3"/>
        <path d="M150 200 Q200 240 250 200 Q260 220 200 230 Q140 220 150 200 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="2"/>
        <line x1="120" y1="320" x2="310" y2="190" stroke="#e4e4e7" stroke-width="8" stroke-linecap="round"/>
        <path d="M160 110 Q200 80 240 110 Q245 160 200 195 Q155 160 160 110 Z" fill="#fee2e2" stroke="#000" stroke-width="3"/>
        <path d="M140 110 L160 60 L180 90 L200 45 L220 90 L245 60 L260 115 L250 145 L265 140 L245 170 L235 130 L165 130 L155 170 L135 140 L150 145 Z" fill="#18181b" stroke="#ffffff" stroke-width="2"/>
        <circle cx="180" cy="136" r="3" fill="#ef4444"/>
        <circle cx="220" cy="136" r="3" fill="#ef4444"/>
        <text x="200" y="380" font-family="sans-serif" font-size="14" font-weight="bold" fill="#71717a" text-anchor="middle">RYUJI - RONIN SWORDSMAN</text>
      </svg>
    `;
  } else if (type === "cyberpunk") {
    innerSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="400" height="400" fill="#0f172a"/>
        <path d="M130 210 L160 170 L240 170 L270 210 L285 380 L115 380 Z" fill="#1e293b" stroke="#06b6d4" stroke-width="3"/>
        <path d="M165 110 Q200 85 235 110 Q240 165 200 190 Q160 165 165 110 Z" fill="#fed7aa" stroke="#0f172a" stroke-width="3"/>
        <path d="M170 130 L230 130 L225 145 L175 145 Z" fill="#06b6d4" stroke="#22d3ee" stroke-width="2"/>
        <text x="200" y="380" font-family="sans-serif" font-size="14" font-weight="bold" fill="#38bdf8" text-anchor="middle">KIRA - CYBER REBEL</text>
      </svg>
    `;
  } else if (type === "mage") {
    innerSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="400" height="400" fill="#1e1b4b"/>
        <path d="M135 220 L265 220 L290 380 L110 380 Z" fill="#2e1065" stroke="#c084fc" stroke-width="3"/>
        <path d="M165 115 Q200 90 235 115 Q240 165 200 190 Q160 165 165 115 Z" fill="#ffedd5" stroke="#1e1b4b" stroke-width="2.5"/>
        <text x="200" y="380" font-family="sans-serif" font-size="14" font-weight="bold" fill="#d8b4fe" text-anchor="middle">AELIA - ASTRAL ENCHANTRESS</text>
      </svg>
    `;
  } else {
    innerSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect width="400" height="400" fill="#18181b"/>
        <path d="M130 200 L270 200 L300 380 L100 380 Z" fill="#3f3f46" stroke="#d4d4d8" stroke-width="3"/>
        <ellipse cx="200" cy="100" rx="90" ry="20" fill="#27272a" stroke="#ffffff" stroke-width="2"/>
        <text x="200" y="380" font-family="sans-serif" font-size="14" font-weight="bold" fill="#a1a1aa" text-anchor="middle">MARCUS - NOIR DETECTIVE</text>
      </svg>
    `;
  }
  return `data:image/svg+xml;utf8,${encodeURIComponent(innerSvg.trim())}`;
}

export const PRESET_CHARACTERS: ComicCharacter[] = [
  {
    id: "char-mendel",
    name: "Mendel (The Husband)",
    role: "Protagonis / Suami yang Tertekan & Frustrasi",
    seriesTitle: "It Could Always Be Worse",
    baseImageData: createComicCharacterSvg("mendel"),
    mimeType: "image/svg+xml",
    description: "Pria Yahudi sederhana yang merasa rumahnya terlalu sempit. Memakai yarmulke (skullcap), kemeja berkerah putih, rompi/suspender cokelat, celana panjang sopan. Ekspresi wajah sangat dinamis: dari frustrasi, panik tertekan, kelelahan total, hingga kelegaan bahagia di akhir.",
    visualPromptSummary: "Jewish middle-aged man named Mendel, wearing black skullcap (yarmulke) clipped on curly dark brown hair, expressive comedic cartoon face with big expressive eyes and mustache, modest white collared shirt with brown suspenders, clean black linework with simple flat cel shading, comic book illustration style.",
    hairStyleColor: "Rambut cokelat bergelombang dengan yarmulke hitam di puncak kepala",
    eyeDetails: "Mata bulat besar kartunis yang sangat ekspresif (panik/frustrasi)",
    outfitBreakdown: "Yarmulke hitam, kemeja putih berlengan panjang, suspender cokelat, celana panjang gelap sopan",
    bodyProportions: "Gaya komik kartun ekspresif, proporsional",
    keyDistinctiveFeatures: ["Yarmulke (skullcap) di kepala", "Kumis dan rambut ikal samping", "Ekspresi komedi kocak & panik"],
    artStyle: "clean-lineart",
    tags: ["Comic", "Clean Linework", "Cel Shading", "Yarmulke", "Protagonist"],
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: "char-rav",
    name: "The Rav (Wise Rabbi)",
    role: "Sang Guru Bijak / Penasihat",
    seriesTitle: "It Could Always Be Worse",
    baseImageData: createComicCharacterSvg("rav"),
    mimeType: "image/svg+xml",
    description: "Rabbi tua yang sangat bijak, tenang, dan murah senyum. Mengenakan topi hitam tradisional bertepi lebar (traditional rabbi hat/fedora), janggut putih panjang terawat, kacamata bulat dengan senyum ramah yang penuh misteri humor.",
    visualPromptSummary: "Wise Jewish Rabbi (The Rav), wearing traditional black wide-brimmed rabbi fedora hat, long full white beard, round spectacles glasses, dark modest suit coat, warm knowing gentle smile, clean black linework with simple cel shading, not overly painterly.",
    hairStyleColor: "Janggut dan kumis putih lebat terawat, rambut putih tertutup topi",
    eyeDetails: "Kacamata bulat dengan mata tersenyum ramah dan bijaksana",
    outfitBreakdown: "Topi hitam tradisional fedora, jas hitam panjang tertutup, kemeja putih",
    bodyProportions: "Tegak, tenang, penuh wibawa namun hangat",
    keyDistinctiveFeatures: ["Topi hitam tradisional", "Janggut putih panjang lebat", "Kacamata bulat bijak"],
    artStyle: "clean-lineart",
    tags: ["Rabbi", "The Rav", "Clean Linework", "Cel Shaded", "Wise Mentor"],
    createdAt: Date.now() - 86400000 * 4,
  },
  {
    id: "char-sarah",
    name: "Sarah (The Wife)",
    role: "Istri Mendel / Pemimpin Rumah Tangga",
    seriesTitle: "It Could Always Be Worse",
    baseImageData: createComicCharacterSvg("sarah"),
    mimeType: "image/svg+xml",
    description: "Istri Mendel yang energik dan kewalahan oleh kekacauan hewan di rumah. Wajib mengenakan tichel (penutup kepala kain khas) TANPA rambut yang terlihat di bagian depan. Berpakaian sangat sopan: rok menutupi lutut, lengan baju menutupi siku, kerah tinggi, serta memakai stoking/kaus kaki (bukan kaki telanjang).",
    visualPromptSummary: "Jewish modest woman named Sarah, wearing a colorful modest tichel head covering scarf wrap tightly with NO hair showing in the front at all, modest long dress with high neckline, sleeves covering elbows, skirt extending below knees, wearing tights socks, highly expressive comedic face shouting in chaos, clean black linework with simple cel shading.",
    hairStyleColor: "Tertutup sempurna oleh kain tichel (tidak ada helai rambut di depan)",
    eyeDetails: "Mata melotot histeris dan terkejut saat hewan masuk rumah",
    outfitBreakdown: "Tichel penutup kepala rapi, gaun sopan kerah tinggi menutupi siku dan lutut, celemek rumah tangga, stoking",
    bodyProportions: "Proporsional wanita komik ekspresif",
    keyDistinctiveFeatures: ["Tichel (head covering) tanpa rambut di dahi", "Pakaian sopan tertutup siku & lutut", "Stoking/tights"],
    artStyle: "clean-lineart",
    tags: ["Tichel", "Modest Dress", "Clean Linework", "Cel Shading", "Comedy"],
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: "char-children",
    name: "The Children (David & Leah)",
    role: "Anak-Anak / Keluarga Mendel",
    seriesTitle: "It Could Always Be Worse",
    baseImageData: createComicCharacterSvg("children"),
    mimeType: "image/svg+xml",
    description: "Anak laki-laki memakai yarmulke dan kemeja sopan; anak perempuan memakai gaun sopan berlengan panjang, rok menutup lutut, dan berstoking. Senang bermain sekaligus panik saat hewan-hewan berkeliaran.",
    visualPromptSummary: "Jewish children in comedic chaos: young boy named David wearing skullcap yarmulke, young girl named Leah in modest knee-covering dress with long sleeves and tights socks, expressive cartoon faces shouting and running, clean black linework with simple cel shading.",
    hairStyleColor: "Anak laki-laki dengan yarmulke, anak perempuan berambut rapi tertata",
    eyeDetails: "Mata ceria dan kaget saat hewan-hewan berlarian",
    outfitBreakdown: "Pakaian sopan anak-anak (yarmulke untuk anak laki-laki, gaun panjang & stoking untuk anak perempuan)",
    bodyProportions: "Anak-anak kartun komik lincah",
    keyDistinctiveFeatures: ["Yarmulke pada anak laki-laki", "Pakaian sopan & stoking anak perempuan", "Ekspresi kocak komedi"],
    artStyle: "clean-lineart",
    tags: ["Children", "Family", "Yarmulke", "Modest", "Clean Linework"],
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: "char-animals",
    name: "The Farm Animals (Ayam, Kambing & Sapi)",
    role: "Hewan Pengacau Rumah / Chaos Makers",
    seriesTitle: "It Could Always Be Worse",
    baseImageData: createComicCharacterSvg("animals"),
    mimeType: "image/svg+xml",
    description: "Hewan-hewan ternak yang diperintahkan masuk ke dalam rumah: Sekelompok ayam berkotek liar mengepakkan bulu, kambing nakal yang mengunyah taplak meja, dan sapi perah besar tambun yang memenuhi seluruh ruang tengah.",
    visualPromptSummary: "Farm animals creating hilarious indoor chaos: wild cartoon chickens flapping feathers everywhere, mischievous horned goat chewing tablecloth, huge gentle spotted dairy cow taking up the whole living room, clean black linework with simple flat cel shading.",
    hairStyleColor: "Bulu ayam putih/kuning, bulu kambing abu-abu, corak hitam-putih sapi",
    eyeDetails: "Mata hewan kartun komikal lucu dan jahil",
    outfitBreakdown: "Hewan ternak (Ayam beterbangan, Kambing pemakan taplak, Sapi gemuk)",
    bodyProportions: "Karakter hewan kartun komik",
    keyDistinctiveFeatures: ["Ayam kepak sayap", "Kambing kunyah taplak", "Sapi besar di ruang tamu"],
    artStyle: "clean-lineart",
    tags: ["Animals", "Chickens", "Goat", "Cow", "Clean Linework", "Chaos"],
    createdAt: Date.now() - 86400000 * 1,
  },
  {
    id: "char-ryuji",
    name: "Ryuji Kageyama",
    role: "Protagonis / Pendekar Pedang Bayangan",
    seriesTitle: "Blade of the Eclipse",
    baseImageData: createComicCharacterSvg("swordsman"),
    mimeType: "image/svg+xml",
    description: "Pendekar muda dengan rambut hitam acak-acakan, bekas luka tipis di dahi kiri, syal merah berkibar, dan jubah hitam bergaris putih.",
    visualPromptSummary: "Young Japanese samurai warrior, messy spiky black hair, intense crimson eyes, scar over left eyebrow, red flowing scarf, black haori coat with white trim, holding katana.",
    artStyle: "manga-screentone",
    tags: ["Shonen", "Action", "Samurai", "Combat"],
    createdAt: Date.now() - 86400000 * 6,
  },
  {
    id: "char-kira",
    name: "Kira Vex",
    role: "Hacker / Cyberpunk Rebel",
    seriesTitle: "Neo-Jakarta 2099",
    baseImageData: createComicCharacterSvg("cyberpunk"),
    mimeType: "image/svg+xml",
    description: "Hacker pemberontak dengan rambut perak asimetris dan highlight cyan, visor optik glowing.",
    visualPromptSummary: "Futuristic cyberpunk girl, asymmetrical silver hair with neon cyan streak, glowing blue cybernetic visor over eyes.",
    artStyle: "webtoon-color",
    tags: ["Sci-Fi", "Webtoon", "Cyberpunk", "Action"],
    createdAt: Date.now() - 86400000 * 7,
  },
];


