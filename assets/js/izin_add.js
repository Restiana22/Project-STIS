export async function initPage() {
  await loading();
  const submitBtn = document.getElementById('submitIzin');
  submitBtn.onclick = async () => {
    const tanggal = document.getElementById('tanggal').value;
    const jenis_izin = document.getElementById('jenis_izin').value;
    const alasan = document.getElementById('alasan').value;
    const fileInput = document.getElementById('lampiran');
    const file = fileInput.files[0];
    if (!tanggal || !jenis_izin || !alasan) {
      alert('Harap isi semua field yang wajib!');
      return;
    }
    let lampiranUrl = '';
    if (file) {
      const fileName = `izin_${Date.now()}_${user.user_no}`;
      const fileExt = file.name.split('.').pop();
      const filePath = `izin/${fileName}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('izin')
        .upload(filePath, file);
      if (uploadError) {
        alert('Gagal upload lampiran: ' + uploadError.message);
        return;
      }
      lampiranUrl = `${SUPABASE_URL}/storage/v1/object/public/izin/${filePath}`;
    }
    const dataIzin = {
      id_user: user.id,
      id_sekolah: user.id_sekolah,
      tanggal: tanggal,
      jenis_izin: jenis_izin,
      alasan: alasan,
      lampiran_url: lampiranUrl,
      status: 'pending'
    };
    const error = await insertIzin(dataIzin);
    if (error) {
      alert('Gagal mengajukan izin: ' + error.message);
    } else {
      alert('Izin berhasil diajukan! Menunggu persetujuan.');
      window.location.href = "#/kehadiran_list";
    }
  };
  await loadingout();
}