// Konfigurasi warna untuk berbagai tipe data
const tableColors = {
  'hari': {
    'Senin': { bg: 'bg-blue-50', text: 'text-blue-500', light: 'bg-blue-50', dark: 'bg-blue-900/20' },
    'Selasa': { bg: 'bg-green-50', text: 'text-green-500', light: 'bg-green-50', dark: 'bg-green-900/20' },
    'Rabu': { bg: 'bg-yellow-50', text: 'text-yellow-500', light: 'bg-yellow-50', dark: 'bg-yellow-900/20' },
    'Kamis': { bg: 'bg-purple-50', text: 'text-purple-500', light: 'bg-purple-50', dark: 'bg-purple-900/20' },
    'Jumat': { bg: 'bg-red-50', text: 'text-red-500', light: 'bg-red-50', dark: 'bg-red-900/20' },
    'Sabtu': { bg: 'bg-indigo-50', text: 'text-indigo-500', light: 'bg-indigo-50', dark: 'bg-indigo-900/20' },
    'Minggu': { bg: 'bg-pink-50', text: 'text-pink-500', light: 'bg-pink-50', dark: 'bg-pink-900/20' }
  },
  'status': {
    'active': { bg: 'bg-green-100', text: 'text-green-800', dark: 'bg-green-900 dark:text-green-200' },
    'inactive': { bg: 'bg-red-100', text: 'text-red-800', dark: 'bg-red-900 dark:text-red-200' },
    'pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', dark: 'bg-yellow-900 dark:text-yellow-200' }
  }
};

class ReusableTable {
  constructor(config) {
    this.config = config;
    this.data = [];
    this.currentSort = { column: '', direction: 'asc' };
    this.isMobile = window.innerWidth < 768;
    
    // Infinite scroll settings
    this.currentPage = 1;
    this.pageSize = config.pageSize || 50;
    this.totalItems = 0;
    this.isLoading = false;
    this.hasMore = true;
    
    // Cache untuk data yang sudah diload
    this.loadedPages = new Set();
  }

  async init() {
    await this.loadFirstPage();
    this.render();
    this.setupEventHandlers();
    this.setupInfiniteScroll();
  }


   async loadFirstPage() {
    if (this.config.serverSideLoader) {
      const result = await this.config.serverSideLoader(1, this.pageSize);
      this.data = result.data;
      this.totalItems = result.totalCount;
      this.hasMore = this.data.length === this.pageSize;
      this.loadedPages.add(1);
    } else if (this.config.dataLoader) {
      this.data = await this.config.dataLoader();
      this.totalItems = this.data.length;
    }
  }

  async loadMore() {
    if (this.isLoading || !this.hasMore) return;
    
    this.isLoading = true;
    this.showLoadingIndicator();

    try {
      const nextPage = this.currentPage + 1;
      
      if (this.config.serverSideLoader) {
        const result = await this.config.serverSideLoader(nextPage, this.pageSize);
        const newData = result.data;
        
        if (newData.length > 0) {
          this.data = [...this.data, ...newData];
          this.currentPage = nextPage;
          this.hasMore = newData.length === this.pageSize;
          this.loadedPages.add(nextPage);
          this.renderTableBody();
        } else {
          this.hasMore = false;
        }
      }
    } catch (error) {
      console.error('Error loading more data:', error);
    } finally {
      this.isLoading = false;
      this.hideLoadingIndicator();
    }
  }

  setupInfiniteScroll() {
    const container = document.getElementById(this.config.containerId);
    if (!container) return;

    let observer;
    
    if (typeof IntersectionObserver !== 'undefined') {
      // Gunakan Intersection Observer untuk modern browser
      observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && this.hasMore && !this.isLoading) {
            this.loadMore();
          }
        });
      });

      const sentinel = document.createElement('div');
      sentinel.id = `${this.config.containerId}-sentinel`;
      sentinel.className = 'h-10';
      container.appendChild(sentinel);
      
      observer.observe(sentinel);
    } else {
      // Fallback untuk browser lama - scroll event
      window.addEventListener('scroll', this.handleScroll.bind(this));
    }
  }

  handleScroll() {
    const sentinel = document.getElementById(`${this.config.containerId}-sentinel`);
    if (!sentinel) return;

    const rect = sentinel.getBoundingClientRect();
    if (rect.top <= window.innerHeight + 100 && this.hasMore && !this.isLoading) {
      this.loadMore();
    }
  }

  showLoadingIndicator() {
    let loader = document.getElementById(`${this.config.containerId}-loader`);
    if (!loader) {
      loader = document.createElement('div');
      loader.id = `${this.config.containerId}-loader`;
      loader.className = 'flex justify-center items-center p-4';
      loader.innerHTML = `
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span class="ml-2 text-gray-600">Memuat data...</span>
      `;
      
      const container = document.getElementById(this.config.containerId);
      if (container) {
        container.appendChild(loader);
      }
    } else {
      loader.classList.remove('hidden');
    }
  }

  hideLoadingIndicator() {
    const loader = document.getElementById(`${this.config.containerId}-loader`);
    if (loader) {
      loader.classList.add('hidden');
    }
  }


  async loadData() {
    if (this.config.dataLoader) {
        this.data = await this.config.dataLoader();
        this.totalItems = this.data.length;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    }
  }

  render() {
    const container = document.getElementById(this.config.containerId);
    if (!container) {
        console.error(`Container #${this.config.containerId} tidak ditemukan`);
        return;
    }

    container.innerHTML = this.generateHTML();
    this.renderTableBody();
    
    if (this.config.enableStatistics) {
        this.renderStatistics();
    }
    
    if (this.config.enablePagination) {
        this.renderPagination();
    }
    
    feather.replace();
  }

  generateHTML() {
        const isMobile = this.isMobile;
        const startItem = (this.currentPage - 1) * this.pageSize + 1;
        const endItem = Math.min(this.currentPage * this.pageSize, this.totalItems);
        
        return `
            <div class="space-y-4">
                <!-- Header Info - Mobile Optimized -->
                <div class="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-4 text-white shadow-sm">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="bg-white/20 p-2 rounded-lg">
                                <i data-feather="${this.config.icon || 'grid'}" class="w-5 h-5"></i>
                            </div>
                            <div>
                                <h2 class="text-lg font-bold">${this.config.title}</h2>
                                <p class="text-blue-100 text-xs">${this.config.subtitle}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-xl font-bold" id="totalItems">${this.totalItems}</div>
                            <div class="text-blue-100 text-xs">
                                ${this.config.enablePagination ? 
                                    `Item ${startItem}-${endItem} dari ${this.totalItems}` : 
                                    'Total Data'
                                }
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Table Container -->
                <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full ${isMobile ? 'text-sm' : ''}">
                            <thead>
                                <tr class="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-gray-800 border-b border-gray-200 dark:border-gray-600">
                                    ${this.config.columns.map(col => `
                                        <th class="px-4 py-3 text-left text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider sortable" data-column="${col.key}">
                                            <div class="flex items-center space-x-2">
                                                <i data-feather="${col.icon || 'circle'}" class="w-3 h-3"></i>
                                                <span class="truncate">${isMobile ? this.abbreviateLabel(col.label) : col.label}</span>
                                            </div>
                                        </th>
                                    `).join('')}
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 dark:divide-gray-700" id="${this.config.containerId}-tbody">
                                <!-- Data akan diisi oleh JavaScript -->
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Empty State -->
                    <div id="${this.config.containerId}-empty-state" class="hidden p-6 text-center">
                        <div class="max-w-md mx-auto">
                            <div class="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                                <i data-feather="${this.config.emptyStateIcon || 'inbox'}" class="w-6 h-6 text-blue-500"></i>
                            </div>
                            <h3 class="text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">${this.config.emptyStateTitle || 'Belum ada data'}</h3>
                            <p class="text-gray-500 dark:text-gray-400 text-xs mb-4">
                                ${this.config.emptyStateMessage || 'Data belum tersedia untuk ditampilkan.'}
                            </p>
                        </div>
                    </div>
                </div>

                ${this.config.enableStatistics ? `
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3" id="${this.config.containerId}-statistics">
                        <!-- Akan diisi oleh JavaScript -->
                    </div>
                ` : ''}

                ${this.config.enablePagination ? `
                    <div id="${this.config.containerId}-pagination">
                        <!-- Pagination akan diisi oleh JavaScript -->
                    </div>
                ` : ''}
            </div>
        `;
    }

  abbreviateLabel(label) {
    // Abbreviate long labels for mobile
    const abbreviations = {
      'Nama': 'Nama',
      'Tanggal': 'Tgl',
      'Jam Masuk': 'Masuk',
      'Jam Keluar': 'Keluar',
      'Jurusan': 'Jur',
      'Semester': 'Sem',
      'Mata Pelajaran': 'Mapel',
      'Nilai': 'Nilai',
      'Status': 'Status'
    };
    
    return abbreviations[label] || label.substring(0, 8);
  }
  renderTableBody() {
    const tbody = document.getElementById(`${this.config.containerId}-tbody`);
    const emptyState = document.getElementById(`${this.config.containerId}-empty-state`);
    const totalItems = document.getElementById('totalItems');

    if (!tbody) return;

    tbody.innerHTML = '';
    
    // Update counter untuk infinite scroll
    const displayedCount = this.data.length;
    const totalText = this.config.serverSideLoader 
      ? `${displayedCount}+ dari ${this.totalItems} data` 
      : `${displayedCount} data`;
    
    if (totalItems) {
      totalItems.textContent = totalText;
    }

    if (!Array.isArray(this.data) || this.data.length === 0) {
      tbody.style.display = 'none';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    tbody.style.display = 'table-row-group';
    if (emptyState) emptyState.classList.add('hidden');

    // Render hanya data yang sudah diload
    this.data.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.className = `group transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/10 ${
        index % 2 === 0 
          ? 'bg-white dark:bg-gray-800' 
          : 'bg-gray-50 dark:bg-gray-700/50'
      }`;

      if (this.config.onRowClick) {
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', () => this.config.onRowClick(item));
      }

      tr.innerHTML = this.config.columns.map(col => {
        const value = item[col.key] || '-';
        return this.renderCell(value, col, item);
      }).join('');

      tbody.appendChild(tr);
    });

    // Add sentinel untuk infinite scroll
    if (!document.getElementById(`${this.config.containerId}-sentinel`)) {
      const sentinel = document.createElement('tr');
      sentinel.id = `${this.config.containerId}-sentinel`;
      sentinel.innerHTML = `<td colspan="${this.config.columns.length}" class="p-4"></td>`;
      tbody.appendChild(sentinel);
    }
  }

  renderPagination() {
        const container = document.getElementById(`${this.config.containerId}-pagination`);
        if (!container || this.totalPages <= 1) return;

        const startItem = (this.currentPage - 1) * this.pageSize + 1;
        const endItem = Math.min(this.currentPage * this.pageSize, this.totalItems);

        container.innerHTML = `
              <div class="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div class="text-sm text-gray-700 dark:text-gray-300">
                    Menampilkan <span class="font-medium">${startItem}</span> - <span class="font-medium">${endItem}</span> 
                    dari <span class="font-medium">${this.totalItems}</span> data
                </div>
                
                <div class="flex items-center space-x-1">
                    <!-- First Page -->
                    <button class="pagination-btn first ${this.currentPage === 1 ? 'disabled' : ''}" 
                            ${this.currentPage === 1 ? 'disabled' : ''}>
                        <i data-feather="chevrons-left" class="w-4 h-4"></i>
                    </button>
                    
                    <!-- Previous Page -->
                    <button class="pagination-btn prev ${this.currentPage === 1 ? 'disabled' : ''}" 
                            ${this.currentPage === 1 ? 'disabled' : ''}>
                        <i data-feather="chevron-left" class="w-4 h-4"></i>
                    </button>
                    
                    <!-- Page Numbers -->
                    <div class="flex space-x-1 mx-2">
                        ${this.generatePageNumbers()}
                    </div>
                    
                    <!-- Next Page -->
                    <button class="pagination-btn next ${this.currentPage === this.totalPages ? 'disabled' : ''}" 
                            ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                        <i data-feather="chevron-right" class="w-4 h-4"></i>
                    </button>
                    
                    <!-- Last Page -->
                    <button class="pagination-btn last ${this.currentPage === this.totalPages ? 'disabled' : ''}" 
                            ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                        <i data-feather="chevrons-right" class="w-4 h-4"></i>
                    </button>
                </div>
                
                <!-- Page Size Selector -->
                <div class="flex items-center space-x-2">
                  <span class="text-sm text-gray-700 dark:text-gray-300">Per halaman:</span>
                  <select class="page-size-selector border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700">
                      <option value="50" ${this.pageSize === 50 ? 'selected' : ''}>50</option>
                      <option value="100" ${this.pageSize === 100 ? 'selected' : ''}>100</option>
                      <option value="200" ${this.pageSize === 200 ? 'selected' : ''}>200</option>
                      <option value="500" ${this.pageSize === 500 ? 'selected' : ''}>500</option>
                      <option value="1000" ${this.pageSize === 1000 ? 'selected' : ''}>1000</option>
                  </select>
                </div>
              </div>
        `;

        this.setupPaginationHandlers();
        feather.replace();
    }

    generatePageNumbers() {
        const pages = [];
        const maxVisiblePages = this.isMobile ? 3 : 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
        
        // Adjust if we're at the end
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // First page
        if (startPage > 1) {
            pages.push(`<button class="pagination-number" data-page="1">1</button>`);
            if (startPage > 2) {
                pages.push('<span class="px-2">...</span>');
            }
        }

        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            pages.push(`
                <button class="pagination-number ${this.currentPage === i ? 'active' : ''}" 
                        data-page="${i}">${i}</button>
            `);
        }

        // Last page
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                pages.push('<span class="px-2">...</span>');
            }
            pages.push(`<button class="pagination-number" data-page="${this.totalPages}">${this.totalPages}</button>`);
        }

        return pages.join('');
    }

    setupPaginationHandlers() {
        const container = document.getElementById(this.config.containerId);
        if (!container) return;

        // Page navigation
        container.querySelector('.pagination-btn.first')?.addEventListener('click', () => {
            if (this.currentPage > 1) this.goToPage(1);
        });

        container.querySelector('.pagination-btn.prev')?.addEventListener('click', () => {
            if (this.currentPage > 1) this.goToPage(this.currentPage - 1);
        });

        container.querySelector('.pagination-btn.next')?.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) this.goToPage(this.currentPage + 1);
        });

        container.querySelector('.pagination-btn.last')?.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) this.goToPage(this.totalPages);
        });

        // Page numbers
        container.querySelectorAll('.pagination-number').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.dataset.page);
                this.goToPage(page);
            });
        });

        // Page size selector
        const pageSizeSelector = container.querySelector('.page-size-selector');
        if (pageSizeSelector) {
            pageSizeSelector.addEventListener('change', (e) => {
                this.changePageSize(parseInt(e.target.value));
            });
        }
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        
        this.currentPage = page;
        this.renderTableBody();
        this.renderPagination();
        
        // Scroll to top of table
        const container = document.getElementById(this.config.containerId);
        if (container) {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    changePageSize(newSize) {
        this.pageSize = newSize;
        this.currentPage = 1;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        this.renderTableBody();
        this.renderPagination();
    }

    updateData(newData) {
        this.data = newData;
        this.totalItems = newData.length;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        this.currentPage = 1; // Reset to first page
        this.renderTableBody();
        
        if (this.config.enableStatistics) {
            this.renderStatistics();
        }
        
        if (this.config.enablePagination) {
            this.renderPagination();
        }
    }

  renderCell(value, column, item) {
    if (column.render) {
      return column.render(value, item);
    }

    // Mobile-optimized cell rendering
    const mobileClass = this.isMobile ? 'px-3 py-2' : 'px-4 py-3';
    
    switch (column.type) {
      case 'badge':
        const colorConfig = this.getBadgeColor(value);
        return `
          <td class="${mobileClass} whitespace-nowrap">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorConfig.bg} ${colorConfig.text}">
              ${this.isMobile ? this.abbreviateValue(value) : value}
            </span>
          </td>
        `;

      case 'time':
        return `
          <td class="${mobileClass} whitespace-nowrap">
            <div class="flex items-center space-x-1">
              <div class="w-1.5 h-1.5 ${column.timeType === 'end' ? 'bg-red-500' : 'bg-green-500'} rounded-full"></div>
              <span class="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
                ${value}
              </span>
            </div>
          </td>
        `;

      case 'icon':
        return `
          <td class="${mobileClass} whitespace-nowrap">
            <div class="flex items-center space-x-2">
              <div class="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <i data-feather="${column.iconName || 'circle'}" class="w-4 h-4 text-white"></i>
              </div>
              <div class="min-w-0 flex-1">
                <div class="font-semibold text-gray-900 dark:text-white text-sm truncate">${value}</div>
                ${item[column.subtitleKey] ? `<div class="text-xs text-gray-500 dark:text-gray-400 truncate">${item[column.subtitleKey]}</div>` : ''}
              </div>
            </div>
          </td>
        `;

      default:
        return `
          <td class="${mobileClass} whitespace-nowrap text-gray-700 dark:text-gray-200 text-sm">
            <div class="truncate max-w-[120px]">${value}</div>
          </td>
        `;
    }
  }

  abbreviateValue(value) {
    if (typeof value !== 'string') return value;
    return value.length > 10 ? value.substring(0, 8) + '...' : value;
  }

  getBadgeColor(value) {
    const colors = {
      'Hadir': { bg: 'bg-green-100', text: 'text-green-800' },
      'Terlambat': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      'Izin': { bg: 'bg-blue-100', text: 'text-blue-800' },
      'Sakit': { bg: 'bg-orange-100', text: 'text-orange-800' },
      'Alpa': { bg: 'bg-red-100', text: 'text-red-800' },
      'Lunas': { bg: 'bg-green-100', text: 'text-green-800' },
      'Belum Lunas': { bg: 'bg-red-100', text: 'text-red-800' }
    };
    
    return colors[value] || { bg: 'bg-gray-100', text: 'text-gray-800' };
  }

  setupEventHandlers() {
    this.setupSortHandlers();
    this.setupTouchHandlers();
  }

  setupTouchHandlers() {
    // Add touch-specific improvements
    if (this.isMobile) {
      document.querySelectorAll('.sortable').forEach(th => {
        th.classList.add('cursor-pointer', 'active:bg-blue-100');
      });
    }
  }

  setupResponsive() {
    // Handle window resize
    window.addEventListener('resize', () => {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth < 768;
      
      if (wasMobile !== this.isMobile) {
        this.render();
      }
    });
  }

  renderStatistics() {
    const container = document.getElementById(`${this.config.containerId}-statistics`);
    if (!container || !this.config.statistics) return;

    const stats = this.config.statistics(this.data);
    container.innerHTML = stats;
    feather.replace();
  }

  setupEventHandlers() {
    this.setupSortHandlers();
  }

  setupSortHandlers() {
    const thElements = document.querySelectorAll(`#${this.config.containerId} .sortable`);
    
    thElements.forEach(th => {
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => {
        const column = th.dataset.column;
        this.sortTableBy(column);
      });
    });
  }

  sortTableBy(column) {
    if (this.currentSort.column === column) {
      this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      this.currentSort.column = column;
      this.currentSort.direction = 'asc';
    }

    this.data.sort((a, b) => {
      let valueA = (a[column] ?? '').toString().toLowerCase();
      let valueB = (b[column] ?? '').toString().toLowerCase();

      // Handle waktu khusus
      if (column === 'jamstart' || column === 'jamend') {
        valueA = this.convertTimeToSortable(valueA);
        valueB = this.convertTimeToSortable(valueB);
      }

      if (valueA < valueB) return this.currentSort.direction === 'asc' ? -1 : 1;
      if (valueA > valueB) return this.currentSort.direction === 'asc' ? 1 : -1;
      return 0;
    });

    this.renderTableBody();
    this.updateSortIndicators();
  }

  // Di bagian updateSortIndicators - PERBAIKI
  updateSortIndicators() {
    const thElements = document.querySelectorAll(`#${this.config.containerId} .sortable`);
    
    thElements.forEach(th => {
      const columnName = th.dataset.column;
      const originalContent = th.innerHTML;
      
      // Reset semua header - HAPUS SEMUA PANAH TERLEBIH DAHULU
      th.classList.remove('text-blue-800', 'bg-blue-100');
      
      // Kembalikan ke konten original (tanpa panah)
      const cleanContent = originalContent.split('<span class="ml-1')[0];
      th.innerHTML = cleanContent;
      
      // Tambahkan panah hanya jika ini kolom yang aktif
      if (this.currentSort.column === columnName) {
        const arrow = this.currentSort.direction === 'asc' ? '↑' : '↓';
        th.innerHTML += `<span class="ml-1 text-blue-600">${arrow}</span>`;
        th.classList.add('text-blue-800', 'bg-blue-100', 'dark:bg-blue-900/30');
      }
    });
  }

  convertTimeToSortable(timeStr) {
    if (!timeStr || timeStr === '-') return '99:99';
    return timeStr.replace(':', '');
  }

  updateData(newData) {
    this.data = newData;
    this.renderTableBody();
    if (this.config.enableStatistics) {
      this.renderStatistics();
    }
  }
}

export default ReusableTable;