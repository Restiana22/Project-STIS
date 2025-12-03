// laporan_keuangan.js - Updated dengan ServerSideLaporan template
import { ServerSideLaporan } from './template_laporan_server_side.js';

let keuanganManager;

export async function initPage() {
    const config = {
        containerId: 'keuangan-list',
        title: 'Laporan Keuangan',
        icon: 'dollar-sign',
        enableStatistics: true,
        emptyStateTitle: 'Belum ada data keuangan',
        emptyStateMessage: 'Data keuangan akan muncul setelah ada transaksi.',
        emptyStateIcon: 'credit-card',
        pageSize: 50,
        
        filterableColumns: [
            { key: 'user_no', label: 'No. User', type: 'text' },
            { key: 'user_name', label: 'Nama User', type: 'text' },
            { key: 'tipe', label: 'Tipe', type: 'text' },
            { key: 'nama_item', label: 'Nama Item', type: 'text' },
            { key: 'periode', label: 'Periode', type: 'text' },
            { key: 'nominal', label: 'Nominal', type: 'number' },
            { key: 'status', label: 'Status', type: 'text' },
            { key: 'tanggal', label: 'Tanggal', type: 'text' },
            { key: 'sumber_dana', label: 'Sumber Dana', type: 'text' }
        ],

        columns: [
            {
                key: 'user_name',
                label: 'User',
                type: 'icon',
                iconName: 'user',
                subtitleKey: 'user_no'
            },
            {
                key: 'tipe',
                label: 'Tipe',
                render: (value) => {
                    let badgeClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
                    let icon = 'dollar-sign';
                    
                    if (value === 'tagihan') {
                        badgeClass = 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
                        icon = 'file-text';
                    } else if (value === 'pembayaran') {
                        badgeClass = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
                        icon = 'credit-card';
                    } else if (value === 'transaksi') {
                        badgeClass = 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
                        icon = 'repeat';
                    }
                    
                    return `
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center space-x-2">
                                <i data-feather="${icon}" class="w-4 h-4"></i>
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}">
                                    ${value.charAt(0).toUpperCase() + value.slice(1)}
                                </span>
                            </div>
                        </td>
                    `;
                }
            },
            {
                key: 'nama_item',
                label: 'Item',
                render: (value) => `
                    <td class="px-6 py-4">
                        <div class="font-medium text-gray-900 dark:text-white">${value}</div>
                    </td>
                `
            },
            {
                key: 'periode',
                label: 'Periode',
                render: (value) => `
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-600 dark:text-gray-400">${value || '-'}</div>
                    </td>
                `
            },
            {
                key: 'nominal',
                label: 'Nominal',
                render: (value, item) => {
                    const isPemasukan = item.tipe === 'pembayaran' || item.jenis === 'pemasukan';
                    const textColor = isPemasukan ? 'text-green-600' : 'text-red-600';
                    const prefix = isPemasukan ? '+' : '-';
                    
                    return `
                        <td class="px-6 py-4 whitespace-nowrap">
                            <div class="flex items-center space-x-2">
                                <span class="${textColor} font-semibold">
                                    ${prefix} Rp ${formatRupiah(value)}
                                </span>
                            </div>
                        </td>
                    `;
                }
            },
            {
                key: 'status',
                label: 'Status',
                render: (value) => {
                    let badgeClass = 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
                    
                    if (value === 'Lunas') {
                        badgeClass = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
                    } else if (value === 'Belum Lunas') {
                        badgeClass = 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
                    } else if (value === 'Sebagian') {
                        badgeClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
                    } else if (value === 'Pending') {
                        badgeClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
                    }
                    
                    return `
                        <td class="px-6 py-4 whitespace-nowrap">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass}">
                                ${value}
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
                        <div class="text-sm text-gray-600 dark:text-gray-400">${formatTanggal(value)}</div>
                    </td>
                `
            },
            {
                key: 'sumber_dana',
                label: 'Sumber Dana',
                render: (value) => `
                    <td class="px-6 py-4">
                        <div class="text-sm text-gray-600 dark:text-gray-400">${value || '-'}</div>
                    </td>
                `
            }
        ],

        dataFetcher: async (page, pageSize, filters) => {
            try {
                // Load data dari semua sumber
                const [tagihanData, pembayaranData, transaksiData] = await Promise.all([
                    loadDataTagihan(),
                    loadDataPembayaran(),
                    loadDataTransaksi()
                ]);

                // Gabungkan semua data
                let allData = [
                    ...tagihanData,
                    ...pembayaranData,
                    ...transaksiData
                ].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

                // Apply filters jika ada
                if (filters && filters.length > 0) {
                    allData = allData.filter(item => {
                        return filters.every(filter => {
                            const rawValue = getNestedValue(item, filter.column);
                            const value = String(rawValue || '').toLowerCase().trim();
                            const filterValue = filter.value.toLowerCase().trim();

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
                                    const numValue = parseFloat(rawValue) || 0;
                                    const numFilter = parseFloat(filter.value) || 0;
                                    return numValue > numFilter;
                                case 'less':
                                    const numValue2 = parseFloat(rawValue) || 0;
                                    const numFilter2 = parseFloat(filter.value) || 0;
                                    return numValue2 < numFilter2;
                                default:
                                    return true;
                            }
                        });
                    });
                }

                // Pagination
                const startIndex = (page - 1) * pageSize;
                const endIndex = startIndex + pageSize;
                const paginatedData = allData.slice(startIndex, endIndex);

                return {
                    data: paginatedData,
                    totalCount: allData.length
                };

            } catch (error) {
                console.error('Error in dataFetcher:', error);
                return { data: [], totalCount: 0 };
            }
        },

        onRowClick: (item) => {
            showKeuanganDetail(item);
        }
    };

    keuanganManager = new ServerSideLaporan(config);
    await keuanganManager.init();
}

// Fungsi-fungsi helper yang sama seperti sebelumnya
async function loadDataTagihan() {
    try {
        const config = {
            baseTable: 'recordtagihan',
            baseColumns: ['id', 'user_id', 'id_tagihan', 'status_bayar', 'sudah_bayar', 'sisa_tagihan', 'tanggal_bayar'],
            joins: [
                {
                    joinTable: 'mastertagihan',
                    columns2: ['nama_tagihan', 'periode', 'nominal', 'tipe'],
                    joinBaseKey: 'id_tagihan',
                    joinForeignKey: 'id',
                },
                {
                    joinTable: 'users',
                    columns2: ['user_no', 'name'],
                    joinBaseKey: 'user_id',
                    joinForeignKey: 'id',
                },
            ],
            filters: [
                { column: 'id_sekolah', value: user.id_sekolah, operator: 'eq' }
            ]
        };

        const data = await fetchMultiJoinLaporan(config);
        
        // Apply role-based filtering
        let filteredData = data;
        if (user.role === 'siswa' || user.role === 'guru') {
            filteredData = await filterMultiColumn(data, user.id, ['user_id']);
        } else if (user.role === 'wali') {
            const siswaNumbers = Array.isArray(user.siswa_no) ? user.siswa_no : [user.siswa_no];
            const { data: allSiswa } = await supabase
                .from('users')
                .select('id, user_no')
                .eq('kode_sekolah', user.kode_sekolah)
                .in('user_no', siswaNumbers);
            
            if (allSiswa) {
                const siswaIds = allSiswa.map(siswa => siswa.id);
                filteredData = await filterMultiColumn(data, siswaIds, ['user_id']);
            }
        }

        return filteredData.map(item => ({
            id: `tagihan_${item.id}`,
            user_no: item.user_no,
            user_name: item.name,
            tipe: 'tagihan',
            nama_item: item.nama_tagihan,
            periode: item.periode,
            nominal: item.sisa_tagihan || item.nominal,
            status: item.status_bayar || 'Belum Lunas',
            tanggal: item.tanggal_bayar,
            sumber_dana: '-',
            keterangan: `Tagihan: ${item.nama_tagihan}`,
            _raw: item
        }));
    } catch (error) {
        console.error('Error loading tagihan:', error);
        return [];
    }
}

async function loadDataPembayaran() {
    try {
        const config = {
            baseTable: 'recordpembayaran',
            baseColumns: ['id', 'id_user', 'id_tunggakan', 'status_bayar', 'sudah_bayar', 'sisa_tunggakan', 'tanggal_bayar'],
            joins: [
                {
                    joinTable: 'mastertagihan',
                    columns2: ['nama_tagihan', 'periode', 'nominal', 'tipe'],
                    joinBaseKey: 'id_tunggakan',
                    joinForeignKey: 'id',
                },
                {
                    joinTable: 'users',
                    columns2: ['user_no', 'name'],
                    joinBaseKey: 'id_user',
                    joinForeignKey: 'id',
                },
            ],
            filters: [
                { column: 'id_sekolah', value: user.id_sekolah, operator: 'eq' }
            ]
        };

        const data = await fetchMultiJoinLaporan(config);
        
        // Apply role-based filtering
        let filteredData = data;
        if (user.role === 'siswa' || user.role === 'guru') {
            filteredData = await filterMultiColumn(data, user.id, ['id_user']);
        } else if (user.role === 'wali') {
            const siswaNumbers = Array.isArray(user.siswa_no) ? user.siswa_no : [user.siswa_no];
            const { data: allSiswa } = await supabase
                .from('users')
                .select('id, user_no')
                .eq('kode_sekolah', user.kode_sekolah)
                .in('user_no', siswaNumbers);
            
            if (allSiswa) {
                const siswaIds = allSiswa.map(siswa => siswa.id);
                filteredData = await filterMultiColumn(data, siswaIds, ['id_user']);
            }
        }

        return filteredData.map(item => ({
            id: `pembayaran_${item.id}`,
            user_no: item.user_no,
            user_name: item.name,
            tipe: 'pembayaran',
            nama_item: item.nama_tagihan,
            periode: item.periode,
            nominal: item.sudah_bayar || item.nominal,
            status: item.status_bayar || 'Lunas',
            tanggal: item.tanggal_bayar,
            sumber_dana: '-',
            keterangan: `Pembayaran: ${item.nama_tagihan}`,
            _raw: item
        }));
    } catch (error) {
        console.error('Error loading pembayaran:', error);
        return [];
    }
}

async function loadDataTransaksi() {
    try {
        const { data: transaksiData, error: trxError } = await supabase
            .from('transaksi')
            .select('*')
            .eq('id_sekolah', user.id_sekolah)
            .order('tanggal_bayar', { ascending: false });

        if (trxError) throw trxError;
        if (!transaksiData || transaksiData.length === 0) return [];

        // Kumpulkan id unik untuk fetch relasi
        const userIds = [...new Set(transaksiData.map(t => t.user_id).filter(Boolean))];
        const tipeIds = [...new Set(transaksiData.map(t => t.id_tipe).filter(Boolean))];
        const saldoIds = [...new Set(transaksiData.map(t => t.id_saldo).filter(Boolean))];
        const sumberIds = [...new Set(transaksiData.map(t => t.id_sumber_external).filter(Boolean))];

        // Fetch relasi secara paralel
        const promises = [
            userIds.length ? supabase.from('users').select('id, user_no, name').in('id', userIds) : Promise.resolve({ data: [], error: null }),
            tipeIds.length ? supabase.from('mastertagihan').select('id, nama_tagihan, tipe').in('id', tipeIds) : Promise.resolve({ data: [], error: null }),
            saldoIds.length ? supabase.from('saldo').select('id, jenis_saldo').in('id', saldoIds) : Promise.resolve({ data: [], error: null }),
            sumberIds.length ? supabase.from('sumber_dana_external').select('id, nama_sumber').in('id', sumberIds) : Promise.resolve({ data: [], error: null })
        ];

        const [usersRes, masterRes, saldoRes, sumberRes] = await Promise.all(promises);

        if (usersRes.error) throw usersRes.error;
        if (masterRes.error) throw masterRes.error;
        if (saldoRes.error) throw saldoRes.error;
        if (sumberRes.error) throw sumberRes.error;

        // Buat lookup map
        const usersMap = (usersRes.data || []).reduce((m, u) => (m[u.id] = u, m), {});
        const masterMap = (masterRes.data || []).reduce((m, mtag) => (m[mtag.id] = mtag, m), {});
        const saldoMap = (saldoRes.data || []).reduce((m, s) => (m[s.id] = s, m), {});
        const sumberMap = (sumberRes.data || []).reduce((m, s) => (m[s.id] = s, m), {});

        // Apply role-based filtering
        let filteredData = transaksiData;
        if (user.role === 'siswa' || user.role === 'guru') {
            filteredData = transaksiData.filter(item => item.user_id === user.id);
        } else if (user.role === 'wali') {
            const siswaNumbers = Array.isArray(user.siswa_no) ? user.siswa_no : [user.siswa_no];
            const { data: allSiswa } = await supabase
                .from('users')
                .select('id, user_no')
                .eq('kode_sekolah', user.kode_sekolah)
                .in('user_no', siswaNumbers);
            
            if (allSiswa) {
                const siswaIds = allSiswa.map(siswa => siswa.id);
                filteredData = transaksiData.filter(item => siswaIds.includes(item.user_id));
            }
        }

        return filteredData.map(item => {
            let sumberDana = '-';
            if (item.sumber_dana === 'saldo' && item.id_saldo && saldoMap[item.id_saldo]) {
                sumberDana = `Saldo ${saldoMap[item.id_saldo].jenis_saldo}`;
            } else if (item.sumber_dana === 'external' && item.id_sumber_external && sumberMap[item.id_sumber_external]) {
                sumberDana = sumberMap[item.id_sumber_external].nama_sumber;
            }

            return {
                id: `transaksi_${item.id}`,
                user_no: usersMap[item.user_id]?.user_no,
                user_name: usersMap[item.user_id]?.name,
                tipe: 'transaksi',
                nama_item: masterMap[item.id_tipe]?.nama_tagihan || item.catatan || 'Transaksi',
                periode: '-',
                nominal: item.nominal,
                status: 'Selesai',
                tanggal: item.tanggal_bayar,
                sumber_dana: sumberDana,
                jenis: item.tipe === 'tagihan' ? 'pengeluaran' : 'pemasukan',
                keterangan: item.catatan,
                _raw: item
            };
        });
    } catch (error) {
        console.error('Error loading transaksi:', error);
        return [];
    }
}

function showKeuanganDetail(item) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Detail Transaksi Keuangan</h3>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-gray-500 hover:text-gray-700">
                    <i data-feather="x" class="w-5 h-5"></i>
                </button>
            </div>
            
            <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">Informasi User</h4>
                        <div class="space-y-2">
                            <div class="flex justify-between">
                                <span class="text-gray-600 dark:text-gray-400">Nama:</span>
                                <span class="font-medium">${item.user_name}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600 dark:text-gray-400">No. User:</span>
                                <span class="font-medium">${item.user_no}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">Informasi Transaksi</h4>
                        <div class="space-y-2">
                            <div class="flex justify-between">
                                <span class="text-gray-600 dark:text-gray-400">Tipe:</span>
                                <span class="font-medium capitalize">${item.tipe}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600 dark:text-gray-400">Status:</span>
                                <span class="font-medium">${item.status}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">Detail Item</h4>
                        <div class="space-y-2">
                            <div class="flex justify-between">
                                <span class="text-gray-600 dark:text-gray-400">Nama Item:</span>
                                <span class="font-medium">${item.nama_item}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600 dark:text-gray-400">Periode:</span>
                                <span class="font-medium">${item.periode || '-'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">Informasi Keuangan</h4>
                        <div class="space-y-2">
                            <div class="flex justify-between">
                                <span class="text-gray-600 dark:text-gray-400">Nominal:</span>
                                <span class="font-medium text-lg ${getNominalColor(item)}">
                                    Rp ${formatRupiah(item.nominal)}
                                </span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600 dark:text-gray-400">Sumber Dana:</span>
                                <span class="font-medium">${item.sumber_dana || '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">Tanggal</h4>
                    <p class="text-gray-600 dark:text-gray-400">${formatTanggal(item.tanggal)}</p>
                </div>

                ${item.keterangan ? `
                    <div>
                        <h4 class="font-medium text-gray-700 dark:text-gray-300 mb-2">Keterangan</h4>
                        <p class="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                            ${item.keterangan}
                        </p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    feather.replace();
}

// Helper functions
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
}

function getNominalColor(item) {
    const isPemasukan = item.tipe === 'pembayaran' || item.jenis === 'pemasukan';
    return isPemasukan ? 'text-green-600' : 'text-red-600';
}

function formatRupiah(amount) {
    if (!amount) return '0';
    return parseFloat(amount).toLocaleString('id-ID');
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
window.showKeuanganDetail = showKeuanganDetail;