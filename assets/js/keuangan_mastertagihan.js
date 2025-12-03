let selectedUsers = null;
export async function initPage() {
  await loading();
  try {
    const { data: jurusan, error: jurusanError } = await supabase
      .from('jurusan')
      .select('id, nama_jurusan')
      .eq('id_sekolah', user.id_sekolah);
    if (jurusanError) throw jurusanError;
    const jurusanSelect = document.getElementById('jurusanFilter');
    jurusan.forEach(j => {
      const option = document.createElement('option');
      option.value = j.id;
      option.textContent = j.nama_jurusan;
      jurusanSelect.appendChild(option);
    });
    document.getElementById('previewUserBtn').addEventListener('click', previewUser);
    document.getElementById('jurusanFilter').addEventListener('change', clearPreview);
    document.getElementById('semesterFilter').addEventListener('change', clearPreview);
    document.getElementById('formMasterTagihan').addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveMasterTagihan();
    });
  } catch (error) {
    console.error('Gagal memuat form:', error);
    alert('Gagal memuat form: ' + error.message);
  } finally {
    await loadingout();
  }
}
async function previewUser() {
  const jurusanId = document.getElementById('jurusanFilter').value;
  const semester = document.getElementById('semesterFilter').value;
  if (!jurusanId || !semester) {
    alert('Pilih jurusan dan semester terlebih dahulu');
    return;
  }
  await loading();
  try {
    const { data: siswa, siswaerror } = await supabase
      .from('siswa')
      .select('id_siswa,user_no')
      .eq('jurusan', jurusanId)
      .eq('semester', semester)
      .eq('id_sekolah', user.id_sekolah);
    if (siswaerror) throw siswaerror;
    const siswaIds = siswa.map(s => s.id_siswa);
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name')
      .in('id', siswaIds);
    if (usersError) throw usersError;
    const siswaWithName = siswa.map(s => {
      const user = users.find(u => u.id === s.id_siswa);
      return {
        ...s,
        name: user ? user.name : '(Nama tidak ditemukan)',
        user_id: s.id_siswa // pastikan user_id untuk proses tagihan
      };
    });
    const userList = document.getElementById('userList');
    userList.innerHTML = '';
    if (siswaWithName.length === 0) {
      userList.innerHTML = '<div class="text-center py-4 text-gray-500">Tidak ada siswa ditemukan</div>';
      return;
    }
    const selectAllDiv = document.createElement('div');
    selectAllDiv.className = 'flex items-center mb-2';
    selectAllDiv.innerHTML = `
      <input type="checkbox" id="selectAllUser" class="mr-2">
      <label for="selectAllUser" class="text-sm font-medium">Pilih Semua</label>
    `;
    userList.appendChild(selectAllDiv);
    siswaWithName.forEach(s => {
      const div = document.createElement('div');
      div.className = 'flex items-center justify-between py-2 border-b';
      div.innerHTML = `
        <div>
          <input type="checkbox" class="user-checkbox mr-2" value="${s.user_id}" id="user_${s.user_id}">
          <label for="user_${s.user_id}">${s.name} (${s.user_no})</label>
        </div>
        <div class="text-green-600">✓ Akan ditagih</div>
      `;
      userList.appendChild(div);
    });
    selectedUsers = siswaWithName.map(s => s.user_id);
    document.querySelectorAll('.user-checkbox').forEach(cb => cb.checked = true);
    userList.addEventListener('change', function(e) {
      if (e.target.classList.contains('user-checkbox')) {
        updateSelectedUsers();
        const allChecked = Array.from(document.querySelectorAll('.user-checkbox')).every(cb => cb.checked);
        document.getElementById('selectAllUser').checked = allChecked;
      }
      if (e.target.id === 'selectAllUser') {
        const checked = e.target.checked;
        document.querySelectorAll('.user-checkbox').forEach(cb => cb.checked = checked);
        updateSelectedUsers();
      }
    });
    function updateSelectedUsers() {
      selectedUsers = Array.from(document.querySelectorAll('.user-checkbox:checked')).map(cb => cb.value);
    }
  } catch (error) {
    alert('Gagal memuat user: ' + error.message);
  } finally {
    await loadingout();
  }
}
function clearPreview() {
  document.getElementById('userList').innerHTML = '';
  selectedUsers = null;
}
async function saveMasterTagihan() {
  const namaTagihan = document.getElementById('namaTagihan').value;
  const nominal = document.getElementById('nominalTagihan').value;
  const tipe = document.getElementById('tipeTagihan').value;
  const tanggalMulai = document.getElementById('tanggalMulai').value;
  const tanggalBerakhir = document.getElementById('tanggalBerakhir').value; // Tambahkan ini
  const keterangan = document.getElementById('keteranganTagihan').value;
  if (!selectedUsers || selectedUsers.length === 0) {
    alert('Lakukan preview user terlebih dahulu');
    return;
  }
  if (tanggalBerakhir && tanggalBerakhir < tanggalMulai) {
    alert('Tanggal berakhir harus setelah tanggal mulai');
    return;
  }
  await loading();
  try {
    const { data: master, error: masterError } = await supabase
      .from('mastertagihan')
      .insert([{
        nama_tagihan: namaTagihan,
        nominal: nominal,
        periode: tipe,
        bulan_dimulai: tanggalMulai,
        bulan_selesai: tanggalBerakhir || null, // Tambahkan ini
        keterangan: keterangan,
        tipe: 'tagihan',
        id_sekolah: user.id_sekolah,
        isactive: true,
      }])
      .select()
      .single();
    if (masterError) throw masterError;
    const periode = tanggalMulai.substring(0, 7); // YYYY-MM
    const records = selectedUsers.map(userId => ({
      user_id: userId,
      id_tagihan: master.id,
      sudah_bayar: 0,
      sisa_tagihan: nominal,
      tipe_tagihan: 'tagihan',
      status_bayar: 'Belum Bayar',
      periode: periode,
      keterangan: keterangan,
      tanggal_bayar: tanggalMulai,
      id_sekolah: user.id_sekolah,
    }));
    const { error: recordError } = await supabase
      .from('recordtagihan')
      .insert(records);
    if (recordError) throw recordError;
    alert('Tagihan berhasil dibuat untuk ' + records.length + ' siswa');
    location.hash = '#/keuangan_kelolatagihan';
  } catch (error) {
    alert('Gagal menyimpan: ' + error.message);
    console.error(error);
  } finally {
    await loadingout();
  }
}