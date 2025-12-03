// reusableFilter.js
class ReusableFilter {
    constructor(config) {
        this.config = config;
        this.container = document.getElementById(config.containerId);
        this.filters = [];
        this.autoApply = config.autoApply !== false;
        this.init();
        
    }

    init() {
        this.render();
        this.setupEventHandlers();
    }

    render() {
        this.container.innerHTML = this.generateFilterHTML();
        feather.replace();
    }

    generateFilterHTML() {
        return `
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <div class="flex flex-col lg:flex-row lg:items-end lg:space-x-4 space-y-4 lg:space-y-0">
                    <!-- Kolom Filter -->
                    <div class="flex-1">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <i data-feather="filter" class="w-4 h-4 inline mr-1"></i>
                            Filter Berdasarkan
                        </label>
                        <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                            <select class="filter-column flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="">Pilih Kolom</option>
                                ${this.config.filterableColumns.map(col => `
                                    <option value="${col.key}">${col.label}</option>
                                `).join('')}
                            </select>
                            
                            <select class="filter-operator w-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="contains">Mengandung</option>
                                <option value="equals">Sama Dengan</option>
                                <option value="startsWith">Dimulai Dengan</option>
                                <option value="endsWith">Diakhiri Dengan</option>
                                <option value="greater">Lebih Besar</option>
                                <option value="less">Lebih Kecil</option>
                            </select>
                            
                            <input type="text" 
                                   class="filter-value flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                   placeholder="Masukkan nilai filter">
                        </div>
                    </div>

                    <!-- Tombol Aksi -->
                    <div class="flex space-x-2">
                        <button class="add-filter bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors">
                            <i data-feather="plus" class="w-4 h-4"></i>
                            <span>Tambah Filter</span>
                        </button>
                        
                        <button class="apply-filters bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors">
                            <i data-feather="check" class="w-4 h-4"></i>
                            <span>Terapkan</span>
                        </button>
                    </div>
                </div>

                <!-- Filter Aktif -->
                <div class="active-filters mt-4 space-y-2">
                    ${this.filters.map((filter, index) => `
                        <div class="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                            <div class="flex items-center space-x-2">
                                <span class="text-sm text-blue-700 dark:text-blue-300">
                                    <strong>${this.getColumnLabel(filter.column)}</strong> 
                                    ${this.getOperatorLabel(filter.operator)} 
                                    "<strong>${filter.value}</strong>"
                                </span>
                            </div>
                            <button class="remove-filter text-red-500 hover:text-red-700" data-index="${index}">
                                <i data-feather="x" class="w-4 h-4"></i>
                            </button>
                        </div>
                    `).join('')}
                </div>

                <!-- Quick Actions -->
                <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                        ${this.filters.length > 0 ? 
                            `${this.filters.length} filter aktif` : 
                            'Belum ada filter yang diterapkan'
                        }
                    </div>
                    <div class="flex space-x-2">
                        <button class="reset-filters text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center space-x-1 text-sm">
                            <i data-feather="refresh-cw" class="w-4 h-4"></i>
                            <span>Reset</span>
                        </button>
                        <button class="clear-all-filters text-red-500 hover:text-red-700 flex items-center space-x-1 text-sm">
                            <i data-feather="trash-2" class="w-4 h-4"></i>
                            <span>Hapus Semua</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getColumnLabel(key) {
        const col = this.config.filterableColumns.find(c => c.key === key);
        return col ? col.label : key;
    }

    getOperatorLabel(operator) {
        const operators = {
            'contains': 'mengandung',
            'equals': 'sama dengan',
            'startsWith': 'dimulai dengan',
            'endsWith': 'diakhiri dengan',
            'greater': 'lebih besar dari',
            'less': 'lebih kecil dari'
        };
        return operators[operator] || operator;
    }

    setupEventHandlers() {
        // Add Filter
        this.container.querySelector('.add-filter').addEventListener('click', () => {
            this.addFilter();
        });

        // Apply Filters
        this.container.querySelector('.apply-filters').addEventListener('click', () => {
            this.applyFilters();
        });

        // Remove Filter
        this.container.addEventListener('click', (e) => {
            if (e.target.closest('.remove-filter')) {
                const index = e.target.closest('.remove-filter').dataset.index;
                this.removeFilter(parseInt(index));
            }
        });

        // Reset Filters
        this.container.querySelector('.reset-filters').addEventListener('click', () => {
            this.resetFilters();
        });

        // Clear All Filters
        this.container.querySelector('.clear-all-filters').addEventListener('click', () => {
            this.clearAllFilters();
        });

        // Enter key untuk filter value
        this.container.querySelector('.filter-value').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addFilter();
            }
        });
    }

    addFilter() {
      const columnSelect = this.container.querySelector('.filter-column');
      const operatorSelect = this.container.querySelector('.filter-operator');
      const valueInput = this.container.querySelector('.filter-value');

      const column = columnSelect.value;
      const operator = operatorSelect.value;
      const value = valueInput.value.trim();

      if (!column || !value) {
          this.showNotification('Kolom dan nilai filter harus diisi', 'error');
          return;
      }

      this.filters.push({ column, operator, value });
      this.render();
      
      // Reset input value
      valueInput.value = '';
      
      this.showNotification('Filter berhasil ditambahkan', 'success');
      
      // Auto apply filters jika enabled
      if (this.autoApply) {
          this.applyFilters();
      }
  }

    removeFilter(index) {
        this.filters.splice(index, 1);
        this.render();
        this.showNotification('Filter berhasil dihapus', 'success');
    }

    resetFilters() {
        const columnSelect = this.container.querySelector('.filter-column');
        const operatorSelect = this.container.querySelector('.filter-operator');
        const valueInput = this.container.querySelector('.filter-value');

        columnSelect.value = '';
        operatorSelect.value = 'contains';
        valueInput.value = '';

        this.showNotification('Filter berhasil direset', 'success');
    }

    clearAllFilters() {
        this.filters = [];
        this.render();
        this.applyFilters();
        this.showNotification('Semua filter berhasil dihapus', 'success');
    }

    applyFilters() {
        if (this.config.onFilterChange) {
            this.config.onFilterChange(this.filters);
        }
    }

    getFilters() {
        return this.filters;
    }

    showNotification(message, type = 'info') {
        // Buat notifikasi sederhana
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'success' ? 'bg-green-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <i data-feather="${
                    type === 'error' ? 'alert-triangle' :
                    type === 'success' ? 'check-circle' : 'info'
                }" class="w-4 h-4"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        feather.replace();

        // Hapus notifikasi setelah 3 detik
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

export default ReusableFilter;