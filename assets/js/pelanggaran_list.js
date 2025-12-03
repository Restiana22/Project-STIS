export async function initPage() {
  await loading();
  const { data: settings } = await getSettingPeringatan(user.id_sekolah);
  window.settings = settings;
  await loadMasterPelanggaranGrouped();
  await loadPelanggaran();
  await loadSettingPeringatan();
  await loadingout();
}
async function loadMasterPelanggaranGrouped() {
  const { data: jenisPelanggaran } = await getJenisPelanggaran(user.id_sekolah);
  const container = document.getElementById('master-pelanggaran-container');
  container.innerHTML = '';
  const grouped = {};
  jenisPelanggaran.forEach(item => {
    if (!grouped[item.kelompok]) {
      grouped[item.kelompok] = [];
    }
    grouped[item.kelompok].push(item);
  });
  for (const [kelompok, items] of Object.entries(grouped)) {
    const kelompokDiv = document.createElement('div');
    kelompokDiv.className = 'mb-6 border rounded-lg overflow-hidden';
    const header = document.createElement('div');
    header.className = 'bg-gray-100 dark:bg-gray-700 px-4 py-3 font-semibold';
    header.textContent = kelompok;
    kelompokDiv.appendChild(header);
    const table = document.createElement('table');
    table.className = 'min-w-full divide-y divide-gray-200';
    table.innerHTML = `
      <thead class="bg-gray-50 dark:bg-gray-600">
        <tr>
          <th class="px-4 py-3 text-left">Jenis Pelanggaran</th>
          <th class="px-4 py-3 text-left">Tingkat</th>
          <th class="px-4 py-3 text-left">Bobot Poin</th>
          <th class="px-4 py-3 text-left">Aksi</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 dark:divide-gray-600">
        ${items.map(item => `
          <tr class="${item.parent_id ? 'bg-gray-50 dark:bg-gray-700' : ''}">
            <td class="px-4 py-2 ${item.parent_id ? 'pl-8' : ''}">
              ${item.parent_id ? '├─ ' : ''}${item.nama_pelanggaran}
            </td>
            <td class="px-4 py-2">${item.tingkat || '-'}</td>
            <td class="px-4 py-2">${item.bobot_point || '-'}</td>
            <td class="px-4 py-2">
              ${!item.parent_id ? `
                <button onclick="tambahSubPelanggaran(${item.id})" class="text-blue-500 hover:text-blue-700 mr-2" title="Tambah Sub">
                  <i data-feather="plus-circle"></i>
                </button>
              ` : ''}
              <button data-id="${item.id}" class="delete-pelanggaran text-red-500 hover:text-red-700">
                <i data-feather="trash-2"></i>
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    `;
    kelompokDiv.appendChild(table);
    container.appendChild(kelompokDiv);
  }
  feather.replace();
  document.querySelectorAll('.delete-pelanggaran').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      if (confirm('Hapus jenis pelanggaran ini?')) {
        await deletePelanggaran(id);
      }
    });
  });
}
async function deletePelanggaran(id) {
  try {
    const { error } = await supabase
      .from('pelanggaran_jenis')
      .delete()
      .eq('id', id);
    if (error) throw error;
    alert('Pelanggaran berhasil dihapus!');
    await loadMasterPelanggaranGrouped();
  } catch (error) {
    console.error('Gagal menghapus:', error);
    alert('Gagal menghapus pelanggaran');
  }
}
window.tambahSubPelanggaran = (parentId) => {
  localStorage.setItem('parent_pelanggaran_id', parentId);
  window.location.hash = '#/pelanggaran_add';
};
async function loadPelanggaran() {
  try {
    const { data: pelanggaran, error } = await supabase
      .from('pelanggaran_siswa')
      .select('*')
      .eq('id_sekolah', user.id_sekolah)
      .order('tanggal', { ascending: false })
      .limit(100);
    if (error) throw error;
    const { data: jenisPelanggaran } = await getJenisPelanggaran(user.id_sekolah);
    const { data: siswa } = await getSiswa(user.kode_sekolah);
    const data = pelanggaran.map(p => {
      const jenis = jenisPelanggaran.find(j => j.id == p.jenis_pelanggaran_id);
      const siswaData = siswa.find(s => s.id == p.siswa_id);
      return {
        id: p.id,
        tanggal: new Date(p.tanggal).toLocaleDateString('id-ID'),
        siswa_nama: siswaData ? `${siswaData.user_no} (${siswaData.name})` : 'Unknown',
        jenis_pelanggaran: jenis ? jenis.nama_pelanggaran : 'Unknown',
        bobot_point: jenis ? jenis.bobot_point : 0,
        keterangan: p.keterangan || '-'
      };
    });
    renderPelanggaran(data);
  } catch (err) {
    console.error('Gagal memuat pelanggaran:', err);
    alert('Gagal memuat data pelanggaran');
  }
}
function renderPelanggaran(data) {
  const tbody = document.getElementById('user-pelanggaran-list');
  tbody.innerHTML = '';
  if (data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="px-4 py-2 text-center text-gray-500">
          Tidak ada data pelanggaran
        </td>
      </tr>
    `;
    return;
  }
  data.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="px-4 py-2">${item.tanggal}</td>
      <td class="px-4 py-2">${item.siswa_nama}</td>
      <td class="px-4 py-2">${item.jenis_pelanggaran}</td>
      <td class="px-4 py-2">${item.bobot_point}</td>
      <td class="px-4 py-2">${item.keterangan}</td>
    `;
    tbody.appendChild(tr);
  });
}
async function loadSettingPeringatan() {
  try {
    const { data: settings, error } = await getSettingPeringatan(user.id_sekolah);
    if (error) throw error;
    const tbody = document.getElementById('peringatan-list');
    tbody.innerHTML = '';
    if (!settings || settings.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="2" class="px-4 py-2 text-center text-gray-500">
            Belum ada setting peringatan
          </td>
        </tr>
      `;
      return;
    }
    const sortedSettings = [...settings].sort((a, b) => a.batas_point - b.batas_point);
    sortedSettings.forEach(setting => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="px-4 py-2">${setting.nama_peringatan}</td>
        <td class="px-4 py-2">${setting.batas_point} poin</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Gagal memuat setting peringatan:', err);
  }
}
function getWarningColor(totalPoin, settings) {
  console.log(totalPoin,settings);
  if (!settings || settings.length === 0) return 'bg-gray-100';
  const sorted = [...settings].sort((a, b) => a.batas_point - b.batas_point);
  let level = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (totalPoin >= sorted[i].batas_point) {
      level = i + 1;
    }
  }
  const hue = Math.max(0, 50 - (level * (50 / Math.max(1, sorted.length))));
  return `text-${hue < 20 ? 'red' : hue < 35 ? 'orange' : 'yellow'}-500`;
}
