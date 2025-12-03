export function initPage() {
  let dataMateri = [];
  setupDropdownFilters({ user_no: user.user_no, id_sekolah: user.id_sekolah, role: user.role }, {
    mapelEl: document.getElementById('mapel'),
    materiEl: document.getElementById('materi'),
    jurusanEl: document.getElementById('jurusan'),
    semesterContainerEl: document.getElementById('semesterContainer'),
  });
  const soalContainer = document.getElementById('soalContainer');
  const tipeSoalSelect = document.getElementById('tipeSoal');
  const tambahSoalBtn = document.getElementById('tambahSoal');
  let soalCounter = 0;
  function buatInputGambarHTML(index) {
    return `
      <div class="mt-2">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-200">Gambar untuk Soal (Opsional)</label>
        <input type="file" name="gambar_soal_${index}" accept="image/*" class="mt-1 block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200">
      </div>
    `;
  }
  function buatSoalEssay(index) {
    return `
      <div class="p-4 border rounded bg-gray-50 dark:bg-gray-700 relative soal-item">
        <label class="block text-gray-700 dark:text-gray-200 font-medium mb-1"><b>Soal ${index + 1}</b></label>
        ${buatInputGambarHTML(index)}
        <br>
        <textarea name="soal_essay_${index}" class="w-full p-2 border rounded" rows="3" placeholder="Tulis soal essay..."></textarea>
        <button type="button" class="absolute top-2 right-2 text-red-500 hover:text-red-700 delete-soal">Hapus</button>
      </div>
    `;
  }
  function buatSoalPG(index) {
    return `
      <div class="p-4 border rounded bg-white dark:bg-gray-700 relative soal-item" data-index="${index}">
        <label class="block text-gray-700 dark:text-gray-200 font-medium mb-1"><b>Soal ${index + 1}</b></label>
        ${buatInputGambarHTML(index)}
        <br>
        <textarea name="soal_pg_${index}" class="w-full p-2 border rounded mb-2" rows="3" placeholder="Tulis soal PG..."></textarea>
        <div class="opsi-container space-y-1 mt-2">
          ${buatOpsi(index, 0)}
          ${buatOpsi(index, 1)}
        </div>
        <button type="button" class="tambah-opsi mt-2 text-blue-600 hover:underline text-sm">+ Tambah Opsi</button>
        <div class="mt-3">
          <label class="block text-sm font-medium">Jawaban Benar:</label>
          <select name="soal_pg_${index}_jawaban" class="jawaban-select border rounded p-1">
            <option value="A">A</option>
            <option value="B">B</option>
          </select>
        </div>
        <button type="button" class="absolute top-2 right-2 text-red-500 hover:text-red-700 delete-soal">Hapus</button>
      </div>
    `;
  }
  function buatOpsi(soalIndex, opsiIndex) {
    const huruf = String.fromCharCode(65 + opsiIndex); // A, B, C, ...
    return `
      <div class="flex items-center opsi-item" data-opsi="${opsiIndex}">
        <label class="w-6">${huruf}.</label>
        <input type="text" name="soal_pg_${soalIndex}_opsi_${huruf}" class="w-full p-1 border rounded" placeholder="Opsi ${huruf}">
        <button type="button" class="hapus-opsi text-red-500 text-sm ml-2">✕</button>
      </div>
    `;
  }
  tambahSoalBtn.addEventListener('click', () => {
    const tipe = tipeSoalSelect.value;
    const index = soalCounter++;
    let html = tipe === 'Essay' ? buatSoalEssay(index) : buatSoalPG(index);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    const deleteBtn = wrapper.querySelector('.delete-soal');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => wrapper.remove());
    }
    if (tipe === 'Pilihan Ganda') {
      const tambahOpsiBtn = wrapper.querySelector('.tambah-opsi');
      const opsiContainer = wrapper.querySelector('.opsi-container');
      const jawabanSelect = wrapper.querySelector('.jawaban-select');
      let jumlahOpsi = 2;
      tambahOpsiBtn.addEventListener('click', () => {
        if (jumlahOpsi >= 26) return;
        const opsiHTML = buatOpsi(index, jumlahOpsi);
        opsiContainer.insertAdjacentHTML('beforeend', opsiHTML);
        const huruf = String.fromCharCode(65 + jumlahOpsi);
        jawabanSelect.insertAdjacentHTML('beforeend', `<option value="${huruf}">${huruf}</option>`);
        jumlahOpsi++;
      });
      wrapper.addEventListener('click', (e) => {
        if (e.target.classList.contains('hapus-opsi')) {
          e.target.closest('.opsi-item')?.remove();
        }
      });
    }
    soalContainer.appendChild(wrapper);
  });
  const form = document.getElementById('addTugasForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await loading();
    const kodetugas = document.getElementById('kodetugas').value;
    const namatugas = document.getElementById('namatugas').value;
    const mapel = document.getElementById('mapel').value;
    const jurusan = document.getElementById('jurusan').value;
    const materi = document.getElementById('materi').value;
    const semesterNodes = document.querySelectorAll('input[name="semester"]:checked');
    const semesters = Array.from(semesterNodes).map(node => parseInt(node.value));
    if (semesters.length === 0) {
      alert('Pilih minimal satu semester.');
      return;
    }
    const soalItems = document.querySelectorAll('.soal-item');
    const soalData = [];
    for (const item of soalItems) {
      const isEssay = item.querySelector(`textarea[name^="soal_essay_"]`);
      const isPG = item.querySelector(`textarea[name^="soal_pg_"]`);
      const file = item.querySelector(`input[type="file"]`)?.files[0] || null;
      let soalImageUrl = null;
      if (file) {
        const filePath = `soal/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from('tugas').upload(filePath, file);
        if (!uploadError) {
          soalImageUrl = `${SUPABASE_URL}/storage/v1/object/public/tugas/${filePath}`;
        }
      }
      if (isEssay) {
        soalData.push({
          tipe: 'Essay',
          soal: isEssay.value.trim(),
          gambar_url: soalImageUrl
        });
      } else if (isPG) {
        const opsiElements = item.querySelectorAll('.opsi-item');
        const opsi = Array.from(opsiElements).map(o => {
          const huruf = o.querySelector('label').textContent.replace('.', '');
          const teks = o.querySelector('input').value.trim();
          return { huruf, teks };
        });
        const jawabanBenar = item.querySelector('.jawaban-select').value;
        soalData.push({
          tipe: 'Pilihan Ganda',
          soal: isPG.value.trim(),
          opsi,
          jawaban: jawabanBenar,
          gambar_url: soalImageUrl
        });
      }
    }
    let berhasil = 0;
    for (const sem of semesters) {
      const dataTugas = {
        kode_tugas: kodetugas,
        nama_tugas: namatugas,
        id_materi: materi,
        semester: sem,
        isi: soalData,
        id_sekolah:user.id_sekolah
      };
      const error = await insertTugas(dataTugas);
      if (error) {
        berhasil++;
        alert('Gagal menambahkan materi: ' + error.message);
        }  
      }
    if (berhasil != 0) {
      alert('Gagal menambahkan Tugas');
    } else {
      alert('Tugas berhasil ditambahkan!');
      form.reset();
      window.location.href = "#/tugas_list";
    }
    await loadingout();
  });
}
