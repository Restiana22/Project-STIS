export async function initPage() {
  const user = JSON.parse(localStorage.getItem('user'));
  const schoolConfig = JSON.parse(localStorage.getItem('schoolConfig')) || {};
    
  if (!user || !schoolConfig.id) {
      console.error('Auth validation failed in dashboard');
      window.location.hash = '#/login';
      return;
  }
    
  await loading();
  const quickAbsensiBtn = document.getElementById('quickAbsensi');
  const quickAbsensiContainer = document.getElementById('quickAbsensiContainer');
  if (quickAbsensiBtn && user.role != '1') {
    quickAbsensiContainer.classList.remove('hidden');
    quickAbsensiBtn.classList.remove('hidden');
    quickAbsensiBtn.addEventListener('click', () => {
      window.location.hash = '#/kehadiran_add';
    });
  }
  const detailpelanggaran = document.getElementById('detailpelanggaran');
  detailpelanggaran.addEventListener('click', () => {
      showDetailPelanggaran();
    });
  const closeDetail = document.getElementById('closedetailmodal');
  closeDetail.addEventListener('click', () => {
      closeDetailModal();
    });
  if (schoolConfig.customDashboard) {
    try {
      const module = await import(`/schools/${schoolConfig.id}/dashboard.js`);
      return module.initPage();
    } catch (err) {
      console.log('Using default dashboard');
    }
  }  
  const { data: allUsers, error: usersError } = await getAllUser(user.kode_sekolah);
  if (!usersError) {
    renderUserStatsChart(allUsers);
  }
  if (user.role === 'siswa') {
    await loadPelanggaranSiswa(user);
    await loadKeuanganWidget(user);
    await loadNilaiSiswa(user);
  }
  updateCurrentDateTime();
  renderRoleSpecificWidgets(user);
  renderMiniCalendar();
  renderQuickActions(user);
  await loadingout();
}
async function getKeuanganSiswa(user_no, id_sekolah) {
  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('user_no', user_no)
      .eq('id_sekolah', id_sekolah)
      .single();
    if (userError) throw userError;
    const { data: tagihanData, error: tagihanError } = await supabase
      .from('recordtagihan')
      .select('*')
      .eq('user_id', userData.id)
      .eq('id_sekolah', id_sekolah)
      .neq('status_bayar', 'Lunas')
      .order('created_at', { ascending: false });
    if (tagihanError) throw tagihanError;
    let masterTagihanMap = {};
    if (tagihanData && tagihanData.length > 0) {
      const tagihanIds = tagihanData.map(t => t.id_tagihan).filter(id => id);
      if (tagihanIds.length > 0) {
        const { data: masterTagihanData, error: masterError } = await supabase
          .from('mastertagihan')
          .select('*')
          .in('id', tagihanIds)
          .eq('id_sekolah', id_sekolah);

        if (!masterError && masterTagihanData) {
          masterTagihanData.forEach(mt => {
            masterTagihanMap[mt.id] = mt;
          });
        }
      }
    }
    const tagihanDenganDetail = tagihanData ? tagihanData.map(tagihan => ({
      ...tagihan,
      mastertagihan: masterTagihanMap[tagihan.id_tagihan] || null
    })) : [];
    const { data: riwayatPembayaran, error: riwayatError } = await supabase
      .from('transaksi')
      .select('*')
      .eq('id_user', userData.id)
      .eq('id_sekolah', id_sekolah)
      .order('tanggal_bayar', { ascending: false })
      .limit(5);
    if (riwayatError) throw riwayatError;
    const { data: saldoData, error: saldoError } = await supabase
      .from('saldo')
      .select('saldo_sekarang')
      .eq('id_user', userData.id)
      .eq('id_sekolah', id_sekolah)
      .single();
    const saldo = saldoError ? 0 : (saldoData?.saldo_sekarang || 0);
    const pembayaranTerakhir = riwayatPembayaran && riwayatPembayaran.length > 0 
      ? riwayatPembayaran[0] 
      : null;
    return {
      data: {
        saldo: saldo,
        tagihan: tagihanDenganDetail || [],
        riwayat_pembayaran: riwayatPembayaran || [],
        pembayaran_terakhir: pembayaranTerakhir,
        status_terakhir: tagihanDenganDetail.length > 0 ? 'Ada Tagihan' : 'Lunas'
      },
      error: null
    };
  } catch (error) {
    console.error('Error fetching keuangan siswa:', error);
    return { 
      data: {
        saldo: 0,
        tagihan: [],
        riwayat_pembayaran: [],
        pembayaran_terakhir: null,
        status_terakhir: 'Tidak Ada Data'
      }, 
      error 
    };
  }
}

async function loadKeuanganWidget(user) {
  try {
    document.getElementById('keuanganWidget').classList.remove('hidden');
    let keuanganData;
    if (user.role === 'siswa') {
      const result = await getKeuanganSiswa(user.user_no, user.id_sekolah);
      keuanganData = result.data;
    }
    if (!keuanganData) {
      document.getElementById('keuanganWidget').innerHTML = `
        <div class="text-center py-4 text-gray-500 dark:text-gray-400">
          <i data-feather="alert-circle" class="w-8 h-8 mx-auto mb-2 text-yellow-500"></i>
          <p>Data keuangan tidak tersedia</p>
        </div>
      `;
      feather.replace();
      return;
    }
    renderKeuanganInfo(keuanganData, user.role);
  } catch (error) {
    console.error('Error loading keuangan data:', error);
    document.getElementById('keuanganWidget').innerHTML = `
      <div class="text-center py-4 text-gray-500 dark:text-gray-400">
        <i data-feather="alert-circle" class="w-8 h-8 mx-auto mb-2 text-yellow-500"></i>
        <p>Gagal memuat data keuangan</p>
      </div>
    `;
    feather.replace();
  }
}
function renderKeuanganInfo(data, role) {
  const detailButton = document.getElementById('detailKeuangan');
  const detailLink = document.getElementById('keuanganDetailLink');
  if (detailLink) {
    detailLink.href = `#/${role === 'siswa' ? 'siswa_keuangan' : 'wali_keuangan'}`;
  }
  if (detailButton) {
    detailButton.onclick = () => {
      window.location.hash = `#/${role === 'siswa' ? 'siswa_keuangan' : 'wali_keuangan'}`;
    };
  }
  document.getElementById('saldoTersedia').textContent = formatRupiah(data.saldo || 0);  
  const totalTagihan = data.tagihan.reduce((sum, t) => sum + (t.sisa_tagihan || 0), 0);
  document.getElementById('totalTagihan').textContent = formatRupiah(totalTagihan);
  document.getElementById('statusKeuangan').textContent = data.status_terakhir || 'Aktif';
  const totalDibayar = data.tagihan.reduce((sum, t) => sum + (t.sudah_bayar || 0), 0);
  const totalSeharusnya = totalTagihan + totalDibayar;
  const progressPembayaran = totalSeharusnya > 0 ? (totalDibayar / totalSeharusnya) * 100 : 100;
  document.getElementById('progressPembayaranText').textContent = `${Math.round(progressPembayaran)}%`;
  document.getElementById('progressPembayaran').style.width = `${progressPembayaran}%`;
  const container = document.getElementById('daftarTagihan');
  const tagihanAktif = data.tagihan || [];
  if (tagihanAktif.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-gray-500 dark:text-gray-400">
        <i data-feather="check-circle" class="w-8 h-8 mx-auto mb-2 text-green-500"></i>
        <p>Tidak ada tagihan aktif</p>
      </div>
    `;
  } else {
    const html = tagihanAktif.slice(0, 3).map(tagihan => {
      const hariTerlambat = hitungKeterlambatanTagihan(tagihan.periode);
      const isTerlambat = hariTerlambat > 0;
      const statusColor = isTerlambat ? 'red' : 'orange';
      const namaTagihan = tagihan.mastertagihan?.nama_tagihan || tagihan.tipe_tagihan || 'Tagihan';    
      return `
        <div class="flex items-start p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div class="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-${statusColor}-500 mr-3"></div>
          <div class="flex-1">
            <div class="flex justify-between items-start flex-wrap">
              <span class="font-medium text-gray-800 dark:text-gray-200 mb-1">${namaTagihan}</span>
              <span class="text-${statusColor}-600 dark:text-${statusColor}-400 font-semibold text-sm">${formatRupiah(tagihan.sisa_tagihan || 0)}</span>
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">Periode: ${tagihan.periode || 'Tidak ditentukan'}</div>
            <div class="flex justify-between items-center mt-1">
              <div class="text-xs text-gray-500 dark:text-gray-500">Status: ${tagihan.status_bayar || 'Belum Bayar'}</div>
              ${isTerlambat ? 
                `<span class="text-xs px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-full">Terlambat ${hariTerlambat} hari</span>` : 
                `<span class="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded-full">Akan jatuh tempo</span>`
              }
            </div>
          </div>
        </div>
      `;
    }).join('');
    container.innerHTML = html;
  }
  feather.replace();
}
document.addEventListener('DOMContentLoaded', function() {
  const detailButton = document.getElementById('detailKeuangan');
  if (detailButton) {
    detailButton.addEventListener('click', function() {
      const user = JSON.parse(localStorage.getItem('user'));
      if (user) {
        window.location.hash = `#/${user.role === 'siswa' ? 'siswa_keuangan' : 'wali_keuangan'}`;
      }
    });
  }
});
function hitungKeterlambatanTagihan(periode) {
  try {
    const today = new Date();
    let tempoDate;
    if (periode && periode.match(/^\d{4}-\d{2}$/)) {
      const [year, month] = periode.split('-');
      tempoDate = new Date(year, month, 0);
    } else {
      tempoDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }
    const diffTime = today - tempoDate;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  } catch (error) {
    return 0;
  }
}
async function loadPelanggaranSiswa(user) {
  try {
    document.getElementById('studentWarningWidget').classList.remove('hidden');
    const { data: siswa, error } = await getSiswaDetail(user.user_no, user.id_sekolah);
    if (error || !siswa || siswa.length === 0) {
      console.error('Gagal mengambil data siswa', error);
      return;
    }
    const siswaData = siswa[0];
    const pelanggaran = await getPelanggaranLengkap(siswaData.id_siswa, user.id_sekolah);
    const totalPoin = pelanggaran.reduce((sum, p) => sum + (p.bobot_point || 0), 0);
    const jumlahPelanggaran = pelanggaran.length;
    const { data: settings, error: errorSettings } = await getSettingPeringatan(user.id_sekolah);
    let status = 'Aman';
    let level = 'success';
    let maxPoin = 100;
    if (settings && settings.length > 0) {
      settings.sort((a, b) => b.batas_point - a.batas_point);
      for (let setting of settings) {
        if (totalPoin >= setting.batas_point) {
          status = setting.nama_peringatan;
          maxPoin = Math.max(maxPoin, setting.batas_point * 1.5);
          break;
        }
      }
      if (totalPoin >= (maxPoin * 0.7)) {
        level = 'danger';
      } else if (totalPoin >= (maxPoin * 0.4)) {
        level = 'warning';
      } else {
        level = 'success';
      }
    }
    document.getElementById('totalPoin').textContent = totalPoin;
    document.getElementById('peringatanStatus').textContent = status;
    document.getElementById('jumlahPelanggaran').textContent = jumlahPelanggaran;
    window.pelanggaranData = {
      pelanggaran,
      totalPoin,
      status,
      level
    };
  } catch (error) {
    console.error('Error loading pelanggaran data:', error);
  }
  feather.replace();
}
function showDetailPelanggaran() {
  const modal = document.getElementById('detailPelanggaranModal');
  const content = document.getElementById('detailContent');
  const data = window.pelanggaranData;
  if (!data) return;
  let html = `
    <div class="mb-6 p-4 rounded-lg ${
      data.level === 'danger' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
      data.level === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' :
      'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
    }">
      <div class="grid grid-cols-2 gap-4 text-center">
        <div>
          <div class="text-2xl font-bold">${data.totalPoin}</div>
          <div class="text-sm">Total Poin</div>
        </div>
        <div>
          <div class="text-xl font-bold">${data.pelanggaran.length}</div>
          <div class="text-sm">Jumlah Pelanggaran</div>
        </div>
      </div>
    </div>
    
    <h4 class="font-semibold mb-3 text-gray-800 dark:text-gray-200">Riwayat Pelanggaran</h4>
    <div class="space-y-3">
  `;
  if (data.pelanggaran.length === 0) {
    html += `
      <div class="text-center py-8 text-gray-500 dark:text-gray-400">
        <i data-feather="check-circle" class="w-12 h-12 mx-auto mb-3 text-green-500"></i>
        <p>Tidak ada riwayat pelanggaran</p>
      </div>
    `;
  } else {
    html += data.pelanggaran.map(p => `
      <div class="border-l-4 border-red-500 pl-4 py-2">
        <div class="flex justify-between items-start">
          <div>
            <span class="font-medium text-gray-800 dark:text-gray-200">${p.jenis_pelanggaran}</span>
            <span class="ml-2 text-red-600 dark:text-red-400 font-semibold">${p.bobot_point} poin</span>
          </div>
          <span class="text-sm text-gray-500 dark:text-gray-400">${formatDate(p.tanggal)}</span>
        </div>
        <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">${p.keterangan || 'Tidak ada keterangan tambahan'}</div>
        <div class="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Dicatat oleh: ${p.guru_pencatat || 'Tidak diketahui'}
        </div>
      </div>
    `).join('');
  }
  html += `</div>`;
  content.innerHTML = html;
  modal.classList.remove('hidden');
  feather.replace();
}
function closeDetailModal() {
  document.getElementById('detailPelanggaranModal').classList.add('hidden');
}
function formatDate(dateString) {
  const options = { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return new Date(dateString).toLocaleDateString('id-ID', options);
}
function renderUserStatsChart(users) {
  const ctx = document.getElementById('userStatsChart').getContext('2d');
  const roleCounts = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {});
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(roleCounts),
      datasets: [{
        data: Object.values(roleCounts),
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(255, 99, 132, 0.8)',
          'rgba(255, 206, 86, 0.8)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            padding: 20,
            color: window.matchMedia('(prefers-color-scheme: dark)').matches ? '#fff' : '#333'
          }
        }
      },
      cutout: '65%'
    }
  });
}


async function renderRoleSpecificWidgets(user) {
  const container = document.getElementById('roleSpecificWidgets');
  if (!container) {
    console.warn('Role specific widgets container not found');
    return;
  }

  let html = '';
  if (user.role === 'guru') {
    const { data: jadwal } = await getJadwalGuru(user.user_no, user.id_sekolah, user.role);
    html += `
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
        <h2 class="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 flex items-center">
          <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-3">
            <i data-feather="calendar" class="w-5 h-5 text-blue-500"></i>
          </div>
          Jadwal Hari Ini
        </h2>
        ${jadwal && jadwal.length > 0 ? 
          jadwal.slice(0, 3).map(item => `
            <div class="mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p class="font-medium text-gray-800 dark:text-gray-200">${item.mapel} (${item.jurusan})</p>
              <p class="text-sm text-gray-600 dark:text-gray-300">${item.hari}: ${item.jam_mulai} - ${item.jam_selesai}</p>
            </div>
          `).join('') : 
          '<p class="text-gray-500 dark:text-gray-400 text-center py-4">Tidak ada jadwal hari ini</p>'}
      </div>
      
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
        <h2 class="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200 flex items-center">
          <div class="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center mr-3">
            <i data-feather="check-square" class="w-5 h-5 text-yellow-500"></i>
          </div>
          Tugas Perlu Dinilai
        </h2>
        <div class="flex items-center justify-center h-32">
          <p class="text-gray-500 dark:text-gray-400">3 tugas menunggu penilaian</p>
        </div>
      </div>
    `;
  } 
  
  container.innerHTML = html;
  feather.replace();
}
async function renderMiniCalendar() {
  const container = document.getElementById('miniCalendar');
  const today = new Date();
  const month = today.toLocaleString('default', { month: 'long' });
  
  let html = `
    <div class="text-center font-medium mb-2">${month} ${today.getFullYear()}</div>
    <div class="grid grid-cols-7 gap-1 text-center text-sm">
      <div class="font-medium">M</div><div class="font-medium">S</div>
      <div class="font-medium">S</div><div class="font-medium">R</div>
      <div class="font-medium">K</div><div class="font-medium">J</div>
      <div class="font-medium">S</div>
  `;
  const events = {
    '5': 'Deadline Tugas',
    '12': 'Rapat Orang Tua',
    '20': 'Ujian Akhir'
  };
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate();
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="py-1"></div>`;
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = day === today.getDate();
    const hasEvent = events[day];
    html += `
      <div class="py-1 rounded-full relative 
        ${isToday ? 'bg-blue-100 dark:bg-blue-800' : ''} 
        ${hasEvent ? 'text-blue-600 dark:text-blue-300 font-medium' : ''}">
        ${day}
        ${hasEvent ? '<div class="absolute bottom-0 w-1 h-1 bg-blue-500 rounded-full left-1/2 transform -translate-x-1/2"></div>' : ''}
      </div>
    `;
  }
  html += `</div>`;
  container.innerHTML = html;
}
function renderQuickActions(user) {
  const container = document.getElementById('quickActions');
  const quickActionsContainer = container?.closest('.quick-actions-container');
  
  if (!container) {
    console.warn('Quick actions container not found');
    return;
  }

  let actions = [];
  const colorMap = {
    guru: 'dark:bg-blue-900 dark:hover:bg-blue-800 bg-blue-100 hover:bg-blue-200',
    siswa: 'dark:bg-green-900 dark:hover:bg-green-800 bg-green-100 hover:bg-green-200',
    wali: 'dark:bg-purple-900 dark:hover:bg-purple-800 bg-purple-100 hover:bg-purple-200',
    admin: 'dark:bg-indigo-900 dark:hover:bg-indigo-800 bg-indigo-100 hover:bg-indigo-200',
    kepsek: 'dark:bg-amber-900 dark:hover:bg-amber-800 bg-amber-100 hover:bg-amber-200'
  };

  // Tambahkan role kepsek dan admin
  if (user.role === 'guru') {
    actions = [
      { icon: 'edit-3', label: 'Input Nilai', url: '#/inputnilai' },
      { icon: 'plus-circle', label: 'Buat Tugas', url: '#/tugas_list' },
      { icon: 'check-square', label: 'Absensi', url: '#/kehadiran_list' },
      { icon: 'book', label: 'Tambah Materi', url: '#/materi_list' }
    ];
  } else if (user.role === 'siswa') {
    actions = [
      { icon: 'upload', label: 'Kumpulkan Tugas', url: '#/tugassiswa_list' },
      { icon: 'book-open', label: 'Lihat Materi', url: '#/mapelsiswa_list' },
      { icon: 'calendar', label: 'Jadwal', url: '#/jadwalpelajaran_list' },
      { icon: 'credit-card', label: 'Keuangan', url: '#/siswa_keuangan' }
    ];
  } else if (user.role === 'wali') {
    actions = [
      { icon: 'dollar-sign', label: 'Bayar SPP', url: '#/wali_keuangan' },
      { icon: 'file-text', label: 'Lihat Rapor', url: '#/nilai' },
      { icon: 'user-check', label: 'Absensi', url: '#/absen' },
      { icon: 'message-square', label: 'Hubungi Guru', url: '#' }
    ];
  } else if (user.role === 'admin' || user.role === 'kepsek') {
    actions = [
      { icon: 'users', label: 'Kelola User', url: '#/user_list' },
      { icon: 'settings', label: 'Pengaturan', url: '#/settings' },
      { icon: 'bar-chart-2', label: 'Laporan', url: '#/laporan' },
      { icon: 'dollar-sign', label: 'Keuangan', url: '#/keuangan' }
    ];
  }

  if (actions.length === 0) {
    if (quickActionsContainer) {
      quickActionsContainer.classList.add('hidden');
    }
    return;
  }

  const html = actions.map(action => {
    const colorClass = colorMap[user.role] || colorMap.guru;
    const textColor = `text-${user.role}-600 dark:text-${user.role}-300`;
    
    return `
      <a href="${action.url}" class="p-4 ${colorClass} rounded-xl flex flex-col items-center justify-center text-center transition-all transform hover:scale-105 shadow-sm h-24">
        <i data-feather="${action.icon}" class="w-6 h-6 mb-2 ${textColor}"></i>
        <span class="text-sm font-medium">${action.label}</span>
      </a>
    `;
  }).join('');

  container.innerHTML = html;
  
  if (quickActionsContainer) {
    quickActionsContainer.classList.remove('hidden');
  }
  
  feather.replace();
}
function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR'
  }).format(amount);
}




async function loadNilaiSiswa(user) {
  try {
    document.getElementById('nilaiWidget').classList.remove('hidden');
    
    // Ambil data siswa terlebih dahulu untuk mendapatkan id_siswa
    const { data: siswa, error } = await getSiswaDetail(user.user_no, user.id_sekolah);
    if (error || !siswa || siswa.length === 0) {
      console.error('Gagal mengambil data siswa', error);
      return;
    }
    
    const siswaData = siswa[0];
    
    // Ambil data nilai menggunakan fungsi yang sama seperti di laporan_nilai.js
    const nilaiData = await getNilaiSiswaDashboard(siswaData.id_siswa, user.id_sekolah);
    
    if (!nilaiData || nilaiData.length === 0) {
      renderNilaiInfo({ nilai: [], rataRata: 0, tertinggi: 0, terendah: 0 });
      return;
    }
    
    renderNilaiInfo(nilaiData, user.role);
  } catch (error) {
    console.error('Error loading nilai data:', error);
    document.getElementById('nilaiWidget').innerHTML = `
      <div class="text-center py-4 text-gray-500 dark:text-gray-400">
        <i data-feather="alert-circle" class="w-8 h-8 mx-auto mb-2 text-yellow-500"></i>
        <p>Gagal memuat data nilai</p>
      </div>
    `;
    feather.replace();
  }
}

// Fungsi untuk mengambil data nilai siswa (mirip dengan yang di laporan_nilai.js)
async function getNilaiSiswaDashboard(id_siswa, id_sekolah) {
  try {
    const config = {
      baseTable: 'nilai',
      baseColumns: ['id_mapel', 'id_siswa', 'nilai'],
      joins: [
        {
          joinTable: 'mapel',
          columns2: ['nama_mapel', 'id_jurusan', 'semester'],
          joinBaseKey: 'id_mapel',
          joinForeignKey: 'id',
        },
        {
          joinTable: 'users',
          columns2: ['user_no', 'name'],
          joinBaseKey: 'id_siswa',
          joinForeignKey: 'id',
        },
      ],
      filters: [
        { 
          column: 'id_siswa', 
          value: id_siswa,
          operator: 'eq'
        }
      ],
    };

    const data = await fetchMultiJoinLaporan(config);
    
    if (!data || data.length === 0) {
      return { nilai: [], rataRata: 0, tertinggi: 0, terendah: 0 };
    }

    // Ambil data jurusan untuk mapping
    const { data: joinjurus, error: jurusanError } = await getJurusan(id_sekolah);
    const jurusanMap = {};
    joinjurus?.forEach(j => {
      jurusanMap[j.id] = j.nama_jurusan;
    });

    // Format data
    const dataFinal = data.map(({ jurusan, ...rest }) => {
      const jurusanId = jurusan || null;
      return {
        ...rest,
        jurusan: jurusanMap[jurusanId] || '',
      };
    });

    // Hitung statistik
    const nilaiNumerik = dataFinal
      .filter(item => !isNaN(parseFloat(item.nilai)))
      .map(item => parseFloat(item.nilai));
    
    const rataRata = nilaiNumerik.length > 0 
      ? (nilaiNumerik.reduce((a, b) => a + b, 0) / nilaiNumerik.length).toFixed(2)
      : 0;
    
    const tertinggi = nilaiNumerik.length > 0 
      ? Math.max(...nilaiNumerik).toFixed(2)
      : 0;
    
    const terendah = nilaiNumerik.length > 0 
      ? Math.min(...nilaiNumerik).toFixed(2)
      : 0;

    return {
      nilai: dataFinal,
      rataRata,
      tertinggi,
      terendah
    };
  } catch (err) {
    console.error("❌ Terjadi kesalahan saat mengambil data nilai:", err);
    return { nilai: [], rataRata: 0, tertinggi: 0, terendah: 0 };
  }
}

// Fungsi untuk merender informasi nilai
function renderNilaiInfo(data, role) {
  const detailButton = document.getElementById('detailNilai');
  
  if (detailButton) {
    detailButton.onclick = () => {
      window.location.hash = '#/laporan_nilai';
    };
  }

  // Update statistik
  document.getElementById('rataRataNilai').textContent = data.rataRata || '-';
  document.getElementById('nilaiTertinggi').textContent = data.tertinggi || '-';
  document.getElementById('nilaiTerendah').textContent = data.terendah || '-';

  // Progress bar (asumsikan skala 0-100)
  const progressPercentage = data.rataRata ? (data.rataRata / 100) * 100 : 0;
  document.getElementById('progressNilaiText').textContent = `${Math.round(progressPercentage)}%`;
  document.getElementById('progressNilai').style.width = `${progressPercentage}%`;

  // Warna progress bar berdasarkan nilai
  const progressBar = document.getElementById('progressNilai');
  if (data.rataRata >= 80) {
    progressBar.className = 'h-2 rounded-full transition-all duration-500 bg-green-500';
  } else if (data.rataRata >= 70) {
    progressBar.className = 'h-2 rounded-full transition-all duration-500 bg-yellow-500';
  } else {
    progressBar.className = 'h-2 rounded-full transition-all duration-500 bg-red-500';
  }

  // Render daftar nilai
  const container = document.getElementById('daftarNilai');
  const nilaiAktif = data.nilai || [];

  if (nilaiAktif.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-gray-500 dark:text-gray-400">
        <i data-feather="book-open" class="w-8 h-8 mx-auto mb-2 text-blue-500"></i>
        <p>Belum ada data nilai</p>
      </div>
    `;
  } else {
    const html = nilaiAktif.slice(0, 3).map(item => {
      const nilai = parseFloat(item.nilai || 0);
      let statusColor = 'blue';
      
      if (nilai >= 80) {
        statusColor = 'green';
      } else if (nilai >= 70) {
        statusColor = 'yellow';
      } else {
        statusColor = 'red';
      }
      
      return `
        <div class="flex items-start p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div class="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-${statusColor}-500 mr-3"></div>
          <div class="flex-1">
            <div class="flex justify-between items-start flex-wrap">
              <span class="font-medium text-gray-800 dark:text-gray-200 mb-1">${item.nama_mapel || 'Mata Pelajaran'}</span>
              <span class="text-${statusColor}-600 dark:text-${statusColor}-400 font-semibold text-sm">${nilai}</span>
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">Jurusan: ${item.jurusan || '-'}</div>
            <div class="flex justify-between items-center mt-1">
              <div class="text-xs text-gray-500 dark:text-gray-500">Semester: ${item.semester || '-'}</div>
              <span class="text-xs px-2 py-1 bg-${statusColor}-100 dark:bg-${statusColor}-900 text-${statusColor}-800 dark:text-${statusColor}-200 rounded-full">
                ${nilai >= 80 ? 'Sangat Baik' : nilai >= 70 ? 'Baik' : 'Perlu Perbaikan'}
              </span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    container.innerHTML = html;
  }
  
  feather.replace();
}


function updateCurrentDateTime() {
  const now = new Date();
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  
  const dateElement = document.getElementById('currentDate');
  const dayElement = document.getElementById('currentDay');
  
  if (dateElement && dayElement) {
    dateElement.textContent = now.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    dayElement.textContent = now.toLocaleDateString('id-ID', { weekday: 'long' });
  }
}