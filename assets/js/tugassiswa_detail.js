let soalArray = [];
let idmateri = null; 
export async function initPage() {
  try {
    await loading();
    const idTugas = localStorage.getItem('selected_tugas_id');
    if (!idTugas) {
      console.error('❌ ID tugas tidak ditemukan.');
      return;
    }
    const tugasDetail = await getTugasbyId(idTugas);
    if (!tugasDetail || tugasDetail.error) {
      console.error('❌ Gagal ambil detail tugas:', tugasDetail?.error?.message);
      return;
    }
    const tugas = tugasDetail.data;
    try {
      soalArray = JSON.parse(tugas.isi);
    } catch (err) {
      console.error('❌ Format soal salah / bukan JSON:', err);
      document.getElementById('form-soal').innerHTML = '<p class="text-red-500">Gagal memuat soal.</p>';
      return;
    }
    renderTugasDetail(tugas);
    renderFormSoal(soalArray,tugas);
  } catch (err) {
    console.error('❌ Error load tugas:', err);
  }finally{
    await loadingout();
  }
}
function renderTugasDetail(tugas) {
  document.getElementById('judul-tugas').textContent = tugas.nama_tugas || 'Tanpa Judul';
  document.getElementById('author').textContent = tugas.id_guru || '-';
  document.getElementById('tanggal-dibuat').textContent = new Date(tugas.created_at).toLocaleDateString('id-ID');
  document.getElementById('semester').textContent = tugas.semester || '-';
  document.getElementById('jurusan').textContent = tugas.kode_jurusan || '-';
  document.getElementById('isi-tugas').innerHTML = ''; 
}
function renderFormSoal(soalArray,tugas) {
  idmateri = tugas.id_materi;
  const container = document.getElementById('form-soal');
  container.innerHTML = '';
  soalArray.forEach((item, index) => {
    const div = document.createElement('div');
    div.classList.add('bg-white', 'dark:bg-gray-800', 'p-4', 'rounded', 'shadow');
    let html = `<p class="text-sm font-semibold mb-2">${index + 1}. ${item.soal}</p>`;
    if (item.gambar_url) {
      html += `<img src="${item.gambar_url}" alt="Gambar Soal" class="w-32 mb-2">`;
    }
    if (item.tipe === "Essay") {
      html += `<textarea name="jawaban_${index}" rows="4" class="w-full border rounded p-2 dark:bg-gray-700 dark:text-white" placeholder="Ketik jawabanmu..."></textarea>`;
    } else if (item.tipe === "Pilihan Ganda") {
      item.opsi.forEach(op => {
        html += `
          <label class="flex items-center gap-2 mb-1">
            <input type="radio" name="jawaban_${index}" value="${op.huruf}" class="text-blue-600">
            <span>${op.huruf}. ${op.teks}</span>
          </label>
        `;
      });
    }
    div.innerHTML = html;
    container.appendChild(div);
  });
}
function ambilJawaban(soalArray) {
  return soalArray.map((item, index) => {
    const name = `jawaban_${index}`;
    let jawaban;
    if (item.tipe === 'Essay') {
      const textarea = document.querySelector(`textarea[name="${name}"]`);
      jawaban = textarea?.value.trim() || '';
    } else if (item.tipe === 'Pilihan Ganda') {
      const selected = document.querySelector(`input[name="${name}"]:checked`);
      jawaban = selected?.value || '';
    }
    return {
      tipe: item.tipe,
      soal: item.soal,
      jawaban
    };
  });
}
const form = document.getElementById('addjawabantugas');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const idTugas = localStorage.getItem('selected_tugas_id');
  const hasil = ambilJawaban(soalArray);
  const hasilFinal = {
    id_tugas: idTugas,
    jawaban: hasil,
    id_siswa:user.id,
    id_materi:idmateri,
    id_sekolah:user.id_sekolah
  };
  const insertjawabanerror = await insertJawabanTugas(hasilFinal);
  if (insertjawabanerror) {
    alert("Gagal mengisi tugas: " + insertjawabanerror.message);
  } else {
    alert('Jawaban sudah dikumpulkan!');
    form.reset();
    window.location.href = "#/tugassiswa_list";
  }
});