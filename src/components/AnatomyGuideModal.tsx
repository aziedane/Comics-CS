import React, { useState } from "react";
import { X, Compass, Activity, Eye, Maximize2, Shield, Flame, BookOpen } from "lucide-react";

interface AnatomyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AnatomyGuideModal: React.FC<AnatomyGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<"proportions" | "lineOfAction" | "foreshortening" | "angles" | "expressions">("proportions");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl shadow-rose-950/30 text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Panduan Anatomi & Perspektif Komik Manga
              </h2>
              <p className="text-xs text-zinc-400">
                Formula visual, garis aksi, dan aturan foreshortening untuk komikus profesional
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Navigation Tabs */}
        <div className="flex overflow-x-auto border-b border-zinc-800 bg-zinc-950/30 px-6 py-2 gap-2 text-xs font-medium">
          <button
            onClick={() => setActiveSection("proportions")}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeSection === "proportions"
                ? "bg-rose-600 text-white font-semibold"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            📏 Proporsi Tubuh (Head Units)
          </button>
          <button
            onClick={() => setActiveSection("lineOfAction")}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeSection === "lineOfAction"
                ? "bg-rose-600 text-white font-semibold"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            ⚡ Line of Action & Keseimbangan
          </button>
          <button
            onClick={() => setActiveSection("foreshortening")}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeSection === "foreshortening"
                ? "bg-rose-600 text-white font-semibold"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            🥊 Foreshortening & Tumpang Tindih
          </button>
          <button
            onClick={() => setActiveSection("angles")}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeSection === "angles"
                ? "bg-rose-600 text-white font-semibold"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            🎥 Sudut Kamera & Sinematik Panel
          </button>
          <button
            onClick={() => setActiveSection("expressions")}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              activeSection === "expressions"
                ? "bg-rose-600 text-white font-semibold"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            🎭 Ekspresi & Micro-Gesture
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {activeSection === "proportions" && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-rose-400 flex items-center gap-2">
                <Maximize2 className="w-4 h-4" /> Standar Rasio Kepala Komik (Head Scale Proportion)
              </h3>
              <p className="text-zinc-300 leading-relaxed">
                Dalam pembuatan manga dan komik, tinggi karakter diukur berdasarkan satuan ukuran kepala dari dagu hingga puncak tengkorak:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">8 - 8.5 Kepala (Heroic & Seinen)</span>
                    <span className="px-2 py-0.5 text-[10px] bg-rose-500/20 text-rose-300 rounded font-mono">Realistis / Epik</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Digunakan untuk karakter dewasa, pendekar, atau superhero berotot. Bahu 2x lebar kepala, kaki panjang 4 unit kepala memberikan kesan wibawa tinggi.
                  </p>
                </div>

                <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">7 - 7.5 Kepala (Shonen & Webtoon)</span>
                    <span className="px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 rounded font-mono">Standar Aksi</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Standar utama protagonis manga/webtoon remaja. Keseimbangan dinamis antara fleksibilitas gerakan aksi akrobatik dan anatomi atletis.
                  </p>
                </div>

                <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">5.5 - 6 Kepala (Shojo / Remaja Awal)</span>
                    <span className="px-2 py-0.5 text-[10px] bg-cyan-500/20 text-cyan-300 rounded font-mono">Lembut / Ramping</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Memberikan kesan awet muda, ramping, dan lincah. Kepala terlihat sedikit lebih besar, cocok untuk karakter siswa sekolah atau komik romance.
                  </p>
                </div>

                <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">2 - 3 Kepala (Chibi / SD Gag)</span>
                    <span className="px-2 py-0.5 text-[10px] bg-purple-500/20 text-purple-300 rounded font-mono">Komedi / Emosional</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Proporsi komedi ekstrim. Kepala besar dengan mata ekspresif lebar, tangan dan kaki bulat sederhana untuk adegan lucu atau reaksi kaget.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === "lineOfAction" && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-rose-400 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Line of Action (Garis Dinamika Gestur)
              </h3>
              <p className="text-zinc-300 leading-relaxed">
                Kunci pose karakter komik yang hidup dan bertenaga adalah satu garis imajiner utama yang menghubungkan seluruh postur tubuh (tulang belakang hingga tumpuan kaki):
              </p>

              <div className="space-y-3">
                <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800">
                  <h4 className="font-bold text-white text-sm text-emerald-400">1. Kurva "C" (Defensif / Meringkuk / Menahan Beban)</h4>
                  <p className="text-xs text-zinc-300 mt-1">
                    Tulang belakang melengkung kompak ke dalam. Sering digunakan pada pose bertahan, jatuh terluka, bersiap melompat, atau mendarat setelah jatuh dari ketinggian.
                  </p>
                </div>

                <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800">
                  <h4 className="font-bold text-white text-sm text-rose-400">2. Kurva "S" (Akrobatik / Elegan / Dinamis)</h4>
                  <p className="text-xs text-zinc-300 mt-1">
                    Garis bergelombang ganda yang mengalir dari kepala, dada membusung, lalu berlawanan ke arah pinggul dan kaki. Menciptakan ilusi gerakan lentur, tarian pedang, atau kecepatan angin.
                  </p>
                </div>

                <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800">
                  <h4 className="font-bold text-white text-sm text-amber-400">3. Garis Diagonal Lurus (Tusukan / Terjangan / Kecepatan Penuh)</h4>
                  <p className="text-xs text-zinc-300 mt-1">
                    Postur karakter membentuk sudut 30-45 derajat lurus terhadap tanah. Digunakan pada serangan kilat, tendangan terbang, atau peluncuran proyektil.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === "foreshortening" && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-rose-400 flex items-center gap-2">
                <Flame className="w-4 h-4" /> Rahasia Foreshortening (Perspektif Tangan & Kaki)
              </h3>
              <p className="text-zinc-300 leading-relaxed">
                Foreshortening adalah teknik memproyeksikan anggota tubuh yang mendekat ke arah mata pembaca agar terlihat jauh lebih besar dan memberikan efek 3D yang meledak keluar dari panel komik:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800 space-y-2">
                  <div className="font-bold text-white text-sm">Prinsip Tumpang Tindih (Overlapping)</div>
                  <p className="text-xs text-zinc-400">
                    Bentuk silinder yang lebih dekat harus menutupi sebagian silinder di belakangnya (Kepalan tangan menutupi pergelangan tangan, lengan bawah menutupi siku).
                  </p>
                </div>
                <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800 space-y-2">
                  <div className="font-bold text-white text-sm">Distorsi Skala Dramatis</div>
                  <p className="text-xs text-zinc-400">
                    Jangan ragu memperbesar telapak tangan atau sol sepatu hingga 2x-3x ukuran kepala jika posisinya berada tepat di foreground dekat lensa kamera.
                  </p>
                </div>
                <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800 space-y-2">
                  <div className="font-bold text-white text-sm">Garis Kontur Gelang (Coil Lines)</div>
                  <p className="text-xs text-zinc-400">
                    Gunakan garis lipatan kain atau gelang otot yang melengkung melingkari silinder tubuh untuk menunjukkan apakah lengan mengarah maju atau mundur.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === "angles" && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-rose-400 flex items-center gap-2">
                <Eye className="w-4 h-4" /> Sudut Kamera Panel Komik (Cinematic Comic Staging)
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 bg-zinc-950/60 rounded-xl border border-zinc-800">
                  <span className="px-2 py-1 bg-zinc-800 text-zinc-200 rounded font-mono text-xs">Worm's Eye (Low-Angle)</span>
                  <div className="text-xs text-zinc-300">
                    Kamera diletakkan di tanah menghadap ke atas. Memberikan kesan karakter dominan, kuat, raksasa, atau heroik saat mendarat.
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-zinc-950/60 rounded-xl border border-zinc-800">
                  <span className="px-2 py-1 bg-zinc-800 text-zinc-200 rounded font-mono text-xs">Bird's Eye (High-Angle)</span>
                  <div className="text-xs text-zinc-300">
                    Kamera melihat dari atas ke bawah. Menunjukkan kesendirian, skala medan pertempuran luas, atau karakter yang terjebak/terpojok.
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-zinc-950/60 rounded-xl border border-zinc-800">
                  <span className="px-2 py-1 bg-zinc-800 text-zinc-200 rounded font-mono text-xs">Dutch Tilt (Canted Angle)</span>
                  <div className="text-xs text-zinc-300">
                    Garis horizon kamera dimiringkan 15-30 derajat. Wajib digunakan pada adegan benturan keras, bahaya mendadak, atau kegilaan psikologis.
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-zinc-950/60 rounded-xl border border-zinc-800">
                  <span className="px-2 py-1 bg-zinc-800 text-zinc-200 rounded font-mono text-xs">Over-The-Shoulder</span>
                  <div className="text-xs text-zinc-300">
                    Kamera berada di belakang bahu lawan bicara. Menjaga kedalaman dialog dua arah dan memperlihatkan reaksi wajah lawan secara fokus.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "expressions" && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-rose-400 flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Ekspresi Wajah Manga & Ketegangan Otot
              </h3>
              <p className="text-zinc-300 leading-relaxed">
                Karakter komik menyampaikan intensitas adegan melalui kombinasi 3 area: alis mata, dilatasi pupil, dan bukaan rahang:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800 space-y-1">
                  <div className="font-bold text-rose-400 text-sm">Membara / Determinasi Tinggi</div>
                  <p className="text-xs text-zinc-400">
                    Alis miring tajam ke bawah mendekati pangkal hidung, pupil mengecil fokus tajam, rahang mengatup kuat dengan garis bayangan tebal di pelipis.
                  </p>
                </div>
                <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800 space-y-1">
                  <div className="font-bold text-amber-400 text-sm">Syok / Terperangah (Gasp)</div>
                  <p className="text-xs text-zinc-400">
                    Pupil mengecil menjadi titik kecil (dilatasi panik), garis arsir vertikal hitam di dahi (manga shock lines), mulut terbuka sedikit menahan napas.
                  </p>
                </div>
                <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800 space-y-1">
                  <div className="font-bold text-cyan-400 text-sm">Seringai Percaya Diri (Smug)</div>
                  <p className="text-xs text-zinc-400">
                    Satu sudut bibir terangkat asimetris, satu kelopak mata sedikit rileks menyipit, kepala sedikit terangkat meremehkan lawan.
                  </p>
                </div>
                <div className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-800 space-y-1">
                  <div className="font-bold text-purple-400 text-sm">Kelelahan Ekstrim (Exhausted)</div>
                  <p className="text-xs text-zinc-400">
                    Napas tersengal terengah lewat mulut, tetesan keringat di pelipis, kelopak mata terkulai, bahu turun lemas dengan garis beban berat.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold transition-colors"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
