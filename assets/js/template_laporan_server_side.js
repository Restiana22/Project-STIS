// template_laporan_server_side.js - Template untuk semua laporan
import ReusableTable from './reusableTable.js';
import ReusableFilter from './reusableFilter.js';

export class ServerSideLaporan {
    constructor(config) {
        this.config = config;
        this.data = [];
        this.filteredData = [];
        this.table = null;
        this.currentFilters = [];
        this.allData = []; // Untuk menyimpan semua data yang sudah diload
    }

    async init() {
        try {
            await loading();
            
            // Inisialisasi Filter
            if (this.config.filterableColumns && this.config.filterableColumns.length > 0) {
                const filter = new ReusableFilter({
                    containerId: 'filterContainer',
                    filterableColumns: this.config.filterableColumns,
                    onFilterChange: (filters) => {
                        this.currentFilters = filters;
                        this.applyFilters();
                    }
                });
            }

            // Server-side data loader
            const serverSideLoader = async (page, pageSize) => {
                const result = await this.config.dataFetcher(page, pageSize, this.currentFilters);
                // Simpan data yang sudah diload untuk filtering client-side
                if (page === 1) {
                    this.allData = [...result.data];
                } else {
                    this.allData = [...this.allData, ...result.data];
                }
                return result;
            };

            // Inisialisasi Tabel
            this.table = new ReusableTable({
                containerId: this.config.containerId,
                title: this.config.title,
                subtitle: 'Scroll untuk memuat lebih banyak data',
                icon: this.config.icon,
                enableStatistics: this.config.enableStatistics || false,
                emptyStateTitle: this.config.emptyStateTitle,
                emptyStateMessage: this.config.emptyStateMessage,
                emptyStateIcon: this.config.emptyStateIcon,
                pageSize: this.config.pageSize || 50,
                serverSideLoader: serverSideLoader,
                columns: this.config.columns,
                onRowClick: this.config.onRowClick
            });

            await this.table.init();
            
            // Tambahkan tombol download
            this.addDownloadButton();
            
        } catch (err) {
            console.error(`❌ Error in ${this.config.title}:`, err);
        } finally {
            await loadingout();
        }
    }

    applyFilters() {
        if (this.currentFilters.length === 0) {
            this.filteredData = [...this.allData];
        } else {
            this.filteredData = this.allData.filter(item => {
                return this.currentFilters.every(filter => {
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

        // Update tabel dengan data yang difilter
        if (this.table) {
            this.table.updateData(this.filteredData);
        }
    }

    addDownloadButton() {
        const container = document.getElementById(this.config.containerId);
        if (!container) return;
        
        // Cari header section yang sudah ada
        const headerSection = container.querySelector('.bg-gradient-to-r');
        
        if (headerSection) {
            // Cari atau buat container untuk header content
            let headerContent = headerSection.querySelector('.flex.items-center.justify-between');
            
            if (!headerContent) {
                // Jika tidak ada, kita restrukturisasi header
                const existingContent = headerSection.innerHTML;
                headerSection.innerHTML = `
                    <div class="flex items-center justify-between w-full">
                        <div class="flex items-center space-x-3 flex-1">
                            ${existingContent}
                        </div>
                        <div class="flex-shrink-0 ml-4">
                            <button class="download-laporan-btn bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors backdrop-blur-sm">
                                <i data-feather="download" class="w-4 h-4"></i>
                                <span class="hidden sm:inline">Download</span>
                            </button>
                        </div>
                    </div>
                `;
            } else {
                // Jika sudah ada, tambahkan tombol di sebelah kanan
                const downloadContainer = document.createElement('div');
                downloadContainer.className = 'flex-shrink-0 ml-4';
                downloadContainer.innerHTML = `
                    <button class="download-laporan-btn bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors backdrop-blur-sm">
                        <i data-feather="download" class="w-4 h-4"></i>
                        <span class="hidden sm:inline">Download</span>
                    </button>
                `;
                headerContent.appendChild(downloadContainer);
            }
            
            // Tambahkan event listener
            headerSection.querySelector('.download-laporan-btn').addEventListener('click', () => {
                this.downloadData();
            });
            
            feather.replace();
        } else {
            // Fallback: tambahkan di atas tabel
            const downloadSection = document.createElement('div');
            downloadSection.className = 'flex justify-end mb-4';
            downloadSection.innerHTML = `
                <button class="download-laporan-btn bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
                    <i data-feather="download" class="w-4 h-4"></i>
                    <span>Download Laporan</span>
                </button>
            `;
            
            container.insertBefore(downloadSection, container.firstChild);
            
            downloadSection.querySelector('.download-laporan-btn').addEventListener('click', () => {
                this.downloadData();
            });
            
            feather.replace();
        }
    }

    downloadData() {
        const dataToDownload = this.filteredData.length > 0 ? this.filteredData : this.allData;
        
        if (!dataToDownload || dataToDownload.length === 0) {
            alert('Tidak ada data untuk diunduh');
            return;
        }

        console.log('Data untuk download:', dataToDownload);

        // Format data untuk download - sesuaikan dengan kolom yang ditampilkan
        const formattedData = this.formatDataForDownload(dataToDownload);

        // Simpan data ke window.laporanDataMap untuk diakses oleh downloadTableData
        if (!window.laporanDataMap) {
            window.laporanDataMap = {};
        }
        window.laporanDataMap[this.config.containerId] = formattedData;

        // Generate filename yang proper
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const filename = `${this.config.title.replace(/ /g, '_')}_${timestamp}`;
        
        // Panggil downloadTableData dengan containerId yang benar
        downloadTableData(this.config.containerId, 'csv', filename);
    }

    formatDataForDownload(data) {
    // Map data sesuai dengan kolom yang ditampilkan di tabel
        return data.map(item => {
            const formattedItem = {};
            
            this.config.columns.forEach(col => {
                let value = item[col.key] || '';
                
                // Format khusus untuk tipe data tertentu
                switch (col.key) {
                    case 'tanggal':
                        value = formatTanggal(value);
                        break;
                    case 'jam_masuk':
                    case 'jam_keluar':
                        // Biarkan sebagai string waktu
                        break;
                    case 'role':
                        // Tidak perlu formatting khusus
                        break;
                    default:
                        // Untuk tipe icon, ambil value langsung
                        if (col.type === 'icon') {
                            value = item[col.key] || '';
                        }
                }
                
                formattedItem[col.label] = value;
            });
            
            return formattedItem;
        });
    }
}