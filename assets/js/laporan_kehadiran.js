// laporan_kehadiran.js - Updated with ReusableTable and ReusableFilter
import { ServerSideLaporan } from './template_laporan_server_side.js';

let kehadiranManager;

export async function initPage() {
    const config = {
        containerId: 'kehadiran-list',
        title: 'Laporan Kehadiran',
        icon: 'clock',
        enableStatistics: false,
        emptyStateTitle: 'Belum ada data kehadiran',
        emptyStateMessage: 'Data kehadiran akan muncul setelah melakukan presensi.',
        emptyStateIcon: 'calendar',
        pageSize: 50,
        
        filterableColumns: [
            { key: 'user_no', label: 'No. User', type: 'text' },
            { key: 'name', label: 'Nama', type: 'text' },
            { key: 'role', label: 'Role', type: 'text' },
            { key: 'tanggal', label: 'Tanggal', type: 'text' },
        ],

        columns: [
            {
                key: 'name',
                label: 'Nama',
                type: 'icon',
                iconName: 'user',
                subtitleKey: 'user_no'
            },
            {
                key: 'role',
                label: 'Role',
                render: (value) => `
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            ${value || '-'}
                        </span>
                    </td>
                `
            },
            {
                key: 'tanggal',
                label: 'Tanggal',
                render: (value) => `
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900 dark:text-white">
                            ${formatTanggal(value)}
                        </div>
                    </td>
                `
            },
            {
                key: 'jam_masuk',
                label: 'Jam Masuk',
                type: 'time',
                timeType: 'start'
            },
            {
                key: 'jam_keluar',
                label: 'Jam Keluar',
                type: 'time', 
                timeType: 'end'
            },
        ],

        dataFetcher: async (page, pageSize, filters) => {
            // Gunakan fungsi yang sudah ada dengan pagination
            const config = {
                baseTable: 'kehadiran',
                baseColumns: ['id_user', 'foto', 'lokasi', 'jam_masuk', 'jam_keluar', 'tanggal'],
                joins: [
                    {
                        joinTable: 'users',
                        columns2: ['name', 'user_no', 'role'],
                        joinBaseKey: 'id_user',
                        joinForeignKey: 'id',
                    }
                ],
                filters: [
                    { column: 'id_sekolah', operator: 'eq', value: user.id_sekolah }
                ],
                page: page,
                pageSize: pageSize,
                orderby: 'tanggal',
                asc: false
            };

            // Role-based filtering
            let additionalFilters = [];
            if (user.role === 'siswa' || user.role === 'guru') {
                additionalFilters.push({ column: 'id_user', operator: 'eq', value: user.id });
            } else if (user.role === 'wali') {
                const siswaNumbers = Array.isArray(user.siswa_no) ? user.siswa_no : [user.siswa_no];
                const { data: allSiswa } = await supabase
                    .from('users')
                    .select('id, user_no')
                    .eq('kode_sekolah', user.kode_sekolah)
                    .in('user_no', siswaNumbers);
                
                if (allSiswa) {
                    const siswaIds = allSiswa.map(siswa => siswa.id);
                    additionalFilters.push({ column: 'id_user', operator: 'in', value: `(${siswaIds.join(',')})` });
                }
            }

            const result = await fetchMultiJoinLaporanPaginated({
                ...config,
                filters: [...config.filters, ...additionalFilters]
            });

            // Process data untuk display
            const processedData = result.data.map(item => {
                let fotoMasuk = '';
                let fotoKeluar = '';
                
                if (item.foto && item.foto.includes('***')) {
                    const [fotoMasukUrl, fotoKeluarUrl] = item.foto.split('***');
                    fotoMasuk = fotoMasukUrl;
                    fotoKeluar = fotoKeluarUrl;
                } else {
                    fotoMasuk = item.foto;
                }

                return {
                    id: item.id_user + '_' + item.tanggal,
                    user_no: item.user_no,
                    name: item.name,
                    role: item.role,
                    tanggal: item.tanggal,
                    jam_masuk: item.jam_masuk || '-',
                    jam_keluar: item.jam_keluar || '-',
                    foto_masuk: fotoMasuk,
                    foto_keluar: fotoKeluar,
                    lokasi: item.lokasi,
                    _raw: item
                };
            });

            return {
                data: processedData,
                totalCount: result.totalCount || 0
            };
        },

        onRowClick: (item) => {
            showKehadiranDetail(item);
        }
    };

    kehadiranManager = new ServerSideLaporan(config);
    await kehadiranManager.init();
}

// Fungsi-fungsi helper yang sudah ada - TETAP SAMA
function showKehadiranDetail(item) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Detail Kehadiran</h3>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-gray-500 hover:text-gray-700">
                    <i data-feather="x" class="w-5 h-5"></i>
                </button>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">Informasi User</h4>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Nama:</span>
                            <span class="font-medium">${item.name}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">No. User:</span>
                            <span class="font-medium">${item.user_no}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Role:</span>
                            <span class="font-medium">${item.role}</span>
                        </div>
                    </div>
                </div>
                
                <div>
                    <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">Informasi Kehadiran</h4>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Tanggal:</span>
                            <span class="font-medium">${formatTanggal(item.tanggal)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Jam Masuk:</span>
                            <span class="font-medium">${item.jam_masuk}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Jam Keluar:</span>
                            <span class="font-medium">${item.jam_keluar || '-'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                ${item.foto_masuk ? `
                    <div>
                        <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">Foto Masuk</h4>
                        <img src="${item.foto_masuk}" alt="Foto Masuk" 
                             class="w-full h-32 object-cover rounded-lg cursor-pointer"
                             onclick="openImageModal('${item.foto_masuk}')">
                    </div>
                ` : ''}
                
                ${item.foto_keluar ? `
                    <div>
                        <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">Foto Keluar</h4>
                        <img src="${item.foto_keluar}" alt="Foto Keluar" 
                             class="w-full h-32 object-cover rounded-lg cursor-pointer"
                             onclick="openImageModal('${item.foto_keluar}')">
                    </div>
                ` : ''}
            </div>

            <div class="mb-4">
                <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">Lokasi</h4>
                <div class="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    ${formatLokasiDisplay(item.lokasi)}
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    feather.replace();
}

// Global functions - TETAP SAMA
window.openImageModal = function(imageUrl) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="max-w-4xl max-h-full">
            <img src="${imageUrl}" alt="Foto" class="max-w-full max-h-full">
            <button class="absolute top-4 right-4 text-white text-3xl" onclick="this.parentElement.parentElement.remove()">&times;</button>
        </div>
    `;
    document.body.appendChild(modal);
};

function applyKehadiranFilters(filters) {
    if (filters.length === 0) {
        filteredDataKehadiran = [...dataKehadiran];
    } else {
        filteredDataKehadiran = dataKehadiran.filter(item => {
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
                    default:
                        return true;
                }
            });
        });
    }

    if (kehadiranTable) {
        kehadiranTable.updateData(filteredDataKehadiran);
    }
}

function generateKehadiranStatistics(data) {
    const totalRecords = data.length;
    const today = new Date().toISOString().split('T')[0];
    const presentToday = data.filter(item => item.tanggal === today && item.jam_masuk).length;
    const lateToday = data.filter(item => item.tanggal === today && item.jam_masuk > '07:00').length;

    return `
        <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-blue-100 text-sm">Total Kehadiran</p>
                    <p class="text-2xl font-bold">${totalRecords}</p>
                </div>
                <div class="bg-white/20 p-3 rounded-xl">
                    <i data-feather="users" class="w-6 h-6"></i>
                </div>
            </div>
        </div>
        
        <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-green-100 text-sm">Hadir Hari Ini</p>
                    <p class="text-2xl font-bold">${presentToday}</p>
                </div>
                <div class="bg-white/20 p-3 rounded-xl">
                    <i data-feather="check-circle" class="w-6 h-6"></i>
                </div>
            </div>
        </div>
        
        <div class="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl p-6 text-white shadow-lg">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-yellow-100 text-sm">Terlambat Hari Ini</p>
                    <p class="text-xl font-bold">${lateToday}</p>
                </div>
                <div class="bg-white/20 p-3 rounded-xl">
                    <i data-feather="clock" class="w-6 h-6"></i>
                </div>
            </div>
        </div>
    `;
}

function handleKehadiranClick(item) {
    showKehadiranDetail(item);
}


function formatTanggal(tanggal) {
    if (!tanggal) return '-';
    try {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(tanggal).toLocaleDateString('id-ID', options);
    } catch (e) {
        return tanggal; // Fallback ke value asli jika parsing gagal
    }
}

// Export fungsi agar bisa diakses oleh template
window.formatTanggal = formatTanggal;

// Global functions
window.downloadLaporanKehadiran = function() {
    if (kehadiranManager) {
        kehadiranManager.downloadData();
    } else {
        alert('Manager laporan belum diinisialisasi');
    }
}; 

// Pastikan manager bisa diakses globally untuk tombol download
window.kehadiranManager = kehadiranManager;