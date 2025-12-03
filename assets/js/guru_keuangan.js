export async function initPage() {
  await loading();
  try{
    await new Promise(resolve => setTimeout(resolve, 200));
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
    const orderby1 = '';
    const asc1 = 'true';
    const filters1 = [];
    filters1.push({ 
      column: 'tipe', 
      operator: 'eq', 
      value: 'pembayaran',
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
    const container1 = document.getElementById('tagihan-container')
      container1.innerHTML = ''
      dataFiltered1.forEach(item => {
        const card = `
          <div class="p-4 rounded border border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900">
            <h3 class="font-semibold text-lg">${item.nama_tagihan}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300">Jumlah: 
              <span class="font-bold text-green-700 dark:text-green-300">Rp ${item.nominal.toLocaleString("id-ID")}</span></p>
            <p class="text-sm text-gray-600 dark:text-gray-300">Tanggal Masuk: ${item.tanggal_bayar.split("T")[0] || '-'}</p>
            <p class="text-sm text-gray-600 dark:text-gray-300">Keterangan: ${item.keterangan || '-'}</p>
          </div>
        `
        container1.insertAdjacentHTML('beforeend', card)
      });
      const container = document.getElementById('pembayaran-container')
        container.innerHTML = ''
        dataFiltered.forEach(item => {
          const statusColor = item.status_bayar === 'Lunas' ? 'text-green-500' : 'text-yellow-500'
          const statusIcon = item.status_bayar === 'Lunas' ? '✅' : '⏳'

          const card = `
            <div class="p-4 rounded border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900">
              <h3 class="font-semibold text-lg">${item.nama_tagihan}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-300">Jumlah: 
                <span class="font-bold text-red-700 dark:text-red-300">Rp ${item.nominal.toLocaleString("id-ID")}</span></p>
              <p class="text-sm text-gray-600 dark:text-gray-300">Tanggal Masuk: ${item.tanggal_bayar.split("T")[0] || '-'}</p>
              <p class="text-sm text-gray-600 dark:text-gray-300">Status: 
                <span class="font-semibold ${statusColor}">${statusIcon} ${item.status_bayar}</span></p>
            </div>
          `
          container.insertAdjacentHTML('beforeend', card)
        });
    } catch (err) {
      console.error("❌ Terjadi kesalahan saat mengambil data:", err);
    } finally {
      await loadingout();
    }
}