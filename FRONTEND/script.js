const URL_MODEL = "https://teachablemachine.withgoogle.com/models/uW9NLaB5x/";

let model, maxPredictions;

// Fungsi Memuat Model
async function init() {
    const modelURL = URL_MODEL + "model.json";
    const metadataURL = URL_MODEL + "metadata.json";

    try {
        model = await tmImage.load(modelURL, metadataURL);
        console.log("Model Machine Learning (Teachable Machine) Berhasil Dimuat");
    } catch (e) {
        console.error("Gagal memuat model. Pastikan link ML benar.", e);
    }
}

init();

// Integrasi Input Gambar
const imageInput = document.getElementById('imageInput');
const dropZone = document.getElementById('dropZone');
const imgPreview = document.getElementById('imgPreview');

dropZone.onclick = () => imageInput.click();

imageInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            imgPreview.src = event.target.result;
            document.getElementById('previewArea').classList.remove('hidden');
            dropZone.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }
};

// Fungsi Analisis
document.getElementById('analyzeBtn').onclick = async () => {
    // 1. Tangkap input pilihan bagian tubuh dan usia
    const selectedBodyPart = document.getElementById('bodyPartInput').value;
    const selectedAge = document.getElementById('ageInput').value;

    document.getElementById('analyzeBtn').classList.add('hidden');
    document.getElementById('loader').classList.remove('hidden');

    // Menjalankan Prediksi AI
    const prediction = await model.predict(imgPreview);

    console.log("=== Detail Probabilitas Prediksi ===");
    prediction.forEach(p => {
        console.log(`${p.className}: ${(p.probability * 100).toFixed(0)}%`);
    });
    console.log("====================================");

    let highestPred = { className: "", probability: 0 };
    prediction.forEach(p => {
        if (p.probability > highestPred.probability) {
            highestPred = p;
        }
    });

    // 2. Kirim grade, bagian tubuh, dan usia ke fungsi penampil
    displayResult(highestPred.className, selectedBodyPart, selectedAge);

    // --- INTEGRASI BACKEND ---
    const file = imageInput.files[0];
    if (file) {
        const formData = new FormData();
        formData.append("gambar", file);
        formData.append("tingkat_luka", highestPred.className);
        formData.append("bagian_tubuh", selectedBodyPart);
        formData.append("kategori_usia", selectedAge); // Ekstra: kirim usia ke backend

        try {
            const response = await fetch("../api/simpan_hasil.php", {
                method: "POST",
                body: formData
            });
            const result = await response.json();
            console.log("Response dari server:", result);
            if (result.status === 'sukses') {
                console.log("Data berhasil disimpan di database. Path gambar:", result.path_gambar);
            } else {
                console.error("Gagal dari server:", result.pesan);
            }
        } catch (error) {
            console.error("Gagal mengirim request ke backend:", error);
        }
    }
    // -------------------------
};

// 3. Fungsi Display Result Diperbarui (Menggabungkan Grade + Bagian Tubuh + Usia)
function displayResult(grade, bodyPart, age) {
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('resultBox').classList.remove('hidden');

    // Ubah heading utama dan hilangkan dseksripsi
    document.querySelector('.hero h1').innerText = "Pengecekan Selesai!";
    document.querySelector('.hero p').classList.add('hidden');

    const badge = document.getElementById('gradeBadge');
    const advice = document.getElementById('resAdvice');

    // Tampilkan nama class dari Teachable Machine
    badge.innerText = grade;

    // Siapkan peringatan khusus pediatrik (anak-anak)
    let pediatricWarning = "";
    if (age === "anak") {
        pediatricWarning = "<br><br><strong style=\"color: #e63946;\">⚠️ PERHATIAN PEDIATRIK: Pasien anak lebih rentan terhadap syok dan dehidrasi. Segera periksakan ke IGD jika luas luka melebihi telapak tangan anak.</strong>";
    }

    let baseAdvice = "";

    // Custom Rekomendasi (Matriks Medis)
    if (grade.includes("1")) {
        if (bodyPart === "muka") {
            baseAdvice = "- Dinginkan luka dengan air mengalir suhu normal (bukan es) selama 10–20 menit<br>- Berhati-hatilah pada area mata<br>- Gunakan pelembap atau lotion (misalnya aloe vera)<br>- <strong style=\"color: #e63946;\">Jika terjadi bengkak di wajah, segera ke dokter</strong>";
        } else {
            baseAdvice = "- Dinginkan luka dengan air mengalir suhu normal (bukan es) selama 10–20 menit<br>- Gunakan pelembap atau lotion (misalnya aloe vera)<br>- Jika nyeri: dapat menggunakan analgesik";
        }

    } else if (grade.includes("2")) {
        if (bodyPart === "muka") {
            baseAdvice = "- <strong style=\"color: #e63946;\">KASUS KRITIS: Luka lepuh di wajah berisiko mengganggu jalan napas!</strong><br>- Jangan pecahkan lepuhan (menghindari infeksi)<br>- Tutup longgar dengan kain bersih<br>- <strong style=\"color: red;\">SEGERA KE IGD / RUMAH SAKIT</strong>";
        } else if (bodyPart === "tangan" || bodyPart === "kaki") {
            baseAdvice = "- <strong style=\"color: #f4a261;\">PERHATIAN KHUSUS: Area ini rentan mengalami kekakuan saraf!</strong><br>- Dinginkan luka dengan air mengalir<br>- Jangan pecahkan lepuhan<br>- Balut longgar dengan kasa steril dan <strong>segera periksakan ke dokter spesialis</strong>";
        } else {
            baseAdvice = "- Dinginkan luka dengan air mengalir suhu normal (bukan es) selama 10–20 menit<br>- Jangan pecahkan lepuhan (menghindari infeksi)<br>- Bersihkan luka dengan air bersih atau saline<br>- Gunakan salep antibiotik topikal (contoh: Silver sulfadiazine, sesuai anjuran tenaga medis)";
        }

    } else if (grade.includes("3")) {
        if (bodyPart === "muka") {
            baseAdvice = "- <strong style=\"color: red;\">GAWAT DARURAT UTAMA: Risiko gagal napas sangat tinggi!</strong><br>- Hubungi Ambulans (119) sekarang juga<br>- Jangan mencoba mengobati sendiri / memberi salep<br>- Evakuasi ke RS sesegera mungkin";
        } else {
            baseAdvice = "- <strong style=\"color: red;\">Segera cari pertolongan medis (RS)</strong><br>- Kerusakan telah mencapai jaringan dalam/otot<br>- Jangan mencoba mengobati sendiri<br>- Tutup luka dengan kain/kasa bersih kering (jangan diberi salep sembarangan)";
        }

    } else {
        baseAdvice = "Hasil tidak spesifik. Harap konsultasikan dengan tenaga medis.";
    }

    // Gabungkan saran dasar dengan peringatan anak (jika ada)
    advice.innerHTML = baseAdvice + pediatricWarning;
}