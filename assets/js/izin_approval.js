export async function initPage() {
  await loading();
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', initPage);
  }
  if (user.role !== 'instruktur'&& user.role !== 'admin') {
    document.getElementById('mainContent').innerHTML = `
      <div class="p-6 text-red-500">
        Anda tidak memiliki akses ke halaman ini.
      </div>
    `;
    await loadingout();
    return;
  }
  const izinListContainer = document.getElementById('izinList');
  const { data: izinData, error } = await getIzinByStatus(user.id_sekolah, 'pending');
  if (error) {
    izinListContainer.innerHTML = `<p class="text-red-500">Gagal memuat data: ${error.message}</p>`;
    await loadingout();
    return;
  }
  if (!izinData || izinData.length === 0) {
    izinListContainer.innerHTML = `
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-center">
        <p class="text-gray-500 dark:text-gray-400">Tidak ada izin yang perlu disetujui.</p>
      </div>
    `;
    await loadingout();
    return;
  }
  izinListContainer.innerHTML = izinData.map(izin => `
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-4 mb-4">
      <div class="flex flex-col md:flex-row justify-between items-start gap-4">
        <div class="flex-1">
          <h3 class="font-semibold text-lg">${izin.user_name} (${izin.user_no})</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-sm">
            <div><span class="font-medium">Tanggal:</span> ${izin.tanggal}</div>
            <div><span class="font-medium">Jenis:</span> ${izin.jenis_izin}</div>
            <div><span class="font-medium">Status:</span> 
              <span class="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Menunggu</span>
            </div>
            <div><span class="font-medium">Diajukan pada:</span> ${new Date(izin.created_at).toLocaleDateString('id-ID')}</div>
          </div>
          <div class="mt-2">
            <span class="font-medium">Alasan:</span>
            <p class="text-gray-700 dark:text-gray-300">${izin.alasan}</p>
          </div>
          ${izin.lampiran_url ? `
            <div class="mt-2">
              <span class="font-medium">Lampiran:</span>
              <a href="${izin.lampiran_url}" target="_blank" 
                 class="text-blue-600 hover:underline text-sm flex items-center">
                <i class="fas fa-external-link-alt mr-1"></i> Lihat Dokumen
              </a>
            </div>
          ` : ''}
        </div>
        <div class="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
          <button onclick="approveIzin(${izin.id})" 
                  class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded flex items-center">
            <i class="fas fa-check mr-2"></i> Setujui
          </button>
          <button onclick="rejectIzin(${izin.id})" 
                  class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded flex items-center">
            <i class="fas fa-times mr-2"></i> Tolak
          </button>
        </div>
      </div>
    </div>
  `).join('');
  await loadingout();
}
window.approveIzin = async (id) => {
  if (!confirm('Setujui izin ini?')) return;
  const { error } = await updateIzinStatus(id, 'disetujui');
  if (error) {
    alert('Gagal menyetujui izin: ' + error.message);
  } else {
    alert('Izin disetujui.');
    initPage();
  }
};
window.rejectIzin = async (id) => {
  const catatan = prompt('Masukkan alasan penolakan:');
  if (catatan === null) return;
  if (!catatan.trim()) {
    alert('Alasan penolakan harus diisi.');
    return;
  }
  const { error } = await updateIzinStatus(id, 'ditolak', catatan);
  if (error) {
    alert('Gagal menolak izin: ' + error.message);
  } else {
    alert('Izin ditolak.');
    initPage();
  }
};