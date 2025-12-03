// jadwalmengajar_list.js - Versi baru dengan ReusableTable
import ReusableTable from './reusableTable.js';

let dataJadwal = [];
let guruCache = null;
let rawJadwal = [];
let mapelByIdCache = {};
let jurusanByIdCache = {};
let guruDataCache = null;
let activeSemesterParity = 'ganjil';

export async function initPage() {
  try {
    await loading();
    
    const jadwalResp = (user.role === 'kurikulum' || user.role === 'kepsek')
      ? await (async () => {
          const { data, error } = await supabase
            .from('jadwal')
            .select('*')
            .eq('id_sekolah', user.id_sekolah);
          if (error) throw error;
          return { data: { jadwal: data } };
        })()
      : await getJadwalGuru(user.user_no, user.id_sekolah, user.role);
    
    if (jadwalResp.error) {
      console.error('❌ Gagal ambil data jadwal:', jadwalResp.error.message);
      return;
    }
    
    rawJadwal = jadwalResp.data.jadwal || [];
    activeSemesterParity = await fetchSchoolSemesterParity(user.id_sekolah);
    await preloadLookups(rawJadwal, user.id_sekolah);
    
    // Gunakan ReusableTable
    const table = new ReusableTable({
      containerId: 'jadwal-list',
      title: 'Daftar Jadwal Mengajar',
      subtitle: 'Kelola jadwal mengajar untuk semua mata pelajaran',
      icon: 'calendar',
      enableStatistics: true,
      emptyStateTitle: 'Belum ada jadwal',
      emptyStateMessage: 'Mulai dengan membuat jadwal mengajar pertama Anda.',
      emptyStateIcon: 'calendar',
      emptyStateButton: {
        text: 'Tambah Jadwal',
        icon: 'plus',
        onclick: "window.location.hash = '#/jadwalmengajar_add'"
      },
      columns: getTableColumns(),
      dataLoader: () => prepareJadwalData(),
      statistics: (data) => generateJadwalStatistics(data),
      onRowClick: (item) => handleJadwalClick(item)
    });

    await table.init();
    
  } catch (err) {
    console.error('❌ Error ambil jadwal:', err);
  } finally {
    await loadingout();
  }
}

function getTableColumns() {
  const baseColumns = [
    {
      key: 'mapel_nama',
      label: 'Mata Pelajaran',
      type: 'icon',
      iconName: 'book',
      subtitleKey: 'kode_mapel'
    },
    {
      key: 'jurusan_semester',
      label: 'Jurusan & Semester',
      render: (value, item) => `
        <td class="px-6 py-4">
          <div class="space-y-1">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              ${item.jurusan_nama || '-'}
            </span>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              Semester: ${item.semester_display || '-'}
            </div>
          </div>
        </td>
      `
    },
    {
      key: 'hari',
      label: 'Hari',
      render: (value) => `
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
            ${value || '-'}
          </span>
        </td>
      `
    },
    {
      key: 'jam',
      label: 'Jam Mengajar',
      render: (value, item) => `
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="font-mono text-sm font-semibold text-gray-900 dark:text-white">
            ${item.jamstart || '-'} - ${item.jamend || '-'}
          </div>
          ${isJadwalActive(item.hari, item.jamstart, item.jamend) ? `
            <div class="flex items-center mt-1">
              <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
              <span class="text-xs text-green-600 dark:text-green-400">Sedang berlangsung</span>
            </div>
          ` : ''}
        </td>
      `
    },
    {
      key: 'guru_nama',
      label: 'Guru Pengajar',
      render: (value) => `
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <div class="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center mr-3">
              <i data-feather="user" class="w-4 h-4 text-white"></i>
            </div>
            <span class="text-gray-700 dark:text-gray-200">${value || 'Tidak ditugaskan'}</span>
          </div>
        </td>
      `
    },
    {
      key: 'status',
      label: 'Status',
      render: (value, item) => {
        const isActive = isJadwalActive(item.hari, item.jamstart, item.jamend);
        const statusText = isActive ? 'Berlangsung' : 'Tidak aktif';
        const statusClass = isActive 
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        
        return `
          <td class="px-6 py-4 whitespace-nowrap">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">
              ${statusText}
            </span>
          </td>
        `;
      }
    }
  ];

  // Tambahkan kolom khusus untuk guru (bukan kurikulum/kepsek)
  if (user.role !== 'kurikulum' && user.role !== 'kepsek') {
    baseColumns.push(
      {
        key: 'absensi_status',
        label: 'Status Absensi',
        render: (value, item) => {
          const absensiClass = item.absensi_hadir 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
          const absensiText = item.absensi_hadir 
            ? `Sudah absen (${item.absensi_count}x minggu ini)`
            : 'Belum absen';
          
          return `
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${absensiClass}">
                ${absensiText}
              </span>
            </td>
          `;
        }
      },
      {
        key: 'aksi',
        label: 'Aksi',
        render: (value, item) => `
          <td class="px-6 py-4 whitespace-nowrap text-center">
            <button class="absen-mengajar-btn bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded text-sm transition-colors"
                    data-id="${item.id}" 
                    data-mapel="${item.mapel}" 
                    data-jurusan="${item.jurusan}">
              <i data-feather="check-circle" class="w-4 h-4 inline mr-1"></i>
              Absen
            </button>
          </td>
        `
      }
    );
  }

  return baseColumns;
}

async function prepareJadwalData() {
  const filtered = rawJadwal.filter(item => {
    if (activeSemesterParity === 'all') return true;
    return semesterMatchesParity(item.semester, activeSemesterParity);
  });

  const jadwalWithDetails = await Promise.all(
    filtered.map(async (jadwalItem) => {
      const guru = (guruDataCache || []).find(g => g.id_guru === jadwalItem.guru);
      const mapelNama = (jadwalItem.mapel && mapelByIdCache[String(jadwalItem.mapel)])
        ? mapelByIdCache[String(jadwalItem.mapel)].nama_mapel
        : (jadwalItem.mapel || '-');
      const jurusanNama = (jadwalItem.jurusan && jurusanByIdCache[String(jadwalItem.jurusan)])
        ? jurusanByIdCache[String(jadwalItem.jurusan)].nama_jurusan
        : (jadwalItem.jurusan || '-');

      // Hitung status absensi untuk guru
      let absensiStatus = { hadir: false, count: 0 };
      if (user.role !== 'kurikulum' && user.role !== 'kepsek') {
        absensiStatus = await checkAbsensiStatus(jadwalItem.id);
      }

      return {
        ...jadwalItem,
        mapel_nama: mapelNama,
        jurusan_nama: jurusanNama,
        guru_nama: guru ? `${guru.user_no} - ${guru.nama}` : 'Tidak ditugaskan',
        semester_display: Array.isArray(jadwalItem.semester) 
          ? jadwalItem.semester.join(', ') 
          : String(jadwalItem.semester || '-'),
        jam: `${jadwalItem.jamstart} - ${jadwalItem.jamend}`,
        absensi_hadir: absensiStatus.hadir,
        absensi_count: absensiStatus.count,
        _raw: jadwalItem
      };
    })
  );

  return sortJadwalByNearest(jadwalWithDetails);
}

function generateJadwalStatistics(data) {
  const totalJadwal = data.length;
  const jadwalAktif = data.filter(item => 
    isJadwalActive(item.hari, item.jamstart, item.jamend)
  ).length;
  const mapelCount = [...new Set(data.map(item => item.mapel_nama))].length;

  return `
    <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-blue-100 text-sm">Total Jadwal</p>
          <p class="text-2xl font-bold">${totalJadwal}</p>
        </div>
        <div class="bg-white/20 p-3 rounded-xl">
          <i data-feather="calendar" class="w-6 h-6"></i>
        </div>
      </div>
    </div>
    
    <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-green-100 text-sm">Sedang Berlangsung</p>
          <p class="text-2xl font-bold">${jadwalAktif}</p>
        </div>
        <div class="bg-white/20 p-3 rounded-xl">
          <i data-feather="play-circle" class="w-6 h-6"></i>
        </div>
      </div>
    </div>
    
    <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-purple-100 text-sm">Mata Pelajaran</p>
          <p class="text-xl font-bold">${mapelCount}</p>
        </div>
        <div class="bg-white/20 p-3 rounded-xl">
          <i data-feather="book" class="w-6 h-6"></i>
        </div>
      </div>
    </div>
  `;
}

function handleJadwalClick(item) {
  // Jika perlu aksi saat row diklik
}

// Setup event handlers untuk tombol absen
function setupAbsenButtons() {
  document.querySelectorAll('.absen-mengajar-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation(); // Mencegah trigger row click
      const jadwalId = this.getAttribute('data-id');
      const mapel = this.getAttribute('data-mapel');
      const jurusan = this.getAttribute('data-jurusan');
      openAbsenMengajarModal(jadwalId, mapel, jurusan);
    });
  });
  feather.replace();
}

// Fungsi-fungsi helper yang sudah ada (tetap dipertahankan)
async function fetchSchoolSemesterParity(id_sekolah) {
  try {
    const { data, error } = await supabase
      .from('sekolah')
      .select('semester_aktif')
      .eq('id', id_sekolah)
      .maybeSingle();
    if (error) {
      console.warn('Gagal baca setting sekolah, default ke ganjil:', error.message);
      return 'ganjil';
    }
    if (!data) return 'ganjil';
    if (data.semester_aktif) {
      const s = String(data.semester_aktif).trim().toLowerCase();
      if (['ganjil', 'genap', 'all'].includes(s)) return s;
    }
    const n = parseInt(String(data.current_semester).replace(/\D/g, ''), 10);
    if (!isNaN(n)) return (n % 2 === 0) ? 'genap' : 'ganjil';
    return 'ganjil';
  } catch (err) {
    console.warn('fetchSchoolSemesterParity error, default ganjil:', err);
    return 'ganjil';
  }
}

async function preloadLookups(jadwalArray, id_sekolah) {
  const mapelIds = Array.from(new Set(jadwalArray.map(d => d.mapel).filter(Boolean)));
  const jurusanIds = Array.from(new Set(jadwalArray.map(d => d.jurusan).filter(Boolean)));
  mapelByIdCache = {};
  if (mapelIds.length) {
    const { data: mapelRows, error: mapelErr } = await supabase
      .from('mapel')
      .select('id, nama_mapel')
      .in('id', mapelIds);
    if (mapelErr) console.warn('Gagal ambil nama mapel:', mapelErr);
    (mapelRows || []).forEach(m => { mapelByIdCache[String(m.id)] = m; });
  }
  jurusanByIdCache = {};
  if (jurusanIds.length) {
    const { data: jurusanRows, error: jurusanErr } = await supabase
      .from('jurusan')
      .select('id, nama_jurusan')
      .in('id', jurusanIds);
    if (jurusanErr) console.warn('Gagal ambil nama jurusan:', jurusanErr);
    (jurusanRows || []).forEach(j => { jurusanByIdCache[String(j.id)] = j; });
  }
  guruDataCache = await getGuruData(id_sekolah);
}

async function getGuruData(id_sekolah) {
  if (guruCache) return guruCache;
  const { data: guruData, error: guruError } = await supabase
    .from('guru')
    .select('id_guru, user_no, id')
    .eq('id_sekolah', id_sekolah);
  if (guruError) {
    console.error('Error fetching guru data:', guruError);
    return [];
  }
  if (!guruData || guruData.length === 0) {
    return [];
  }
  const userIds = guruData.map(guru => guru.id_guru);
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('id, name')
    .in('id', userIds);

  if (usersError) {
    console.error('Error fetching users data:', usersError);
    return guruData.map(guru => ({
      id_guru: guru.id_guru,
      user_no: guru.user_no,
      nama: 'Nama tidak tersedia'
    }));
  }
  const combinedData = guruData.map(guru => {
    const user = usersData.find(u => u.id === guru.id_guru);
    return {
      id_guru: guru.id_guru,
      user_no: guru.user_no,
      nama: user ? user.name : 'Nama tidak tersedia'
    };
  });
  guruCache = combinedData;
  return combinedData;
}

function semesterMatchesParity(semesterField, parity) {
  if (semesterField === undefined || semesterField === null) return false;
  let parts = [];
  if (Array.isArray(semesterField)) {
    parts = semesterField.map(String);
  } else {
    parts = String(semesterField).split(',').map(s => s.trim()).filter(Boolean);
  }
  for (const p of parts) {
    const num = parseInt(p.replace(/\D/g, ''), 10);
    if (isNaN(num)) continue;
    if (parity === 'ganjil' && num % 2 === 1) return true;
    if (parity === 'genap' && num % 2 === 0) return true;
  }
  return false;
}

function sortJadwalByNearest(jadwalList) {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const today = new Date();
  const currentDay = days[today.getDay()];
  const currentTime = today.getHours() * 60 + today.getMinutes();
  return jadwalList.sort((a, b) => {
    const dayA = days.indexOf(a.hari);
    const dayB = days.indexOf(b.hari);
    const dayDiffA = (dayA - today.getDay() + 7) % 7;
    const dayDiffB = (dayB - today.getDay() + 7) % 7;
    if (dayDiffA === dayDiffB) {
      const timeA = parseInt(a.jamstart.split(':')[0]) * 60 + parseInt(a.jamstart.split(':')[1]);
      const timeB = parseInt(b.jamstart.split(':')[0]) * 60 + parseInt(b.jamstart.split(':')[1]);
      if (dayDiffA === 0) {
        if (timeA < currentTime && timeB >= currentTime) return 1;
        if (timeA >= currentTime && timeB < currentTime) return -1;
      }
      return timeA - timeB;
    }
    return dayDiffA - dayDiffB;
  });
}

function isJadwalActive(hari, jamStart, jamEnd) {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const today = new Date();
  const currentDay = days[today.getDay()];
  const currentTime = today.getHours() + ':' + (today.getMinutes() < 10 ? '0' : '') + today.getMinutes();
  if (currentDay !== hari) return false;
  return currentTime >= jamStart && currentTime <= jamEnd;
}

function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return weekNo;
}

async function checkAbsensiStatus(jadwalId) {
  const currentWeek = getWeekNumber(new Date());
  const { data: absensiData, error } = await supabase
    .from('kegiatan')
    .select('*')
    .eq('id_jadwal', jadwalId)
    .eq('user_id', user.id)
    .eq('id_sekolah', user.id_sekolah);
  if (error) {
    console.error('Error fetching absensi data:', error);
    return { hadir: false, count: 0 };
  }
  if (!absensiData || absensiData.length === 0) {
    return { hadir: false, count: 0 };
  }
  const absensiMingguIni = absensiData.filter(item => {
    const itemDate = new Date(item.waktu);
    const itemWeek = getWeekNumber(itemDate);
    return itemWeek === currentWeek;
  });
  return { 
    hadir: absensiMingguIni.length > 0, 
    count: absensiMingguIni.length 
  };
}

function openAbsenMengajarModal(jadwalId, mapel, jurusan) {
  localStorage.setItem('selected_jadwal_id', jadwalId);
  localStorage.setItem('selected_mapel', mapel);
  localStorage.setItem('selected_jurusan', jurusan);
  window.location.hash = '#/jadwalmengajar_absen';
}

// Setup event listeners setelah tabel dirender
document.addEventListener('DOMContentLoaded', function() {
  document.addEventListener('click', function(e) {
    if (e.target.closest('.absen-mengajar-btn')) {
      const btn = e.target.closest('.absen-mengajar-btn');
      const jadwalId = btn.getAttribute('data-id');
      const mapel = btn.getAttribute('data-mapel');
      const jurusan = btn.getAttribute('data-jurusan');
      openAbsenMengajarModal(jadwalId, mapel, jurusan);
    }
  });
});