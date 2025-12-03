export async function initPage() {
  await loading();
  try {
    await loadSaldo();
    document.getElementById('searchInput').addEventListener('input', loadSaldo);
    document.getElementById('jenisFilter').addEventListener('change', loadSaldo);
    document.getElementById('pemilikFilter').addEventListener('change', loadSaldo);
    document.getElementById('tambahSaldoBtn').addEventListener('click', openTambahSaldoModal);
  } catch (error) {
    console.error('Gagal memuat halaman:', error);
    alert('Gagal memuat halaman: ' + error.message);
  } finally {
    await loadingout();
  }
}
async function loadSaldo() {
  await loading();
  try {
    const search = document.getElementById('searchInput').value;
    const jenis = document.getElementById('jenisFilter').value;
    const pemilik = document.getElementById('pemilikFilter').value;
    let query = supabase.from('saldo').select('*');
    if (jenis) query = query.eq('jenis_saldo', jenis);
    if (pemilik === 'sekolah') query = query.is('id_user', null);
    if (pemilik === 'siswa') query = query.not('id_user', 'is', null);
    const { data: saldoList, error } = await query.eq('id_sekolah', user.id_sekolah);
    if (error) throw error;
    let filteredData = saldoList || [];
    if (search) {
      const searchLower = search.toLowerCase();
      filteredData = filteredData.filter(item => 
        item.nama_saldo.toLowerCase().includes(searchLower) ||
        item.keterangan.toLowerCase().includes(searchLower)
      );
    }
    renderSaldoTable(filteredData);
  } catch (error) {
    console.error('Gagal memuat saldo:', error);
    alert('Gagal memuat saldo: ' + error.message);
  } finally {
    await loadingout();
  }
}
function renderSaldoTable(data) {
  const tableBody = document.getElementById('saldoList');
  if (data.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="py-4 px-4 text-center text-gray-500 dark:text-gray-400">
          Tidak ditemukan saldo
        </td>
      </tr>
    `;
    return;
  }
  let html = '';
  data.forEach(item => {
    const saldo = parseInt(item.saldo_sekarang || 0);
    const saldoClass = saldo >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
    const pemilik = item.id_user ? 'Siswa' : 'Sekolah';
    html += `
      <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
        <td class="py-3 px-4 dark:text-gray-300 font-medium">${item.nama_saldo}</td>
        <td class="py-3 px-4 dark:text-gray-300">
          <span class="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            ${item.jenis_saldo}
          </span>
        </td>
        <td class="py-3 px-4 dark:text-gray-300">${pemilik}</td>
        <td class="py-3 px-4 dark:text-gray-300 font-bold ${saldoClass}">
          Rp ${saldo.toLocaleString('id-ID')}
        </td>
        <td class="py-3 px-4 dark:text-gray-300">${item.keterangan || '-'}</td>
        <td class="py-3 px-4">
          <div class="flex gap-2">
            <button class="text-blue-600 hover:text-blue-800 mutasi-btn dark:text-blue-400" 
                    data-id="${item.id}" title="Lihat Mutasi">
              <i class="fas fa-history"></i>
            </button>
            <button class="text-green-600 hover:text-green-800 tambah-btn dark:text-green-400" 
                    data-id="${item.id}" title="Tambah Saldo">
              <i class="fas fa-plus"></i>
            </button>
            <button class="text-yellow-600 hover:text-yellow-800 edit-btn dark:text-yellow-400" 
                    data-id="${item.id}" title="Edit Saldo">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });
  tableBody.innerHTML = html;
  document.querySelectorAll('.mutasi-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('.mutasi-btn').dataset.id;
      openMutasiModal(id);
    });
  });
  document.querySelectorAll('.tambah-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('.tambah-btn').dataset.id;
      openTambahModal(id);
    });
  });
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('.edit-btn').dataset.id;
      openEditModal(id);
    });
  });
}
async function openTambahSaldoModal() {
  const modalHtml = `
    <div class="modal-container">
      <div class="modal-content">
        <div class="p-6">
          <h2 class="text-xl font-bold mb-4 dark:text-white">Tambah Saldo</h2>
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2 dark:text-gray-300">Jenis Saldo</label>
            <select id="jenisSaldo" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white">
              <option value="dana_bos">Dana BOS</option>
              <option value="kas_sekolah">Kas Sekolah</option>
              <option value="dana_darurat">Dana Darurat</option>
              <option value="lainnya">Lainnya</option>
            </select>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2 dark:text-gray-300">Nama Saldo</label>
            <input type="text" id="namaSaldo" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white" 
                   placeholder="Contoh: Dana BOS 2024, Kas Sekolah">
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2 dark:text-gray-300">Saldo Awal</label>
            <input type="number" id="saldoAwal" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white" 
                   value="0" min="0">
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2 dark:text-gray-300">Keterangan</label>
            <textarea id="keteranganSaldo" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white" 
                      placeholder="Keterangan tambahan"></textarea>
          </div>
          <div class="flex gap-2">
            <button id="simpanSaldo" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
              Simpan Saldo
            </button>
            <button id="batalSaldo" class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  const modal = createModal(modalHtml);
  modal.querySelector('#batalSaldo').addEventListener('click', closeModal);
  modal.querySelector('#simpanSaldo').addEventListener('click', simpanSaldo);
}

async function simpanSaldo() {
  const jenisSaldo = document.getElementById('jenisSaldo').value;
  const namaSaldo = document.getElementById('namaSaldo').value;
  const saldoAwal = parseInt(document.getElementById('saldoAwal').value);
  const keterangan = document.getElementById('keteranganSaldo').value;
  if (!namaSaldo) {
    alert('Nama saldo harus diisi');
    return;
  }
  await loading();
  try {
    const { data, error } = await createSaldo({
      id_sekolah: user.id_sekolah,
      jenis_saldo: jenisSaldo,
      nama_saldo: namaSaldo,
      saldo_awal: saldoAwal,
      saldo_sekarang: saldoAwal,
      keterangan: keterangan
    });
    if (error) throw error;
    alert('Saldo berhasil dibuat!');
    closeModal();
    await loadSaldo();
  } catch (error) {
    console.error('Error creating saldo:', error);
    alert('Gagal membuat saldo: ' + (error.message || 'Terjadi kesalahan'));
  } finally {
    await loadingout();
  }
}

function createModal(html) {
  const existingModal = document.querySelector('.modal-container');
  if (existingModal) existingModal.remove();
  const modal = document.createElement('div');
  modal.className = 'modal-container';
  modal.innerHTML = html;
  document.body.appendChild(modal);
  return modal;
}

function closeModal() {
  const modal = document.querySelector('.modal-container');
  if (modal) modal.remove();
}

async function openMutasiModal(saldoId) {
  const { data: mutasi, error } = await getMutasiSaldo(saldoId);
  if (error) {
    alert('Gagal memuat mutasi: ' + error.message);
    return;
  }
  const modalHtml = `
    <div class="modal-container">
      <div class="modal-content">
        <div class="p-6">
          <h2 class="text-xl font-bold mb-4 dark:text-white">Mutasi Saldo</h2>
          <div class="max-h-96 overflow-y-auto">
            ${mutasi && mutasi.length > 0 ? mutasi.map(m => `
              <div class="border-b border-gray-200 dark:border-gray-700 py-3">
                <div class="flex justify-between items-center">
                  <span class="font-medium ${m.jenis_mutasi === 'debit' ? 'text-red-600' : 'text-green-600'}">
                    ${m.jenis_mutasi === 'debit' ? '-' : '+'}Rp ${parseInt(m.nominal).toLocaleString('id-ID')}
                  </span>
                  <span class="text-sm text-gray-500">${new Date(m.created_at).toLocaleDateString('id-ID')}</span>
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400">${m.keterangan || '-'}</div>
                <div class="text-xs text-gray-500">Saldo: Rp ${parseInt(m.saldo_sebelum).toLocaleString('id-ID')} → Rp ${parseInt(m.saldo_sesudah).toLocaleString('id-ID')}</div>
              </div>
            `).join('') : '<p class="text-center text-gray-500 py-4">Tidak ada mutasi</p>'}
          </div>
          <button id="tutupMutasi" class="w-full mt-4 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">
            Tutup
          </button>
        </div>
      </div>
    </div>
  `;
  const modal = createModal(modalHtml);
  modal.querySelector('#tutupMutasi').addEventListener('click', closeModal);
}

async function openTambahModal(saldoId) {
  const modalHtml = `
    <div class="modal-container">
      <div class="modal-content">
        <div class="p-6">
          <h2 class="text-xl font-bold mb-4 dark:text-white">Tambah Saldo</h2>
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2 dark:text-gray-300">Jumlah</label>
            <input type="number" id="jumlahTambah" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white" 
                   min="1" value="0">
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2 dark:text-gray-300">Keterangan</label>
            <textarea id="keteranganTambah" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white" 
                      placeholder="Keterangan transaksi"></textarea>
          </div>
          <div class="flex gap-2">
            <button id="simpanTambah" class="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
              Tambah Saldo
            </button>
            <button id="batalTambah" class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  const modal = createModal(modalHtml);
  modal.querySelector('#batalTambah').addEventListener('click', closeModal);
  modal.querySelector('#simpanTambah').addEventListener('click', () => simpanTambahSaldo(saldoId));
}

async function simpanTambahSaldo(saldoId) {
  const jumlah = parseInt(document.getElementById('jumlahTambah').value);
  const keterangan = document.getElementById('keteranganTambah').value;
  if (!jumlah || jumlah <= 0) {
    alert('Jumlah harus lebih dari 0');
    return;
  }
  await loading();
  try {
    const { data, error } = await updateSaldoAmount(
      saldoId, 
      jumlah, 
      'kredit', 
      null,
      keterangan || 'Penambahan saldo manual'
    );
    if (error) throw error;
    alert('Saldo berhasil ditambahkan!');
    closeModal();
    await loadSaldo();
  } catch (error) {
    console.error('Error adding saldo:', error);
    alert('Gagal menambah saldo: ' + (error.message || 'Terjadi kesalahan'));
  } finally {
    await loadingout();
  }
}

async function openEditModal(saldoId) {
  const { data: saldo, error } = await supabase
    .from('saldo')
    .select('*')
    .eq('id', saldoId)
    .single();
  if (error) {
    alert('Gagal memuat data saldo: ' + error.message);
    return;
  }
  const modalHtml = `
    <div class="modal-container">
      <div class="modal-content">
        <div class="p-6">
          <h2 class="text-xl font-bold mb-4 dark:text-white">Edit Saldo</h2>
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2 dark:text-gray-300">Nama Saldo</label>
            <input type="text" id="editNamaSaldo" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white" 
                   value="${saldo.nama_saldo || ''}">
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2 dark:text-gray-300">Jenis Saldo</label>
            <select id="editJenisSaldo" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white">
              <option value="dana_bos" ${saldo.jenis_saldo === 'dana_bos' ? 'selected' : ''}>Dana BOS</option>
              <option value="kas_sekolah" ${saldo.jenis_saldo === 'kas_sekolah' ? 'selected' : ''}>Kas Sekolah</option>
              <option value="dana_darurat" ${saldo.jenis_saldo === 'dana_darurat' ? 'selected' : ''}>Dana Darurat</option>
              <option value="lainnya" ${saldo.jenis_saldo === 'lainnya' ? 'selected' : ''}>Lainnya</option>
            </select>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2 dark:text-gray-300">Keterangan</label>
            <textarea id="editKeterangan" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white">${saldo.keterangan || ''}</textarea>
          </div>
          <div class="flex gap-2">
            <button id="simpanEdit" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
              Simpan Perubahan
            </button>
            <button id="batalEdit" class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  const modal = createModal(modalHtml);
  modal.querySelector('#batalEdit').addEventListener('click', closeModal);
  modal.querySelector('#simpanEdit').addEventListener('click', () => simpanEditSaldo(saldoId));
}

async function simpanEditSaldo(saldoId) {
  const namaSaldo = document.getElementById('editNamaSaldo').value;
  const jenisSaldo = document.getElementById('editJenisSaldo').value;
  const keterangan = document.getElementById('editKeterangan').value;
  if (!namaSaldo) {
    alert('Nama saldo harus diisi');
    return;
  }
  await loading();
  try {
    const { data, error } = await updateSaldoDetail(saldoId, {
      nama_saldo: namaSaldo,
      jenis_saldo: jenisSaldo,
      keterangan: keterangan,
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
    alert('Saldo berhasil diupdate!');
    closeModal();
    await loadSaldo();
  } catch (error) {
    console.error('Error updating saldo:', error);
    alert('Gagal mengupdate saldo: ' + (error.message || 'Terjadi kesalahan'));
  } finally {
    await loadingout();
  }
}