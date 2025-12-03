let selectedUsers = null;
export async function initPage() {
  await loading();
  try {
    await populateRoleFilter();
    document.getElementById('previewUserBtn').addEventListener('click', previewUser);
    document.getElementById('roleFilter').addEventListener('change', clearPreview);
    document.getElementById('formMasterPembayaran').addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveMasterPembayaran();
    });
  } catch (error) {
    console.error('Gagal memuat form:', error);
    alert('Gagal memuat form: ' + error.message);
  } finally {
    await loadingout();
  }
}
async function populateRoleFilter() {
  const roleSelect = document.getElementById('roleFilter');
  roleSelect.innerHTML = '<option value="">Pilih Role</option>';
  const { data: roles, error } = await supabase
    .from('users')
    .select('role')
    .eq('id_sekolah', user.id_sekolah);
  if (error) {
    alert('Gagal mengambil role: ' + error.message);
    return;
  }
  const uniqueRoles = [...new Set(roles.map(u => u.role).filter(Boolean))];
  uniqueRoles.forEach(role => {
    const opt = document.createElement('option');
    opt.value = role;
    opt.textContent = role.charAt(0).toUpperCase() + role.slice(1);
    roleSelect.appendChild(opt);
  });
}
async function previewUser() {
  const role = document.getElementById('roleFilter').value;
  if (!role) {
    alert('Pilih role terlebih dahulu');
    return;
  }
  await loading();
  try {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, user_no')
      .eq('role', role)
      .eq('id_sekolah', user.id_sekolah);
    if (usersError) throw usersError;
    const userList = document.getElementById('userList');
    userList.innerHTML = '';
    if (users.length === 0) {
      userList.innerHTML = '<div class="text-center py-4 text-gray-500">Tidak ada user ditemukan</div>';
      return;
    }
    const selectAllDiv = document.createElement('div');
    selectAllDiv.className = 'flex items-center mb-2';
    selectAllDiv.innerHTML = `
      <input type="checkbox" id="selectAllUser" class="mr-2">
      <label for="selectAllUser" class="text-sm font-medium">Pilih Semua</label>
    `;
    userList.appendChild(selectAllDiv);
    users.forEach(u => {
      const div = document.createElement('div');
      div.className = 'flex items-center justify-between py-2 border-b';
      div.innerHTML = `
        <div>
          <input type="checkbox" class="user-checkbox mr-2" value="${u.id}" id="user_${u.id}">
          <label for="user_${u.id}">${u.name} (${u.user_no})</label>
        </div>
        <div class="text-green-600">✓ Akan menerima pembayaran</div>
      `;
      userList.appendChild(div);
    });
    selectedUsers = users.map(u => u.id);
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
    selectedUsers = [];
  } finally {
    await loadingout();
  }
}
function clearPreview() {
  document.getElementById('userList').innerHTML = '';
  selectedUsers = null;
}
async function saveMasterPembayaran() {
  const namaPembayaran = document.getElementById('namaPembayaran').value;
  const nominal = document.getElementById('nominalPembayaran').value;
  const tipe = document.getElementById('tipePembayaran').value;
  const tanggalMulai = document.getElementById('tanggalMulai').value;
  const tanggalBerakhir = document.getElementById('tanggalBerakhir').value;
  const keterangan = document.getElementById('keteranganPembayaran').value;
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
        nama_tagihan: namaPembayaran,
        nominal: nominal,
        periode: tipe,
        bulan_dimulai: tanggalMulai,
        bulan_selesai: tanggalBerakhir || null,
        keterangan: keterangan,
        tipe: 'pembayaran',
        id_sekolah: user.id_sekolah,
        isactive: true,
      }])
      .select()
      .single();
    if (masterError) throw masterError;
    const periode = tanggalMulai.substring(0, 7); // YYYY-MM
    const records = selectedUsers.map(userId => ({
      id_user: userId,
      id_tunggakan: master.id,
      sudah_bayar: 0,
      status_bayar: 'Belum Bayar',
      keterangan: keterangan,
      sisa_tunggakan: nominal,
      id_sekolah: user.id_sekolah,
      tanggal_bayar: null,
      total_pembayaran: nominal,
      periode: periode,
    }));
    const { error: recordError } = await supabase
      .from('recordpembayaran')
      .insert(records);
    if (recordError) throw recordError;
    alert('Pembayaran berhasil dibuat untuk ' + records.length + ' user');
    location.hash = '#/keuangan_kelolapembayaran';
  } catch (error) {
    alert('Gagal menyimpan: ' + error.message);
    console.error(error);
  } finally {
    await loadingout();
  }
}