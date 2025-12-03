export async function initPage() {
  try {
    await loading();
    const { data: kegiatan, error } = await supabase
      .from('kegiatan')
      .select('*')
      .eq('user_id', user.id)
      .order('waktu', { ascending: false });
    if (error) throw new Error('Gagal mengambil data: ' + error.message);
    renderKegiatanList(kegiatan);
  } catch (err) {
    console.error(err);
    document.getElementById('kegiatan-list').innerHTML = `
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
        ${err.message}
      </div>
    `;
  } finally {
    await loadingout();
  }
}

function renderKegiatanList(data) {
  const tbody = document.querySelector('#kegiatan-list tbody');
  tbody.innerHTML = '';
  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="px-4 py-4 text-center text-gray-500">
          Belum ada kegiatan yang tercatat
        </td>
      </tr>
    `;
    return;
  }
  data.forEach(item => {
    const waktu = new Date(item.waktu).toLocaleString();
    const lokasi = item.lokasi ? item.lokasi.split(',')[0] + ', ' + item.lokasi.split(',')[1] : '-';
    const row = document.createElement('tr');
    row.className = 'hover:bg-blue-50 dark:hover:bg-gray-700';
    row.innerHTML = `
      <td class="px-4 py-3 text-sm">${waktu}</td>
      <td class="px-4 py-3">
        <div class="font-medium">${item.jenis_kegiatan}</div>
        <div class="text-gray-500 text-sm">${item.keterangan || '-'}</div>
      </td>
      <td class="px-4 py-3 text-sm">${lokasi}</td>
      <td class="px-4 py-3">
        ${item.foto ? 
          `<a href="${item.foto}" target="_blank" class="text-blue-600 hover:underline">
            Lihat Foto
          </a>` : 
          '-'}
      </td>
    `;
    tbody.appendChild(row);
  });
}