export async function initPage() {
  await loading();
  try {
    await loadFilters();
    await loadRiwayat();
    document.getElementById('searchInput').addEventListener('input', loadRiwayat);
    document.getElementById('jurusanFilter').addEventListener('change', loadRiwayat);
    document.getElementById('semesterFilter').addEventListener('change', loadRiwayat);
    document.getElementById('jenisFilter').addEventListener('change', loadRiwayat);
    document.getElementById('periodeFilter').addEventListener('change', loadRiwayat);
    document.getElementById('prevPage').addEventListener('click', () => {
      currentPage--;
      loadRiwayat();
    });
    document.getElementById('nextPage').addEventListener('click', () => {
      currentPage++;
      loadRiwayat();
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
async function loadFilters() {
  const { data: jurusan, error: jurusanError } = await supabase
    .from('jurusan')
    .select('id, nama_jurusan')
    .eq('id_sekolah', user.id_sekolah);
  if (jurusanError) throw jurusanError;
  const jurusanFilter = document.getElementById('jurusanFilter');
  jurusan.forEach(j => {
    const option = document.createElement('option');
    option.value = j.id;
    option.textContent = j.nama_jurusan;
    option.className = 'dark:bg-gray-700';
    jurusanFilter.appendChild(option);
  });
  const { data: jenis, error: jenisError } = await supabase
    .from('mastertagihan')
    .select('id, nama_tagihan')
    .eq('tipe', 'tagihan')
    .eq('id_sekolah', user.id_sekolah);
  if (jenisError) throw jenisError;
  const jenisFilter = document.getElementById('jenisFilter');
  jenis.forEach(j => {
    const option = document.createElement('option');
    option.value = j.id;
    option.textContent = j.nama_tagihan;
    option.className = 'dark:bg-gray-700';
    jenisFilter.appendChild(option);
  });
}
async function loadRiwayat() {
  await loading();
  try {
    const { data: transaksi, error: transaksiError, count } = await supabase
      .from('transaksi')
      .select('*', { count: 'exact' })
      .eq('tipe', 'tagihan')
      .eq('id_sekolah', user.id_sekolah)
      .order('tanggal_bayar', { ascending: false })
      .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
    if (transaksiError) throw transaksiError;
    const userIds = transaksi.map(t => t.id_user);
    const tagihanIds = transaksi.map(t => t.id_tipe);
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, user_no')
      .in('id', userIds);
    if (usersError) throw usersError;
    const { data: siswa, error: siswaError } = await supabase
      .from('siswa')
      .select('user_id, jurusan, semester')
      .in('user_id', userIds);
    if (siswaError) throw siswaError;
    const jurusanIds = siswa.map(s => s.jurusan).filter(Boolean);
    const { data: jurusan1, error: jurusanError } = await supabase
      .from('jurusan')
      .select('id, nama_jurusan')
      .in('id', jurusanIds);
    if (jurusanError) throw jurusanError;
    const { data: mastertagihan, error: masterError } = await supabase
      .from('mastertagihan')
      .select('id, nama_tagihan')
      .in('id', tagihanIds);
    if (masterError) throw masterError;
    const combinedData = transaksi.map(t => {
      const user = users.find(u => u.id === t.id_user) || {};
      const siswaDetail = siswa.find(s => s.user_id === t.id_user) || {};
      const jurusanDetail = jurusan1.find(j => j.id === siswaDetail.jurusan) || {};
      const tagihan = mastertagihan.find(m => m.id === t.id_tipe) || {};
      return {
        ...t,
        user,
        siswa: siswaDetail,
        jurusan: jurusanDetail,
        mastertagihan: tagihan
      };
    });
    let filteredData = [...combinedData];
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
      filteredData = filteredData.filter(item => item.id_tipe == jenis);
    }
    const periode = document.getElementById('periodeFilter').value;
    if (periode) {
      filteredData = filteredData.filter(item => item.periode === periode);
    }
    renderRiwayatTable(filteredData, count);
  } catch (error) {
    console.error('Gagal memuat riwayat:', error);
    alert('Gagal memuat riwayat: ' + error.message);
  } finally {
    await loadingout();
  }
}
function renderRiwayatTable(data, totalCount) {
  let html = '';
  data.forEach(item => {
    html += `
      <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
        <td class="py-3 px-4 dark:text-gray-300">${new Date(item.tanggal_bayar).toLocaleDateString('id-ID')}</td>
        <td class="py-3 px-4 dark:text-gray-300">${item.user.name || '-'} (${item.user.user_no || '-'})</td>
        <td class="py-3 px-4 dark:text-gray-300">${item.mastertagihan.nama_tagihan || '-'}</td>
        <td class="py-3 px-4 dark:text-gray-300">${item.periode || '-'}</td>
        <td class="py-3 px-4 dark:text-gray-300">Rp ${parseInt(item.nominal).toLocaleString('id-ID')}</td>
        <td class="py-3 px-4 dark:text-gray-300">${item.metode_pembayaran || '-'}</td>
        <td class="py-3 px-4 dark:text-gray-300">${item.catatan || '-'}</td>
      </tr>
    `;
  });
  document.getElementById('riwayatList').innerHTML = html || `
    <tr>
      <td colspan="7" class="py-4 px-4 text-center text-gray-500 dark:text-gray-400">
        Tidak ditemukan riwayat
      </td>
    </tr>
  `;
  document.getElementById('paginationInfo').textContent = 
    `Menampilkan ${data.length} dari ${totalCount} riwayat`;
  document.getElementById('prevPage').disabled = currentPage === 1;
  document.getElementById('nextPage').disabled = (currentPage * pageSize) >= totalCount;
}