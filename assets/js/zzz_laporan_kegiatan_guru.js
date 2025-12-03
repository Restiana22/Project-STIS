export function initPage() {
  let currentPage = 1;
  const itemsPerPage = 10;
  let allKegiatan = [];
  let allGuru = [];
  let allUsers = []; // Tambahkan variabel untuk menyimpan data users
  async function loadKegiatanGuru() {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('id_sekolah', user.id_sekolah);
      if (usersError) throw usersError;
      allUsers = usersData;
      const guruUsers = allUsers.filter(u => u.role === 'guru');
      let query = supabase
        .from('kegiatan')
        .select('*')
        .eq('id_sekolah', user.id_sekolah)
        .order('waktu', { ascending: false });
      if (user.role === 'guru') {
        query = query.eq('user_id', user.id);
      } else {
        const guruUserIds = guruUsers.map(g => g.id);
        query = query.in('user_id', guruUserIds);
      }
      const { data, error } = await query;
      if (error) throw error;
      allKegiatan = data.map(kegiatan => {
        const userData = allUsers.find(u => u.id === kegiatan.user_id);
        return {
          ...kegiatan,
          users: userData || { name: 'Unknown', role: 'Unknown' }
        };
      });
      if (user.role === 'admin' || user.role === 'kurikulum' || user.role === 'kepsek') {
        allGuru = guruUsers;
        const guruFilter = document.getElementById('guruFilter');
        guruFilter.innerHTML = '<option value="">Semua Guru</option>';
        allGuru.forEach(guru => {
          const option = document.createElement('option');
          option.value = guru.id;
          option.textContent = guru.name;
          guruFilter.appendChild(option);
        });
        document.getElementById('guruFilter').parentElement.classList.remove('hidden');
      } else {
        document.getElementById('guruFilter').parentElement.classList.add('hidden');
      }
      renderKegiatanTable();
      setupPagination();
    } catch (error) {
      console.error('Error loading kegiatan:', error);
    }
  }
  function renderKegiatanTable() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    let filteredData = allKegiatan;
    const searchText = document.getElementById('searchKegiatan').value.toLowerCase();
    if (searchText) {
      filteredData = filteredData.filter(k => 
        k.jenis_kegiatan.toLowerCase().includes(searchText) || 
        (k.keterangan && k.keterangan.toLowerCase().includes(searchText)) ||
        (k.users && k.users.name && k.users.name.toLowerCase().includes(searchText))
      );
    }
    const jenisFilter = document.getElementById('jenisFilter').value;
    if (jenisFilter) {
      filteredData = filteredData.filter(k => k.jenis_kegiatan === jenisFilter);
    }
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;
    if (dateFrom) {
      filteredData = filteredData.filter(k => new Date(k.waktu) >= new Date(dateFrom));
    }
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1); // Sampai akhir hari yang dipilih
      filteredData = filteredData.filter(k => new Date(k.waktu) < endDate);
    }
    if (user.role === 'admin' || user.role === 'kurikulum' || user.role === 'kepsek') {
      const guruFilter = document.getElementById('guruFilter').value;
      if (guruFilter) {
        filteredData = filteredData.filter(k => k.user_id === guruFilter);
      }
    }
    const currentItems = filteredData.slice(startIndex, endIndex);
    const tableBody = document.getElementById('kegiatanGuruList');
    tableBody.innerHTML = '';
    currentItems.forEach(kegiatan => {
      const row = document.createElement('tr');
      const location = convertCoordinatesToAddress(kegiatan.lokasi);
      row.innerHTML = `
        <td class="py-3 px-4 dark:text-gray-300">${kegiatan.users?.name || 'Unknown'}</td>
        <td class="py-3 px-4 dark:text-gray-300">${kegiatan.jenis_kegiatan}</td>
        <td class="py-3 px-4 dark:text-gray-300">${kegiatan.keterangan || '-'}</td>
        <td class="py-3 px-4">
          <img src="${kegiatan.foto}" alt="Foto Kegiatan" class="w-16 h-16 object-cover rounded cursor-pointer" onclick="openImageModal('${kegiatan.foto}')">
        </td>
        <td class="py-3 px-4 dark:text-gray-300">${location}</td>
        <td class="py-3 px-4 dark:text-gray-300">${formatDateTime(kegiatan.waktu)}</td>
        <td class="py-3 px-4">
          ${(user.role === 'admin' || user.role === 'kurikulum' || user.role === 'kepsek') ? `
          <button class="text-red-600 hover:text-red-800 ml-2 dark:text-red-400" onclick="deleteKegiatan(${kegiatan.id})">
            <i class="fas fa-trash"></i>
          </button>
          ` : ''}
        </td>
      `;
      tableBody.appendChild(row);
    });
    document.getElementById('paginationInfo').textContent = 
      `Menampilkan ${startIndex + 1}-${Math.min(endIndex, filteredData.length)} dari ${filteredData.length} kegiatan`;
  }
  function setupPagination() {
    const totalPages = Math.ceil(allKegiatan.length / itemsPerPage);
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages;
    document.getElementById('prevPage').onclick = () => {
      if (currentPage > 1) {
        currentPage--;
        renderKegiatanTable();
        setupPagination();
      }
    };
    document.getElementById('nextPage').onclick = () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderKegiatanTable();
        setupPagination();
      }
    };
  }
  function convertCoordinatesToAddress(coordinates) {
    if (!coordinates) return 'Lokasi tidak tersedia';
    try {
      const [lat, lng] = coordinates.split(',').map(coord => parseFloat(coord.trim()));
      return `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
    } catch (e) {
      return coordinates; // Kembalikan aslinya jika parsing gagal
    }
  }
  function formatDateTime(dateTimeString) {
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateTimeString).toLocaleDateString('id-ID', options);
  }
  window.deleteKegiatan = async function(id) {
    if (confirm('Apakah Anda yakin ingin menghapus kegiatan ini?')) {
      try {
        const { error } = await supabase
          .from('kegiatan')
          .delete()
          .eq('id', id);
        if (error) throw error;
        alert('Kegiatan berhasil dihapus');
        loadKegiatanGuru(); // Muat ulang data
      } catch (error) {
        console.error('Error deleting kegiatan:', error);
        alert('Gagal menghapus kegiatan');
      }
    }
  };
  window.openImageModal = function(imageUrl) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="max-w-4xl max-h-full">
        <img src="${imageUrl}" alt="Foto Kegiatan" class="max-w-full max-h-full">
        <button class="absolute top-4 right-4 text-white text-3xl" onclick="this.parentElement.parentElement.remove()">&times;</button>
      </div>
    `;
    document.body.appendChild(modal);
  };
  document.getElementById('searchKegiatan').addEventListener('input', renderKegiatanTable);
  document.getElementById('jenisFilter').addEventListener('change', renderKegiatanTable);
  document.getElementById('dateFrom').addEventListener('change', renderKegiatanTable);
  document.getElementById('dateTo').addEventListener('change', renderKegiatanTable);
  if (document.getElementById('guruFilter')) {
    document.getElementById('guruFilter').addEventListener('change', renderKegiatanTable);
  }
  loadKegiatanGuru();
};