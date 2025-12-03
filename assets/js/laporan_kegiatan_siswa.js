// laporan_kegiatan_siswa.js - Dengan Server-side Pagination
import { ServerSideLaporan } from './template_laporan_server_side.js';

let kegiatanManager;

export async function initPage() {
    const config = {
        containerId: 'kegiatan-list',
        title: 'Laporan Kegiatan Siswa',
        icon: 'activity',
        enableStatistics: false,
        emptyStateTitle: 'Belum ada data kegiatan',
        emptyStateMessage: 'Data kegiatan akan muncul setelah siswa melaporkan aktivitas.',
        emptyStateIcon: 'calendar',
        pageSize: 50,
        
        filterableColumns: (() => {
            const columns = [
                { key: 'siswa_name', label: 'Nama Siswa', type: 'text' },
                { key: 'jenis_kegiatan', label: 'Jenis Kegiatan', type: 'text' },
                { key: 'keterangan', label: 'Keterangan', type: 'text' },
                { key: 'lokasi', label: 'Lokasi', type: 'text' }
            ];
            
            if (user.role === 'admin' || user.role === 'bk') {
                columns.unshift({ key: 'siswa_no', label: 'No. Siswa', type: 'text' });
            }
            
            return columns;
        })(),

        columns: [
            {
                key: 'siswa_name',
                label: 'Nama Siswa',
                type: 'icon',
                iconName: 'user',
                subtitleKey: 'siswa_no'
            },
            {
                key: 'jenis_kegiatan',
                label: 'Jenis Kegiatan',
                render: (value) => `
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            ${value || '-'}
                        </span>
                    </td>
                `
            },
            {
                key: 'keterangan',
                label: 'Keterangan',
                render: (value) => `
                    <td class="px-6 py-4">
                        <div class="max-w-xs truncate" title="${value}">
                            ${value || '-'}
                        </div>
                    </td>
                `
            },
            {
                key: 'foto',
                label: 'Bukti Foto',
                render: (value) => `
                    <td class="px-6 py-4 whitespace-nowrap">
                        ${value ? `
                            <img src="${value}" alt="Foto Kegiatan" 
                                 class="w-16 h-16 object-cover rounded-lg cursor-pointer border-2 border-gray-200 hover:border-blue-400 transition-all"
                                 onclick="openImageModal('${value}')">
                        ` : `
                            <span class="text-gray-400 italic">Tidak ada foto</span>
                        `}
                    </td>
                `
            },
            {
                key: 'lokasi',
                label: 'Lokasi',
                render: (value) => `
                    <td class="px-6 py-4">
                        <div class="max-w-xs">${value}</div>
                    </td>
                `
            },
            {
                key: 'waktu',
                label: 'Waktu',
                render: (value) => `
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-600 dark:text-gray-400">${value}</div>
                    </td>
                `
            }
        ],

        dataFetcher: async (page, pageSize, filters) => {
            // Query dengan pagination
            let query = supabase
                .from('kegiatan')
                .select('*', { count: 'exact' })
                .eq('id_sekolah', user.id_sekolah)
                .neq('jenis_kegiatan', 'Mengajar')
                .order('waktu', { ascending: false })
                .range((page - 1) * pageSize, page * pageSize - 1);

            // Role-based filtering
            if (user.role === 'siswa') {
                query = query.eq('user_id', user.id);
            }

            const { data, error, count } = await query;
            if (error) throw error;

            // Ambil data user untuk mapping
            const userIds = [...new Set(data.map(k => k.user_id))];
            const { data: usersData } = await supabase
                .from('users')
                .select('id, name, user_no')
                .in('id', userIds);

            const usersMap = {};
            usersData?.forEach(u => {
                usersMap[u.id] = u;
            });

            // Process data
            const processedData = data.map(kegiatan => {
                const userData = usersMap[kegiatan.user_id];
                return {
                    id: kegiatan.id,
                    siswa_name: userData?.name || 'Unknown',
                    siswa_no: userData?.user_no || '-',
                    jenis_kegiatan: kegiatan.jenis_kegiatan,
                    keterangan: kegiatan.keterangan || '-',
                    foto: kegiatan.foto,
                    lokasi: formatLokasiKoordinat(kegiatan.lokasi),
                    waktu: formatDateTime(kegiatan.waktu),
                    _raw: kegiatan
                };
            });

            return {
                data: processedData,
                totalCount: count || 0
            };
        },

        onRowClick: (item) => {
            showKegiatanDetail(item);
        }
    };

    kegiatanManager = new ServerSideLaporan(config);
    await kegiatanManager.init();
}

// Fungsi-fungsi helper tetap sama
function showKegiatanDetail(item) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Detail Kegiatan</h3>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-gray-500 hover:text-gray-700">
                    <i data-feather="x" class="w-5 h-5"></i>
                </button>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">Informasi Siswa</h4>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Nama:</span>
                            <span class="font-medium">${item.siswa_name}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">No. Siswa:</span>
                            <span class="font-medium">${item.siswa_no}</span>
                        </div>
                    </div>
                </div>
                
                <div>
                    <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">Informasi Kegiatan</h4>
                    <div class="space-y-2">
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Jenis:</span>
                            <span class="font-medium">${item.jenis_kegiatan}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Waktu:</span>
                            <span class="font-medium">${item.waktu}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mb-4">
                <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">Keterangan</h4>
                <p class="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    ${item.keterangan || 'Tidak ada keterangan'}
                </p>
            </div>

            <div class="mb-4">
                <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">Lokasi</h4>
                <p class="text-gray-600 dark:text-gray-400">${item.lokasi}</p>
            </div>

            ${item.foto ? `
                <div>
                    <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">Bukti Foto</h4>
                    <img src="${item.foto}" alt="Foto Kegiatan" class="w-full max-w-md mx-auto rounded-lg">
                </div>
            ` : ''}

            ${(user.role === 'admin' || user.role === 'bk') ? `
                <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <button onclick="deleteKegiatan(${item.id})" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
                        <i data-feather="trash-2" class="w-4 h-4"></i>
                        <span>Hapus Kegiatan</span>
                    </button>
                </div>
            ` : ''}
        </div>
    `;
    document.body.appendChild(modal);
    feather.replace();
}

function formatLokasiKoordinat(lokasi) {
    if (!lokasi) return 'Lokasi tidak tersedia';
    try {
        const [lat, lng] = lokasi.split(',').map(coord => parseFloat(coord.trim()));
        return `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
    } catch (e) {
        return lokasi;
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

// Global functions
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

window.deleteKegiatan = async function(id) {
    if (confirm('Apakah Anda yakin ingin menghapus kegiatan ini?')) {
        try {
            await loading();
            const { error } = await supabase
                .from('kegiatan')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            
            // Refresh page untuk update data
            window.location.reload();
            
        } catch (error) {
            console.error('Error deleting kegiatan:', error);
            alert('Gagal menghapus kegiatan');
        } finally {
            await loadingout();
        }
    }
};