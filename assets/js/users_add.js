export function initPage() {
  document.getElementById('addUserForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await loading();
    const userData = {
      name: document.getElementById('username').value,
      address: document.getElementById('address').value,
      role: document.getElementById('role').value,
      user_no: document.getElementById('user_no').value,
      password: document.getElementById('password').value,
      kode_sekolah: user.kode_sekolah,
      id_sekolah: user.id_sekolah,
    };
    const error = await insertUser(userData);
    const getUser = await getUserByUserNo(userData.user_no,userData.kode_sekolah);
    const role = getUser.data.role;
    let additionalData = {};
    let userDataadd;
    let userError;
    if (role === 'siswa') {
      additionalData = {
        jurusan: document.getElementById('jurusan').value,
        semester: document.getElementById('semester').value,
        user_no: getUser.data.user_no,
        id_sekolah: getUser.data.id_sekolah,
        id_siswa: getUser.data.id
      };
      const error = await insertSiswa(additionalData);
      if (error) {
        userError = error;
      }
    } else if (role === 'guru') {
      const mapel = Array.from(document.querySelectorAll('input[name="guru_mapel"]:checked'))
      .map(cb => cb.value).join(',');
      const semester = Array.from(document.querySelectorAll('input[name="semester"]:checked'))
      .map(el => el.value).join(',');
      additionalData = {
        guru_mapel : mapel,
        guru_semester: semester,
        guru_jurusan: document.getElementById('guru_jurusan').value,
        user_no: getUser.data.user_no,
        id_sekolah: getUser.data.id_sekolah,
        id_guru: getUser.data.id
      };
      const error = await insertGuru(additionalData);
      if (error) {
        userError = error;
      }
    } else if (role === 'wali') {
      additionalData = {
        siswa_no: document.getElementById('siswa_no').value,
        user_no: getUser.data.user_no,
        id_sekolah: getUser.data.id_sekolah,
        user_id: getUser.data.id
      };
      const error = await insertWali(additionalData);
      if (error) {
        userError = error;
      }
    }
    if (userError) {
      alert("Gagal menambahkan data tambahan: " + userError.message);
    }
    if (error) {
      alert("Gagal menambahkan user: " + error.message);
    } else {
      alert(userData.name+ " berhasil ditambahkan!");
      window.location.href = "#/users_list";
    }
    await loadingout();
  });
  const roleSelect = document.getElementById('role');
  roleSelect.addEventListener('change', function () {
    const selectedRole = this.value;
    const allFieldDivs = document.querySelectorAll('[id$="Fields"]'); // ambil semua elemen yang ID-nya diakhiri 'Fields'
    allFieldDivs.forEach(div => {
      div.classList.add('hidden');
    });
    const targetDiv = document.getElementById(selectedRole + 'Fields');
    if (targetDiv) {
      targetDiv.classList.remove('hidden');
    }
  });
  async function fetchJurusan() {
    const { data: sekolahData, error: sekolahError } = await supabase
    .from('sekolah')
    .select('*')
    .eq('kode_sekolah', user.kode_sekolah)
    .single(); // biar langsung ambil 1 object, bukan array
  if (sekolahError || !sekolahData) {
    console.error('Gagal ambil sekolah:', sekolahError?.message);
    return;
  }
  const { data: jurusanData, error: jurusanError } = await supabase
    .from('jurusan')
    .select('*')
    .eq('id_sekolah', sekolahData.id)
    .order('nama_jurusan'); // ganti nama kolom sesuai struktur tabel kamu
  if (jurusanError || !jurusanData) {
    console.error('Gagal ambil jurusan:', jurusanError?.message);
    return;
  }
    const siswaJurusan = document.getElementById('jurusan');
    siswaJurusan.innerHTML = '';
    jurusanData.forEach(j => {
      const option1 = document.createElement('option');
      option1.value = j.id;
      option1.textContent = j.nama_jurusan;
      siswaJurusan.appendChild(option1);
    });
    const guruJurusan = document.getElementById('guru_jurusan');
    guruJurusan.innerHTML = '';
    jurusanData.forEach(k => {
      const option1 = document.createElement('option');
      option1.value = k.id;
      option1.textContent = k.nama_jurusan;
      guruJurusan.appendChild(option1);
    });
  }
  async function fetchMapel() {
    const { data: DataMapel, error: errormapel } = await getMapel(user.id_sekolah);
    if (errormapel) {
      console.error('Gagal ambil mapel:', errormapel?.message);
      return;
    }
    const mapelContainer = document.getElementById('guru_mapel');
    mapelContainer.innerHTML = ''; // Clear previous
    DataMapel.forEach(m => {
      const checkbox = document.createElement('div');
      checkbox.innerHTML = `
        <label class="inline-flex items-center space-x-2 text-sm text-gray-800 dark:text-gray-200">
          <input type="checkbox" name="guru_mapel" value="${m.id}" class="rounded border-gray-300 dark:border-gray-600 text-blue-600">
          <span>${m.nama_mapel}</span>
        </label>
      `;
      mapelContainer.appendChild(checkbox);
    });
  }
  fetchMapel();
  fetchJurusan();
}
