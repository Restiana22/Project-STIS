export async function initPage() {
  await loading();
  try {
    const { count: tagihanAktif } = await supabase
      .from('recordtagihan')
      .select('*', { count: 'exact' })
      .eq('status_bayar', 'Belum Bayar')
      .eq('id_sekolah', user.id_sekolah);
    const { count: pembayaranAktif } = await supabase
      .from('recordpembayaran')
      .select('*', { count: 'exact' })
      .eq('status_bayar', 'Belum Bayar')
      .eq('id_sekolah', user.id_sekolah);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    const { data: tagihanBulanIni } = await supabase
      .from('transaksi')
      .select('nominal')
      .eq('tipe', 'tagihan')
      .eq('id_sekolah', user.id_sekolah)
      .gte('tanggal_bayar', startOfMonth)
      .lte('tanggal_bayar', endOfMonth);
    const totalTagihan = tagihanBulanIni?.reduce((sum, item) => sum + parseInt(item.nominal || 0), 0) || 0;
    const { data: pembayaranBulanIni } = await supabase
      .from('transaksi')
      .select('nominal')
      .eq('tipe', 'pembayaran')
      .eq('id_sekolah', user.id_sekolah)
      .gte('tanggal_bayar', startOfMonth)
      .lte('tanggal_bayar', endOfMonth);
    const totalPembayaran = pembayaranBulanIni?.reduce((sum, item) => sum + parseInt(item.nominal || 0), 0) || 0;
    const { data: saldoSekolah } = await getSaldoSekolah(user.id_sekolah);
    const totalSaldo = saldoSekolah ? saldoSekolah.reduce((sum, item) => sum + parseInt(item.saldo_sekarang || 0), 0) : 0;
    const { data: totalSaldoSiswa } = await getTotalSaldoSiswa(user.id_sekolah);
    const { data: sumberDanaExternal } = await getSumberDanaExternal(user.id_sekolah);
    const jumlahSumberExternal = sumberDanaExternal?.length || 0;
    document.getElementById('totalTagihan').textContent = tagihanAktif || 0;
    document.getElementById('pembayaranBulanIni').textContent = `Rp ${totalTagihan.toLocaleString('id-ID')}`;
    document.getElementById('tagihanBelumLunas').textContent = pembayaranAktif || 0;
    document.getElementById('saldoSekolah').textContent = `Rp ${totalSaldo.toLocaleString('id-ID')}`;
    const dashboardStats = `
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h3 class="text-lg font-semibold mb-4 dark:text-white">Sumber Dana Tersedia</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-blue-50 dark:bg-blue-900 p-4 rounded">
            <div class="text-blue-600 dark:text-blue-300 font-semibold">Saldo Sekolah</div>
            <div class="text-2xl font-bold">Rp ${totalSaldo.toLocaleString('id-ID')}</div>
          </div>
          <div class="bg-green-50 dark:bg-green-900 p-4 rounded">
            <div class="text-green-600 dark:text-green-300 font-semibold">Sumber External</div>
            <div class="text-2xl font-bold">${jumlahSumberExternal} Sumber</div>
          </div>
          <div class="bg-purple-50 dark:bg-purple-900 p-4 rounded">
            <div class="text-purple-600 dark:text-purple-300 font-semibold">Total Saldo Siswa</div>
            <div class="text-2xl font-bold">Rp ${totalSaldoSiswa.toLocaleString('id-ID')}</div>
          </div>
        </div>
      </div>
    `;
    const recentActivityElement = document.getElementById('recentActivity');
    recentActivityElement.insertAdjacentHTML('beforebegin', dashboardStats);
    const { data: aktivitas } = await supabase
      .from('transaksi')
      .select(`id, nominal, tanggal_bayar, id_tipe, id_user, tipe, catatan, sumber_dana`)
      .eq('id_sekolah', user.id_sekolah)
      .order('tanggal_bayar', { ascending: false })
      .limit(10);
    if (!aktivitas || aktivitas.length === 0) {
      document.getElementById('recentActivity').innerHTML = `
        <div class="text-center py-4 text-gray-500 dark:text-gray-400">
          Tidak ada aktivitas terbaru
        </div>
      `;
      return;
    }
    const userIds = aktivitas.map(a => a.id_user);
    const tagihanIds = aktivitas.filter(a => a.tipe === 'tagihan').map(a => a.id_tipe);
    const pembayaranIds = aktivitas.filter(a => a.tipe === 'pembayaran').map(a => a.id_tipe);
    const { data: users } = await supabase
      .from('users')
      .select('id, name')
      .in('id', userIds);
    const { data: mastertagihan } = await supabase
      .from('mastertagihan')
      .select('id, nama_tagihan')
      .in('id', tagihanIds);
    const { data: masterpembayaran } = await supabase
      .from('mastertagihan')
      .select('id, nama_tagihan')
      .eq('tipe', 'pembayaran')
      .in('id', pembayaranIds);
    let aktivitasHtml = '';
    aktivitas.forEach(item => {
      const user = users.find(u => u.id === item.id_user) || {};
      let jenis = '';
      let icon = '';
      let color = '';
      let sumberInfo = '';
      if (item.tipe === 'tagihan') {
        const tagihan = mastertagihan.find(m => m.id == item.id_tipe) || {};
        jenis = tagihan.nama_tagihan || 'Unknown';
        icon = 'fa-arrow-down';
        color = 'text-green-600 dark:text-green-400';
      } else {
        const pembayaran = masterpembayaran.find(m => m.id == item.id_tipe) || {};
        jenis = pembayaran.nama_tagihan || 'Unknown';
        icon = 'fa-arrow-up';
        color = 'text-red-600 dark:text-red-400';
      }
      
      if (item.sumber_dana && item.sumber_dana !== 'tunai') {
        sumberInfo = `<div class="text-xs text-blue-500">Sumber: ${item.sumber_dana}</div>`;
      }
      aktivitasHtml += `
        <div class="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center">
            <div class="p-2 rounded-full bg-gray-100 dark:bg-gray-700 mr-3">
              <i class="fas ${icon} ${color}"></i>
            </div>
            <div>
              <div class="font-medium dark:text-gray-300">${user.name || 'Unknown'}</div>
              <div class="text-sm text-gray-500 dark:text-gray-400">${jenis}</div>
              ${item.catatan ? `<div class="text-xs text-gray-400">${item.catatan}</div>` : ''}
              ${sumberInfo}
            </div>
          </div>
          <div class="text-right">
            <div class="font-semibold ${color}">
              ${item.tipe === 'tagihan' ? '+' : '-'}Rp ${parseInt(item.nominal).toLocaleString('id-ID')}
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400">${new Date(item.tanggal_bayar).toLocaleDateString('id-ID')}</div>
          </div>
        </div>
      `;
    });
    document.getElementById('recentActivity').innerHTML = aktivitasHtml;
  } catch (error) {
    console.error('Gagal memuat dashboard:', error);
    alert('Gagal memuat dashboard: ' + error.message);
  } finally {
    await loadingout();
  }
}