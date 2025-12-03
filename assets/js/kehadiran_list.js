let dataAbsen = [];
let dataPresensi = [];
let currentSort = {
  column: '',
  direction: 'asc',
};

export async function initPage() {
  try {
    await loading();
    if (user.role == 'admin' || user.role == 'kepsek') {
      document.getElementById('setting_lokasi').classList.remove('hidden');
    }
    const absen = await getAbsenbyUserId(user.id);
    if (absen.error) {
      console.error('❌ Gagal ambil data Absen:', absen.error.message);
    }
    const izin = await getIzinByUserId(user.id);
    if (izin.error) {
      console.error('❌ Gagal ambil data Izin:', izin.error.message);
    }
    const dataKehadiran = absen.data || [];
    const dataIzin = izin.data || [];
    
    const formattedKehadiran = dataKehadiran.map(item => {
      let fotoMasuk = '';
      let fotoKeluar = '';
      
      if (item.foto && item.foto.includes('***')) {
        const [fotoMasukUrl, fotoKeluarUrl] = item.foto.split('***');
        fotoMasuk = generatePhotoThumbnail(fotoMasukUrl);
        fotoKeluar = generatePhotoThumbnail(fotoKeluarUrl);
      } else {
        fotoMasuk = generatePhotoThumbnail(item.foto);
      }

      let lokasiMasuk = '';
      let lokasiKeluar = '';
      
      if (item.lokasi && item.lokasi.includes('***')) {
        const [lokasiMasukStr, lokasiKeluarStr] = item.lokasi.split('***');
        lokasiMasuk = formatSingleLocation(lokasiMasukStr);
        lokasiKeluar = formatSingleLocation(lokasiKeluarStr);
      } else {
        lokasiMasuk = formatSingleLocation(item.lokasi);
      }
      
      return {
        id: item.id,
        tanggal: item.tanggal,
        jenis: 'kehadiran',
        jam_masuk: item.jam_masuk,
        jam_keluar: item.jam_keluar,
        foto_masuk: fotoMasuk,
        foto_keluar: fotoKeluar,
        lokasi_masuk: lokasiMasuk,
        lokasi_keluar: lokasiKeluar,
        keterangan: item.lokasi ? `Lokasi: ${item.lokasi}` : '',
        status: 'confirmed',
        absensi_oleh: item.absensi_oleh
      };
    });
    
    const formattedIzin = dataIzin.map(item => ({
      id: item.id,
      tanggal: item.tanggal,
      jenis: 'izin',
      jam_masuk: '-',
      jam_keluar: '-',
      foto_masuk: '-',
      foto_keluar: '-',
        lokasi_masuk: lokasiMasuk,
        lokasi_keluar: lokasiKeluar,
      keterangan: `${item.jenis_izin}: ${item.alasan}`,
      lampiran: item.lampiran ? `<a href="${item.lampiran}" target="_blank" class="text-blue-600 hover:underline">Lihat Dokumen</a>` : '',
      status: item.status
    }));
    
    dataPresensi = [...formattedKehadiran, ...formattedIzin].sort((a, b) => 
      new Date(b.tanggal) - new Date(a.tanggal)
    );
    renderPresensiList();
    
    updatePresensiStats();
    setupSortHandlers();
  } catch (err) {
    console.error('❌ Error ambil data presensi:', err);
  } finally {
    await loadingout();
  }
}


function renderPresensiList() {
  const tbody = document.querySelector('#absen-list table tbody');
  tbody.innerHTML = '';
  
  if (!Array.isArray(dataPresensi) || dataPresensi.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8;
    td.className = 'px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-lg';
    td.textContent = 'Belum ada data presensi.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  
  dataPresensi.forEach(item => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-[#f0f9ff] dark:hover:bg-gray-700 transition';
    
    let statusClass = '';
    let statusText = '';
    
    if (item.jenis === 'kehadiran') {
      statusClass = 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
      statusText = 'Hadir';
    } else {
      if (item.status === 'disetujui') {
        statusClass = 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
      } else if (item.status === 'ditolak') {
        statusClass = 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
      } else {
        statusClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
      }
      statusText = `Izin (${item.status})`;
    }
    
    tr.innerHTML = `
      <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
        ${item.tanggal || '-'}
      </td>
      <td class="px-4 py-3">
        <span class="px-3 py-1 rounded-full text-xs font-semibold ${statusClass}">
          ${statusText}
        </span>
        ${item.jenis === 'kehadiran' && item.absensi_oleh === 'guru_piket' ? 
          '<div class="text-xs text-gray-500 mt-1">Oleh: Guru Piket</div>' : ''}
      </td>
      <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
        ${item.jam_masuk || '-'}
      </td>
      <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
        ${item.jam_keluar || '-'}
      </td>
      <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
        ${item.foto_masuk || '-'}
      </td>
      <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
        ${item.foto_keluar || '-'}
      </td>
      <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
        ${item.lokasi_masuk || '-'}
      </td>
      <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
        ${item.lokasi_keluar || '-'}
      </td>
      <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
        ${item.keterangan || '-'}
        ${item.lampiran ? `<div class="mt-1">${item.lampiran}</div>` : ''}
      </td>
    `;
    
    tbody.appendChild(tr);
  });
}

// Tambahkan fungsi helper dari laporan_kehadiran
function generatePhotoThumbnail(photoUrl) {
  if (!photoUrl) return '-';
  return `
    <div class="photo-thumbnail inline-block">
      <a href="${photoUrl}" target="_blank" class="thumbnail-link">
        <img src="${photoUrl}" alt="Foto" 
             class="thumbnail-img h-12 w-12 object-cover rounded-lg border border-gray-300 hover:shadow-md transition cursor-pointer">
      </a>
    </div>
  `;
}

function formatLokasiDisplay(lokasi) {
  if (!lokasi) return '-';
  try {
    const lokasiObj = JSON.parse(lokasi);
    if (lokasiObj.alamat) {
      return `
        <div class="text-left max-w-xs">
          <div class="font-medium text-xs">${lokasiObj.alamat}</div>
          <div class="text-xs text-gray-500 mt-1">${lokasiObj.lat}, ${lokasiObj.lng}</div>
        </div>
      `;
    }
    return `${lokasiObj.lat}, ${lokasiObj.lng}`;
  } catch (e) {
    return lokasi;
  }
}


function formatSingleLocation(locationStr) {
  if (!locationStr || locationStr === '-') return '-';
  
  try {
    // If it's a coordinate string like "-6.28117,106.7145994"
    if (locationStr.includes(',')) {
      const [lat, lng] = locationStr.split(',');
      return `
        <div class="location-display text-left">
          <div class="text-xs font-mono">${lat.trim()}</div>
          <div class="text-xs font-mono">${lng.trim()}</div>
          <a href="https://maps.google.com/?q=${lat},${lng}" 
             target="_blank" 
             class="text-xs text-blue-600 hover:underline mt-1 inline-block">
            <i class="fas fa-map-marker-alt mr-1"></i>Buka Maps
          </a>
        </div>
      `;
    }
    
    // If it's JSON format
    const lokasiObj = JSON.parse(locationStr);
    if (lokasiObj.alamat) {
      return `
        <div class="location-display text-left">
          <div class="text-xs font-medium">${lokasiObj.alamat}</div>
          <div class="text-xs text-gray-500">${lokasiObj.lat}, ${lokasiObj.lng}</div>
          <a href="https://maps.google.com/?q=${lokasiObj.lat},${lokasiObj.lng}" 
             target="_blank" 
             class="text-xs text-blue-600 hover:underline mt-1 inline-block">
            <i class="fas fa-map-marker-alt mr-1"></i>Buka Maps
          </a>
        </div>
      `;
    }
    return `${lokasiObj.lat}, ${lokasiObj.lng}`;
  } catch (e) {
    // If parsing fails, return as plain text
    return `
      <div class="location-display text-left">
        <div class="text-xs">${locationStr}</div>
        <a href="https://maps.google.com/?q=${encodeURIComponent(locationStr)}" 
           target="_blank" 
           class="text-xs text-blue-600 hover:underline mt-1 inline-block">
          <i class="fas fa-map-marker-alt mr-1"></i>Buka Maps
        </a>
      </div>
    `;
  }
}

function setupSortHandlers() {
  // Implementasi sorting jika diperlukan
  const thElements = document.querySelectorAll('#absen-list table thead th');
  thElements.forEach((th, index) => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      // Implementasi sorting logic di sini
      sortTableBy(index);
    });
  });
}

function sortTableBy(columnIndex) {
  // Implementasi sorting logic
  console.log('Sort by column:', columnIndex);
}

function updatePresensiStats() {
  const totalPresensi = dataPresensi.length;
  const totalHadir = dataPresensi.filter(item => item.jenis === 'kehadiran').length;
  const totalIzin = dataPresensi.filter(item => item.jenis === 'izin' && item.status === 'disetujui').length;
  const totalDitolak = dataPresensi.filter(item => item.jenis === 'izin' && item.status === 'ditolak').length;
  
  document.getElementById('totalPresensi').textContent = totalPresensi;
  document.getElementById('totalHadir').textContent = totalHadir;
  document.getElementById('totalIzin').textContent = totalIzin;
  document.getElementById('totalDitolak').textContent = totalDitolak;
}