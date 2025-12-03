export async function initPage() {
  await loading();
  await loadSiswaOptions();
  await loadJenisPelanggaranOptions();
  await loadingout();
}
async function loadSiswaOptions() {
  const { data: siswa } = await getSiswa(user.kode_sekolah);
  const select = document.getElementById('siswaSelect');
  siswa.forEach(s => {
    const option = document.createElement('option');
    option.value = s.id;
    option.textContent = `${s.user_no} (${s.name || '-'})`;
    select.appendChild(option);
  });
}
async function loadJenisPelanggaranOptions() {
  const { data: jenis } = await getJenisPelanggaran(user.id_sekolah);
  const select = document.getElementById('jenisPelanggaran');
  select.innerHTML = '<option value="">Pilih Jenis Pelanggaran</option>';
  const parentItems = jenis.filter(j => !j.parent_id);
  const grouped = {};
  parentItems.forEach(j => {
    if (!grouped[j.kelompok]) {
      grouped[j.kelompok] = [];
    }
    grouped[j.kelompok].push(j);
  });
  for (const [kelompok, items] of Object.entries(grouped)) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = kelompok;
    items.forEach(j => {
      const option = document.createElement('option');
      option.value = j.id;
      option.textContent = `${j.nama_pelanggaran} ${j.bobot_point ? `(${j.bobot_point} poin)` : '(Pilih tingkat)'}`;
      const hasChildren = jenis.some(child => child.parent_id === j.id);
      if (hasChildren) {
        option.dataset.hasChildren = 'true';
      }
      optgroup.appendChild(option);
    });
    select.appendChild(optgroup);
  }
  select.addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    const existingDisplay = document.getElementById('selectedPelanggaran');
    if (existingDisplay) {
      existingDisplay.remove();
    }
    if (selectedOption.dataset.hasChildren === 'true') {
      showTingkatPelanggaran(selectedOption.value);
      this.value = ''; // Reset selection karena user harus pilih dari modal
    }
  });
}
function showTingkatPelanggaran(parentId) {
    let modal = document.getElementById('tingkatPelanggaranModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'tingkatPelanggaranModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold">Pilih Tingkat Pelanggaran</h3>
                    <button onclick="closeTingkatModal()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div id="tingkatOptions" class="space-y-2 mb-4">
                    <!-- Options akan diisi oleh JS -->
                </div>
                <div class="flex justify-end space-x-2">
                    <button onclick="closeTingkatModal()" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Batal</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    loadTingkatOptions(parentId);
    modal.classList.remove('hidden');
}
async function loadTingkatOptions(parentId) {
    const { data: subPelanggaran } = await supabase
        .from('pelanggaran_jenis')
        .select('*')
        .eq('parent_id', parentId)
        .order('urutan');
    const container = document.getElementById('tingkatOptions');
    container.innerHTML = '';
    if (!subPelanggaran || subPelanggaran.length === 0) {
        container.innerHTML = '<p class="text-gray-500">Tidak ada tingkat pelanggaran tersedia.</p>';
        return;
    }
    subPelanggaran.forEach(sub => {
        const button = document.createElement('button');
        button.className = 'w-full text-left p-3 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition';
        button.innerHTML = `
            <div class="font-medium">${sub.tingkat ? `Tingkat ${sub.tingkat.toUpperCase()}` : 'Pelanggaran'}</div>
            <div class="text-sm text-gray-600 dark:text-gray-400">${sub.nama_pelanggaran}</div>
            <div class="text-sm font-semibold text-blue-600">${sub.bobot_point} poin</div>
        `;
        button.addEventListener('click', () => {
            selectTingkatPelanggaran(sub.id, sub.nama_pelanggaran, sub.bobot_point);
        });
        container.appendChild(button);
    });
}
function selectTingkatPelanggaran(pelanggaranId, namaPelanggaran, bobotPoint) {
    document.getElementById('jenisPelanggaran').value = pelanggaranId;
    const selectedText = `${namaPelanggaran} (${bobotPoint} poin)`;
    const selectedDisplay = document.getElementById('selectedPelanggaran') || createSelectedDisplay();
    selectedDisplay.textContent = `Selected: ${selectedText}`;
    closeTingkatModal();
}
function createSelectedDisplay() {
    const display = document.createElement('div');
    display.id = 'selectedPelanggaran';
    display.className = 'mt-2 p-2 bg-blue-50 dark:bg-blue-900 rounded text-sm';
    const select = document.getElementById('jenisPelanggaran');
    select.parentNode.insertBefore(display, select.nextSibling);
    return display;
}
function closeTingkatModal() {
    const modal = document.getElementById('tingkatPelanggaranModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}
window.showTingkatPelanggaran = showTingkatPelanggaran;
window.closeTingkatModal = closeTingkatModal;
window.selectTingkatPelanggaran = selectTingkatPelanggaran;
window.submitPelanggaran = async () => {
  try {
    const siswaId = document.getElementById('siswaSelect').value;
    const jenisPelanggaranId = document.getElementById('jenisPelanggaran').value;
    const tanggal = document.getElementById('tanggal').value;
    const keterangan = document.getElementById('keterangan').value;
    if (!siswaId) {
      alert('Pilih siswa terlebih dahulu!');
      return;
    }
    if (!jenisPelanggaranId) {
      alert('Pilih jenis pelanggaran terlebih dahulu!');
      return;
    }
    if (!tanggal) {
      alert('Tanggal harus diisi!');
      return;
    }
    const data = {
      id_sekolah: user.id_sekolah,
      siswa_id: siswaId,
      jenis_pelanggaran_id: jenisPelanggaranId,
      tanggal: tanggal,
      keterangan: keterangan || null,
      created_by: user.user_no,
    };
    const { error } = await supabase
      .from('pelanggaran_siswa')
      .insert([data]);
    if (error) throw error;
    alert('Pelanggaran berhasil dicatat!');
    window.location.hash = '#/pelanggaran_list';
  } catch (err) {
    console.error('Gagal menyimpan pelanggaran:', err);
    alert(`Gagal menyimpan pelanggaran: ${err.message}`);
  }
};  