# 🎨 Comic Character Pose & Anatomy Studio

Aplikasi studio generator pose karakter komik dan database anatomi berbasis AI. Aplikasi ini mentransformasikan gambar karakter acuan (*character sheet/reference*) menjadi berbagai variasi pose dinamis, sudut kamera sinematik (*low angle, bird's eye view, dutch tilt*), dan latar lingkungan sesuai kebutuhan naskah komik dengan dukungan output transparan PNG (*cutout*).

---

## 💻 Panduan Instalasi & Menjalankan di Laptop / PC Windows

Ikuti langkah-langkah berikut untuk menginstal dan menjalankan aplikasi ini secara lokal di sistem operasi **Windows 10 / 11**.

---

### 1. Prasyarat Sistem (Prerequisites)

Sebelum memulai, pastikan perangkat Windows Anda telah terpasang:

1. **Node.js (v18.x atau v20.x LTS Direkomendasikan)**
   - Unduh installer resmi dari: [https://nodejs.org/](https://nodejs.org/) (pilih versi **LTS**).
   - Jalankan file `.msi`, ikuti petunjuk wizard dan centang opsi **"Automatically install the necessary tools"** jika diminta.
   - Untuk memverifikasi instalasi, buka **Command Prompt (cmd)** atau **PowerShell** dan ketik:
     ```cmd
     node -v
     npm -v
     ```
2. **Git for Windows (Opsional)**
   - Unduh dari [https://git-scm.com/download/win](https://git-scm.com/download/win).
3. **Gemini API Key (Google AI Studio)**
   - Dapatkan kunci API gratis di: [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey).

---

### 2. Langkah-Langkah Instalasi

#### Langkah 1: Ekstrak atau Clone Folder Proyek
Jika Anda mengunduh file berupa `.zip`:
1. Klik kanan file `.zip` > Pilih **Extract All...** (*Ekstrak Semua*).
2. Tentukan lokasi folder, misalnya di `D:\Projects\comic-pose-studio` atau `C:\comic-pose-studio`.

Jika menggunakan Git:
```bash
git clone <URL_REPOSITORY_ANDA>
cd comic-character-pose-studio
```

---

#### Langkah 2: Buka Terminal di Direktori Proyek
1. Buka folder proyek di **File Explorer**.
2. Klik pada **Address Bar** di bagian atas File Explorer, ketik `cmd` atau `powershell`, lalu tekan **Enter**.
3. *Atau* buka editor kode seperti **Visual Studio Code**, lalu buka menu **Terminal > New Terminal** (`Ctrl + \``).

---

#### Langkah 3: Install Dependensi Paket (Dependencies)
Jalankan perintah berikut pada terminal untuk mengunduh semua pustaka yang dibutuhkan:

```cmd
npm install
```
> *Tunggu hingga proses instalasi selesai (ditandai dengan munculnya folder `node_modules`).*

---

#### Langkah 4: Konfigurasi API Key (`.env`)
1. Buat file baru bernama `.env` di folder utama (sejajar dengan `package.json`).
2. Buka file `.env` menggunakan Notepad atau VS Code, lalu isi konfigurasi berikut:

```env
GEMINI_API_KEY=masukkan_api_key_gemini_anda_disini
```

> **Catatan:** Ganti `masukkan_api_key_gemini_anda_disini` dengan API Key yang Anda dapatkan dari [Google AI Studio](https://aistudio.google.com/apikey).

---

#### Langkah 5: Jalankan Aplikasi (Mode Pengembangan / Development)
Ketik perintah berikut pada terminal:

```cmd
npm run dev
```

Jika berhasil, terminal akan menampilkan output:
```text
Server running on http://localhost:3000
```

---

#### Langkah 6: Buka Aplikasi di Browser
Buka peramban web pilihan Anda (Google Chrome, Microsoft Edge, Mozilla Firefox, Brave), lalu ketik alamat berikut di address bar:

👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🚀 Menjalankan dalam Mode Produksi (Build & Start)

Jika Anda ingin menjalankan aplikasi versi rilis terkompilasi (*production build*):

1. **Build aplikasi:**
   ```cmd
   npm run build
   ```
2. **Jalankan server produksi:**
   ```cmd
   npm start
   ```
3. Buka **[http://localhost:3000](http://localhost:3000)** di browser.

---

## 🛠️ Solusi Kendala Umum di Windows (Troubleshooting)

### 1. Error: *`'npm' is not recognized as an internal or external command`*
- **Penyebab:** Path Node.js belum terdaftar di Environment Variables Windows.
- **Solusi:** Tutup semua terminal / Command Prompt yang sedang terbuka, restart PC Anda, atau tambahkan lokasi instalasi Node.js (biasanya `C:\Program Files\nodejs\`) ke dalam System Environment Variables `PATH`.

### 2. Error PowerShell: *`File ... cannot be loaded because running scripts is disabled on this system`*
- **Penyebab:** Kebijakan eksekusi skrip PowerShell Windows masih terkunci (*Restricted*).
- **Solusi:** Buka PowerShell sebagai Administrator (*Run as Administrator*), lalu jalankan perintah berikut:
  ```powershell
  Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
  Ketik `Y` lalu tekan **Enter**.

### 3. Error: *`EADDRINUSE: address already in use :::3000`*
- **Penyebab:** Port 3000 sedang digunakan oleh aplikasi lain.
- **Solusi:** Matikan proses yang menggunakan port 3000 lewat CMD:
  ```cmd
  netstat -ano | findstr :3000
  taskkill /PID <PID_NOMOR> /F
  ```

### 4. Error saat Generate Pose / API Key Error:
- Pastikan file `.env` sudah dibuat dengan nama tepat `.env` (bukan `.env.txt`).
- Pastikan API Key dari Google AI Studio masih aktif dan memiliki kuota yang cukup.

---

## 📜 Daftar Perintah Tersedia (NPM Scripts)

| Perintah | Fungsi |
| :--- | :--- |
| `npm run dev` | Menjalankan server lokal dalam mode development dengan auto-reload |
| `npm run build` | Mengompilasi frontend Vite dan backend TypeScript ke folder `dist/` |
| `npm start` | Menjalankan server hasil kompilasi produksi |
| `npm run lint` | Memeriksa validasi tipe TypeScript (`tsc --noEmit`) |
| `npm run clean` | Membersihkan folder build `dist` |

---

Selamat berkreasi dengan **Comic Character Pose & Anatomy Studio**! 🎨🦸‍♂️
