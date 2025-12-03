export async function initPage() {
    await loading();
    try {
      const idtagihan = JSON.parse(localStorage.getItem('selected_tagihan_id'));
      const orderby = '';
      const asc = 'true';
      const filters = [];
      filters.push({ 
        column: 'id_tagihan', 
        operator: 'eq', 
        value: idtagihan,
      });
      const config = {
        baseTable: 'recordtagihan',
        baseColumns: ['user_id', 'sudah_bayar','sisa_tagihan', 'status_bayar', 'tipe_tagihan','id_tagihan'],
        joins: [
          {
            joinTable: 'mastertagihan',
            columns2: ['nama_tagihan', 'periode', 'nominal','isactive', 'keterangan', 'id','created_at'],
            joinBaseKey: 'id_tagihan',
            joinForeignKey: 'id',
          },
          {
            joinTable: 'users',
            columns2: ['name', 'user_no', 'role'],
            joinBaseKey: 'user_id',
            joinForeignKey: 'id',
          },
        ],
        orderby: orderby, 
        asc: asc,
        filters: filters,  
      };
      const data = await fetchMultiJoinLaporan (config);
      const dataupdate=[];
      if (data.length > 0) {
        for (const datanow of data) {
          const data1 = {
            'User No': datanow.user_no,
            'Nama' : datanow.name,
            'Role' : datanow.role,
            'sudah_bayar' : datanow.sudah_bayar,
            'sisa_tagihan' : datanow.sisa_tagihan,
            'Status' : datanow.isactive === 'true'?'Aktif':'Tidak Aktif',
            'Tanggal Mulai' : datanow.created_at.split("T")[0],
            'Aksi' : '<a href="google.com" class="underline">edit</a>  |  <a href="google.com" class="underline">delete</a>',
          };
          dataupdate.push(data1);
        }
      }
      renderLaporanToTable(dataupdate, 'laporanContainer', true);
    } catch (err) {
      console.error("❌ Terjadi kesalahan saat mengambil data:", err);
    } finally {
      await loadingout();
    }
}