import { ActionCategory, CameraAngle, CharacterEmotion, ComicArtStyle, PanelAspectRatio } from "../types";

export interface PosePreset {
  id: string;
  name: string;
  category: ActionCategory;
  scriptSnippet: string;
  actionPrompt: string;
  cameraAngle: CameraAngle;
  expression: CharacterEmotion;
  aspectRatio: PanelAspectRatio;
  artStyle: ComicArtStyle;
  anatomyTip: string;
}

export const POSE_PRESETS: PosePreset[] = [
  {
    id: "preset-iaijutsu-slash",
    name: "Tebasan Cepat Katana (Iaijutsu Slash)",
    category: "dynamic-combat",
    scriptSnippet: "Panel 4: Dalam sekejap mata, pedang terhunus membelah udara. Gerakan secepat kilat dengan garis aksi melengkung.",
    actionPrompt: "Extremely dynamic explosive sword slash pose, body low in deep lunging stance, katana blade blurred in high-speed motion arc with screentone speedlines, haori coat fluttering wildly, intense focused glare.",
    cameraAngle: "extreme-low-angle",
    expression: "determined",
    aspectRatio: "16:9",
    artStyle: "manga-screentone",
    anatomyTip: "Garis tumpu berat badan condong ke depan (kaki depan menekuk 90 derajat), putaran torso menghasilkan torsi tebasan.",
  },
  {
    id: "preset-superhero-landing",
    name: "Mendarat Dramatis (Dynamic Hero Landing)",
    category: "acrobatic-jump",
    scriptSnippet: "Panel 1: Karakter mendarat keras dari langit di atas aspal jalanan, satu tangan menghantam tanah memicu gelombang kejut.",
    actionPrompt: "Iconic three-point dynamic superhero landing pose, one fist slammed onto the cracked ground, head slightly lifted with piercing eyes, cape/scarf billowing upward from impact shockwave, speedlines radiating outward.",
    cameraAngle: "extreme-low-angle",
    expression: "intense-rage",
    aspectRatio: "1:1",
    artStyle: "manga-screentone",
    anatomyTip: "Tiga titik tumpu: dua kaki dan satu kepalan tangan. Tulang belakang melengkung dinamis menahan gaya gravitasi.",
  },
  {
    id: "preset-punch-foreshortened",
    name: "Pukulan Mendekat Kamera (Foreshortened Punch)",
    category: "dynamic-combat",
    scriptSnippet: "Panel 6: Karakter melepaskan tinju sekuat tenaga langsung mengarah ke wajah musuh (ke arah pembaca).",
    actionPrompt: "Extreme dynamic manga punch rushing straight into the camera lens with exaggerated dramatic comic foreshortening, huge fist in sharp focus in foreground, arm muscles bulging, body angled back in intense kinetic momentum.",
    cameraAngle: "close-up-dramatic",
    expression: "intense-rage",
    aspectRatio: "1:1",
    artStyle: "manga-screentone",
    anatomyTip: "Foreshortening ekstrem: ukuran kepalan tangan lebih besar 2.5x dari kepala untuk efek 3D komik yang mendalam.",
  },
  {
    id: "preset-spellcasting-aura",
    name: "Pelepasan Mantra Astral (Spellcasting Burst)",
    category: "spellcasting-aura",
    scriptSnippet: "Panel 2: Karakter merentangkan tangan ke depan, lingkaran sihir bercahaya terang berputar di telapak tangannya memanggil kekuatan magis.",
    actionPrompt: "Floating gracefully mid-air, both hands outstretched channeling glowing magical runic circles, hair floating weightlessly, mystical energy particles and swirling aura around the body, serene yet powerful expression.",
    cameraAngle: "mid-shot",
    expression: "determined",
    aspectRatio: "3:4",
    artStyle: "webtoon-color",
    anatomyTip: "Postur mengambang melayang (anti-gravitasi), lekuk jari-jemari tangan terbuka elegan menyalurkan energi.",
  },
  {
    id: "preset-noir-rain",
    name: "Berdiri dalam Hujan Noir (Rainy Silhouette)",
    category: "seated-thinking",
    scriptSnippet: "Panel 5: Hujan deras mengguyur gang sempit. Karakter berdiri diam menyalakan korek api di bawah bayangan lampu jalan.",
    actionPrompt: "Hardboiled comic silhouette standing in heavy diagonal rain, coat collar popped up against wind, striking a match casting warm glow over sharp features, heavy black ink shadows, puddles reflecting street neon.",
    cameraAngle: "over-the-shoulder",
    expression: "neutral-focused",
    aspectRatio: "9:16",
    artStyle: "seinen-noir",
    anatomyTip: "Postur rileks tapi waspada, bahu sedikit terangkat menahan dingin, garis vertikal hujan kontras dengan postur tegak.",
  },
  {
    id: "preset-despair-knees",
    name: "Jatuh Berlutut Keputusasaan (Despair Breakdown)",
    category: "emotional-breakdown",
    scriptSnippet: "Panel 3: Menyadari semuanya sudah terlambat, karakter jatuh bertumpu pada kedua lututnya, tangan mencengkeram tanah dengan air mata.",
    actionPrompt: "Emotional comic scene, character collapsed on knees, hands trembling gripping the dirt/floor, head tilted down in agony, tears falling with dramatic comic shadow hatching across face, dramatic Dutch angle.",
    cameraAngle: "dutch-angle",
    expression: "despair-crying",
    aspectRatio: "4:3",
    artStyle: "manga-screentone",
    anatomyTip: "Punggung melengkung bungkuk putus asa, ketegangan tendon leher dan jari tangan yang mencengkeram lantai.",
  },
  {
    id: "preset-smug-turn",
    name: "Menoleh Sombong (Smug Turnaround)",
    category: "dramatic-turnaround",
    scriptSnippet: "Panel 2: Karakter berbalik setengah badan dengan seringai percaya diri, menatap lawannya seolah berkata 'hanya segitu kemampuanmu?'",
    actionPrompt: "Over-the-shoulder dramatic turnaround, character glancing back over shoulder with confident smirk and raised eyebrow, wind catching the hair, sharp ink linework and speedlines.",
    cameraAngle: "over-the-shoulder",
    expression: "smug-confident",
    aspectRatio: "1:1",
    artStyle: "clean-lineart",
    anatomyTip: "Rotasi tulang belakang 45 derajat, bahu depan menutup sebagian dada menciptakan kedalaman ruang panel.",
  },
  {
    id: "preset-rooftop-sprint",
    name: "Melompati Atap Gedung (Rooftop Leap)",
    category: "sprint-run",
    scriptSnippet: "Panel 1: Mengejar target di malam hari, melompat dari satu atap gedung ke gedung lain dengan lincah.",
    actionPrompt: "Mid-air acrobatic leap across skyscraper rooftops at night, full body extended in athletic stride, dynamic high-angle view looking down at city streets below, wind tearing at clothing.",
    cameraAngle: "high-angle-bird",
    expression: "determined",
    aspectRatio: "9:16",
    artStyle: "webtoon-color",
    anatomyTip: "Garis aksi diagonal penuh (Line of Action) dari ujung jari tangan depan hingga ujung kaki belakang.",
  },
];

export const SAMPLE_COMIC_SCRIPTS = [
  {
    title: "Rumah Terlalu Sempit (It Could Always Be Worse)",
    genre: "Clean Lineart & Cel-Shaded Comedy / Classic Folk Tale",
    script: `[PANEL 1]
Lokasi: Ruang Belajar Sang Rav.
Deskripsi: Seorang pria Yahudi yang frustrasi (Mendel) duduk di seberang meja Sang Rav. Sang Rav mengenakan topi hitam tradisional, janggut putih panjang, dan kacamata bulat. Mendel memakai yarmulke dan terlihat stres.
Gaya Gambar: Clean black linework with simple cel shading, not overly painterly.
Man: "Rabbi, our house is just too small! My wife, the children—we’re constantly on top of each other!"
Rav: "Do you have chickens?"
Man: "Yes..."
Rav: "Bring them into the house."

[PANEL 2]
Lokasi: Rumah Keluarga.
Deskripsi: Ayam-ayam berkeliaran di mana-mana! Seekor ayam bertengger di atas kursi, ayam lain mencuri makanan dari meja, dan anak-anak berusaha menangkapnya. Sang istri (Sarah) memakai tichel (tanpa rambut di depan) dan pakaian sopan (lengan panjang, rok panjang, stoking) berteriak panik ke suaminya.
Wife: "Why are there CHICKENS in my house?!"
Man: "The Rabbi told me to bring them in."
Wife: "Did you mention that our problem was too LITTLE space?!"
SFX: BOK-BOK-CLUCK!

[PANEL 3]
Lokasi: Kembali di Ruangan Sang Rav.
Deskripsi: Pria itu kembali menghadap Sang Rav dengan ekspresi yang jauh lebih kusut dan bingung (frazzled), rambut mencuat di samping yarmulke. Pria itu menatap curiga saat Rav memberi saran berikutnya.
Man: "Rabbi, I did what you said. But now the house is even more crowded!"
Rav: "You have a goat?"
Man: "...I do."
Rav: "Bring it inside."

[PANEL 4]
Lokasi: Rumah Keluarga yang Semakin Kacau.
Deskripsi: Kambing sedang mengunyah taplak meja! Ayam-ayam mengepakkan sayap di sekitarnya. Seorang anak laki-laki berpakaian yarmulke menyelamatkan makanannya, anak lainnya lari ketakutan dikejar ayam. Sang istri menjerit memegang kepalanya.
Wife: "HE’S EATING THE TABLECLOTH!"
Child: "Where did my candy go"
Child: "(Running away from chickens) Heeelppppp!!!!"
SFX: MEHHH! BAAAK-BAK!

[PANEL 5]
Lokasi: Di Ruangan Sang Rav.
Deskripsi: Pria itu tampak sangat kelelahan (exhausted) dan membeku kaget saat Sang Rav tersenyum tenang memberikan instruksi yang tak terduga.
Man: "Rabbi, you know I trust you. But we can barely turn around in there!"
Rav: "Do you have a cow?"
Man: "(gulp)"
Rav: "Bring her in."
SFX: GULP...

[PANEL 6]
Lokasi: Rumah yang Sangat Kacau Total (Complete Mayhem).
Deskripsi: Kekacauan total! Seekor sapi raksasa memenuhi seluruh ruang tengah. Kambing memanjat perabotan, ayam beterbangan di udara dan hinggap di kepala. Seluruh keluarga berdesakan di celah sempit yang tersisa. Sang istri berteriak histeris.
Wife: "A COW?!"
Man: "I know. I know."
Wife: "Please go back to the rav! I cannot live like this for even one more minute!"
SFX: MOOOOOOO! CLUCK-CLUCK!

[PANEL 7]
Lokasi: Di Ruangan Sang Rav.
Deskripsi: Pria itu terlihat benar-benar kehabisan tenaga (completely worn out), pakaian kusut. Sang Rav tersenyum bijak dan ramah dengan kedua tangan terbuka.
Man: "Rabbi, we did everything you said. We can’t live like this!"
Rav: "Good. Now take all the animals out."

[PANEL 8]
Lokasi: Jalan Menuju Rumah.
Deskripsi: Pria itu berlari secepat kilat (dynamic comical sprint) pulang ke rumahnya dengan senyum lebar dan penuh semangat kelegaan. Garis kecepatan kartun berputar di kakinya.
SFX: WOSH-WOSH-WOSH!

[PANEL 9]
Lokasi: Rumah yang Tenang dan Damai (Final Panel).
Deskripsi: Rumah yang sama, tanpa hewan apa pun! Seluruh keluarga (suami ber-yarmulke, istri ber-tichel sopan, anak-anak) duduk santai menikmati teh di sekitar meja makan. Ruangan tiba-tiba terasa sangat lega, lapang, dan nyaman seperti istana.
Man: "wow! Our house is HUGE!"
Child: "We live in a mansion"
Wife: "Aahhhhhhhhh!"`,
  },
  {
    title: "Adegan 1: Serbuan di Gerbang Kastil",
    genre: "Shonen Action Fantasy",
    script: `[PANEL 1]
Kamera Bird's Eye View: Ryuji berdiri di tepi tebing tinggi melihat benteng musuh di kejauhan. Angin kencang menerbangkan syal merahnya.
Ryuji (Monolog): "Waktunya tiba. Aku tidak akan mundur lagi."

[PANEL 2]
Ryuji melompat turun dari tebing dengan pose akrobatik meluncur di udara, kedua tangan bersiap menarik pedang katana di pinggangnya.
SFX: ZHHHUUUUSH!

[PANEL 3]
Sudut Low-Angle dramatis: Ryuji mendarat keras di depan barisan penjaga, lutut menekuk menahan benturan dan satu tangan menghantam tanah menghasilkan retakan batu.
SFX: BLAAAM!

[PANEL 4]
Extreme Close-up: Wajah Ryuji dengan tatapan mata merah tajam menyala penuh amarah, seringai percaya diri menantang komandan musuh.
Ryuji: "Kalian yang menghadang... bersiaplah!"

[PANEL 5]
Tebasan Iaijutsu menyilang horizontal: Ryuji bergerak secepat kilat menebas ke arah kamera dengan efek speedlines manga dan kilatan bilah pedang berkilau.
SFX: SHIIIIING!`,
  },
  {
    title: "Adegan 2: Pertarungan di Distrik Cyberpunk",
    genre: "Sci-Fi Cyberpunk Webtoon",
    script: `[PANEL 1]
Kira Vex bersembunyi di balik pilar beton di lorong berlampu neon redup, memeriksa muatan senjata di lengan sibernetiknya.
Kira (Berbisik): "Tiga drone pengintai di atas... dua detik sebelum pemindaian."

[PANEL 2]
Kira melompat keluar dengan salto berputar ke samping (Acrobatic Dodge) menghindari tembakan laser merah yang meledakkan pilar.
SFX: PEW-PEW-BOOM!

[PANEL 3]
Sudut Dutch Tilt: Kira menembakkan kabel listrik dari telapak tangan sibernetiknya ke arah drone utama sambil melayang di udara.
Kira: "Tertangkap!"

[PANEL 4]
Close-up dramatis: Kira mendarat di atas kap mobil terbang, menoleh ke belakang sambil meniup asap dari moncong tangannya dengan senyum puas.
SFX: TZZZZT...`,
  },
];
