export async function initPage() {
  const parentId = localStorage.getItem('parent_pelanggaran_id');
  if (parentId) {
    document.getElementById('form-title').textContent = 'Tambah Sub Pelanggaran';
    document.getElementById('urutan-container').style.display = 'none';
    const { data: parent } = await supabase
      .from('pelanggaran_jenis')
      .select('kelompok')
      .eq('id', parentId)
      .single();
    if (parent) {
      document.getElementById('kelompok').value = parent.kelompok;
      document.getElementById('kelompok').disabled = true;
    }
  }
  document.getElementById('nama-pelanggaran').focus();
}
window.tambahPelanggaran = async () => {
  const parentId = localStorage.getItem('parent_pelanggaran_id');
  const kelompok = document.getElementById('kelompok').value;
  const namaPelanggaran = document.getElementById('nama-pelanggaran').value.trim();
  const tingkat = document.getElementById('tingkat').value.trim();
  const bobotPoin = parseInt(document.getElementById('bobot-poin').value) || 0;
  const urutan = parseInt(document.getElementById('urutan').value) || 1;
  if (!kelompok) {
    alert('Kelompok pelanggaran harus dipilih!');
    return;
  }
  if (!namaPelanggaran) {
    alert('Nama pelanggaran harus diisi!');
    return;
  }
  if (bobotPoin < 0) {
    alert('Bobot poin tidak boleh negatif!');
    return;
  }
  try {
    const data = {
      id_sekolah: user.id_sekolah,
      kelompok: kelompok,
      nama_pelanggaran: namaPelanggaran,
      bobot_point: bobotPoin,
      tingkat: tingkat || null,
      urutan: urutan,
      parent_id: parentId || null
    };
    const { error } = await supabase
      .from('pelanggaran_jenis')
      .insert([data]);
    if (error) throw error;
    alert(parentId ? 'Sub pelanggaran berhasil ditambahkan!' : 'Jenis pelanggaran berhasil ditambahkan!');
    localStorage.removeItem('parent_pelanggaran_id');
    window.location.hash = '#/pelanggaran_list';
  } catch (err) {
    console.error('Gagal menambahkan pelanggaran:', err);
    alert('Gagal menambahkan pelanggaran');
  }
};
