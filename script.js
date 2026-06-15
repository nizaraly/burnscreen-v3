const URL_MODEL = "https://teachablemachine.withgoogle.com/models/HYg4GPZE6/";

let model;
let isModelLoaded = false;

// ── 1. LOAD MODEL ──────────────────────────────────────────────────────────────
async function init() {
    const modelURL = URL_MODEL + "model.json";
    const metadataURL = URL_MODEL + "metadata.json";

    try {
        model = await tmImage.load(modelURL, metadataURL);
        isModelLoaded = true;
        console.log("✅ Model ML berhasil dimuat.");
    } catch (e) {
        console.error("❌ Gagal memuat model. Pastikan koneksi internet aktif.", e);
        alert("Gagal memuat model. Periksa koneksi internet lalu segarkan halaman.");
    }
}

init();

// ── 2. UPLOAD & PREVIEW GAMBAR ─────────────────────────────────────────────────
const imageInput = document.getElementById('imageInput');
const cameraInput = document.getElementById('cameraInput');
const dropZone = document.getElementById('dropZone');
const imgPreview = document.getElementById('imgPreview');


// ── Fungsi terpusat: proses file gambar dari sumber apapun ──
function handleImageFile(file) {
    if (!file) return;

    // Validasi tipe file
    if (!file.type.startsWith('image/')) {
        alert('File tidak valid. Harap pilih file gambar (JPG, PNG, WEBP, dll).');
        return;
    }


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
imageInput.onchange = (e) => handleImageFile(e.target.files[0]);

// ── Input dari kamera langsung (Khusus Fallback / Mobile) ──
cameraInput.onchange = (e) => handleImageFile(e.target.files[0]);


// ── DETEKSI PERANGKAT ──
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 768);
}

// ── KONTROLLER MODAL KAMERA (UNTUK DESKTOP/LAPTOP & WEBCAM) ──
const openCameraBtn = document.getElementById('openCameraBtn');
const cameraModal = document.getElementById('cameraModal');
const closeCameraBtn = document.getElementById('closeCameraBtn');
const webcamVideo = document.getElementById('webcamVideo');
const webcamCanvas = document.getElementById('webcamCanvas');
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
    const selectedAge = document.getElementById('ageInput').value;

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

// ── 4. TAMPILKAN HASIL (Logika & Matriks Rekomendasi dari eas-web-sher) ───────────────────────────
function displayResult(grade, bodyPart, age) {
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('previewArea').classList.add('hidden');
    document.getElementById('resultBox').classList.remove('hidden');

    // Copy image to results view
    const resultImg = document.getElementById('resultImgPreview');
    if (resultImg) {
        resultImg.src = imgPreview.src;
    }

    // Tampilkan data input pilihan lokasi & usia di bawah gambar
    const metaBodyPartText = document.getElementById('metaBodyPartText');
    const metaAgeText = document.getElementById('metaAgeText');
    if (metaBodyPartText) {
        metaBodyPartText.innerText = bodyPart === 'tangan' ? 'Tangan' : 'Kaki';
    }
    if (metaAgeText) {
        metaAgeText.innerText = age === 'dewasa' ? 'Dewasa' : 'Anak-anak';
    }

    // Ubah judul hero
    document.querySelector('.hero h1').innerText = "Pengecekan Selesai!";
    document.querySelector('.hero p').classList.add('hidden');

    const badge = document.getElementById('gradeBadge');
    const advice = document.getElementById('resAdvice');
    const resultCard = document.getElementById('resultBox');

    // Tampilkan nama kelas dari model
    badge.innerText = grade;

    // FIX: Set warna badge & border hasil dinamis sesuai grade
    const gradeLower = grade.toLowerCase();
    badge.className = 'badge'; // reset semua kelas warna lama

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

    let baseAdvice = "";
    let warningText = "";

    // ── MATRIKS REKOMENDASI DARI EAS-WEB-SHER ──
    if (gradeLower.includes("1")) {
        // --- GRADE 1: SUPERFICIAL ---
        if (bodyPart === "tangan") {
            if (age === "anak") {
                baseAdvice = `
<strong>Meredakan nyeri dan mempercepat pemulihan kulit</strong><br><br>
<ul style="margin: 10px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px;">
    <li style="background: white; border-left: 3px solid #EAB308; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Dinginkan luka dengan air mengalir selama 20 menit.
    </li>
    <li style="background: white; border-left: 3px solid #EAB308; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Lepaskan cincin, gelang, jam tangan, atau aksesori lainnya.
    </li>
    <li style="background: white; border-left: 3px solid #EAB308; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Tinggikan tangan untuk mengurangi pembengkakan.
    </li>
    <li style="background: white; border-left: 3px solid #EAB308; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Jaga kebersihan area luka dan gunakan kasa pelindung bila diperlukan.
    </li>
    <li style="background: white; border-left: 3px solid #EAB308; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Lakukan gerakan ringan jari dan pergelangan tangan jika tidak menimbulkan nyeri.
    </li>
</ul>
`;
            } else {
                baseAdvice = `
<strong>Rekomendasi Penanganan</strong><br><br>
<ul style="margin: 10px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px;">
    <li style="background: white; border-left: 3px solid #EAB308; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Lepaskan cincin, jam tangan, gelang, atau aksesori lainnya.
    </li>
    <li style="background: white; border-left: 3px solid #EAB308; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Kurangi penggunaan tangan dan hindari aktivitas berat.
    </li>
    <li style="background: white; border-left: 3px solid #EAB308; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Tinggikan tangan untuk mengurangi pembengkakan.
    </li>
    <li style="background: white; border-left: 3px solid #EAB308; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Oleskan aloe vera atau pelembap pada area luka.
    </li>
    <li style="background: white; border-left: 3px solid #EAB308; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Dinginkan luka dengan air mengalir selama 20 menit.
    </li>
</ul>
<div style="margin-top: 1.5rem;">
    <strong style="color: #e63946; display: block; margin-bottom: 0.75rem;">Hindari:</strong>
    <table style="width: 100%; border-collapse: collapse; background: #fff5f5; border: 1px solid #fee2e2; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <tbody>
            <tr>
                <td style="padding: 10px 14px; font-size: 0.85rem; color: #b91c1c; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-circle-xmark" style="color: #ef4444; font-size: 1rem; flex-shrink: 0;"></i>
                    <span>Hindari deterjen, bahan kimia, dan air panas berlebihan.</span>
                </td>
            </tr>
        </tbody>
    </table>
</div>
`;
            }
        } else if (bodyPart === "kaki") {
            if (age === "anak") {
                baseAdvice = `
<strong>Meredakan nyeri dan mempercepat pemulihan kulit</strong><br><br>
<ul style="margin: 10px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px;">
    <li style="background: white; border-left: 3px solid #EAB308; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Dinginkan luka dengan air mengalir selama 20 menit.
    </li>
    <li style="background: white; border-left: 3px solid #EAB308; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Lepaskan sepatu atau aksesori yang tidak menempel.
    </li>
    <li style="background: white; border-left: 3px solid #EAB308; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Istirahatkan dan kurangi aktivitas pada kaki.
    </li>
    <li style="background: white; border-left: 3px solid #EAB308; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Tinggikan kaki bila bengkak.
    </li>
    <li style="background: white; border-left: 3px solid #EAB308; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Oleskan aloe vera atau pelembap.
    </li>
</ul>
`;
            } else {
                baseAdvice = `
<strong>Meredakan nyeri dan mempercepat pemulihan kulit</strong><br><br>
<ul style="margin: 10px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px;">
    <li style="background: white; border-left: 3px solid #EAB308; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Dinginkan luka dengan air mengalir selama 20 menit.
    </li>
    <li style="background: white; border-left: 3px solid #EAB308; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Lepaskan sepatu, kaus kaki, atau aksesori yang tidak menempel pada luka.
    </li>
    <li style="background: white; border-left: 3px solid #EAB308; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Istirahatkan kaki dan hindari aktivitas berlebihan.
    </li>
    <li style="background: white; border-left: 3px solid #EAB308; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Tinggikan kaki untuk mengurangi pembengkakan.
    </li>
    <li style="background: white; border-left: 3px solid #EAB308; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Oleskan aloe vera atau pelembap pada area luka.
    </li>
    <li style="background: white; border-left: 3px solid #EAB308; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Gunakan pereda nyeri sesuai petunjuk bila diperlukan.
    </li>
</ul>
`;
            }
        }

    } else if (gradeLower.includes("2")) {
        // --- GRADE 2: PARTIAL THICKNESS ---
        if (bodyPart === "tangan") {
            if (age === "anak") {
                warningText = `<strong>WARNING!</strong> Pasien anak lebih rentan terhadap syok dan dehidrasi. <strong>Segera periksakan ke IGD jika luas luka melebihi telapak tangan anak.</strong>`;
                baseAdvice = `
<strong>Melindungi luka dan mencegah infeksi</strong><br><br>
<ul style="margin: 10px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px;">
    <li style="background: white; border-left: 3px solid #F97316; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Dinginkan luka dengan air mengalir selama 20 menit.
    </li>
    <li style="background: white; border-left: 3px solid #F97316; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Lepaskan cincin, gelang, atau jam tangan yang tidak menempel pada luka.
    </li>
    <li style="background: white; border-left: 3px solid #F97316; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Jangan memecahkan atau mengelupas lepuh.
    </li>
    <li style="background: white; border-left: 3px solid #F97316; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Tutup luka dengan kasa steril non-stick secara longgar.
    </li>
    <li style="background: white; border-left: 3px solid #F97316; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Tinggikan tangan untuk mengurangi pembengkakan.
    </li>
    <li style="background: white; border-left: 3px solid #F97316; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Lakukan gerakan ringan jari jika tidak menimbulkan nyeri.
    </li>
</ul>
`;
            } else {
                warningText = `<strong>WARNING!</strong> Segera periksa ke tenaga kesehatan, terutama jika luka mengenai jari, telapak tangan, atau area sendi.`;
                baseAdvice = `
<strong>Melindungi luka dan mencegah infeksi</strong><br><br>
<ul style="margin: 10px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px;">
    <li style="background: white; border-left: 3px solid #F97316; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Dinginkan luka dengan air mengalir selama 20 menit.
    </li>
    <li style="background: white; border-left: 3px solid #F97316; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Lepaskan seluruh perhiasan dari tangan.
    </li>
    <li style="background: white; border-left: 3px solid #F97316; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Jangan memecahkan atau menggaruk lepuh.
    </li>
    <li style="background: white; border-left: 3px solid #F97316; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Tutup luka dengan kasa steril non-stick dan ganti jika kotor atau basah.
    </li>
    <li style="background: white; border-left: 3px solid #F97316; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Kurangi aktivitas yang memberi tekanan pada tangan.
    </li>
    <li style="background: white; border-left: 3px solid #F97316; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Tinggikan tangan untuk mengurangi pembengkakan.
    </li>
    <li style="background: white; border-left: 3px solid #F97316; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Lakukan latihan ringan jari dan pergelangan setelah nyeri berkurang.
    </li>
</ul>
`;
            }
        } else if (bodyPart === "kaki") {
            if (age === "anak") {
                warningText = `<strong>WARNING!</strong> Pasien anak lebih rentan terhadap syok dan dehidrasi. <strong>Segera periksakan ke IGD jika luas luka melebihi telapak tangan anak.</strong>`;
                baseAdvice = `
<strong>Melindungi luka dan mencegah infeksi</strong><br><br>
<ul style="margin: 10px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px;">
    <li style="background: white; border-left: 3px solid #F97316; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Dinginkan luka dengan air mengalir selama 20 menit.
    </li>
    <li style="background: white; border-left: 3px solid #F97316; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Lepaskan alas kaki yang tidak menempel pada luka.
    </li>
    <li style="background: white; border-left: 3px solid #F97316; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Jangan memecahkan atau menggaruk lepuh.
    </li>
    <li style="background: white; border-left: 3px solid #F97316; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Tutup luka dengan kasa steril non-stick.
    </li>
    <li style="background: white; border-left: 3px solid #F97316; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Batasi berjalan dan hindari aktivitas berat.
    </li>
    <li style="background: white; border-left: 3px solid #F97316; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Tinggikan kaki untuk mengurangi pembengkakan.
    </li>
</ul>
`;
            } else {
                warningText = `<strong>WARNING!</strong> Periksa ke tenaga kesehatan jika luka luas, lepuh besar, terdapat tanda infeksi, atau sulit berjalan.`;
                baseAdvice = `
<strong>Melindungi luka dan mencegah infeksi</strong><br><br>
<ul style="margin: 10px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px;">
    <li style="background: white; border-left: 3px solid #F97316; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Dinginkan luka dengan air mengalir selama 20 menit.
    </li>
    <li style="background: white; border-left: 3px solid #F97316; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Lepaskan alas kaki yang tidak menempel pada luka.
    </li>
    <li style="background: white; border-left: 3px solid #F97316; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Jangan memecahkan atau menggaruk lepuh.
    </li>
    <li style="background: white; border-left: 3px solid #F97316; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Tutup luka dengan kasa steril non-stick.
    </li>
    <li style="background: white; border-left: 3px solid #F97316; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Batasi berjalan dan hindari aktivitas berat.
    </li>
    <li style="background: white; border-left: 3px solid #F97316; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Tinggikan kaki untuk mengurangi pembengkakan.
    </li>
</ul>
`;
            }
        }

    } else if (gradeLower.includes("3")) {
        // --- GRADE 3: FULL THICKNESS ---
        if (bodyPart === "tangan") {
            if (age === "anak") {
                warningText = `<strong>WARNING!</strong> Pasien anak lebih rentan terhadap syok dan dehidrasi. <strong>Segera bawa ke rumah sakit untuk mendapatkan penanganan medis.</strong>`;
                baseAdvice = `
<strong>Rekomendasi Penanganan</strong><br><br>
<ul style="margin: 10px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px;">
    <li style="background: white; border-left: 3px solid #e63946; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Jauhkan anak dari sumber panas.
    </li>
    <li style="background: white; border-left: 3px solid #e63946; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Lepaskan cincin, gelang, atau aksesori yang tidak menempel pada luka.
    </li>
    <li style="background: white; border-left: 3px solid #e63946; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Tutup luka dengan kasa steril atau kain bersih.
    </li>
    <li style="background: white; border-left: 3px solid #e63946; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Tinggikan tangan jika memungkinkan.
    </li>
    <li style="background: white; border-left: 3px solid #e63946; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Jaga tubuh anak tetap hangat.
    </li>
    <li style="background: white; border-left: 3px solid #e63946; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Melepaskan pakaian atau benda yang menempel pada luka.
    </li>
</ul>
<div style="margin-top: 1.5rem;">
    <strong style="color: #e63946; display: block; margin-bottom: 0.75rem;">Hindari / Jangan Dilakukan:</strong>
    <table style="width: 100%; border-collapse: collapse; background: #fff5f5; border: 1px solid #fee2e2; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <tbody>
            <tr style="border-bottom: 1px solid #fee2e2;">
                <td style="padding: 10px 14px; font-size: 0.85rem; color: #b91c1c; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-circle-xmark" style="color: #ef4444; font-size: 1rem; flex-shrink: 0;"></i>
                    <span>Mengoleskan pasta gigi, mentega, minyak, or bahan tradisional lainnya.</span>
                </td>
            </tr>
            <tr>
                <td style="padding: 10px 14px; font-size: 0.85rem; color: #b91c1c; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-circle-xmark" style="color: #ef4444; font-size: 1rem; flex-shrink: 0;"></i>
                    <span>Memecahkan jaringan atau kulit yang rusak.</span>
                </td>
            </tr>
        </tbody>
    </table>
</div>
`;
            } else {
                warningText = `<strong>WARNING!</strong> Segera bawa ke rumah sakit untuk mendapatkan penanganan medis.`;
                baseAdvice = `
<strong>Pertolongan Pertama Sebelum ke Rumah Sakit</strong><br><br>
<ul style="margin: 10px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px;">
    <li style="background: white; border-left: 3px solid #e63946; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Jauhkan korban dari sumber panas atau penyebab luka bakar.
    </li>
    <li style="background: white; border-left: 3px solid #e63946; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Lepaskan cincin, gelang, jam tangan, atau perhiasan yang tidak menempel pada luka.
    </li>
    <li style="background: white; border-left: 3px solid #e63946; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Tutup luka dengan kasa steril atau kain bersih secara longgar.
    </li>
    <li style="background: white; border-left: 3px solid #e63946; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Tinggikan tangan jika memungkinkan untuk mengurangi pembengkakan.
    </li>
</ul>
`;
            }
        } else if (bodyPart === "kaki") {
            if (age === "anak") {
                warningText = `<strong>WARNING!</strong> Pasien anak lebih rentan terhadap syok dan dehidrasi. <strong>Segera bawa ke rumah sakit untuk mendapatkan penanganan medis.</strong>`;
                baseAdvice = `
<strong>Pertolongan Pertama Sebelum ke Rumah Sakit</strong><br><br>
<ul style="margin: 10px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px;">
    <li style="background: white; border-left: 3px solid #e63946; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Jauhkan korban dari sumber panas.
    </li>
    <li style="background: white; border-left: 3px solid #e63946; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Lepaskan sepatu, kaus kaki, dan aksesori yang tidak menempel pada luka.
    </li>
    <li style="background: white; border-left: 3px solid #e63946; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Tutup luka dengan kasa steril atau kain bersih secara longgar.
    </li>
    <li style="background: white; border-left: 3px solid #e63946; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Tinggikan kaki lebih tinggi dari jantung jika memungkinkan.
    </li>
    <li style="background: white; border-left: 3px solid #e63946; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Jaga suhu tubuh agar tetap hangat.
    </li>
</ul>
`;
            } else {
                warningText = `<strong>WARNING!</strong> Segera bawa ke rumah sakit untuk mendapatkan penanganan medis.`;
                baseAdvice = `
<strong>Pertolongan Pertama Sebelum ke Rumah Sakit</strong><br><br>
<ul style="margin: 10px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px;">
    <li style="background: white; border-left: 3px solid #e63946; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Jauhkan korban dari sumber panas.
    </li>
    <li style="background: white; border-left: 3px solid #e63946; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Lepaskan sepatu, kaus kaki, dan aksesori yang tidak menempel pada luka.
    </li>
    <li style="background: white; border-left: 3px solid #e63946; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Tutup luka dengan kasa steril atau kain bersih secara longgar.
    </li>
    <li style="background: white; border-left: 3px solid #e63946; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Tinggikan kaki jika memungkinkan.
    </li>
    <li style="background: white; border-left: 3px solid #e63946; padding: 10px 14px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); font-size: 0.85rem; color: #334155; line-height: 1.5;">
        Jaga tubuh tetap hangat.
    </li>
</ul>
`;
            }
        }
    } else {
        baseAdvice = "Tingkat keparahan tidak dapat diidentifikasi secara pasti. Harap segera hubungi tenaga medis atau kunjungi klinik terdekat jika terdapat keluhan fisik.";
    }

    // Tampilkan hasil rekomendasi klinis ke UI
    advice.innerHTML = baseAdvice;

    // Tampilkan warning box jika ada warningText
    const warningBox = document.getElementById('resWarning');
    if (warningBox) {
        if (warningText) {
            warningBox.innerHTML = warningText;
            warningBox.classList.remove('hidden');
        } else {
            warningBox.classList.add('hidden');
        }
    }
}

// ── CLINIC FINDER LOGIC (dari eas-web-sher) ──
function findClinic() {
    const btn = document.getElementById('findClinicBtn');
    const status = document.getElementById('clinicStatus');

    if (!navigator.geolocation) {
        showClinicStatus('Browser Anda tidak mendukung geolokasi.', 'error');
        return;
    }

    setClinicLoading(true);
    showClinicStatus('Meminta izin lokasi...', '');

    navigator.geolocation.getCurrentPosition(
        function (pos) {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            showClinicStatus('Lokasi ditemukan! Membuka Google Maps...', 'success');
            setClinicLoading(false);

            const query = encodeURIComponent('klinik terdekat');
            const url = `https://www.google.com/maps/search/${query}/@${lat},${lng},15z`;

            setTimeout(function () {
                window.open(url, '_blank');
                showClinicStatus('Google Maps telah dibuka di tab baru.', 'success');
            }, 600);
        },
        function (err) {
            setClinicLoading(false);
            const msgs = {
                1: 'Izin lokasi ditolak. Harap aktifkan di pengaturan browser.',
                2: 'Posisi tidak tersedia. Pastikan GPS aktif.',
                3: 'Permintaan lokasi habis waktu. Coba lagi.',
            };
            showClinicStatus(msgs[err.code] || 'Gagal mendapatkan lokasi.', 'error');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    function setClinicLoading(on) {
        if (on) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Mendeteksi lokasi...`;
        } else {
            btn.disabled = false;
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;display:inline-block;vertical-align:middle;">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 2a7 7 0 0 1 7 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 0 1 7-7z"/>
                </svg>
                <span>Cari Klinik Terdekat</span>`;
        }
    }

    function showClinicStatus(msg, type) {
        status.textContent = msg;
        if (type === 'error') {
            status.style.color = '#ef4444';
        } else if (type === 'success') {
            status.style.color = '#22c55e';
        } else {
            status.style.color = '#64748b';
        }
    }
}

console.log("hai")