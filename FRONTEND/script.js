const URL_MODEL = "https://teachablemachine.withgoogle.com/models/uW9NLaB5x/";

let model;
let isModelLoaded = false;

// ── 1. LOAD MODEL ──────────────────────────────────────────────────────────────
async function init() {
    const modelURL    = URL_MODEL + "model.json";
    const metadataURL = URL_MODEL + "metadata.json";

    try {
        model = await tmImage.load(modelURL, metadataURL);
        isModelLoaded = true;
        console.log("✅ Model ML (Teachable Machine) berhasil dimuat.");
    } catch (e) {
        console.error("❌ Gagal memuat model. Pastikan koneksi internet aktif.", e);
        alert("Gagal memuat model AI. Periksa koneksi internet lalu refresh halaman.");
    }
}

init();

// ── 2. UPLOAD & PREVIEW GAMBAR ─────────────────────────────────────────────────
const imageInput  = document.getElementById('imageInput');
const cameraInput = document.getElementById('cameraInput');
const dropZone    = document.getElementById('dropZone');
const imgPreview  = document.getElementById('imgPreview');

// Simpan file aktif dari sumber manapun (folder / kamera / drag-drop)
let currentFile = null;

// ── Fungsi terpusat: proses file gambar dari sumber apapun ──
function handleImageFile(file) {
    if (!file) return;

    // Validasi tipe file
    if (!file.type.startsWith('image/')) {
        alert('File tidak valid. Harap pilih file gambar (JPG, PNG, WEBP, dll).');
        return;
    }

    currentFile = file; // Simpan untuk dikirim ke backend nanti

    const reader = new FileReader();
    reader.onload = (event) => {
        imgPreview.src = event.target.result;

        // Tampilkan area preview, sembunyikan dropzone
        document.getElementById('previewArea').classList.remove('hidden');
        dropZone.classList.add('hidden');

        // Reset kotak hasil & tombol saat gambar baru dipilih
        document.getElementById('resultBox').classList.add('hidden');
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('analyzeBtn').classList.remove('hidden');
        document.getElementById('bodyPartInput').disabled = false;
        document.getElementById('ageInput').disabled = false;
        document.querySelector('.hero h1').innerText = "Cek Luka Bakar Anda Sekarang!";
        document.querySelector('.hero p').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

// ── Input dari galeri / folder ──
imageInput.onchange  = (e) => handleImageFile(e.target.files[0]);

// ── Input dari kamera langsung (Khusus Fallback / Mobile) ──
cameraInput.onchange = (e) => handleImageFile(e.target.files[0]);


// ── DETEKSI PERANGKAT ──
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 768);
}

// ── KONTROLLER MODAL KAMERA (UNTUK DESKTOP/LAPTOP & WEBCAM) ──
const openCameraBtn   = document.getElementById('openCameraBtn');
const cameraModal     = document.getElementById('cameraModal');
const closeCameraBtn   = document.getElementById('closeCameraBtn');
const webcamVideo     = document.getElementById('webcamVideo');
const webcamCanvas    = document.getElementById('webcamCanvas');
const switchCameraBtn = document.getElementById('switchCameraBtn');
const capturePhotoBtn = document.getElementById('capturePhotoBtn');

let localStream = null;
let videoDevices = [];
let activeDeviceIndex = 0;

// Tombol Buka Kamera utama
openCameraBtn.onclick = () => {
    if (isMobileDevice()) {
        // Pada perangkat mobile, langsung picu input file native dengan capture="environment"
        cameraInput.click();
    } else {
        // Pada laptop/desktop, buka modal kamera in-app
        openCameraModal();
    }
};

async function openCameraModal() {
    cameraModal.classList.add('active');
    videoDevices = [];
    activeDeviceIndex = 0;
    
    try {
        // Minta izin kamera dan jalankan stream pertama kali (Hanya memicu 1 prompt izin)
        const constraints = {
            video: {
                facingMode: "environment", // Prioritaskan kamera belakang jika tersedia
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };
        
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        webcamVideo.srcObject = localStream;

        // Sekarang setelah izin diberikan dan stream berjalan aktif, 
        // kita bisa mencari list device kamera lain tanpa double-prompt
        const devices = await navigator.mediaDevices.enumerateDevices();
        videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        // Atur tombol switch camera
        if (videoDevices.length > 1) {
            switchCameraBtn.style.display = 'flex';
            
            // Cari index kamera aktif saat ini agar sinkron saat tombol switch ditekan
            const activeTrack = localStream.getVideoTracks()[0];
            if (activeTrack) {
                const settings = activeTrack.getSettings();
                const activeId = settings.deviceId;
                const index = videoDevices.findIndex(device => device.deviceId === activeId);
                if (index !== -1) {
                    activeDeviceIndex = index;
                }
            }
        } else {
            switchCameraBtn.style.display = 'none';
        }
    } catch (err) {
        console.error("Gagal mendeteksi / mengakses kamera:", err);
        alert("Gagal mengakses kamera. Pastikan izin kamera telah diberikan dan laptop Anda memiliki webcam aktif.");
        closeCameraModal();
    }
}

async function startWebcam() {
    // Berhentikan stream lama jika ada
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }

    if (videoDevices.length === 0) {
        throw new Error("Tidak ada input kamera video yang terdeteksi.");
    }

    const currentDevice = videoDevices[activeDeviceIndex];
    const constraints = {
        video: {
            deviceId: currentDevice ? { exact: currentDevice.deviceId } : undefined,
            width: { ideal: 1280 },
            height: { ideal: 720 }
        }
    };

    try {
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        webcamVideo.srcObject = localStream;
    } catch (err) {
        console.warn("Gagal memulai stream dengan deviceId spesifik, mencoba fallback ke default stream...", err);
        // Fallback ke video standar jika gagal dengan device tertentu
        localStream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcamVideo.srcObject = localStream;
    }
}

function closeCameraModal() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    webcamVideo.srcObject = null;
    cameraModal.classList.remove('active');
}

// Tutup modal
closeCameraBtn.onclick = closeCameraModal;

// Klik di luar konten modal juga menutup modal
cameraModal.onclick = (e) => {
    if (e.target === cameraModal) {
        closeCameraModal();
    }
};

// Ganti Kamera
switchCameraBtn.onclick = async () => {
    if (videoDevices.length <= 1) return;
    activeDeviceIndex = (activeDeviceIndex + 1) % videoDevices.length;
    try {
        await startWebcam();
    } catch (err) {
        console.error("Gagal berganti kamera:", err);
        alert("Gagal berpindah ke kamera berikutnya.");
    }
};

// Ambil Foto
capturePhotoBtn.onclick = () => {
    if (!localStream) return;

    const width = webcamVideo.videoWidth || 640;
    const height = webcamVideo.videoHeight || 480;

    webcamCanvas.width = width;
    webcamCanvas.height = height;

    const ctx = webcamCanvas.getContext('2d');
    
    // Gambar frame video saat ini ke canvas
    ctx.drawImage(webcamVideo, 0, 0, width, height);

    webcamCanvas.toBlob((blob) => {
        if (blob) {
            // Buat berkas virtual File dari Blob
            const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
            
            // Kirim file ke handler utama untuk di-preview dan diproses
            handleImageFile(file);
            
            // Tutup kamera setelah selesai mengambil gambar
            closeCameraModal();
        }
    }, 'image/jpeg', 0.95);
};


// ── Drag & Drop ──────────────────────────────────────────────────────────────

// Saat file mulai masuk ke area drop: beri highlight
['dragenter', 'dragover'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
    });
});

// Saat file keluar dari area drop atau setelah drop: hilangkan highlight
['dragleave', 'drop'].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
    });
});

// Saat file di-drop ke area
dropZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) {
        handleImageFile(file);
    }
});

// ── 3. TOMBOL ANALISIS ─────────────────────────────────────────────────────────
document.getElementById('analyzeBtn').onclick = async () => {

    // FIX: Guard — pastikan model sudah dimuat sebelum analisis
    if (!isModelLoaded) {
        alert("Model AI belum selesai dimuat. Mohon tunggu sebentar, lalu coba lagi.");
        return;
    }

    const selectedBodyPart = document.getElementById('bodyPartInput').value;
    const selectedAge      = document.getElementById('ageInput').value;

    document.getElementById('bodyPartInput').disabled = true;
    document.getElementById('ageInput').disabled = true;
    document.getElementById('analyzeBtn').classList.add('hidden');
    document.getElementById('loader').classList.remove('hidden');

    try {
        // Jalankan prediksi AI
        const prediction = await model.predict(imgPreview);

        console.log("=== Detail Probabilitas Prediksi ===");
        prediction.forEach(p => {
            console.log(`  ${p.className}: ${(p.probability * 100).toFixed(1)}%`);
        });
        console.log("====================================");

        // Cari kelas dengan probabilitas tertinggi
        let highestPred = { className: "", probability: 0 };
        prediction.forEach(p => {
            if (p.probability > highestPred.probability) highestPred = p;
        });

        // Tampilkan hasil ke UI
        displayResult(highestPred.className, selectedBodyPart, selectedAge);

        // ── INTEGRASI BACKEND DIHAPUS (MURNI CLIENT-SIDE) ──

    } catch (err) {
        // FIX: Handle error prediksi — kembalikan UI ke semula
        console.error("❌ Gagal melakukan prediksi:", err);
        document.getElementById('bodyPartInput').disabled = false;
        document.getElementById('ageInput').disabled = false;
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('analyzeBtn').classList.remove('hidden');
        alert("Terjadi kesalahan saat menganalisis gambar. Pastikan foto jelas dan coba lagi.");
    }
};

// ── 4. TAMPILKAN HASIL ─────────────────────────────────────────────────────────
function displayResult(grade, bodyPart, age) {
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('resultBox').classList.remove('hidden');

    // Ubah judul hero
    document.querySelector('.hero h1').innerText = "Pengecekan Selesai!";
    document.querySelector('.hero p').classList.add('hidden');

    const badge  = document.getElementById('gradeBadge');
    const advice = document.getElementById('resAdvice');
    const resultCard = document.getElementById('resultBox');

    // Tampilkan nama kelas dari model
    badge.innerText = grade;

    // FIX: Set warna badge & border hasil dinamis sesuai grade
    const gradeLower = grade.toLowerCase();
    badge.className  = 'badge'; // reset semua kelas warna lama

    if (gradeLower.includes("normal")) {
        badge.classList.add('badge-normal');
        resultCard.style.borderTopColor = '#22c55e';
    } else if (gradeLower.includes("1")) {
        badge.classList.add('badge-grade1');
        resultCard.style.borderTopColor = '#EAB308';
    } else if (gradeLower.includes("2")) {
        badge.classList.add('badge-grade2');
        resultCard.style.borderTopColor = '#F97316';
    } else if (gradeLower.includes("3")) {
        badge.classList.add('badge-grade3');
        resultCard.style.borderTopColor = '#e63946';
    } else {
        badge.classList.add('badge-unknown');
        resultCard.style.borderTopColor = '#94a3b8';
    }

    // ── KELAS NORMAL: Tidak ada luka bakar terdeteksi ──
    if (gradeLower.includes("normal")) {
        advice.innerHTML = `Tidak terdeteksi luka bakar pada foto yang diunggah.<br><br>
            Jika Anda masih merasakan ketidaknyamanan atau keluhan pada kulit, 
            silakan konsultasikan langsung ke tenaga medis profesional.`;
        return;
    }

    // Peringatan khusus pediatrik (anak-anak)
    let pediatricWarning = "";
    if (age === "anak") {
        pediatricWarning = `<br><br><strong style="color:#e63946;">
            ⚠️ PERHATIAN PEDIATRIK: Pasien anak lebih rentan terhadap syok dan dehidrasi. 
            Segera periksakan ke IGD jika luas luka melebihi telapak tangan anak.
        </strong>`;
    }

    let baseAdvice = "";

    // ── MATRIKS REKOMENDASI (Silakan edit konten di bawah ini sesuai dokumen Anda) ──
    if (gradeLower.includes("1")) {
        // --- GRADE 1: SUPERFICIAL ---
        if (bodyPart === "tangan") {
            if (age === "anak") {
                baseAdvice = `[Rekomendasi Grade 1 - Tangan - Anak-anak: Silakan ganti dengan teks dari dokumen Anda]`;
            } else {
                baseAdvice = `[Rekomendasi Grade 1 - Tangan - Dewasa: Silakan ganti dengan teks dari dokumen Anda]`;
            }
        } else if (bodyPart === "kaki") {
            if (age === "anak") {
                baseAdvice = `[Rekomendasi Grade 1 - Kaki - Anak-anak: Silakan ganti dengan teks dari dokumen Anda]`;
            } else {
                baseAdvice = `[Rekomendasi Grade 1 - Kaki - Dewasa: Silakan ganti dengan teks dari dokumen Anda]`;
            }
        }

    } else if (gradeLower.includes("2")) {
        // --- GRADE 2: PARTIAL THICKNESS ---
        if (bodyPart === "tangan") {
            if (age === "anak") {
                baseAdvice = `[Rekomendasi Grade 2 - Tangan - Anak-anak: Silakan ganti dengan teks dari dokumen Anda]`;
            } else {
                baseAdvice = `[Rekomendasi Grade 2 - Tangan - Dewasa: Silakan ganti dengan teks dari dokumen Anda]`;
            }
        } else if (bodyPart === "kaki") {
            if (age === "anak") {
                baseAdvice = `[Rekomendasi Grade 2 - Kaki - Anak-anak: Silakan ganti dengan teks dari dokumen Anda]`;
            } else {
                baseAdvice = `[Rekomendasi Grade 2 - Kaki - Dewasa: Silakan ganti dengan teks dari dokumen Anda]`;
            }
        }

    } else if (gradeLower.includes("3")) {
        // --- GRADE 3: FULL THICKNESS ---
        if (bodyPart === "tangan") {
            if (age === "anak") {
                baseAdvice = `[Rekomendasi Grade 3 - Tangan - Anak-anak: Silakan ganti dengan teks dari dokumen Anda]`;
            } else {
                baseAdvice = `[Rekomendasi Grade 3 - Tangan - Dewasa: Silakan ganti dengan teks dari dokumen Anda]`;
            }
        } else if (bodyPart === "kaki") {
            if (age === "anak") {
                baseAdvice = `[Rekomendasi Grade 3 - Kaki - Anak-anak: Silakan ganti dengan teks dari dokumen Anda]`;
            } else {
                baseAdvice = `[Rekomendasi Grade 3 - Kaki - Dewasa: Silakan ganti dengan teks dari dokumen Anda]`;
            }
        }
    } else {
        baseAdvice = "Tingkat keparahan tidak dapat diidentifikasi secara pasti. Harap segera hubungi tenaga medis atau kunjungi klinik terdekat jika terdapat keluhan fisik.";
    }

    // Tampilkan hasil rekomendasi klinis ke UI
    advice.innerHTML = baseAdvice + pediatricWarning;
}