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
    renderTugasDetail(tugasDetail.data);
  } catch (err) {
    console.error('❌ Error load detail tugas:', err);
  }finally{
    await loadingout();
  }
}
function renderTugasDetail(tugas) {
  document.getElementById('judul-tugas').textContent = tugas.nama_tugas || 'Tidak ada judul';
  let soalHTML = '';
  try {
    const soalArray = JSON.parse(tugas.isi);
    soalArray.forEach((soal, index) => {
      console.log(soal);
      soalHTML += `
        <div class="mb-6 p-4 border rounded-md bg-gray-50 dark:bg-gray-700">
          <p class="font-semibold mb-2">Soal ${index + 1} (${soal.tipe})</p>
          <hr><p>${soal.soal}</p>
          ${soal.gambar_url ? `<img src="${soal.gambar_url}" alt="Gambar Soal" class="mb-4 w-full max-w-md" />` : ''}
          ${soal.tipe === "Pilihan Ganda" && soal.opsi ? `
            <div class="space-y-1 mb-2">
              ${soal.opsi.map(opt => `
                <div class="flex items-center">
                  <span class="font-medium mr-2">${opt.huruf}.</span>
                  <span>${opt.teks}</span>
                </div>
              `).join('')}
            </div>
            <p class="mt-2 text-green-700 dark:text-green-400">
              ✅ Jawaban benar: <strong>${soal.jawaban || 'Belum ditentukan'}</strong>
            </p>
          ` : soal.tipe === "Essay" ? `
            <p class="italic text-gray-600 dark:text-gray-300">Jenis soal Essay. Jawaban diisi oleh siswa.</p>
            <p class="mt-2 text-green-700 dark:text-green-400">
              ✅ Contoh jawaban / Kunci: <strong>${soal.jawaban || 'Belum ditentukan'}</strong>
            </p>
          ` : `
            <p class="text-red-500">❌ Tipe soal tidak dikenali.</p>
          `}
        </div>
      `;
    });
  } catch (err) {
    console.error('❌ Gagal parse isi tugas:', err);
    soalHTML = '<p class="text-red-500">Gagal menampilkan soal.</p>';
  }
  document.getElementById('isi-tugas').innerHTML = soalHTML;
}
