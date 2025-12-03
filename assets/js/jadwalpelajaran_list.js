let dataJadwal = [];
let currentSort = {
  column: '',
  direction: 'asc',
};

// Warna untuk setiap hari
const hariColors = {
  'Senin': { bg: 'bg-blue-50', text: 'text-blue-500', light: 'bg-blue-50', dark: 'bg-blue-900/20' },
  'Selasa': { bg: 'bg-green-50', text: 'text-green-500', light: 'bg-green-50', dark: 'bg-green-900/20' },
  'Rabu': { bg: 'bg-yellow-50', text: 'text-yellow-500', light: 'bg-yellow-50', dark: 'bg-yellow-900/20' },
  'Kamis': { bg: 'bg-purple-50', text: 'text-purple-500', light: 'bg-purple-50', dark: 'bg-purple-900/20' },
  'Jumat': { bg: 'bg-red-50', text: 'text-red-500', light: 'bg-red-50', dark: 'bg-red-900/20' },
  'Sabtu': { bg: 'bg-indigo-50', text: 'text-indigo-500', light: 'bg-indigo-50', dark: 'bg-indigo-900/20' },
  'Minggu': { bg: 'bg-pink-50', text: 'text-pink-500', light: 'bg-pink-50', dark: 'bg-pink-900/20' }
};

export async function initPage() {
  try {
    await loading();
    console.log('🔄 Mengambil jadwal untuk user:', user.user_no, 'sekolah:', user.id_sekolah);
    
    const jadwal = await getJadwalSiswa(user.user_no, user.id_sekolah);
    
    console.log('📊 Hasil jadwal:', jadwal);
    
    if (jadwal.error) {
      console.error('❌ Gagal ambil data jadwal:', jadwal.error.message);
      showErrorMessage('Gagal memuat jadwal: ' + jadwal.error.message);
      return;
    }
    
    dataJadwal = jadwal.data || [];
    console.log('📅 Data jadwal yang akan dirender:', dataJadwal);
    
    renderJadwalList();
    renderStatistics();
    setupSortHandlers();
    
  } catch (err) {
    console.error('❌ Error ambil jadwal:', err);
    showErrorMessage('Terjadi error saat memuat jadwal');
  } finally {
    await loadingout();
  }
}

function renderJadwalList() {
  const tbody = document.getElementById('jadwal-tbody');
  const emptyState = document.getElementById('empty-state');
  const totalJadwal = document.getElementById('totalJadwal');
  
  if (!tbody) {
    console.error('❌ Table body tidak ditemukan');
    return;
  }
  
  tbody.innerHTML = '';
  totalJadwal.textContent = dataJadwal.length;
  
  console.log('🎨 Merender jadwal, jumlah data:', dataJadwal.length);
  
  if (!Array.isArray(dataJadwal) || dataJadwal.length === 0) {
    tbody.style.display = 'none';
    emptyState.classList.remove('hidden');
    feather.replace();
    return;
  }
  
  tbody.style.display = 'table-row-group';
  emptyState.classList.add('hidden');
  
  dataJadwal.forEach((item, index) => {
    const hari = item.hari || '-';
    const hariColor = hariColors[hari] || { bg: 'bg-gray-500', text: 'text-gray-500', light: 'bg-gray-50', dark: 'bg-gray-900/20' };
    
    const tr = document.createElement('tr');
    tr.className = `group transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${
      index % 2 === 0 
        ? 'bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/10' 
        : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/10'
    }`;
    
    tr.innerHTML = `
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center space-x-3">
          <div class="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <i data-feather="book" class="w-5 h-5 text-white"></i>
          </div>
          <div>
            <div class="font-semibold text-gray-900 dark:text-white text-sm">${item.mapel || '-'}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${item.nama_mapel || ''}</div>
          </div>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="inline-flex items-center px-3 py-2 rounded-lg text-sm font-semibold ${hariColor.bg} ${hariColor.light} ${hariColor.text} dark:${hariColor.dark} dark:text-white border-l-4">
          <i data-feather="clock" class="w-3 h-3 mr-2"></i>
          ${hari}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center space-x-2">
          <div class="w-2 h-2 bg-green-500 rounded-full"></div>
          <span class="font-mono text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
            ${item.jamstart || item.jam_mulai || '-'}
          </span>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center space-x-2">
          <div class="w-2 h-2 bg-red-500 rounded-full"></div>
          <span class="font-mono text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
            ${item.jamend || item.jam_selesai || '-'}
          </span>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center space-x-2">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            ${item.jurusan || '-'}
          </span>
          ${item.nama_jurusan ? `<div class="text-xs text-gray-500 dark:text-gray-400">${item.nama_jurusan}</div>` : ''}
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
          <i data-feather="layers" class="w-3 h-3 mr-1"></i>
          ${item.semester || '-'}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });  
  
  feather.replace();
  updateSortIndicators();
}

function renderStatistics() {
  const container = document.getElementById('statistics-cards');
  if (!container) return;
  
  if (!Array.isArray(dataJadwal) || dataJadwal.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  // Hitung statistik
  const hariCount = {};
  const totalMapel = dataJadwal.length;
  const uniqueMapel = [...new Set(dataJadwal.map(item => item.mapel))].length;
  
  dataJadwal.forEach(item => {
    const hari = item.hari || 'Unknown';
    hariCount[hari] = (hariCount[hari] || 0) + 1;
  });
  
  const mostFrequentHari = Object.keys(hariCount).reduce((a, b) => 
    hariCount[a] > hariCount[b] ? a : b, 'Tidak ada'
  );
  
  container.innerHTML = `
    <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-blue-100 text-sm">Total Jadwal</p>
          <p class="text-2xl font-bold">${totalMapel}</p>
        </div>
        <div class="bg-white/20 p-3 rounded-xl">
          <i data-feather="calendar" class="w-6 h-6"></i>
        </div>
      </div>
    </div>
    
    <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-green-100 text-sm">Mata Pelajaran</p>
          <p class="text-2xl font-bold">${uniqueMapel}</p>
        </div>
        <div class="bg-white/20 p-3 rounded-xl">
          <i data-feather="book" class="w-6 h-6"></i>
        </div>
      </div>
    </div>
    
    <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-purple-100 text-sm">Hari Terpadat</p>
          <p class="text-xl font-bold">${mostFrequentHari}</p>
        </div>
        <div class="bg-white/20 p-3 rounded-xl">
          <i data-feather="activity" class="w-6 h-6"></i>
        </div>
      </div>
    </div>
  `;
  
  feather.replace();
}

function showErrorMessage(message) {
  const container = document.querySelector('#jadwal-list');
  if (container) {
    container.innerHTML = `
      <div class="bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl p-6 text-white shadow-lg mb-6">
        <div class="flex items-center space-x-4">
          <div class="bg-white/20 p-3 rounded-xl">
            <i data-feather="alert-triangle" class="w-6 h-6"></i>
          </div>
          <div>
            <h3 class="font-bold text-lg">Terjadi Kesalahan</h3>
            <p class="text-red-100">${message}</p>
          </div>
        </div>
      </div>
      <div class="text-center py-12">
        <div class="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
          <i data-feather="calendar" class="w-10 h-10 text-gray-400"></i>
        </div>
        <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Tidak dapat memuat jadwal</h3>
        <p class="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
          Silakan coba lagi atau hubungi administrator jika masalah berlanjut.
        </p>
        <button onclick="location.reload()" class="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg font-semibold">
          <i data-feather="refresh-cw" class="w-4 h-4 inline mr-2"></i>
          Muat Ulang Halaman
        </button>
      </div>
    `;
    feather.replace();
  }
}

// Fungsi sorting tetap sama, hanya update indicator
function updateSortIndicators() {
  const thElements = document.querySelectorAll('#jadwal-list table thead th');
  const columnMap = ['mapel', 'hari', 'jamstart', 'jamend', 'jurusan', 'semester'];
  
  thElements.forEach((th, index) => {
    const columnName = columnMap[index];
    const originalContent = th.innerHTML;
    
    // Reset semua header
    th.classList.remove('text-blue-800', 'bg-blue-100');
    th.innerHTML = originalContent.split('<span class="ml-1">')[0]; // Hapus indicator
    
    if (currentSort.column === columnName) {
      const arrow = currentSort.direction === 'asc' ? '↑' : '↓';
      th.innerHTML += `<span class="ml-1 text-blue-600">${arrow}</span>`;
      th.classList.add('text-blue-800', 'bg-blue-100', 'dark:bg-blue-900/30');
    }
  });
}

// Setup sort handlers tetap sama
function setupSortHandlers() {
  const thElements = document.querySelectorAll('#jadwal-list table thead th');
  const columnMap = ['mapel', 'hari', 'jamstart', 'jamend', 'jurusan', 'semester'];
  
  thElements.forEach((th, index) => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      sortTableBy(columnMap[index]);
    });
  });
}

function sortTableBy(column) {
  if (currentSort.column === column) {
    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.column = column;
    currentSort.direction = 'asc';
  }
  
  dataJadwal.sort((a, b) => {
    let valueA = (a[column] ?? '').toString().toLowerCase();
    let valueB = (b[column] ?? '').toString().toLowerCase();
    
    // Handle waktu khusus
    if (column === 'jamstart' || column === 'jamend') {
      valueA = convertTimeToSortable(valueA);
      valueB = convertTimeToSortable(valueB);
    }
    
    if (valueA < valueB) return currentSort.direction === 'asc' ? -1 : 1;
    if (valueA > valueB) return currentSort.direction === 'asc' ? 1 : -1;
    return 0;
  });
  
  renderJadwalList();
}

function convertTimeToSortable(timeStr) {
  // Convert time like "08:00" to sortable format
  if (!timeStr || timeStr === '-') return '99:99';
  return timeStr.replace(':', '');
}