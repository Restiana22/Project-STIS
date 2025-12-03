let selectedSiswa = null;
let selectedSiswaName = null;
export async function initPage() {
  await loadJurusan();
  setupEventListeners();
}
async function loadJurusan() {
  const { data, error } = await getJurusan(user.id_sekolah);
  if (error) {
    alert('Gagal memuat data jurusan');
    return;
  }
  const select = document.getElementById('filterJurusan');
  select.innerHTML = '<option value="">Pilih Jurusan</option>';
  data.forEach(jurusan => {
    const option = document.createElement('option');
    option.value = jurusan.id;
    option.textContent = `${jurusan.kode_jurusan} - ${jurusan.nama_jurusan}`;
    select.appendChild(option);
  });
}
function setupEventListeners() {
  document.getElementById('btnFilter').addEventListener('click', loadSiswa);
  document.getElementById('cancelConfirm').addEventListener('click', () => {
    document.getElementById('confirmModal').classList.add('hidden');
  });
  document.getElementById('submitConfirm').addEventListener('click', submitAbsensi);
}
async function loadSiswa() {
  const jurusanId = document.getElementById('filterJurusan').value;
  const semester = document.getElementById('filterSemester').value;
  if (!jurusanId || !semester) {
    alert('Pilih jurusan dan semester terlebih dahulu');
    return;
  }
  await loading();
  try {
    const { data: siswaData, error } = await supabase
      .from('siswa')
      .select('*')
      .eq('jurusan', jurusanId)
      .eq('semester', semester)
      .eq('id_sekolah', user.id_sekolah);
    if (error) throw error;
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('id_sekolah', user.id_sekolah);
    if (usersError) throw usersError;
    const relatedSiswa = siswaData.map((siswa) => {
      const user = usersData.find(u => u.id === siswa.id_siswa);
      return {
        ...siswa,
        name: user ? user.name : null,
        user_no: user ? user.user_no : null
      };
    });
    const today = new Date().toISOString().split('T')[0];
    const userIds = relatedSiswa.map(s => s.id_siswa);
    const { data: absensiData } = await supabase
      .from('kehadiran')
      .select('*')
      .eq('tanggal', today)
      .in('id_user', userIds);
    renderSiswaList(relatedSiswa, absensiData || []);
  } catch (error) {
    console.error('Error loading siswa:', error);
    alert('Gagal memuat data siswa: ' + error.message);
  } finally {
    await loadingout();
  }
}
function renderSiswaList(siswaData, absensiData) {
  const container = document.getElementById('siswaContainer');
  const listElement = document.getElementById('siswaList');
  listElement.innerHTML = '';
  if (siswaData.length === 0) {
    listElement.innerHTML = `
      <tr>
        <td colspan="4" class="px-4 py-4 text-center text-gray-500 dark:text-gray-400">
          Tidak ada siswa ditemukan
        </td>
      </tr>
    `;
    container.classList.remove('hidden');
    return;
  }
  siswaData.forEach(siswa => {
    const absensi = absensiData.find(a => a.id_user == siswa.id_siswa);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="px-4 py-3">
        <div class="text-sm text-gray-500">${siswa.user_no || '-'}</div>
        <div>${siswa.name || '-'}</div>
      </td>
      <td class="px-4 py-3">
        <span class="px-2 py-1 text-xs rounded-full ${
          absensi 
            ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
        }">
          ${absensi ? 'Sudah Absen' : 'Belum Absen'}
        </span>
      </td>
      <td class="px-4 py-3">
        <button class="absen-btn px-3 py-1 rounded ${
          absensi 
            ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }" 
        data-siswa-id="${siswa.id_siswa}" 
        data-siswa-name="${siswa.name}"
        ${absensi ? 'disabled' : ''}>
          ${absensi ? 'Sudah Absen' : 'Absen'}
        </button>
      </td>
    `;
    listElement.appendChild(row);
  });
  document.querySelectorAll('.absen-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const siswaId = e.target.dataset.siswaId;
      const siswaName = e.target.dataset.siswaName;
      showConfirmModal(siswaId, siswaName);
    });
  });
  container.classList.remove('hidden');
}
function showConfirmModal(siswaId, siswaName) {
  selectedSiswa = siswaId;
  selectedSiswaName = siswaName;
  const confirmText = document.getElementById('confirmText');
  confirmText.textContent = `Apakah Anda yakin ingin menandai ${siswaName} sebagai hadir?`;
  document.getElementById('confirmModal').classList.remove('hidden');
}
async function submitAbsensi() {
  if (!selectedSiswa) {
    alert('Tidak ada siswa yang dipilih');
    return;
  }
  await loading();
  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString('en-GB');
    const { data: existingAbsen, error: checkError } = await supabase
      .from('kehadiran')
      .select('*')
      .eq('id_user', selectedSiswa)
      .eq('tanggal', today)
      .maybeSingle();
    if (checkError) {
      console.error('Error checking existing absensi:', checkError);
      throw checkError;
    }
    if (existingAbsen) {
      alert(`Siswa ${selectedSiswaName} sudah melakukan absensi hari ini`);
      document.getElementById('confirmModal').classList.add('hidden');
      return;
    }
    const { error } = await supabase
      .from('kehadiran')
      .insert([{
        tanggal: today,
        jam_masuk: now,
        id_user: selectedSiswa,
        id_sekolah: user.id_sekolah,
        absensi_oleh: 'guru_piket',
        lokasi: 'Absensi oleh guru piket',
        foto: null,
        created_at: new Date().toISOString()
      }]);
    if (error) {
      console.error('Error inserting absensi:', error);
      throw error;
    }
    alert(`Absensi ${selectedSiswaName} berhasil dicatat`);
    document.getElementById('confirmModal').classList.add('hidden');
    await loadSiswa();
  } catch (error) {
    console.error('Error submitting absensi:', error);
    alert('Gagal mencatat absensi: ' + error.message);
  } finally {
    await loadingout();
  }
}