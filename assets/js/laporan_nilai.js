import ReusableTable from './reusableTable.js';
import ReusableFilter from './reusableFilter.js';

let dataNilai = [];
let filteredDataNilai = [];
let nilaiTable;

export async function initPage() {
    try {
        await loading();
        
        // [Kode fetch data tetap sama...]
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
            filters: [],
            limit: 10000
        };

        let data = await fetchMultiJoinLaporan(config);
        
        // [Kode role-based filtering tetap sama...]
        if (user.role === 'siswa') {
            data = await filterMultiColumn(data, user.id, ['id_siswa']);
        } else if (user.role === 'guru') {
            const getdetail = await getGuruDetail(user.user_no, user.id_sekolah);
            const semesterGuru = getdetail.data[0].guru_semester.split(',').map(Number);
            data = data.filter(item => 
                semesterGuru.includes(Number(item.semester))
            );
        } else if (user.role === 'wali') {
            const siswaNumbers = Array.isArray(user.siswa_no) ? user.siswa_no : [user.siswa_no];
            const { data: allSiswa } = await supabase
                .from('users')
                .select('id, user_no')
                .eq('kode_sekolah', user.kode_sekolah)
                .in('user_no', siswaNumbers);
            
            if (allSiswa) {
                const siswaIds = allSiswa.map(siswa => siswa.id);
                data = data.filter(item => 
                    siswaIds.includes(item.id_siswa)
                );
            }
        }

        // Process data for display
        const { data: joinjurus } = await getJurusan(user.id_sekolah);
        const jurusanMap = {};
        joinjurus?.forEach(j => {
            jurusanMap[j.id] = j.nama_jurusan;
        });

        dataNilai = data.map(item => {
            const jurusanId = item.jurusan || null;
            return {
                id: item.id_siswa + '_' + item.id_mapel,
                siswa_no: item.user_no,
                name: item.name,
                nama_mapel: item.nama_mapel || '-',
                jurusan: jurusanMap[jurusanId] || '',
                semester: item.semester || '-',
                nilai: item.nilai || '0',
                _raw: item
            };
        });

        filteredDataNilai = [...dataNilai];

        // Inisialisasi Filter
        const filter = new ReusableFilter({
            containerId: 'filterContainer',
            filterableColumns: [
                { key: 'siswa_no', label: 'No. Siswa', type: 'text' },
                { key: 'name', label: 'Nama Siswa', type: 'text' },
                { key: 'nama_mapel', label: 'Mata Pelajaran', type: 'text' },
                { key: 'jurusan', label: 'Jurusan', type: 'text' },
                { key: 'semester', label: 'Semester', type: 'text' },
                { key: 'nilai', label: 'Nilai', type: 'number' }
            ],
            onFilterChange: (filters) => {
                applyNilaiFilters(filters);
            }
        });

        // Inisialisasi Tabel
        nilaiTable = new ReusableTable({
            
            enablePagination: true,
            pageSize: 100,
            containerId: 'nilai-list',
            title: 'Laporan Nilai',
            subtitle: 'Data nilai siswa untuk semua mata pelajaran',
            icon: 'bar-chart-2',
            enableStatistics: true,
            emptyStateTitle: 'Belum ada data nilai',
            emptyStateMessage: 'Data nilai akan muncul setelah guru menginput nilai.',
            emptyStateIcon: 'file-text',
            columns: [
                {
                    key: 'siswa_no',
                    label: 'No. Siswa',
                    type: 'icon',
                    iconName: 'user',
                    subtitleKey: 'name'
                },
                {
                    key: 'nama_mapel',
                    label: 'Mata Pelajaran',
                    type: 'icon',
                    iconName: 'book'
                },
                {
                    key: 'jurusan',
                    label: 'Jurusan',
                    render: (value) => `
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                ${value || '-'}
                            </span>
                        </td>
                    `
                },
                {
                    key: 'semester',
                    label: 'Semester',
                    render: (value) => `
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Semester ${value || '-'}
                            </span>
                        </td>
                    `
                },
                {
                    key: 'nilai',
                    label: 'Nilai',
                    type: 'badge',
                    render: (value) => {
                        const numericValue = parseFloat(value) || 0;
                        let badgeClass = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
                        
                        if (numericValue >= 85) {
                            badgeClass = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
                        } else if (numericValue >= 75) {
                            badgeClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
                        } else if (numericValue >= 65) {
                            badgeClass = 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
                        }
                        
                        return `
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="flex items-center space-x-2">
                                    <div class="w-16 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                                        <div class="bg-blue-600 h-2 rounded-full" style="width: ${Math.min(numericValue, 100)}%"></div>
                                    </div>
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}">
                                        ${numericValue.toFixed(1)}
                                    </span>
                                </div>
                            </td>
                        `;
                    }
                }
            ],
            dataLoader: () => filteredDataNilai,
            statistics: (data) => generateNilaiStatistics(data),
            onRowClick: (item) => handleNilaiClick(item)
        });

        await nilaiTable.init();
        addDownloadButton();
        
    } catch (err) {
        console.error('❌ Error ambil data nilai:', err);
    } finally {
        await loadingout();
    }
}

function applyNilaiFilters(filters) {
    if (filters.length === 0) {
        filteredDataNilai = [...dataNilai];
    } else {
        filteredDataNilai = dataNilai.filter(item => {
            return filters.every(filter => {
                const value = String(item[filter.column] || '').toLowerCase();
                const filterValue = filter.value.toLowerCase();

                switch (filter.operator) {
                    case 'contains':
                        return value.includes(filterValue);
                    case 'equals':
                        return value === filterValue;
                    case 'startsWith':
                        return value.startsWith(filterValue);
                    case 'endsWith':
                        return value.endsWith(filterValue);
                    case 'greater':
                        return parseFloat(item[filter.column]) > parseFloat(filter.value);
                    case 'less':
                        return parseFloat(item[filter.column]) < parseFloat(filter.value);
                    default:
                        return true;
                }
            });
        });
    }

    if (nilaiTable) {
        nilaiTable.updateData(filteredDataNilai);
    }
}

function generateNilaiStatistics(data) {
  const totalNilai = data.length;
  const rataRata = data.reduce((sum, item) => sum + parseFloat(item.nilai || 0), 0) / totalNilai;
  const nilaiTertinggi = Math.max(...data.map(item => parseFloat(item.nilai || 0)));
  const mapelCount = [...new Set(data.map(item => item.nama_mapel))].length;

  return `
    <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-blue-100 text-sm">Total Nilai</p>
          <p class="text-2xl font-bold">${totalNilai}</p>
        </div>
        <div class="bg-white/20 p-3 rounded-xl">
          <i data-feather="bar-chart-2" class="w-6 h-6"></i>
        </div>
      </div>
    </div>
    
    <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-green-100 text-sm">Rata-rata</p>
          <p class="text-2xl font-bold">${rataRata.toFixed(1)}</p>
        </div>
        <div class="bg-white/20 p-3 rounded-xl">
          <i data-feather="trending-up" class="w-6 h-6"></i>
        </div>
      </div>
    </div>
    
    <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-purple-100 text-sm">Nilai Tertinggi</p>
          <p class="text-xl font-bold">${nilaiTertinggi.toFixed(1)}</p>
        </div>
        <div class="bg-white/20 p-3 rounded-xl">
          <i data-feather="award" class="w-6 h-6"></i>
        </div>
      </div>
    </div>
  `;
}

function handleNilaiClick(item) {
  // Bisa digunakan untuk melihat detail nilai
  console.log('Item nilai diklik:', item);
  
  // Contoh: Simpan di sessionStorage untuk halaman detail
  sessionStorage.setItem('selected_nilai_data', JSON.stringify(item._raw));
  
  // Atau tampilkan modal detail
  showNilaiDetail(item);
}

function showNilaiDetail(item) {
  // Implementasi modal detail nilai
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Detail Nilai</h3>
        <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-gray-500 hover:text-gray-700">
          <i data-feather="x" class="w-5 h-5"></i>
        </button>
      </div>
      <div class="space-y-3">
        <div class="flex justify-between">
          <span class="text-gray-600 dark:text-gray-400">Siswa:</span>
          <span class="font-medium">${item.name}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600 dark:text-gray-400">Mata Pelajaran:</span>
          <span class="font-medium">${item.nama_mapel}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600 dark:text-gray-400">Jurusan:</span>
          <span class="font-medium">${item.jurusan}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600 dark:text-gray-400">Semester:</span>
          <span class="font-medium">${item.semester}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-600 dark:text-gray-400">Nilai:</span>
          <span class="font-bold text-lg ${getNilaiColorClass(item.nilai)}">${item.nilai}</span>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  feather.replace();
}

function getNilaiColorClass(nilai) {
  const numericValue = parseFloat(nilai) || 0;
  if (numericValue >= 85) return 'text-green-600';
  if (numericValue >= 75) return 'text-yellow-600';
  if (numericValue >= 65) return 'text-orange-600';
  return 'text-red-600';
}

function addDownloadButton() {
  const container = document.getElementById('nilai-list');
  if (!container) return;
  
  const downloadSection = document.createElement('div');
  downloadSection.className = 'mt-6 flex justify-end';
  downloadSection.innerHTML = `
    <button onclick="downloadLaporanNilai()" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
      <i data-feather="download" class="w-4 h-4"></i>
      <span>Download Laporan</span>
    </button>
  `;
  
  container.appendChild(downloadSection);
  feather.replace();
}

// Download function
window.downloadLaporanNilai = function() {
  if (!dataNilai || dataNilai.length === 0) {
    alert('Tidak ada data untuk diunduh');
    return;
  }

  const dataToDownload = filteredDataNilai.length > 0 ? filteredDataNilai : dataNilai;
    
    const data = dataToDownload.map(item => ({
        'No. Siswa': item.siswa_no,
        'Nama Siswa': item.name,
        'Mata Pelajaran': item.nama_mapel,
        'Jurusan': item.jurusan,
        'Semester': item.semester,
        'Nilai': item.nilai
    }));

    downloadTableData(data, 'csv', 'laporan_nilai');
};