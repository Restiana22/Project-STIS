export async function initPage() {
  await loading();
  try{
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 1. Ambil data saldo siswa terlebih dahulu
    await loadSaldoSiswa();
    
    // 2. Ambil data tagihan (uang keluar)
    const orderby = '';
    const asc = 'true';
    const filters = [];
    filters.push({ 
      column: 'tipe', 
      operator: 'eq', 
      value: 'tagihan',
    });
    const config = {
      baseTable: 'mastertagihan',
      baseColumns: ['nama_tagihan','periode', 'nominal','isactive', 'id','tipe'],
      joins: [
        {
          joinTable: 'recordtagihan',
          columns2: ['user_id', 'sudah_bayar','sisa_tagihan', 'status_bayar', 'tanggal_bayar','id_tagihan'],
          joinBaseKey: 'id',
          joinForeignKey: 'id_tagihan',
        }, 
      ],
      orderby: orderby, 
      asc: asc,
      filters: filters,  
    };
    const data = await fetchMultiJoinLaporan (config);
    const dataFiltered = data.filter(item =>
      item.user_id === user.id
    );
    
    // 3. Ambil data pembayaran (uang masuk)
    const orderby1 = '';
    const asc1 = 'true';
    const filters1 = [];
    filters1.push({ 
      column: 'tipe', 
      operator: 'eq', 
      value: 'bayaran',
    });
    const config1 = {
      baseTable: 'mastertagihan',
      baseColumns: ['nama_tagihan','periode', 'nominal','isactive', 'id','tipe','keterangan'],
      joins: [
        {
          joinTable: 'recordpembayaran',
          columns2:['id_user', 'id_tunggakan','sudah_bayar','sisa_tunggakan', 'status_bayar','tanggal_bayar'],
          joinBaseKey: 'id',
          joinForeignKey: 'id_tunggakan',
        },
      ],
      orderby: orderby1, 
      asc: asc1,
      filters: filters1,  
    };
    const data1 = await fetchMultiJoinLaporan (config1);
    const dataFiltered1 = data1.filter(item =>
      item.id_user === user.id
    );
    
    // Render data pembayaran (uang masuk)
    const container1 = document.getElementById('tagihan-container')
    container1.innerHTML = ''
    if (dataFiltered1.length === 0) {
      container1.innerHTML = `
        <div class="text-center py-4 text-gray-500 dark:text-gray-400">
          <i data-feather="inbox" class="w-8 h-8 mx-auto mb-2"></i>
          <p>Tidak ada data uang masuk</p>
        </div>
      `;
    } else {
      dataFiltered1.forEach(item => {
        const card = `
          <div class="p-4 rounded border border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20 transition-all hover:shadow-md">
            <h3 class="font-semibold text-lg text-green-700 dark:text-green-300">${item.nama_tagihan}</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-300">Jumlah:</p>
                <p class="font-bold text-green-700 dark:text-green-300 text-lg">Rp ${item.nominal.toLocaleString("id-ID")}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-300">Tanggal Masuk:</p>
                <p class="font-medium">${item.tanggal_bayar ? item.tanggal_bayar.split("T")[0] : '-'}</p>
              </div>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-300 mt-2">Keterangan: ${item.keterangan || '-'}</p>
          </div>
        `
        container1.insertAdjacentHTML('beforeend', card)
      })
    }
    
    // Render data tagihan (uang keluar)
    const container = document.getElementById('pembayaran-container')
    container.innerHTML = ''
    if (dataFiltered.length === 0) {
      container.innerHTML = `
        <div class="text-center py-4 text-gray-500 dark:text-gray-400">
          <i data-feather="inbox" class="w-8 h-8 mx-auto mb-2"></i>
          <p>Tidak ada data uang keluar</p>
        </div>
      `;
    } else {
      dataFiltered.forEach(item => {
        const statusColor = item.status_bayar === 'Lunas' ? 'text-green-500' : 
                          item.status_bayar === 'Sebagian' ? 'text-yellow-500' : 'text-red-500';
        const statusIcon = item.status_bayar === 'Lunas' ? '✅' : 
                          item.status_bayar === 'Sebagian' ? '⏳' : '❌';
        const progressPercentage = item.nominal > 0 ? 
          Math.min((item.sudah_bayar / item.nominal) * 100, 100) : 0;
        
        const card = `
          <div class="p-4 rounded border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/20 transition-all hover:shadow-md">
            <div class="flex justify-between items-start mb-2">
              <h3 class="font-semibold text-lg text-red-700 dark:text-red-300">${item.nama_tagihan}</h3>
              <span class="font-semibold ${statusColor} flex items-center">
                ${statusIcon} ${item.status_bayar}
              </span>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-300">Total Tagihan:</p>
                <p class="font-bold text-red-700 dark:text-red-300 text-lg">Rp ${item.nominal.toLocaleString("id-ID")}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600 dark:text-gray-300">Sudah Dibayar:</p>
                <p class="font-medium text-green-600 dark:text-green-400">Rp ${item.sudah_bayar.toLocaleString("id-ID")}</p>
              </div>
            </div>
            
            <!-- Progress Bar -->
            <div class="mb-2">
              <div class="flex justify-between text-xs text-gray-600 dark:text-gray-300 mb-1">
                <span>Progress Pembayaran</span>
                <span>${Math.round(progressPercentage)}%</span>
              </div>
              <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div class="h-2 rounded-full transition-all duration-500 ${
                  progressPercentage === 100 ? 'bg-green-500' : 
                  progressPercentage > 50 ? 'bg-yellow-500' : 'bg-red-500'
                }" style="width: ${progressPercentage}%"></div>
              </div>
            </div>
            
            <p class="text-sm text-gray-600 dark:text-gray-300">Sisa: 
              <span class="font-semibold ${item.sisa_tagihan > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}">
                Rp ${item.sisa_tagihan.toLocaleString("id-ID")}
              </span>
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-300">Periode: ${item.periode || '-'}</p>
          </div>
        `
        container.insertAdjacentHTML('beforeend', card)
      })
    }
    
    feather.replace();
  } catch (err) {
    console.error("❌ Terjadi kesalahan saat mengambil data:", err);
  } finally {
    await loadingout();
  }
}

// Fungsi untuk memuat dan menampilkan saldo siswa
async function loadSaldoSiswa() {
  try {
    const { data: saldoData, error } = await getSaldoByUser(user.id, user.id_sekolah);
    
    const container = document.getElementById('saldo-container');
    container.innerHTML = '';
    
    if (error || !saldoData || saldoData.length === 0) {
      container.innerHTML = `
        <div class="text-center py-6">
          <i data-feather="credit-card" class="w-12 h-12 mx-auto mb-3 text-gray-400"></i>
          <p class="text-gray-500 dark:text-gray-400">Tidak ada data saldo</p>
        </div>
      `;
      return;
    }
    
    // Hitung total saldo
    const totalSaldo = saldoData.reduce((total, saldo) => {
      return total + parseFloat(saldo.saldo_sekarang || 0);
    }, 0);
    
    // Tampilkan kartu saldo utama
    const mainSaldoCard = `
      <div class="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="text-lg font-semibold">Total Saldo Tersedia</h3>
            <p class="text-blue-100 text-sm">Saldo dapat digunakan untuk pembayaran</p>
          </div>
          <i data-feather="dollar-sign" class="w-8 h-8 text-white opacity-80"></i>
        </div>
        <div class="text-3xl font-bold mb-2">Rp ${totalSaldo.toLocaleString("id-ID")}</div>
        <div class="flex justify-between items-center text-sm">
          <span class="bg-white/20 px-2 py-1 rounded-full">${saldoData.length} Jenis Saldo</span>
          <span class="flex items-center">
            <i data-feather="refresh-cw" class="w-3 h-3 mr-1"></i>
            Updated
          </span>
        </div>
      </div>
    `;
    
    container.insertAdjacentHTML('beforeend', mainSaldoCard);
    
    // Tampilkan detail per jenis saldo
    const detailSaldo = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        ${saldoData.map(saldo => `
          <div class="border border-blue-200 dark:border-blue-700 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
            <div class="flex justify-between items-start mb-2">
              <h4 class="font-semibold text-blue-700 dark:text-blue-300">${saldo.jenis_saldo || 'Saldo Utama'}</h4>
              <span class="text-xs px-2 py-1 rounded-full ${
                saldo.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
              }">
                ${saldo.status || 'active'}
              </span>
            </div>
            <p class="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
              Rp ${parseFloat(saldo.saldo_sekarang || 0).toLocaleString("id-ID")}
            </p>
            <p class="text-xs text-gray-600 dark:text-gray-400">
              ${saldo.keterangan || 'Saldo dapat digunakan untuk berbagai keperluan'}
            </p>
          </div>
        `).join('')}
      </div>
    `;
    
    container.insertAdjacentHTML('beforeend', detailSaldo);
    
  } catch (error) {
    console.error('Error loading saldo data:', error);
    const container = document.getElementById('saldo-container');
    container.innerHTML = `
      <div class="text-center py-6 text-red-500">
        <i data-feather="alert-circle" class="w-12 h-12 mx-auto mb-3"></i>
        <p>Gagal memuat data saldo</p>
      </div>
    `;
  }
}