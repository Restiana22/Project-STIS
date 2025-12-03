export async function initPage() {
  await loading();
  const { data: allUsers, error } = await getAllUsersWithSekolah(user?.kode_sekolah || null);
  if (error) {
    console.error("Gagal ambil data user:", error);
    return;
  }
  try {
    const orderby = '';
    const asc = 'true';
    const filters = [];
    filters.push({ 
      column: 'tipe', 
      operator: 'eq', 
      value: 'bayaran',
    });
    const config = {
      baseTable: 'transaksi',
      baseColumns: ['tipe', 'id_tipe','id_user','nominal', 'tanggal_bayar'],
      joins: [
        {
          joinTable: 'mastertagihan',
          columns2: ['nama_tagihan', 'id','isactive','jatuh_tempo'],
          joinBaseKey: 'id_tipe',
          joinForeignKey: 'id',
        },
        {
          joinTable: 'recordpembayaran',
          columns2: ['status_bayar', 'sisa_tunggakan', 'sudah_bayar'],
          joinBaseKey: 'id_tipe',
          joinForeignKey: 'id_tunggakan',
        },
      ],
      orderby: orderby, 
      asc: asc,
      filters: filters,  
    };
    const data = await fetchMultiJoinLaporan (config);
    const dataupdate=[];
    const dataFiltered = data.filter(item =>
      item.isactive === 'true'
    );
    if (dataFiltered.length > 0) {
      for (const datanow of dataFiltered) {
        const data1 = {
          'Pembayaran': datanow.nama_tagihan,
          'Total Bayar':datanow.nominal,
          'Tanggal Mulai' : datanow.jatuh_tempo.split("T")[0],
          'Tanggal Bayar':datanow.tanggal_bayar.split("T")[0] || '-',
          'sisa_tagihan' : datanow.sisa_tagihan|| 0,
          'Status Bayar' : datanow.status_bayar,
        };
        dataupdate.push(data1);
      }
    }
    renderLaporanToTable(dataupdate, 'laporanContainer', true);
    let allDataFiltered = dataupdate;
    async function applyFilters() {
      await loading();
      await new Promise(resolve => setTimeout(resolve, 200));
      const searchTerm = document.getElementById('searchInput').value.toLowerCase();
      const selectedStatus = document.getElementById('statusFilter').value;
      const filtered = allDataFiltered.filter(row => {
        const matchSearch = searchTerm === '' || (
          (row['Pembayaran'] || '').toLowerCase().includes(searchTerm)
        );
        const matchStatus = selectedStatus === '' || (row['Status Bayar'] || '').toLowerCase() === selectedStatus.toLowerCase();
        return matchSearch && matchStatus;
      });
      const jumlahData = document.getElementById('jumlahData');
      if (jumlahData) {
        jumlahData.textContent = `Menampilkan ${filtered.length} data`;
      }
      renderLaporanToTable(filtered, 'laporanContainer', true);
      await loadingout();
    }
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
  } catch (err) {
    console.error("❌ Terjadi kesalahan saat mengambil data:", err);
  } finally {
    await loadingout();
  }
}
