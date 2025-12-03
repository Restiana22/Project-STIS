// laporan_pelanggaran.js - Dengan Server-side Pagination  
import { ServerSideLaporan } from './template_laporan_server_side.js';

let pelanggaranManager;

export async function initPage() {
    const config = {
        containerId: 'pelanggaran-list',
        title: 'Laporan Pelanggaran',
        icon: 'alert-triangle',
        enableStatistics: false,
        emptyStateTitle: 'Belum ada data pelanggaran',
        emptyStateMessage: 'Tidak ada pelanggaran yang tercatat.',
        emptyStateIcon: 'check-circle',
        pageSize: 50,
        
        filterableColumns: user.role !== 'siswa' ? [
            { key: 'siswa_no', label: 'No. Siswa', type: 'text' },
            { key: 'siswa_name', label: 'Nama Siswa', type: 'text' },
            { key: 'jenis_pelanggaran', label: 'Jenis Pelanggaran', type: 'text' },
            { key: 'bobot_point', label: 'Bobot Point', type: 'number' },
            { key: 'tanggal', label: 'Tanggal', type: 'text' }
        ] : null,

        columns: [
            {
                key: 'siswa_name',
                label: 'Nama Siswa',
                type: 'icon',
                iconName: 'user',
                subtitleKey: 'siswa_no'
            },
            {
                key: 'jenis_pelanggaran',
                label: 'Jenis Pelanggaran',
                render: (value) => `
                    <td class="px-6 py-4">
                        <div class="font-medium text-gray-900 dark:text-white">${value}</div>
                    </td>
                `
            },
            {
                key: 'bobot_point',
                label: 'Bobot Point',
                type: 'badge',
                render: (value) => {
                    let badgeClass = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
                    if (value >= 20) badgeClass = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
                    else if (value >= 10) badgeClass = 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
                    else if (value >= 5) badgeClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
                    
                    return `
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}">
                                ${value} Poin
                            </span>
                        </td>
                    `;
                }
            },
            {
                key: 'tanggal',
                label: 'Tanggal',
                render: (value) => `
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900 dark:text-white">${value}</div>
                    </td>
                `
            },
            {
                key: 'keterangan',
                label: 'Keterangan',
                render: (value) => `
                    <td class="px-6 py-4">
                        <div class="max-w-xs truncate" title="${value}">
                            ${value}
                        </div>
                    </td>
                `
            }
        ],

        dataFetcher: async (page, pageSize, filters) => {
            let query = supabase
                .from('pelanggaran_siswa')
                .select('*', { count: 'exact' })
                .eq('id_sekolah', user.id_sekolah)
                .order('tanggal', { ascending: false })
                .range((page - 1) * pageSize, page * pageSize - 1);

            // Role-based filtering
            if (user.role === 'siswa') {
                query = query.eq('siswa_id', user.id);
            } else if (user.role === 'wali') {
                const siswaNumbers = Array.isArray(user.siswa_no) ? user.siswa_no : [user.siswa_no];
                const { data: allSiswa } = await supabase
                    .from('users')
                    .select('id, user_no')
                    .eq('kode_sekolah', user.kode_sekolah)
                    .in('user_no', siswaNumbers);
                
                if (allSiswa) {
                    const siswaIds = allSiswa.map(siswa => siswa.id);
                    query = query.in('siswa_id', siswaIds);
                }
            }

            const { data, error, count } = await query;
            if (error) throw error;

            // Process joins
            const processedData = await processPelanggaranData(data);
            
            return {
                data: processedData,
                totalCount: count || 0
            };
        },

        onRowClick: (item) => {
            showPelanggaranDetail(item);
        }
    };

    pelanggaranManager = new ServerSideLaporan(config);
    await pelanggaranManager.init();
}

// Helper function untuk process data
async function processPelanggaranData(data) {
    const jenisPelanggaranIds = [...new Set(data.map(p => p.jenis_pelanggaran_id))];
    const siswaIds = [...new Set(data.map(p => p.siswa_id))];

    const [jenisData, siswaData] = await Promise.all([
        supabase.from('pelanggaran_jenis').select('*').in('id', jenisPelanggaranIds),
        supabase.from('users').select('id, name, user_no').in('id', siswaIds)
    ]);

    const jenisMap = {};
    jenisData.data?.forEach(j => {
        jenisMap[j.id] = j;
    });

    const siswaMap = {};
    siswaData.data?.forEach(s => {
        siswaMap[s.id] = s;
    });

    return data.map(item => {
        const jenis = jenisMap[item.jenis_pelanggaran_id];
        const siswa = siswaMap[item.siswa_id];
        
        return {
            id: item.id,
            siswa_no: siswa?.user_no || '-',
            siswa_name: siswa?.name || 'Unknown',
            jenis_pelanggaran: jenis?.nama_pelanggaran || '-',
            bobot_point: jenis?.bobot_point || 0,
            tanggal: formatTanggal(item.tanggal),
            keterangan: item.keterangan || '-',
            _raw: item
        };
    });
}

function formatTanggal(tanggal) {
    if (!tanggal) return '-';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(tanggal).toLocaleDateString('id-ID', options);
}

function showPelanggaranDetail(item) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Detail Pelanggaran</h3>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-gray-500 hover:text-gray-700">
                    <i data-feather="x" class="w-5 h-5"></i>
                </button>
            </div>
            
            <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">Informasi Pelanggaran</h4>
                        <div class="space-y-2">
                            <div class="flex justify-between">
                                <span class="text-gray-600 dark:text-gray-400">Jenis:</span>
                                <span class="font-medium">${item.jenis_pelanggaran}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600 dark:text-gray-400">Bobot Point:</span>
                                <span class="font-medium">${item.bobot_point}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">Tanggal</h4>
                    <p class="text-gray-600 dark:text-gray-400">${item.tanggal}</p>
                </div>

                <div>
                    <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">Keterangan</h4>
                    <p class="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                        ${item.keterangan}
                    </p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    feather.replace();
}