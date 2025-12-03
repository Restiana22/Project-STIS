export async function initPage() {
  await loading();
  try {
    await loadPembayaran();
    document.getElementById('searchInput').addEventListener('input', loadPembayaran);
    document.getElementById('statusFilter').addEventListener('change', loadPembayaran);
    document.getElementById('prevPage').addEventListener('click', () => {
      currentPage--;
      loadPembayaran();
    });
    document.getElementById('nextPage').addEventListener('click', () => {
      currentPage++;
      loadPembayaran();
    });
  } catch (error) {
    console.error('Gagal memuat halaman:', error);
    alert('Gagal memuat halaman: ' + error.message);
  } finally {
    await loadingout();
  }
}

let currentPage = 1;
const pageSize = 10;
async function loadPembayaran() {
  await loading();
  try {
    const search = document.getElementById('searchInput').value;
    const status = document.getElementById('statusFilter').value;
    let query = supabase
      .from('recordpembayaran')
      .select('*', { count: 'exact' })
      .eq('id_sekolah', user.id_sekolah);
    if (status) {
      query = query.eq('status_bayar', status);
    }
    const { data: pembayaran, error, count } = await query
      .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
    if (error) throw error;
    if (!pembayaran || pembayaran.length === 0) {
      renderPembayaranTable([], count);
      return;
    }
    const userIds = pembayaran.map(p => p.id_user);
    const pembayaranIds = pembayaran.map(p => p.id_tunggakan);
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, user_no, role')
      .in('id', userIds);
    if (usersError) throw usersError;
    const { data: masterPembayaran, error: masterError } = await supabase
      .from('mastertagihan')
      .select('id, nama_tagihan, periode')
      .in('id', pembayaranIds)
      .eq('id_sekolah', user.id_sekolah)
      .eq('tipe', 'pembayaran');
    if (masterError) throw masterError;
    const mergedData = pembayaran.map(p => {
      const userData = users.find(u => u.id == p.id_user) || {};
      const masterData = masterPembayaran.find(m => m.id == p.id_tunggakan) || {};
      return {
        ...p,
        users: userData,
        masterpembayaran: masterData
      };
    });
    let filteredData = mergedData;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredData = mergedData.filter(item => 
        item.users.name?.toLowerCase().includes(searchLower) || 
        item.users.user_no?.toString().includes(search)
      );
    }
    renderPembayaranTable(filteredData, count);
  } catch (error) {
    console.error('Gagal memuat pembayaran:', error);
    alert('Gagal memuat pembayaran: ' + error.message);
  } finally {
    await loadingout();
  }
}

function renderPembayaranTable(data, totalCount) {
  const tableBody = document.getElementById('pembayaranList');
  if (data.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="9" class="py-4 px-4 text-center text-gray-500 dark:text-gray-400">
          Tidak ditemukan pembayaran
        </td>
      </tr>
    `;
    return;
  }
  let html = '';
  data.forEach(item => {
    const total = parseInt(item.total_pembayaran || 0);
    const sudahDibayar = parseInt(item.sudah_bayar || 0);
    const sisa = parseInt(item.sisa_tunggakan || 0);
    const statusClass = getStatusClass(item.status_bayar);
    html += `
      <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
        <td class="py-3 px-4 dark:text-gray-300">${item.users?.name || '-'} (${item.users?.user_no || '-'})</td>
        <td class="py-3 px-4 dark:text-gray-300">${item.users?.role || '-'}</td>
        <td class="py-3 px-4 dark:text-gray-300">${item.masterpembayaran?.periode || item.periode || '-'}</td>
        <td class="py-3 px-4 dark:text-gray-300">Rp ${total.toLocaleString('id-ID')}</td>
        <td class="py-3 px-4 dark:text-gray-300">Rp ${sudahDibayar.toLocaleString('id-ID')}</td>
        <td class="py-3 px-4 dark:text-gray-300">Rp ${sisa.toLocaleString('id-ID')}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-1 rounded-full text-xs ${statusClass}">
            ${item.status_bayar || 'Belum Bayar'}
          </span>
        </td>
        <td class="py-3 px-4">
          <div class="flex gap-2">
            <button class="text-blue-600 hover:text-blue-800 bayar-btn dark:text-blue-400" 
                    data-id="${item.id}" title="Bayar Pembayaran">
              <i class="fas fa-money-bill-wave"></i>
            </button>
            <button class="text-green-600 hover:text-green-800 history-btn dark:text-green-400" 
                    data-id="${item.id}" title="Riwayat Pembayaran">
              <i class="fas fa-history"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });
  tableBody.innerHTML = html;
  document.getElementById('paginationInfo').textContent = 
    `Menampilkan ${data.length} dari ${totalCount} pembayaran`;
  document.getElementById('prevPage').disabled = currentPage === 1;
  document.getElementById('nextPage').disabled = (currentPage * pageSize) >= totalCount;
  document.getElementById('pembayaranList').addEventListener('click', function(e) {
    if (e.target.closest('.bayar-btn')) {
      const id = e.target.closest('.bayar-btn').dataset.id;
      openPaymentModal1(id);
    }
    if (e.target.closest('.history-btn')) {
      const id = e.target.closest('.history-btn').dataset.id;
      openPaymentHistory(id);
    }
  });
}

function getStatusClass(status) {
  switch (status) {
    case 'Lunas': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'Sebagian': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    default: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  }
}

async function openPaymentModal1(pembayaranId) {
  try {
    const { data: pembayaran, error } = await supabase
      .from('recordpembayaran')
      .select('*')
      .eq('id', pembayaranId)
      .single();
    if (error) throw error;
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('name, user_no')
      .eq('id', pembayaran.id_user)
      .single();
    if (userError) throw userError;
    const { data: masterData, error: masterError } = await supabase
      .from('mastertagihan')
      .select('nama_tagihan, periode')
      .eq('id', pembayaran.id_tunggakan)
      .single();
    if (masterError) throw masterError;
    const mergedData = {
      ...pembayaran,
      users: userData,
      masterpembayaran: masterData
    };
    const modalHtml = `
      <div class="modal-content">
        <div class="p-6">
          <h2 class="text-xl font-bold mb-4 dark:text-white">Pembayaran</h2>
          <div class="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <div class="font-semibold">${mergedData.users?.name || 'Unknown'} (${mergedData.users?.user_no || 'Unknown'})</div>
            <div class="text-sm text-gray-600 dark:text-gray-300">${mergedData.masterpembayaran?.nama_pembayaran || 'Unknown'}</div>
            <div class="text-sm text-gray-600 dark:text-gray-300">Periode: ${mergedData.periode || 'Unknown'}</div>
          </div>
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="p-2 bg-blue-50 dark:bg-blue-900 rounded">
              <div class="text-sm text-blue-600 dark:text-blue-300">Total Pembayaran</div>
              <div class="font-bold">Rp ${parseInt(mergedData.total_pembayaran || 0).toLocaleString('id-ID')}</div>
            </div>
            <div class="p-2 bg-green-50 dark:bg-green-900 rounded">
              <div class="text-sm text-green-600 dark:text-green-300">Sisa Pembayaran</div>
              <div class="font-bold">Rp ${parseInt(mergedData.sisa_tunggakan || 0).toLocaleString('id-ID')}</div>
            </div>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium mb-2 dark:text-gray-300">Jumlah Bayar</label>
            <input type="number" id="paymentAmount" 
                   class="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:text-white"
                   placeholder="Masukkan jumlah pembayaran" 
                   max="${mergedData.sisa_tunggakan}"
                   value="${mergedData.sisa_tunggakan}">
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
            <button id="closeModalPembayaran" class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded transition-colors">
              Batal
            </button>
          </div>
        </div>
      </div>
    `;
    const modal = createModalpembayaran(modalHtml);
    modal.querySelector('#closeModalPembayaran').addEventListener('click', closeModalPembayaran);
    modal.querySelector('#confirmPayment').addEventListener('click', async () => {
      const amount = parseInt(modal.querySelector('#paymentAmount').value);
      const note = modal.querySelector('#paymentNote').value;
      try {
        await processPayment(mergedData, amount, note);
        alert('Pembayaran berhasil dicatat!');
        closeModalPembayaran();
        await loadPembayaran();
      } catch (error) {
        alert('Gagal memproses pembayaran: ' + error.message);
      }
    });
  } catch (error) {
    console.error('Error opening payment modal:', error);
    alert('Gagal membuka modal pembayaran');
  }
}

async function processPayment(pembayaran, amount, note) {
  await loading();
  try {
    if (!amount || amount <= 0 || amount > parseInt(pembayaran.sisa_tunggakan || 0)) {
      throw new Error('Jumlah pembayaran tidak valid');
    }
    const newPaid = parseInt(pembayaran.sudah_bayar || 0) + amount;
    const newRemaining = parseInt(pembayaran.sisa_tunggakan || 0) - amount;
    const newStatus = newRemaining <= 0 ? 'Lunas' : 'Sebagian';
    const tanggalBayar = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('recordpembayaran')
      .update({
        sudah_bayar: newPaid,
        sisa_tunggakan: newRemaining,
        status_bayar: newStatus,
        tanggal_bayar: tanggalBayar
      })
      .eq('id', pembayaran.id);
    if (updateError) throw updateError;
    const { error: transaksiError } = await supabase
      .from('transaksi')
      .insert({
        id_user: pembayaran.id_user,
        id_tipe: pembayaran.id_tunggakan,
        nominal: amount.toString(),
        catatan: note,
        tipe: 'pembayaran',
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

async function openPaymentHistory(pembayaranId) {
  try {
    const { data: pembayaran } = await supabase
      .from('recordpembayaran')
      .select('id_tunggakan, id_user')
      .eq('id', pembayaranId)
      .single();
    if (!pembayaran) return;
    const { data: transactions } = await supabase
      .from('transaksi')
      .select('*')
      .eq('id_tipe', pembayaran.id_tunggakan)
      .eq('id_user', pembayaran.id_user)
      .eq('tipe', 'pembayaran')
      .order('tanggal_bayar', { ascending: true });
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
    const modal = createModalpembayaran(modalHtml);
    modal.querySelector('#closeHistory').addEventListener('click', closeModalPembayaran);
  } catch (error) {
    console.error('Error opening payment history:', error);
    alert('Gagal membuka riwayat pembayaran');
  }
}

function createModalpembayaran(html) {
  const existingModal = document.querySelector('.modal-container-pembayaran');
  if (existingModal) {
    existingModal.remove();
  }
  const modal = document.createElement('div');
  modal.className = 'modal-container-pembayaran';
  modal.innerHTML = html;
  document.body.appendChild(modal);
  return modal;
}

function closeModalPembayaran() {
  const modal = document.querySelector('.modal-container-pembayaran');
  if (modal) {
    modal.remove();
  }
}