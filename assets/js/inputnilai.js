import * as XLSX from "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm";

let allSiswa = [];
let allMapel = [];
let allNilai = [];
let filteredMapel = []; // Mapel yang sudah difilter berdasarkan role
let allJurusan = [];

export function initPage() {
  initializeTabs();
  loadInitialData();
  setupEventListeners();
}

function initializeTabs() {
  const tabs = document.querySelectorAll('.tab-button');
  const contents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.id.replace('tab-', 'content-');
      
      // Update active tab
      tabs.forEach(t => t.classList.remove('active', 'border-blue-500', 'text-blue-600'));
      tab.classList.add('active', 'border-blue-500', 'text-blue-600');
      
      // Show target content
      contents.forEach(content => content.classList.add('hidden'));
      document.getElementById(target).classList.remove('hidden');
      
      // Load data based on tab
      switch(tab.id) {
        case 'tab-view':
          loadNilaiList();
          break;
        case 'tab-rekap':
          loadRekapData();
          break;
      }
    });
  });
}

async function loadInitialData() {
  await loading();
  try {
    // Load semua data sekaligus untuk manual joins
    await Promise.all([
      loadSiswaData(),
      loadJurusanData(),
      loadMapelData(),
      loadNilaiData()
    ]);
    
    // Filter mapel berdasarkan role user
    await filterMapelByUserRole();
    
    populateManualForm();
    populateRekapFilters(); // Ganti dari populateRekapFilters yang lama
  } catch (error) {
    console.error('Error loading initial data:', error);
    alert('Gagal memuat data awal');
  } finally {
    await loadingout();
  }
}

async function loadSiswaData() {
  const { data, error } = await getSiswa(user.kode_sekolah);
  if (!error) {
    allSiswa = data || [];
  }
}

async function loadJurusanData() {
  const { data, error } = await getJurusan(user.id_sekolah);
  if (!error) {
    allJurusan = data || [];
  }
}

async function loadMapelData() {
  const { data, error } = await getMapel(user.id_sekolah);
  if (!error) {
    allMapel = data || [];
  }
}

async function loadNilaiData() {
  const { data, error } = await supabase
    .from('nilai')
    .select('*')
    .eq('id_sekolah', user.id_sekolah);
  
  if (!error) {
    allNilai = data || [];
  }
}

// Fungsi baru: Filter mapel berdasarkan role user
async function filterMapelByUserRole() {
  if (user.role === 'guru') {
    // Untuk guru, hanya tampilkan mapel yang dia ajar
    const guruDetail = await getGuruDetail(user.user_no, user.id_sekolah);
    
    if (guruDetail.data && guruDetail.data.length > 0) {
      const guru = guruDetail.data[0];
      
      if (guru.guru_mapel) {
        const mapelIds = guru.guru_mapel.split(',').map(id => id.trim());
        
        // Filter mapel berdasarkan id mapel yang diajar
        filteredMapel = allMapel.filter(mapel => 
          mapelIds.includes(mapel.id.toString())
        );
      } else {
        filteredMapel = [];
        console.warn('Guru tidak memiliki mapel yang ditugaskan');
      }
    } else {
      filteredMapel = [];
      console.warn('Data guru tidak ditemukan');
    }
  } else {
    // Untuk admin/kurikulum/kepsek, tampilkan semua mapel
    filteredMapel = allMapel;
  }
}

function populateKelasFilter() {
  const jurusanSelect = document.getElementById('filter-jurusan');
  
  jurusanSelect.innerHTML = '<option value="">Semua Jurusan</option>';
  allJurusan.forEach(jurusan => {
    const option = document.createElement('option');
    option.value = jurusan.id;
    option.textContent = `${jurusan.kode_jurusan} - ${jurusan.nama_jurusan}`;
    jurusanSelect.appendChild(option);
  });
}

// Fungsi untuk filter siswa berdasarkan jurusan dan semester
function filterSiswaByKelas() {
  const jurusanId = document.getElementById('filter-jurusan').value;
  const semester = document.getElementById('filter-semester').value;
  const siswaSelect = document.getElementById('siswa-select');
  
  let filteredSiswa = allSiswa;
  
  // Filter berdasarkan role user terlebih dahulu
  if (user.role === 'guru') {
    filteredSiswa = filterSiswaByGuruMapel(filteredSiswa);
  } else if (user.role === 'wali') {
    filteredSiswa = filterSiswaByWali(filteredSiswa);
  }
  if (jurusanId) {
    filteredSiswa = filteredSiswa.filter(siswa => 
      siswa.siswa_detail && siswa.siswa_detail.jurusan == jurusanId
    );
  }
  
  // Filter berdasarkan semester
  if (semester) {
    filteredSiswa = filteredSiswa.filter(siswa => 
      siswa.siswa_detail && siswa.siswa_detail.semester == semester
    );
  }
  
  // Update dropdown siswa
  siswaSelect.innerHTML = '<option value="">Pilih Siswa</option>';
  filteredSiswa.forEach(siswa => {
    const option = document.createElement('option');
    option.value = siswa.id;
    option.textContent = `${siswa.user_no} - ${siswa.name}`;
    option.setAttribute('data-user-no', siswa.user_no);
    siswaSelect.appendChild(option);
  });
  
  // Tampilkan jumlah siswa yang difilter
  const filterInfo = document.getElementById('filter-info');
  if (filterInfo) {
    filterInfo.textContent = `(${filteredSiswa.length} siswa ditemukan)`;
  }
}

// Update fungsi populateManualForm untuk menambahkan filter kelas
function populateManualForm() {
  const siswaSelect = document.getElementById('siswa-select');
  const mapelSelect = document.getElementById('mapel-select');
  
  // Populate filter kelas
  populateKelasFilter();
  
  // Populate siswa dropdown - filter berdasarkan role
  siswaSelect.innerHTML = '<option value="">Pilih Siswa</option>';
  
  let siswaToShow = allSiswa;
  
  if (user.role === 'guru') {
    siswaToShow = filterSiswaByGuruMapel(allSiswa);
  } else if (user.role === 'wali') {
    siswaToShow = filterSiswaByWali(allSiswa);
  }
  
  siswaToShow.forEach(siswa => {
    const option = document.createElement('option');
    option.value = siswa.id;
    option.textContent = `${siswa.user_no} - ${siswa.name}`;
    option.setAttribute('data-user-no', siswa.user_no);
    siswaSelect.appendChild(option);
  });
  
  // Populate mapel dropdown dengan mapel yang sudah difilter
  mapelSelect.innerHTML = '<option value="">Pilih Mapel</option>';
  filteredMapel.forEach(mapel => {
    const jurusan = allJurusan.find(j => j.id == mapel.id_jurusan);
    const jurusanName = jurusan ? jurusan.nama_jurusan : 'Umum';
    
    const option = document.createElement('option');
    option.value = mapel.id;
    option.textContent = `${mapel.kode_mapel} - ${mapel.nama_mapel} (${jurusanName} - Sem ${mapel.semester})`;
    option.setAttribute('data-jurusan', mapel.id_jurusan);
    option.setAttribute('data-semester', mapel.semester);
    mapelSelect.appendChild(option);
  });
  const filterInfo = document.getElementById('filter-info');
  if (filterInfo) {
    let initialCount = allSiswa.length;
    if (user.role === 'guru') {
      initialCount = filterSiswaByGuruMapel(allSiswa).length;
    } else if (user.role === 'wali') {
      initialCount = filterSiswaByWali(allSiswa).length;
    }
    filterInfo.textContent = `(${initialCount} siswa ditemukan)`;
  }
}

function filterSiswaByGuruMapel(siswaList) {
  if (user.role !== 'guru') return siswaList;
  const jurusanIds = [...new Set(filteredMapel.map(mapel => mapel.id_jurusan))];
  const semesters = [...new Set(filteredMapel.map(mapel => mapel.semester))];
  return siswaList;
}

function filterSiswaByWali(siswaList) {
  if (user.role !== 'wali') return siswaList;
  
  const siswaNumbers = Array.isArray(user.siswa_no) ? user.siswa_no : [user.siswa_no];
  return siswaList.filter(siswa => siswaNumbers.includes(siswa.user_no));
}

function populateRekapFilters() {
  const jurusanSelect = document.getElementById('rekap-jurusan');
  const mapelSelect = document.getElementById('rekap-mapel');
  
  // Populate jurusan dropdown
  jurusanSelect.innerHTML = '<option value="">Pilih Jurusan</option>';
  allJurusan.forEach(jurusan => {
    const option = document.createElement('option');
    option.value = jurusan.id;
    option.textContent = `${jurusan.kode_jurusan} - ${jurusan.nama_jurusan}`;
    jurusanSelect.appendChild(option);
  });
  
  // Populate mapel dropdown dengan mapel yang sudah difilter
  mapelSelect.innerHTML = '<option value="">Pilih Mapel</option>';
  filteredMapel.forEach(mapel => {
    const jurusan = allJurusan.find(j => j.id == mapel.id_jurusan);
    const jurusanName = jurusan ? jurusan.nama_jurusan : 'Umum';
    
    const option = document.createElement('option');
    option.value = mapel.id;
    option.textContent = `${mapel.kode_mapel} - ${mapel.nama_mapel} (${jurusanName} - Sem ${mapel.semester})`;
    option.setAttribute('data-jurusan-id', mapel.id_jurusan);
    option.setAttribute('data-semester', mapel.semester);
    mapelSelect.appendChild(option);
  });
  
  // Update info
  updateRekapInfo();
}
function updateRekapInfo() {
  const jurusanId = document.getElementById('rekap-jurusan').value;
  const semester = document.getElementById('rekap-semester').value;
  const mapelId = document.getElementById('rekap-mapel').value;
  
  let infoText = "Pilih jurusan, semester, dan mata pelajaran untuk melihat rekap";
  
  if (jurusanId && semester && mapelId) {
    const jurusan = allJurusan.find(j => j.id == jurusanId);
    const mapel = filteredMapel.find(m => m.id == mapelId);
    
    if (jurusan && mapel) {
      // Hitung jumlah siswa di kelas tersebut
      const siswaCount = allSiswa.filter(siswa => 
        siswa.siswa_detail && 
        siswa.siswa_detail.jurusan == jurusanId && 
        siswa.siswa_detail.semester == semester
      ).length;
      
      infoText = `Kelas: ${jurusan.kode_jurusan} - Semester ${semester} | Mapel: ${mapel.nama_mapel} | ${siswaCount} siswa`;
    }
  } else if (jurusanId && semester) {
    const jurusan = allJurusan.find(j => j.id == jurusanId);
    const siswaCount = allSiswa.filter(siswa => 
      siswa.siswa_detail && 
      siswa.siswa_detail.jurusan == jurusanId && 
      siswa.siswa_detail.semester == semester
    ).length;
    
    infoText = `Kelas: ${jurusan.kode_jurusan} - Semester ${semester} | ${siswaCount} siswa | Pilih mata pelajaran`;
  } else if (jurusanId) {
    const jurusan = allJurusan.find(j => j.id == jurusanId);
    infoText = `Jurusan: ${jurusan.nama_jurusan} | Pilih semester dan mata pelajaran`;
  }
  
  document.getElementById('rekap-info').textContent = infoText;
}
// Fungsi helper untuk mendapatkan kombinasi jurusan-semester unik
function getUniqueJurusanSemester(siswaList) {
  const uniqueMap = new Map();
  siswaList.forEach(siswa => {
    console.log(siswa.user_no);
    if (siswa.siswa_detail) {
      const jurusanId = siswa.siswa_detail.jurusan;
      const semester = siswa.siswa_detail.semester;
      const jurusan = allJurusan.find(j => j.id == jurusanId);
      
      if (jurusan && semester) {
        const key = `${jurusanId}-${semester}`;
        const label = `${jurusan.kode_jurusan} - ${jurusan.nama_jurusan} - Sem ${semester}`;
        
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, {
            value: key,
            label: label,
            jurusan_id: jurusanId,
            jurusan_kode: jurusan.kode_jurusan,
            jurusan_nama: jurusan.nama_jurusan,
            semester: semester
          });
        }
      }
    }
  });
  
  return Array.from(uniqueMap.values()).sort((a, b) => a.label.localeCompare(b.label));
}
// Helper function untuk mendapatkan kelas dari data siswa
function getKelasFromSiswa(siswa) {
  // Implementasi: gabungkan jurusan + semester dari data siswa
  // Ini perlu disesuaikan dengan struktur data siswa yang sebenarnya
  if (siswa.siswa_detail) {
    return siswa.siswa_detail.kelas || `${siswa.siswa_detail.jurusan} - Sem ${siswa.siswa_detail.semester}`;
  }
  return `Siswa - ${siswa.user_no}`;
}
async function uploadExcel() {
  const fileInput = document.getElementById('excel-file');
  const file = fileInput.files[0];
  
  if (!file) {
    alert("Pilih file Excel terlebih dahulu.");
    return;
  }

  await loading();
  try {
    const data = await readExcel(file);
    const statusItems = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const row of data) {
      try {
        // Manual join: cari siswa berdasarkan user_no
        const siswa = allSiswa.find(s => s.user_no == row['Id_Siswa']);
        // Manual join: cari mapel berdasarkan kode_mapel - hanya dari filteredMapel
        const mapel = filteredMapel.find(m => m.kode_mapel == row['Kode_Mapel']);
        
        if (!siswa) {
          throw new Error(`Siswa dengan NIS ${row['Id_Siswa']} tidak ditemukan`);
        }
        
        if (!mapel) {
          throw new Error(`Mapel dengan kode ${row['Kode_Mapel']} tidak ditemukan atau tidak diizinkan`);
        }
        
        // Validasi tambahan untuk guru: pastikan mapel termasuk yang dia ajar
        if (user.role === 'guru' && !filteredMapel.some(m => m.id == mapel.id)) {
          throw new Error(`Anda tidak diizinkan menginput nilai untuk mapel ini`);
        }

        const record = {
          id_siswa: siswa.id,
          id_mapel: mapel.id,
          nilai: row['Nilai'],
          jenis_nilai: row['Jenis_Nilai'] || 'harian',
          semester: row['Semester'] || mapel.semester.split(',')[0] || '1',
          tahun_ajaran: row['Tahun_Ajaran'] || new Date().getFullYear().toString(),
          id_sekolah: user.id_sekolah,
          created_by: user.id
        };
        
        const { error } = await supabase.from('nilai').insert([record]);
        
        if (error) throw error;
        
        statusItems.push(`
          <li class="p-3 rounded bg-green-100 text-green-700 border-l-4 border-green-500">
            <div class="flex justify-between items-center">
              <span>${siswa.name} - ${mapel.nama_mapel}</span>
              <span class="font-semibold">✔️ Berhasil</span>
            </div>
            <div class="text-sm mt-1">Nilai: ${record.nilai} | Jenis: ${record.jenis_nilai}</div>
          </li>
        `);
        successCount++;
        
        // Update local data
        allNilai.push({ ...record, id: Date.now() });
      } catch (error) {
        statusItems.push(`
          <li class="p-3 rounded bg-red-100 text-red-700 border-l-4 border-red-500">
            <div class="flex justify-between items-center">
              <span>${row['Id_Siswa']} - ${row['Kode_Mapel']}</span>
              <span class="font-semibold">❌ Gagal</span>
            </div>
            <div class="text-sm mt-1">${error.message}</div>
          </li>
        `);
        errorCount++;
      }
    }
    
    // Summary
    if (data.length > 0) {
      statusItems.unshift(`
        <li class="p-3 rounded bg-blue-100 text-blue-700 border-l-4 border-blue-500">
          <div class="font-semibold">Summary: ${successCount} Berhasil, ${errorCount} Gagal</div>
        </li>
      `);
    }
    
    document.getElementById('status-list').innerHTML = statusItems.join('');
    
  } catch (error) {
    console.error('Error processing file:', error);
    document.getElementById('status-list').innerHTML = `
      <li class="p-3 rounded bg-red-100 text-red-700">Error: ${error.message}</li>
    `;
  } finally {
    await loadingout();
  }
}

async function saveManualNilai(e) {
  e.preventDefault();
  await loading();
  
  try {
    const siswaId = document.getElementById('siswa-select').value;
    const mapelId = document.getElementById('mapel-select').value;
    
    // Validasi untuk guru: pastikan mapel termasuk yang dia ajar
    if (user.role === 'guru') {
      const isMapelAllowed = filteredMapel.some(mapel => mapel.id == mapelId);
      if (!isMapelAllowed) {
        throw new Error('Anda tidak diizinkan menginput nilai untuk mapel ini');
      }
    }

    const formData = {
      id_siswa: siswaId,
      id_mapel: mapelId,
      nilai: document.getElementById('nilai-input').value,
      jenis_nilai: document.getElementById('jenis-nilai').value,
      semester: document.getElementById('semester').value,
      tahun_ajaran: document.getElementById('tahun-ajaran').value,
      id_sekolah: user.id_sekolah,
      created_by: user.id
    };

    const { error } = await supabase.from('nilai').insert([formData]);
    
    if (error) throw error;
    
    alert('Nilai berhasil disimpan!');
    
    // Update local data
    allNilai.push({ ...formData, id: Date.now() });
    
    resetManualForm();
    
  } catch (error) {
    console.error('Error saving nilai:', error);
    alert('Gagal menyimpan nilai: ' + error.message);
  } finally {
    await loadingout();
  }
}

// Update fungsi loadNilaiList untuk filter berdasarkan role
async function loadNilaiList() {
  await loading();
  try {
    // Reload data terbaru
    await loadNilaiData();
    
    const searchTerm = document.getElementById('search-nilai').value.toLowerCase();
    const container = document.getElementById('nilai-list');
    
    // Manual join: gabungkan data nilai dengan siswa dan mapel
    let nilaiWithDetails = allNilai.map(nilai => {
      const siswa = allSiswa.find(s => s.id === nilai.id_siswa);
      const mapel = allMapel.find(m => m.id == nilai.id_mapel);
      const jurusan = mapel ? allJurusan.find(j => j.id == mapel.id_jurusan) : null;
      
      return {
        ...nilai,
        siswa_name: siswa ? siswa.name : 'Tidak Diketahui',
        siswa_no: siswa ? siswa.user_no : 'Tidak Diketahui',
        mapel_name: mapel ? mapel.nama_mapel : 'Tidak Diketahui',
        mapel_kode: mapel ? mapel.kode_mapel : 'Tidak Diketahui',
        jurusan_name: jurusan ? jurusan.nama_jurusan : 'Tidak Diketahui',
        semester_mapel: mapel ? mapel.semester : 'Tidak Diketahui'
      };
    });
    
    // Filter berdasarkan role user
    if (user.role === 'guru') {
      // Untuk guru, hanya tampilkan nilai untuk mapel yang dia ajar
      const allowedMapelIds = filteredMapel.map(mapel => mapel.id);
      nilaiWithDetails = nilaiWithDetails.filter(item => 
        allowedMapelIds.includes(item.id_mapel)
      );
    } else if (user.role === 'siswa') {
      // Untuk siswa, hanya tampilkan nilai sendiri
      nilaiWithDetails = nilaiWithDetails.filter(item => 
        item.id_siswa == user.id
      );
    } else if (user.role === 'wali') {
      // Untuk wali, hanya tampilkan nilai siswa yang menjadi tanggungan
      const siswaNumbers = Array.isArray(user.siswa_no) ? user.siswa_no : [user.siswa_no];
      const siswaIds = allSiswa
        .filter(siswa => siswaNumbers.includes(siswa.user_no))
        .map(siswa => siswa.id);
      
      nilaiWithDetails = nilaiWithDetails.filter(item => 
        siswaIds.includes(item.id_siswa)
      );
    }
    
    // Filter berdasarkan search term
    const filteredNilai = searchTerm ? 
      nilaiWithDetails.filter(item => 
        item.siswa_name.toLowerCase().includes(searchTerm) ||
        item.mapel_name.toLowerCase().includes(searchTerm) ||
        item.siswa_no.toLowerCase().includes(searchTerm) ||
        item.jurusan_name.toLowerCase().includes(searchTerm)
      ) : nilaiWithDetails;
    
    renderNilaiList(filteredNilai, container);
    
  } catch (error) {
    console.error('Error loading nilai list:', error);
    document.getElementById('nilai-list').innerHTML = `
      <div class="text-red-500 text-center py-4">Gagal memuat data: ${error.message}</div>
    `;
  } finally {
    await loadingout();
  }
}

async function generateRekap() {
  const jurusanId = document.getElementById('rekap-jurusan').value;
  const semester = document.getElementById('rekap-semester').value;
  const mapelId = document.getElementById('rekap-mapel').value;
  
  if (!jurusanId || !semester || !mapelId) {
    alert('Pilih Jurusan, Semester, dan Mata Pelajaran terlebih dahulu');
    return;
  }
  
  // Validasi untuk guru: pastikan mapel termasuk yang dia ajar
  if (user.role === 'guru') {
    const isMapelAllowed = filteredMapel.some(mapel => mapel.id == mapelId);
    if (!isMapelAllowed) {
      alert('Anda tidak diizinkan melihat rekap untuk mapel ini');
      return;
    }
  }
  
  await loading();
  try {
    const mapel = allMapel.find(m => m.id == mapelId);
    const jurusan = allJurusan.find(j => j.id == jurusanId);
    
    if (!jurusan) {
      throw new Error('Jurusan tidak ditemukan');
    }
    
    // Filter siswa berdasarkan jurusan dan semester - SAMA DENGAN INPUT MANUAL
    const siswaInJurusanSemester = allSiswa.filter(siswa => {
      if (!siswa.siswa_detail) return false;
      return siswa.siswa_detail.jurusan == jurusanId && siswa.siswa_detail.semester == semester;
    });
    
    if (siswaInJurusanSemester.length === 0) {
      document.getElementById('rekap-container').innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-users-slash text-4xl mb-2"></i>
          <p>Tidak ada siswa ditemukan untuk ${jurusan.nama_jurusan} Semester ${semester}</p>
        </div>
      `;
      await loadingout();
      return;
    }
    
    // Filter nilai untuk siswa dalam jurusan-semester ini dan mapel yang dipilih
    const nilaiInJurusanSemester = allNilai.filter(nilai => 
      siswaInJurusanSemester.some(siswa => siswa.id == nilai.id_siswa) &&
      nilai.id_mapel == mapelId
    );
    
    // Gabungkan data untuk rekap
    const rekapData = siswaInJurusanSemester.map(siswa => {
      const nilaiSiswa = nilaiInJurusanSemester.filter(n => n.id_siswa == siswa.id);
      
      // Kelompokkan nilai berdasarkan jenis
      const nilaiByType = {
        harian: nilaiSiswa.find(n => n.jenis_nilai === 'harian')?.nilai || '-',
        tugas: nilaiSiswa.find(n => n.jenis_nilai === 'tugas')?.nilai || '-',
        uts: nilaiSiswa.find(n => n.jenis_nilai === 'uts')?.nilai || '-',
        uas: nilaiSiswa.find(n => n.jenis_nilai === 'uas')?.nilai || '-'
      };
      
      // Hitung rata-rata dari nilai yang ada (hanya yang numerik)
      const nilaiNumbers = nilaiSiswa
        .map(n => parseFloat(n.nilai))
        .filter(n => !isNaN(n));
      
      const rataRata = nilaiNumbers.length > 0 ? 
        nilaiNumbers.reduce((sum, n) => sum + n, 0) / nilaiNumbers.length : 0;
      
      return {
        siswa: siswa.name,
        user_no: siswa.user_no,
        nilai: nilaiSiswa,
        nilai_by_type: nilaiByType,
        rata_rata: rataRata.toFixed(2),
        total_nilai: nilaiSiswa.length
      };
    });
    
    renderRekapTable(rekapData, mapel?.nama_mapel || 'Tidak Diketahui', jurusan.nama_jurusan, semester);
    
  } catch (error) {
    console.error('Error generating rekap:', error);
    alert('Gagal generate rekap: ' + error.message);
  } finally {
    await loadingout();
  }
}
function setupEventListeners() {
  // Download template
  document.getElementById('download-btn').addEventListener('click', downloadTemplate);
  
  // Upload Excel
  document.getElementById('upload-btn').addEventListener('click', uploadExcel);
  
  // Manual form
  document.getElementById('manual-form').addEventListener('submit', saveManualNilai);
  document.getElementById('reset-form').addEventListener('click', resetManualForm);
  
  // Filter kelas
  document.getElementById('filter-siswa').addEventListener('click', filterSiswaByKelas);
  
  // View tab
  document.getElementById('search-nilai').addEventListener('input', filterNilaiList);
  document.getElementById('refresh-nilai').addEventListener('click', loadNilaiList);
  
  // Rekap tab
  document.getElementById('generate-rekap').addEventListener('click', generateRekap);
  document.getElementById('rekap-jurusan').addEventListener('change', updateRekapInfo);
  document.getElementById('rekap-semester').addEventListener('change', updateRekapInfo);
  document.getElementById('rekap-mapel').addEventListener('change', updateRekapInfo);
  document.getElementById('generate-rekap').addEventListener('click', generateRekap);
}

// Update fungsi resetManualForm untuk mereset filter juga
function resetManualForm() {
  document.getElementById('manual-form').reset();
  // Reset filter kelas
  document.getElementById('filter-jurusan').value = '';
  document.getElementById('filter-semester').value = '';
  // Tampilkan semua siswa sesuai role
  populateManualForm();
}

async function downloadTemplate() {
  await loading();
  try {
    const filePath = "template_upload_data_nilai.xlsx";
    const { data, error } = await supabase.storage.from('template').getPublicUrl(filePath);
    if (error) throw error;
    
    const link = document.createElement('a');
    link.href = data.publicUrl;
    link.download = filePath;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('❌ Gagal ambil URL:', error.message);
    alert('Gagal mendownload template');
  } finally {
    await loadingout();
  }
}

function renderNilaiList(data, container) {
  if (!data || data.length === 0) {
    container.innerHTML = '<div class="text-gray-500 text-center py-4">Tidak ada data nilai</div>';
    return;
  }

  const items = data.map(item => `
    <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
      <div class="flex justify-between items-start">
        <div class="flex-1">
          <h4 class="font-semibold text-gray-800 dark:text-white">${item.siswa_name} (${item.siswa_no})</h4>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            ${item.mapel_name} - ${item.mapel_kode}
          </p>
          <div class="flex gap-4 mt-2 text-xs text-gray-500">
            <span>Jenis: ${item.jenis_nilai}</span>
            <span>Semester: ${item.semester}</span>
            <span>Tahun: ${item.tahun_ajaran}</span>
            <span>${new Date(item.created_at).toLocaleDateString('id-ID')}</span>
          </div>
        </div>
        <div class="text-right">
          <span class="text-2xl font-bold ${getNilaiColor(item.nilai)}">${item.nilai}</span>
          <div class="mt-1">
            <button onclick="editNilai('${item.id}')" class="text-blue-600 hover:text-blue-800 text-sm mr-2">
              <i class="fas fa-edit"></i>
            </button>
            <button onclick="deleteNilai('${item.id}')" class="text-red-600 hover:text-red-800 text-sm">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
  
  container.innerHTML = items;
}

function filterNilaiList(e) {
  const searchTerm = e.target.value.toLowerCase();
  const container = document.getElementById('nilai-list');
  
  const filteredData = allNilai.map(nilai => {
    const siswa = allSiswa.find(s => s.id == nilai.id_siswa);
    const mapel = allMapel.find(m => m.id == nilai.id_mapel);
    
    return {
      ...nilai,
      siswa_name: siswa ? siswa.name : 'Tidak Diketahui',
      siswa_no: siswa ? siswa.user_no : 'Tidak Diketahui',
      mapel_name: mapel ? mapel.nama_mapel : 'Tidak Diketahui'
    };
  }).filter(item => 
    item.siswa_name.toLowerCase().includes(searchTerm) ||
    item.mapel_name.toLowerCase().includes(searchTerm) ||
    item.siswa_no.toLowerCase().includes(searchTerm)
  );
  
  renderNilaiList(filteredData, container);
}

function getNilaiColor(nilai) {
  const num = parseFloat(nilai);
  if (num >= 85) return 'text-green-600';
  if (num >= 70) return 'text-blue-600';
  if (num >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

async function loadRekapData() {
  // Reset filter rekap ketika tab dibuka
  document.getElementById('rekap-jurusan').value = '';
  document.getElementById('rekap-semester').value = '';
  document.getElementById('rekap-mapel').value = '';
  updateRekapInfo();
  
  document.getElementById('rekap-container').innerHTML = `
    <div class="text-gray-500 text-center py-8">
      <i class="fas fa-chart-bar text-4xl mb-2"></i>
      <p>Pilih jurusan, semester, dan mata pelajaran untuk melihat rekap nilai</p>
    </div>
  `;
}

function renderRekapTable(data, mapelName, jurusanName, semester) {
  const container = document.getElementById('rekap-container');
  
  // Hitung statistik
  const totalSiswa = data.length;
  const siswaWithNilai = data.filter(item => item.total_nilai > 0).length;
  const rataRataKelas = data.length > 0 ? 
    (data.reduce((sum, item) => sum + parseFloat(item.rata_rata || 0), 0) / data.length).toFixed(2) : 0;
  
  const tableHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden mb-6">
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900">
        <h4 class="font-semibold text-lg text-blue-800 dark:text-blue-200">
          Rekap Nilai ${mapelName}
        </h4>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 text-sm">
          <div>
            <span class="font-medium">Jurusan:</span> ${jurusanName}
          </div>
          <div>
            <span class="font-medium">Semester:</span> ${semester}
          </div>
          <div>
            <span class="font-medium">Statistik:</span> ${siswaWithNilai}/${totalSiswa} siswa memiliki nilai
          </div>
        </div>
      </div>
      
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">No</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Siswa</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">NIS</th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Harian</th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tugas</th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">UTS</th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">UAS</th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rata-rata</th>
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            ${data.map((item, index) => {
              const isLulus = parseFloat(item.rata_rata) >= 75;
              const statusClass = isLulus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
              const statusText = isLulus ? 'Lulus' : 'Tidak Lulus';
              
              return `
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">${index + 1}</td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">${item.siswa}</td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">${item.user_no}</td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-center ${getNilaiColorClass(item.nilai_by_type.harian)} font-medium">${item.nilai_by_type.harian}</td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-center ${getNilaiColorClass(item.nilai_by_type.tugas)} font-medium">${item.nilai_by_type.tugas}</td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-center ${getNilaiColorClass(item.nilai_by_type.uts)} font-medium">${item.nilai_by_type.uts}</td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-center ${getNilaiColorClass(item.nilai_by_type.uas)} font-medium">${item.nilai_by_type.uas}</td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-center font-bold ${getNilaiColorClass(item.rata_rata)}">${item.rata_rata}</td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}">
                      ${statusText}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <td colspan="7" class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">
                Rata-rata Kelas:
              </td>
              <td class="px-4 py-3 text-center font-bold text-lg ${getNilaiColorClass(rataRataKelas)}">
                ${rataRataKelas}
              </td>
              <td class="px-4 py-3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
    
    <div class="flex justify-between items-center">
      <div class="text-sm text-gray-600 dark:text-gray-400">
        Total: ${data.length} siswa | Rata-rata kelas: ${rataRataKelas}
      </div>
      <button onclick="exportRekapToExcel()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm">
        <i class="fas fa-file-excel mr-2"></i>Export Excel
      </button>
    </div>
  `;
  
  container.innerHTML = tableHTML;
}

async function exportRekapToExcel() {
  await loading();
  try {
    const jurusanId = document.getElementById('rekap-jurusan').value;
    const semester = document.getElementById('rekap-semester').value;
    const mapelId = document.getElementById('rekap-mapel').value;
    
    if (!jurusanId || !semester || !mapelId) {
      alert('Pilih Jurusan, Semester dan Mata Pelajaran terlebih dahulu');
      return;
    }
    
    // Parse dan ambil data yang sama seperti generateRekap
    const mapel = allMapel.find(m => m.id == mapelId);
    const jurusan = allJurusan.find(j => j.id == jurusanId);
    
    const siswaInJurusanSemester = allSiswa.filter(siswa => {
      if (!siswa.siswa_detail) return false;
      return siswa.siswa_detail.jurusan == jurusanId && siswa.siswa_detail.semester == semester;
    });
    
    const nilaiInJurusanSemester = allNilai.filter(nilai => 
      siswaInJurusanSemester.some(siswa => siswa.id == nilai.id_siswa) &&
      nilai.id_mapel == mapelId
    );
    
    const rekapData = siswaInJurusanSemester.map(siswa => {
      const nilaiSiswa = nilaiInJurusanSemester.filter(n => n.id_siswa == siswa.id);
      
      const nilaiByType = {
        harian: nilaiSiswa.find(n => n.jenis_nilai === 'harian')?.nilai || '-',
        tugas: nilaiSiswa.find(n => n.jenis_nilai === 'tugas')?.nilai || '-',
        uts: nilaiSiswa.find(n => n.jenis_nilai === 'uts')?.nilai || '-',
        uas: nilaiSiswa.find(n => n.jenis_nilai === 'uas')?.nilai || '-'
      };
      
      const nilaiNumbers = nilaiSiswa
        .map(n => parseFloat(n.nilai))
        .filter(n => !isNaN(n));
      
      const rataRata = nilaiNumbers.length > 0 ? 
        nilaiNumbers.reduce((sum, n) => sum + n, 0) / nilaiNumbers.length : 0;
      
      return {
        'No': '',
        'NIS': siswa.user_no,
        'Nama Siswa': siswa.name,
        'Harian': nilaiByType.harian,
        'Tugas': nilaiByType.tugas,
        'UTS': nilaiByType.uts,
        'UAS': nilaiByType.uas,
        'Rata-rata': rataRata.toFixed(2),
        'Status': rataRata >= 75 ? 'Lulus' : 'Tidak Lulus'
      };
    });
    
    // Add numbers
    rekapData.forEach((item, index) => {
      item.No = index + 1;
    });
    
    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(rekapData);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Nilai");
    
    // Generate filename
    const filename = `Rekap_Nilai_${mapel?.nama_mapel || 'Mapel'}_${jurusan?.kode_jurusan || 'Jurusan'}_Sem${semester}_${new Date().toISOString().slice(0,10)}.xlsx`;
    
    // Export to Excel
    XLSX.writeFile(wb, filename);
    
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    alert('Gagal export ke Excel: ' + error.message);
  } finally {
    await loadingout();
  }
}

// Tambahkan ke window object
window.exportRekapToExcel = exportRekapToExcel;
function getNilaiColorClass(nilai) {
  if (nilai === '-' || nilai === '' || nilai === null) return 'text-gray-500';
  const num = parseFloat(nilai);
  if (isNaN(num)) return 'text-gray-500';
  if (num >= 85) return 'text-green-600';
  if (num >= 75) return 'text-blue-600';
  if (num >= 65) return 'text-yellow-600';
  return 'text-red-600';
}

// Fungsi bantuan
function readExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);
        resolve(json);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

// Fungsi global untuk edit dan delete
window.editNilai = async function(id) {
  // Implementasi edit nilai
  alert('Fitur edit nilai akan segera tersedia');
};

window.deleteNilai = async function(id) {
  if (confirm('Apakah Anda yakin ingin menghapus nilai ini?')) {
    await loading();
    try {
      const { error } = await supabase.from('nilai').delete().eq('id', id);
      if (error) throw error;
      
      // Update local data
      allNilai = allNilai.filter(n => n.id !== id);
      loadNilaiList();
      
      alert('Nilai berhasil dihapus');
    } catch (error) {
      console.error('Error deleting nilai:', error);
      alert('Gagal menghapus nilai: ' + error.message);
    } finally {
      await loadingout();
    }
  }
};