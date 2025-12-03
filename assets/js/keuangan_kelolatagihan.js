export async function initPage() {
  await loading();
  try {
    await loadFilters();
    await loadTagihan();
    document.getElementById('searchInput').addEventListener('input', loadTagihan);
    document.getElementById('jurusanFilter').addEventListener('change', loadTagihan);
    document.getElementById('semesterFilter').addEventListener('change', loadTagihan);
    document.getElementById('jenisFilter').addEventListener('change', loadTagihan);
    document.getElementById('statusFilter').addEventListener('change', loadTagihan);
    document.getElementById('prevPage').addEventListener('click', () => {
      currentPage--;
      loadTagihan();
    });
    document.getElementById('nextPage').addEventListener('click', () => {
      currentPage++;
      loadTagihan();
    });
    document.getElementById('selectAll').addEventListener('change', toggleSelectAll);
    document.getElementById('batchPaymentBtn').addEventListener('click', openBatchPaymentModal);
    document.getElementById('exportBtn').addEventListener('click', exportToExcel);
  } catch (error) {
    console.error('Gagal memuat halaman:', error);
    alert('Gagal memuat halaman: ' + error.message);
  } finally {
    await loadingout();
  }
}
let currentPage = 1;
const pageSize = 10;
let selectedRows = new Set();
let allTagihanData = [];
let activeModal = null;
async function loadFilters() {
  try {
    const { data: jurusan, error: jurusanError } = await supabase
      .from('jurusan')
      .select('id, nama_jurusan')
      .eq('id_sekolah', user.id_sekolah);
    if (jurusanError) throw jurusanError;
    const jurusanFilter = document.getElementById('jurusanFilter');
    jurusanFilter.innerHTML = '<option value="">Semua Jurusan</option>';
    jurusan.forEach(j => {
      const option = document.createElement('option');
      option.value = j.id;
      option.textContent = j.nama_jurusan;
      jurusanFilter.appendChild(option);
    });
    const { data: jenis, error: jenisError } = await supabase
      .from('mastertagihan')
      .select('id, nama_tagihan')
      .eq('tipe', 'tagihan')
      .eq('id_sekolah', user.id_sekolah);
    if (jenisError) throw jenisError;
    const jenisFilter = document.getElementById('jenisFilter');
    jenisFilter.innerHTML = '<option value="">Semua Jenis</option>';
    jenis.forEach(j => {
      const option = document.createElement('option');
      option.value = j.id;
      option.textContent = j.nama_tagihan;
      jenisFilter.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading filters:', error);
  }
}
async function loadTagihan() {
  await loading();
  try {
    await generateBulananTagihan();
    const search = document.getElementById('searchInput').value.trim().toLowerCase();
    const jurusan = document.getElementById('jurusanFilter').value;
    const semester = document.getElementById('semesterFilter').value;
    const jenis = document.getElementById('jenisFilter').value;
    const status = document.getElementById('statusFilter').value;
    let query = supabase
      .from('recordtagihan')
      .select('*', { count: 'exact' })
      .eq('tipe_tagihan', 'tagihan')
      .eq('id_sekolah', user.id_sekolah);
    if (jenis) query = query.eq('id_tagihan', jenis);
    if (status) query = query.eq('status_bayar', status);
    let siswaFilterIds = null;
    if (jurusan || semester || search) {
      let siswaQuery = supabase.from('siswa').select('id_siswa');
      siswaQuery = siswaQuery.eq('id_sekolah', user.id_sekolah);
      if (jurusan) siswaQuery = siswaQuery.eq('jurusan', jurusan);
      if (semester) siswaQuery = siswaQuery.eq('semester', semester);
      if (search) {
        const { data: users } = await supabase
          .from('users')
          .select('id')
          .ilike('name', `%${search}%`);
        const userIds = users?.map(u => u.id) || [];
        siswaQuery = siswaQuery.in('id_siswa', userIds);
      }
      const { data: siswaFiltered } = await siswaQuery;
      siswaFilterIds = siswaFiltered?.map(s => s.id_siswa) || [];
      if (siswaFilterIds.length > 0) {
        query = query.in('user_id', siswaFilterIds);
      } else if (jurusan || semester || search) {
        renderTagihanTable([], 0);
        await loadingout();
        return;
      }
    }
    const { data: recordtagihan, error: tagihanError, count } = await query
      .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
    if (tagihanError) throw tagihanError;
    const uniqueTagihan = [];
    const seenIds = new Set();
    for (const r of recordtagihan) {
      if (!seenIds.has(r.id)) {
        uniqueTagihan.push(r);
        seenIds.add(r.id);
      }
    }
    const userIds = uniqueTagihan.map(r => r.user_id);
    const { data: users } = await supabase
      .from('users')
      .select('id, name, user_no')
      .in('id', userIds);
    const { data: siswaList } = await supabase
      .from('siswa')
      .select('id_siswa, jurusan, semester')
      .in('id_siswa', userIds);
    const tagihanIds = uniqueTagihan.map(r => r.id_tagihan);
    const { data: masterList } = await supabase
      .from('mastertagihan')
      .select('id, nama_tagihan, periode')
      .in('id', tagihanIds);
    const jurusanIds = siswaList.map(s => s.jurusan).filter(Boolean);
    const { data: jurusanList } = await supabase
      .from('jurusan')
      .select('id, kode_jurusan, nama_jurusan')
      .in('id', jurusanIds);
    allTagihanData = uniqueTagihan.map(rt => {
      const userData = users.find(u => u.id === rt.user_id) || {};
      const siswaData = siswaList.find(s => s.id_siswa === rt.user_id) || {};
      const masterData = masterList.find(m => m.id == rt.id_tagihan) || {};
      const jurusanData = jurusanList.find(j => j.id == siswaData.jurusan) || {};
      return {
        ...rt,
        user: userData,
        siswa: siswaData,
        jurusan: jurusanData,
        mastertagihan: masterData,
      };
    });
    renderTagihanTable(allTagihanData, count);
  } catch (error) {
    console.error('Gagal memuat tagihan:', error);
    alert('Gagal memuat tagihan: ' + error.message);
  } finally {
    await loadingout();
  }
}
function applyFilters(data) {
  let filteredData = [...data];
  const search = document.getElementById('searchInput').value.toLowerCase();
  if (search) {
    filteredData = filteredData.filter(item => 
      item.user.name?.toLowerCase().includes(search) || 
      item.user.user_no?.toString().includes(search)
    );
  }
  const jurusan = document.getElementById('jurusanFilter').value;
  if (jurusan) {
    filteredData = filteredData.filter(item => item.siswa.jurusan == jurusan);
  }
  const semester = document.getElementById('semesterFilter').value;
  if (semester) {
    filteredData = filteredData.filter(item => item.siswa.semester == semester);
  }
  const jenis = document.getElementById('jenisFilter').value;
  if (jenis) {
    filteredData = filteredData.filter(item => item.id_tagihan == jenis);
  }
  const status = document.getElementById('statusFilter').value;
  if (status) {
    filteredData = filteredData.filter(item => item.status_bayar === status);
  }
  return filteredData;
}
function renderTagihanTable(data, totalCount) {
  let html = '';
  data.forEach((item, index) => {
    const total = parseInt(item.sudah_bayar || 0) + parseInt(item.sisa_tagihan || 0);
    const statusClass = getStatusClass(item.status_bayar);
    const isSelected = selectedRows.has(item.id);
    html += `
      <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 ${isSelected ? 'bg-blue-50 dark:bg-blue-900' : ''}">
        <td class="py-3 px-4">
          <input type="checkbox" class="row-checkbox" data-id="${item.id}" ${isSelected ? 'checked' : ''}>
        </td>
        <td class="py-3 px-4 dark:text-gray-300">${item.user.name || '-'} (${item.user.user_no || '-'})</td>
        <td class="py-3 px-4 dark:text-gray-300">${item.jurusan.kode_jurusan || item.jurusan.nama_jurusan || '-'}</td>
        <td class="py-3 px-4 dark:text-gray-300">${item.siswa.semester || '-'}</td>
        <td class="py-3 px-4 dark:text-gray-300">${item.mastertagihan.nama_tagihan || '-'}</td>
        <td class="py-3 px-4 dark:text-gray-300">${item.mastertagihan.periode || item.periode || '-'}</td>
        <td class="py-3 px-4 dark:text-gray-300">${item.tanggal_bayar? new Date(item.tanggal_bayar).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }): '-'}</td>
        <td class="py-3 px-4 dark:text-gray-300">Rp ${total.toLocaleString('id-ID')}</td>
        <td class="py-3 px-4 dark:text-gray-300">Rp ${parseInt(item.sudah_bayar || 0).toLocaleString('id-ID')}</td>
        <td class="py-3 px-4 dark:text-gray-300">Rp ${parseInt(item.sisa_tagihan || 0).toLocaleString('id-ID')}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-1 rounded-full text-xs ${statusClass}">
            ${item.status_bayar || 'Belum Bayar'}
          </span>
        </td>
        <td class="py-3 px-4">
          <div class="flex gap-2">
            <button class="text-blue-600 hover:text-blue-800 bayar-btn dark:text-blue-400" 
                    data-id="${item.id}" title="Bayar Tagihan">
              <i class="fas fa-money-bill-wave"></i>
            </button>
            <button class="text-green-600 hover:text-green-800 history-btn dark:text-green-400" 
                    data-id="${item.id}" title="Riwayat Pembayaran">
              <i class="fas fa-history"></i>
            </button>
            <button class="text-yellow-600 hover:text-yellow-800 edit-btn dark:text-yellow-400" 
                    data-id="${item.id}" title="Edit Tagihan">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });
  document.getElementById('tagihanList').innerHTML = html || `
    <tr>
      <td colspan="11" class="py-4 px-4 text-center text-gray-500 dark:text-gray-400">
        Tidak ditemukan tagihan
      </td>
    </tr>
  `;
  document.getElementById('paginationInfo').textContent = 
    `Menampilkan ${data.length} dari ${totalCount} tagihan`;
  document.getElementById('prevPage').disabled = currentPage === 1;
  document.getElementById('nextPage').disabled = (currentPage * pageSize) >= totalCount;
  document.querySelectorAll('.row-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      if (e.target.checked) {
        selectedRows.add(id);
      } else {
        selectedRows.delete(id);
        document.getElementById('selectAll').checked = false;
      }
      updateSelectedCount();
      toggleBatchActions();
    });
  });
  document.getElementById('tagihanList').addEventListener('click', function(e) {
    if (e.target.closest('.bayar-btn')) {
      const id = e.target.closest('.bayar-btn').dataset.id;
      openPaymentModal(id);
    }
    if (e.target.closest('.history-btn')) {
      const id = e.target.closest('.history-btn').dataset.id;
      openPaymentHistory(id);
    }
    if (e.target.closest('.edit-btn')) {
      const id = e.target.closest('.edit-btn').dataset.id;
      openEditModal(id);
    }
  });
}
function toggleSelectAll(e) {
  const checkboxes = document.querySelectorAll('.row-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = e.target.checked;
    const id = checkbox.dataset.id;
    if (e.target.checked) {
      selectedRows.add(id);
    } else {
      selectedRows.delete(id);
    }
  });
  updateSelectedCount();
  toggleBatchActions();
}
function updateSelectedCount() {
  const count = selectedRows.size;
  document.getElementById('selectedCount').textContent = `${count} terpilih`;
}
function toggleBatchActions() {
  const hasSelection = selectedRows.size > 0;
  document.getElementById('batchPaymentBtn').disabled = !hasSelection;
}
async function generateBulananTagihan() {
  try {
    const { data: masterBulanan, error: masterError } = await supabase
      .from('mastertagihan')
      .select('id, nominal, keterangan, bulan_dimulai,bulan_selesai')
      .eq('tipe', 'bulanan')
      .eq('isactive', true)
      .eq('id_sekolah', user.id_sekolah);
    if (masterError || !masterBulanan) return;
    const currentDate = new Date();
    const currentPeriod = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    for (const master of masterBulanan) {
      if (master.bulan_selesai && new Date(master.bulan_selesai) < currentDate) {
        continue; // Skip jika tagihan sudah kadaluarsa
      }
      const { data: previousUsers } = await supabase
        .from('recordtagihan')
        .select('user_id')
        .eq('id_tagihan', master.id)
        .neq('user_id', null)
        .limit(1000);
      if (!previousUsers || previousUsers.length === 0) continue;
      const userIds = [...new Set(previousUsers.map(p => p.user_id))];
      const { data: existingRecords } = await supabase
        .from('recordtagihan')
        .select('user_id')
        .eq('id_tagihan', master.id)
        .eq('periode', currentPeriod)
        .in('user_id', userIds);
      const existingUserIds = new Set((existingRecords || []).map(r => r.user_id));
      const newUserIds = userIds.filter(uid => !existingUserIds.has(uid));
      if (newUserIds.length === 0) continue;
      const records = newUserIds.map(userId => ({
        user_id: userId,
        id_tagihan: master.id,
        total_tagihan: master.nominal,
        sudah_bayar: 0,
        sisa_tagihan: master.nominal,
        status_bayar: 'Belum Bayar',
        periode: currentPeriod,
        keterangan: master.keterangan,
        aktif: true,
        tipe_tagihan: 'tagihan',
        id_sekolah: user.id_sekolah,
        bulan_berjalan: `${currentPeriod}-01`
      }));
      await supabase
        .from('recordtagihan')
        .insert(records);
    }
  } catch (error) {
    console.error('Error generating monthly bills:', error);
  }
}
async function openPaymentModal(tagihanId) {
  try {
    const { data: tagihan, error } = await supabase
      .from('recordtagihan')
      .select('*')
      .eq('id', tagihanId)
      .single();
    if (error) throw error;
    let mastertagihan = null;
    let userData = null;
    try {
      const { data: masterData } = await supabase
        .from('mastertagihan')
        .select('nama_tagihan, periode')
        .eq('id', tagihan.id_tagihan)
        .single();
      mastertagihan = masterData;
    } catch (error) {
      mastertagihan = null;
    }
    try {
      const { data: user } = await supabase
        .from('users')
        .select('name, user_no')
        .eq('id', tagihan.user_id)
        .single();
      userData = user;
    } catch (error) {
      userData = null;
    }
    const { data: sumberDana } = await getSumberDanaTersedia(user.id_sekolah, tagihan.user_id);
    const modalHtml = `
      <div class="modal-content">
        <div class="p-6">
          <h2 class="text-xl font-bold mb-4 dark:text-white">Pembayaran Tagihan</h2>
          <div class="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <div class="font-semibold">${userData?.name || 'Unknown'} (${userData?.user_no || 'Unknown'})</div>
            <div class="text-sm text-gray-600 dark:text-gray-300">${mastertagihan?.nama_tagihan || 'Unknown'}</div>
            <div class="text-sm text-gray-600 dark:text-gray-300">Periode: ${tagihan.periode || 'Unknown'}</div>
          </div>
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="p-2 bg-blue-50 dark:bg-blue-900 rounded">
              <div class="text-sm text-blue-600 dark:text-blue-300">Total Tagihan</div>
              <div class="font-bold">Rp ${parseInt(tagihan.total_tagihan || 0).toLocaleString('id-ID')}</div>
            </div>
            <div class="p-2 bg-green-50 dark:bg-green-900 rounded">
              <div class="text-sm text-green-600 dark:text-green-300">Sisa Tagihan</div>
              <div class="font-bold">Rp ${parseInt(tagihan.sisa_tagihan || 0).toLocaleString('id-ID')}</div>
            </div>
          </div>
          <!-- Sumber Pembayaran -->
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2 dark:text-gray-300">Sumber Pembayaran</label>
            <select id="paymentSource" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white">
              <option value="tunai">Tunai</option>
              <option value="saldo">Saldo</option>
              <option value="external">Sumber External</option>
            </select>
          </div>
          <!-- Section Saldo -->
          <div id="saldoSection" class="mb-4 hidden">
            <label class="block text-sm font-medium mb-2 dark:text-gray-300">Pilih Saldo</label>
            <select id="saldoSelect" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white">
              <option value="">Loading saldo...</option>
            </select>
            <div id="saldoInfo" class="text-sm text-gray-600 mt-1 dark:text-gray-300"></div>
          </div>
          <!-- Section External -->
          <div id="externalSection" class="mb-4 hidden">
            <label class="block text-sm font-medium mb-2 dark:text-gray-300">Sumber Dana External</label>
            <select id="externalSource" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white">
              <option value="">Pilih Sumber Dana</option>
              <option value="baru">+ Tambah Sumber Baru</option>
            </select>
            <div id="newExternalSection" class="hidden mt-2">
              <input type="text" id="newExternalName" placeholder="Nama Sumber Dana" class="w-full border rounded px-3 py-2 mb-2 dark:bg-gray-700 dark:text-white">
              <textarea id="newExternalDesc" placeholder="Keterangan" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"></textarea>
            </div>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2 dark:text-gray-300">Jumlah Bayar</label>
            <input type="number" id="paymentAmount" 
                   class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
                   placeholder="Masukkan jumlah pembayaran" 
                   max="${tagihan.sisa_tagihan}"
                   value="${tagihan.sisa_tagihan}">
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2 dark:text-gray-300">Catatan</label>
            <textarea id="paymentNote" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white" 
                      placeholder="Tambahkan catatan pembayaran"></textarea>
          </div>
          <div class="flex gap-2 modal-actions">
            <button id="confirmPayment" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors">
              <i class="fas fa-check mr-2"></i>Konfirmasi Pembayaran
            </button>
            <button id="closeModaltagihan" class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded transition-colors">
              Batal
            </button>
          </div>
        </div>
      </div>
    `;
    const modal = createModaltagihan(modalHtml);
    modal.querySelector('#closeModaltagihan').addEventListener('click', closeModaltagihan);
    modal.querySelector('#paymentSource').addEventListener('change', function() {
      const saldoSection = modal.querySelector('#saldoSection');
      const externalSection = modal.querySelector('#externalSection');
      saldoSection.classList.add('hidden');
      externalSection.classList.add('hidden');
      if (this.value === 'saldo') {
        saldoSection.classList.remove('hidden');
        loadSaldoOptions(tagihan.user_id);
      } else if (this.value === 'external') {
        externalSection.classList.remove('hidden');
        loadExternalOptions();
      }
    });
    async function loadSaldoOptions(userId) {
      const { data: sumberDana } = await getSumberDanaTersedia(user.id_sekolah, userId);
      const select = modal.querySelector('#saldoSelect');
      select.innerHTML = '<option value="">Pilih Saldo</option>';
      if (sumberDana.saldo_sekolah.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = 'Saldo Sekolah';
        sumberDana.saldo_sekolah.forEach(saldo => {
          const option = document.createElement('option');
          option.value = saldo.id;
          option.textContent = `${saldo.nama_saldo} - Rp ${saldo.saldo_sekarang.toLocaleString('id-ID')}`;
          option.dataset.saldo = saldo.saldo_sekarang;
          optgroup.appendChild(option);
        });
        select.appendChild(optgroup);
      }
      if (sumberDana.saldo_siswa.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = 'Saldo Siswa';
        sumberDana.saldo_siswa.forEach(saldo => {
          const option = document.createElement('option');
          option.value = saldo.id;
          option.textContent = `${saldo.nama_saldo} - Rp ${saldo.saldo_sekarang.toLocaleString('id-ID')}`;
          option.dataset.saldo = saldo.saldo_sekarang;
          optgroup.appendChild(option);
        });
        select.appendChild(optgroup);
      }
      if (select.options.length === 1) {
        select.innerHTML = '<option value="">Tidak ada saldo tersedia</option>';
      }
      select.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const saldoInfo = modal.querySelector('#saldoInfo');
        if (selectedOption.value) {
          const saldoAmount = parseInt(selectedOption.dataset.saldo || 0);
          saldoInfo.textContent = `Saldo tersedia: Rp ${saldoAmount.toLocaleString('id-ID')}`;
        } else {
          saldoInfo.textContent = '';
        }
      });
    }
    async function loadExternalOptions() {
      const { data: sumberDana } = await getSumberDanaTersedia(user.id_sekolah);
      const select = modal.querySelector('#externalSource');
      select.innerHTML = '<option value="">Pilih Sumber Dana</option><option value="baru">+ Tambah Sumber Baru</option>';
      if (sumberDana.external.length > 0) {
        sumberDana.external.forEach(source => {
          const option = document.createElement('option');
          option.value = source.id;
          option.textContent = source.nama_sumber;
          select.appendChild(option);
        });
      }
      select.addEventListener('change', function() {
        const newSection = modal.querySelector('#newExternalSection');
        if (this.value === 'baru') {
          newSection.classList.remove('hidden');
        } else {
          newSection.classList.add('hidden');
        }
      });
    }
    modal.querySelector('#confirmPayment').addEventListener('click', async () => {
      const amount = parseInt(modal.querySelector('#paymentAmount').value);
      const note = modal.querySelector('#paymentNote').value;
      const paymentSource = modal.querySelector('#paymentSource').value;
      let idSumber = null;
      let keteranganSumber = '';
      if (paymentSource === 'saldo') {
        idSumber = modal.querySelector('#saldoSelect').value;
        if (!idSumber) {
          alert('Pilih saldo terlebih dahulu');
          return;
        }
      } else if (paymentSource === 'external') {
        const externalSource = modal.querySelector('#externalSource').value;
        if (externalSource === 'baru') {
          const newName = modal.querySelector('#newExternalName').value;
          const newDesc = modal.querySelector('#newExternalDesc').value;
          if (!newName) {
            alert('Nama sumber external harus diisi');
            return;
          }
          const { error: insertError } = await insertSumberDanaExternal({
            id_sekolah: user.id_sekolah,
            nama_sumber: newName,
            jenis: 'lainnya',
            keterangan: newDesc
          });
          if (insertError) {
            alert('Gagal membuat sumber external: ' + insertError.message);
            return;
          }
          await loadExternalOptions();
          idSumber = modal.querySelector('#externalSource').value;
        } else {
          idSumber = externalSource;
        }
      }
      try {
        await processPaymentWithSource(tagihan, amount, note, paymentSource, idSumber, keteranganSumber);
        alert('Pembayaran berhasil dicatat!');
        closeModaltagihan();
        await loadTagihan();
      } catch (error) {
        alert('Gagal memproses pembayaran: ' + error.message);
      }
    });
  } catch (error) {
    console.error('Error opening payment modal:', error);
    alert('Gagal membuka modal pembayaran');
  }
}
async function processPaymentWithSource(tagihan, amount, note, paymentSource, idSumber = null, keteranganSumber = '') {
  await loading();
  try {
    if (!amount || amount <= 0 || amount > parseInt(tagihan.sisa_tagihan || 0)) {
      throw new Error('Jumlah pembayaran tidak valid');
    }
    const newPaid = parseInt(tagihan.sudah_bayar || 0) + amount;
    const newRemaining = parseInt(tagihan.sisa_tagihan || 0) - amount;
    const newStatus = newRemaining <= 0 ? 'Lunas' : 'Sebagian';
    const tanggalBayar = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('recordtagihan')
      .update({
        sudah_bayar: newPaid,
        sisa_tagihan: newRemaining,
        status_bayar: newStatus,
        tanggal_bayar: tanggalBayar
      })
      .eq('id', tagihan.id);
    if (updateError) throw updateError;
    const transaksiData = {
      id_user: tagihan.user_id,
      id_tipe: tagihan.id_tagihan,
      nominal: amount.toString(),
      catatan: note,
      tipe: 'tagihan',
      id_sekolah: user.id_sekolah,
      tanggal_bayar: tanggalBayar,
      sumber_dana: paymentSource,
      id_sumber_external: idSumber,
      keterangan_sumber: keteranganSumber
    };
    const { data: transaksi, error: transaksiError } = await supabase
      .from('transaksi')
      .insert(transaksiData)
      .select()
      .single();
    if (transaksiError) throw transaksiError;
    if (paymentSource === 'saldo' && idSumber) {
      const { error: saldoError } = await updateSaldoAmount(
        idSumber, 
        amount, 
        'debit', 
        transaksi.id,
        `Pembayaran tagihan: ${tagihan.mastertagihan?.nama_tagihan || ''}`
      );
      if (saldoError) throw saldoError;
    }
    return true;
  } catch (error) {
    console.error('Error processing payment:', error);
    throw error;
  } finally {
    await loadingout();
  }
}
const modalStyle = document.createElement('style');
modalStyle.textContent = `
  .modal-container-tagihan {
    z-index: 10000;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.5);
  }
  .modal-content {
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
    width: 96%;
    max-width: 24rem;
    max-height: 90vh;
    overflow-y: auto;
  }
  .dark .modal-content {
    background: #374151;
    color: white;
  }
  .modal-actions button {
    cursor: pointer;
  }
  .modal-actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
document.head.appendChild(modalStyle);
function createModaltagihan(html) {
  if (activeModal) {
    activeModal.remove();
  }
  const modal = document.createElement('div');
  modal.className = 'modal-container-tagihan';
  modal.innerHTML = html;
  document.body.appendChild(modal);
  activeModal = modal;
  return modal;
}
function closeModaltagihan() {
  if (activeModal) {
    activeModal.remove();
    activeModal = null;
  }
}
async function processPayment(tagihan, amount, note) {
  await loading();
  try {
    if (!amount || amount <= 0 || amount > parseInt(tagihan.sisa_tagihan || 0)) {
      throw new Error('Jumlah pembayaran tidak valid');
    }
    const newPaid = parseInt(tagihan.sudah_bayar || 0) + amount;
    const newRemaining = parseInt(tagihan.sisa_tagihan || 0) - amount;
    const newStatus = newRemaining <= 0 ? 'Lunas' : 'Sebagian';
    const tanggalBayar = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('recordtagihan')
      .update({
        sudah_bayar: newPaid,
        sisa_tagihan: newRemaining,
        status_bayar: newStatus,
        tanggal_bayar: tanggalBayar
      })
      .eq('id', tagihan.id);
    if (updateError) throw updateError;
    const { error: transaksiError } = await supabase
      .from('transaksi')
      .insert({
        id_user: tagihan.user_id,
        id_tipe: tagihan.id_tagihan,
        nominal: amount.toString(),
        catatan: note,
        tipe: 'tagihan',
        id_sekolah: user.id_sekolah,
        tanggal_bayar: tanggalBayar
      });
    if (transaksiError) throw transaksiError;
    return true;
  } catch (error) {
    console.error('Error processing payment:', error);
    throw error;
  } finally {
    await loadingout();
  }
}
async function openBatchPaymentModal() {
  if (selectedRows.size === 0) {
    alert('Pilih setidaknya satu tagihan untuk pembayaran massal');
    return;
  }
  closeModaltagihan();
  const modalHtml = `
    <div class="modal-content">
      <div class="p-6">
        <h2 class="text-xl font-bold mb-4 dark:text-white">Pembayaran Massal</h2>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Pembayaran untuk ${selectedRows.size} tagihan terpilih
        </p>
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2 dark:text-gray-300">Sumber Pembayaran</label>
          <select id="paymentSource" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white">
            <option value="tunai">Tunai</option>
            <option value="saldo">Saldo/Tabungan</option>
            <option value="external">Sumber External</option>
          </select>
        </div>
        <!-- Section Saldo -->
        <div id="saldoSection" class="mb-4 hidden">
          <label class="block text-sm font-medium mb-2 dark:text-gray-300">Pilih Saldo</label>
          <select id="saldoSelect" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white">
            <option value="">Loading saldo...</option>
          </select>
          <div id="saldoInfo" class="text-sm text-gray-600 mt-1 dark:text-gray-300"></div>
        </div>
        <!-- Section Sumber External -->
        <div id="externalSection" class="mb-4 hidden">
          <div class="mb-3">
            <label class="block text-sm font-medium mb-2 dark:text-gray-300">Sumber Dana External</label>
            <select id="externalSource" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white">
              <option value="">Pilih Sumber Dana</option>
              <option value="baru">+ Tambah Sumber Baru</option>
            </select>
          </div>
          <div id="newExternalSection" class="hidden">
            <input type="text" id="newExternalName" placeholder="Nama Sumber Dana" class="w-full border rounded px-3 py-2 mb-2 dark:bg-gray-700 dark:text-white">
            <select id="newExternalType" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white">
              <option value="donasi">Donasi</option>
              <option value="bantuan_pemerintah">Bantuan Pemerintah</option>
              <option value="lainnya">Lainnya</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2 dark:text-gray-300">Keterangan Sumber</label>
            <input type="text" id="externalDescription" placeholder="Contoh: Donatur A, BOS Pusat, dll" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white">
          </div>
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2 dark:text-gray-300">Jumlah Pembayaran per Tagihan</label>
          <input type="number" id="batchPaymentAmount" 
                 class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
                 min="1" placeholder="Masukkan jumlah pembayaran">
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2 dark:text-gray-300">Catatan (Opsional)</label>
          <textarea id="batchPaymentNote" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
                    placeholder="Catatan untuk semua pembayaran"></textarea>
        </div>
        <div class="flex gap-2">
          <button id="confirmBatchPayment" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            <i class="fas fa-check mr-2"></i>Proses Pembayaran
          </button>
          <button id="closeBatchModal" class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">
            Batal
          </button>
        </div>
      </div>
    </div>
  `;
  const modal = createModaltagihan(modalHtml);
  modal.querySelector('#closeBatchModal').addEventListener('click', closeModaltagihan);
  modal.querySelector('#confirmBatchPayment').addEventListener('click', processBatchPayment);
  modal.querySelector('#paymentSource').addEventListener('change', function() {
      const saldoSection = modal.querySelector('#saldoSection');
      const externalSection = modal.querySelector('#externalSection');
      if (this.value === 'saldo') {
        saldoSection.classList.remove('hidden');
        externalSection.classList.add('hidden');
        loadSaldoOptions(tagihan.user_id);
      } else if (this.value === 'external') {
        saldoSection.classList.add('hidden');
        externalSection.classList.remove('hidden');
        loadExternalOptions();
      } else {
        saldoSection.classList.add('hidden');
        externalSection.classList.add('hidden');
      }
    });
  modal.querySelector('#externalSource').addEventListener('change', function() {
    const newExternalSection = modal.querySelector('#newExternalSection');
    if (this.value === 'baru') {
      newExternalSection.classList.remove('hidden');
    } else {
      newExternalSection.classList.add('hidden');
    }
  });
}
async function loadExternalOptions() {
  const { data: externalSources, error } = await getSumberDanaExternal(user.id_sekolah);
  const select = document.getElementById('externalSource');
  select.innerHTML = '<option value="">Pilih Sumber Dana</option><option value="baru">+ Tambah Sumber Baru</option>';
  if (externalSources && externalSources.length > 0) {
    externalSources.forEach(source => {
      const option = document.createElement('option');
      option.value = source.id;
      option.textContent = source.nama_sumber;
      select.appendChild(option);
    });
  }
}
async function processBatchPayment() {
  const modal = activeModal;
  const amount = parseInt(modal.querySelector('#batchPaymentAmount').value);
  const note = modal.querySelector('#batchPaymentNote').value;
  if (!amount || amount <= 0) {
    alert('Jumlah pembayaran tidak valid');
    return;
  }
  await loading();
  try {
    const tagihanIds = Array.from(selectedRows);
    let successCount = 0;
    let errorCount = 0;
    const tanggalBayar = new Date().toISOString();
    for (const tagihanId of tagihanIds) {
      try {
        const { data: tagihan } = await supabase
          .from('recordtagihan')
          .select('*')
          .eq('id', tagihanId)
          .single();
        if (!tagihan) {
          errorCount++;
          continue;
        }
        const paymentAmount = Math.min(amount, parseInt(tagihan.sisa_tagihan || 0));
        if (paymentAmount <= 0) {
          errorCount++;
          continue;
        }
        const newPaid = parseInt(tagihan.sudah_bayar || 0) + paymentAmount;
        const newRemaining = parseInt(tagihan.sisa_tagihan || 0) - paymentAmount;
        const newStatus = newRemaining <= 0 ? 'Lunas' : 'Sebagian';
        const { error: updateError } = await supabase
          .from('recordtagihan')
          .update({
            sudah_bayar: newPaid,
            sisa_tagihan: newRemaining,
            status_bayar: newStatus,
            tanggal_bayar: tanggalBayar
          })
          .eq('id', tagihanId);
        if (updateError) {
          errorCount++;
          continue;
        }
        const { error: transaksiError } = await supabase
          .from('transaksi')
          .insert({
            id_user: tagihan.user_id,
            id_tipe: tagihan.id_tagihan,
            nominal: paymentAmount.toString(),
            catatan: note,
            tipe: 'tagihan',
            id_sekolah: user.id_sekolah,
            tanggal_bayar: tanggalBayar
          });
        if (transaksiError) {
          errorCount++;
          continue;
        }
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }
    alert(`Pembayaran massal selesai!\nBerhasil: ${successCount}\nGagal: ${errorCount}`);
    closeModaltagihan();
    selectedRows.clear();
    await loadTagihan();
  } catch (error) {
    alert('Gagal memproses pembayaran massal: ' + error.message);
  } finally {
    await loadingout();
  }
}
async function openPaymentHistory(tagihanId) {
  try {
    closeModaltagihan();
    const { data: tagihan } = await supabase
      .from('recordtagihan')
      .select('id_tagihan, user_id')
      .eq('id', tagihanId)
      .single();
    if (!tagihan) return;
    const { data: transactions } = await supabase
      .from('transaksi')
      .select('*')
      .eq('id_tipe', tagihan.id_tagihan)
      .eq('id_user', tagihan.user_id)
      .order('tanggal_bayar', { ascending: true });
console.log(transactions);
    const modalHtml = `
      <div class="modal-content">
        <div class="p-6">
          <h2 class="text-xl font-bold mb-4 dark:text-white">Riwayat Pembayaran</h2>
          <div class="space-y-2">
            ${transactions && transactions.length > 0 ? transactions.map(trans => `
              <div class="p-3 border rounded dark:border-gray-600">
                <div class="flex justify-between items-center">
                  <span class="font-semibold">Rp ${parseInt(trans.nominal || 0).toLocaleString('id-ID')}</span>
                  <span class="text-sm text-gray-500">${new Date(trans.tanggal_bayar).toLocaleDateString('id-ID')}</span>
                </div>
                ${trans.catatan ? `<div class="text-sm text-gray-500 mt-1">${trans.catatan}</div>` : ''}
              </div>
            `).join('') : `
              <div class="text-center text-gray-500 py-4">Belum ada riwayat pembayaran</div>
            `}
          </div>
          <button id="closeHistory" class="w-full mt-4 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">
            Tutup
          </button>
        </div>
      </div>
    `;
    const modal = createModaltagihan(modalHtml);
    modal.querySelector('#closeHistory').addEventListener('click', closeModaltagihan);
  } catch (error) {
    console.error('Error opening payment history:', error);
    alert('Gagal membuka riwayat pembayaran');
  }
}
async function openEditModal(tagihanId) {
  try {
    closeModaltagihan();
    const { data: tagihan } = await supabase
      .from('recordtagihan')
      .select('*')
      .eq('id', tagihanId)
      .single();
    if (!tagihan) return;
    const modalHtml = `
      <div class="modal-content">
        <div class="p-6">
          <h2 class="text-xl font-bold mb-4 dark:text-white">Edit Tagihan</h2>
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2 dark:text-gray-300">Total Tagihan</label>
            <input type="number" id="editTotal" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
                   value="${tagihan.total_tagihan || 0}">
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2 dark:text-gray-300">Sudah Dibayar</label>
            <input type="number" id="editPaid" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
                   value="${tagihan.sudah_bayar || 0}">
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2 dark:text-gray-300">Keterangan</label>
            <textarea id="editNote" class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white">${tagihan.keterangan || ''}</textarea>
          </div>
          <div class="flex gap-2">
            <button id="saveEdit" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
              Simpan
            </button>
            <button id="closeEdit" class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">
              Batal
            </button>
          </div>
        </div>
      </div>
    `;
    const modal = createModaltagihan(modalHtml);
    modal.querySelector('#closeEdit').addEventListener('click', closeModaltagihan);
    modal.querySelector('#saveEdit').addEventListener('click', async () => {
      const total = parseInt(modal.querySelector('#editTotal').value);
      const paid = parseInt(modal.querySelector('#editPaid').value);
      const note = modal.querySelector('#editNote').value;
      if (isNaN(total) || isNaN(paid) || paid > total) {
        alert('Data tidak valid');
        return;
      }
      await loading();
      try {
        const remaining = total - paid;
        const status = remaining <= 0 ? 'Lunas' : (paid > 0 ? 'Sebagian' : 'Belum Bayar');
        await supabase
          .from('recordtagihan')
          .update({
            sisa_tagihan: total,
            sudah_bayar: paid,
            sisa_tagihan: remaining,
            status_bayar: status,
            keterangan: note
          })
          .eq('id', tagihanId);
        alert('Tagihan berhasil diupdate');
        closeModaltagihan();
        await loadTagihan();
      } catch (error) {
        alert('Gagal update tagihan: ' + error.message);
      } finally {
        await loadingout();
      }
    });
  } catch (error) {
    console.error('Error opening edit modal:', error);
    alert('Gagal membuka modal edit');
  }
}
async function exportToExcel() {
  await loading();
  try {
    const { data } = await supabase
      .from('recordtagihan')
      .select('*')
      .eq('id_sekolah', user.id_sekolah);
    if (!data || data.length === 0) {
      alert('Tidak ada data untuk diekspor');
      return;
    }
    const exportData = [];
    for (const item of data) {
      let userData = null;
      try {
        const { data: user } = await supabase
          .from('users')
          .select('name, user_no')
          .eq('id', item.user_id)
          .single();
        userData = user;
      } catch (error) {
        userData = null;
      }
      let masterData = null;
      try {
        const { data: master } = await supabase
          .from('mastertagihan')
          .select('nama_tagihan')
          .eq('id', item.id_tagihan)
          .single();
        masterData = master;
      } catch (error) {
        masterData = null;
      }
      exportData.push({
        'Nama Siswa': userData?.name || 'Unknown',
        'NIS': userData?.user_no || 'Unknown',
        'Jenis Tagihan': masterData?.nama_tagihan || 'Unknown',
        'Total Tagihan': item.total_tagihan || 0,
        'Sudah Dibayar': item.sudah_bayar || 0,
        'Sisa Tagihan': item.sisa_tagihan || 0,
        'Status': item.status_bayar || 'Belum Bayar',
        'Periode': item.periode || 'Unknown',
        'Keterangan': item.keterangan || ''
      });
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Data Tagihan');
    XLSX.writeFile(wb, `data-tagihan-${new Date().toISOString().split('T')[0]}.xlsx`);
  } catch (error) {
    alert('Gagal mengekspor data: ' + error.message);
  } finally {
    await loadingout();
  }
}
function getStatusClass(status) {
  switch (status) {
    case 'Lunas': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'Sebagian': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    default: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  }
}