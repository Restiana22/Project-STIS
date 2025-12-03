export function initPage() {
  const userId = localStorage.getItem('editUserId');
  if (!userId) {
    alert('ID user tidak ditemukan');
    window.location.href = '#/users_list';
    return;
  }
  localStorage.removeItem('editUserId');
  loadUserData(userId);
  setupFormSubmitHandler();
  setupRoleBasedFields();
  fetchJurusan();
  fetchMapel();
}
async function loadUserData(userId) {
  await loading();
  try {
    const { data: userData, error } = await getUserById(userId);
    if (error || !userData) {
      throw new Error('Gagal memuat data user: ' + (error?.message || 'User tidak ditemukan'));
    }
    document.getElementById('user_id').value = userData.id;
    document.getElementById('user_no').value = userData.user_no;
    document.getElementById('username').value = userData.name;
    document.getElementById('address').value = userData.address;
    document.getElementById('role').value = userData.role;
    const roleSelect = document.getElementById('role');
    const selectedRole = roleSelect.value;
    const allFieldDivs = document.querySelectorAll('[id$="Fields"]');
    allFieldDivs.forEach(div => {
      div.classList.add('hidden');
    });
    const targetDiv = document.getElementById(selectedRole + 'Fields');
    if (targetDiv) {
      targetDiv.classList.remove('hidden');
    }
    await loadAdditionalData(userData);
  } catch (error) {
    alert(error.message);
    window.location.href = '#/users_list';
  } finally {
    await loadingout();
  }
}
async function loadAdditionalData(userData) {
  if (userData.role === 'siswa') {
    try {
      const { data: siswaData, error } = await getSiswaDetail(userData.user_no, userData.id_sekolah);
      if (!error && siswaData && siswaData.length > 0) {
        document.getElementById('jurusan').value = siswaData[0].jurusan || '';
        document.getElementById('semester').value = siswaData[0].semester || '';
      }
    } catch (error) {
      console.error('Gagal memuat data siswa:', error);
    }
  } else if (userData.role === 'guru') {
    try {
      const { data: guruData, error } = await getGuruDetail(userData.user_no, userData.id_sekolah);
      if (!error && guruData && guruData.length > 0) {
        document.getElementById('guru_jurusan').value = guruData[0].guru_jurusan || '';
        if (guruData[0].guru_mapel) {
          const mapelIds = guruData[0].guru_mapel.split(',');
          document.querySelectorAll('input[name="guru_mapel"]').forEach(checkbox => {
            checkbox.checked = mapelIds.includes(checkbox.value);
          });
        }
        if (guruData[0].guru_semester) {
          const semesterIds = guruData[0].guru_semester.split(',');
          document.querySelectorAll('input[name="semester"]').forEach(checkbox => {
            checkbox.checked = semesterIds.includes(checkbox.value);
          });
        }
      }
    } catch (error) {
      console.error('Gagal memuat data guru:', error);
    }
  } else if (userData.role === 'wali') {
    try {
      const { data: waliData, error } = await getWaliDetail(userData.user_no, userData.id_sekolah);
      if (!error && waliData && waliData.length > 0) {
        document.getElementById('siswa_no').value = waliData[0].siswa_no || '';
      }
    } catch (error) {
      console.error('Gagal memuat data wali:', error);
    }
  }
}
function setupFormSubmitHandler() {
  document.getElementById('editUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await updateUserData();
  });
}
function setupRoleBasedFields() {
  const roleSelect = document.getElementById('role');
  roleSelect.addEventListener('change', function() {
    const selectedRole = this.value;
    const allFieldDivs = document.querySelectorAll('[id$="Fields"]');
    allFieldDivs.forEach(div => {
      div.classList.add('hidden');
    });
    const targetDiv = document.getElementById(selectedRole + 'Fields');
    if (targetDiv) {
      targetDiv.classList.remove('hidden');
    }
  });
}
async function fetchJurusan() {
  try {
    const { data: sekolahData, error: sekolahError } = await supabase
      .from('sekolah')
      .select('*')
      .eq('kode_sekolah', user.kode_sekolah)
      .single();
    if (sekolahError || !sekolahData) {
      console.error('Gagal ambil sekolah:', sekolahError?.message);
      return;
    }
    const { data: jurusanData, error: jurusanError } = await supabase
      .from('jurusan')
      .select('*')
      .eq('id_sekolah', sekolahData.id)
      .order('nama_jurusan');
    if (jurusanError || !jurusanData) {
      console.error('Gagal ambil jurusan:', jurusanError?.message);
      return;
    }
    const siswaJurusan = document.getElementById('jurusan');
    const guruJurusan = document.getElementById('guru_jurusan');
    if (siswaJurusan) {
      siswaJurusan.innerHTML = '<option value="">Pilih jurusan</option>';
      jurusanData.forEach(j => {
        const option = document.createElement('option');
        option.value = j.id;
        option.textContent = j.nama_jurusan;
        siswaJurusan.appendChild(option);
      });
    }
    if (guruJurusan) {
      guruJurusan.innerHTML = '<option value="">Pilih Jurusan</option>';
      jurusanData.forEach(j => {
        const option = document.createElement('option');
        option.value = j.id;
        option.textContent = j.nama_jurusan;
        guruJurusan.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error fetching jurusan:', error);
  }
}
async function fetchMapel() {
  try {
    const { data: DataMapel, error: errormapel } = await getMapel(user.id_sekolah);
    if (errormapel) {
      console.error('Gagal ambil mapel:', errormapel?.message);
      return;
    }
    const mapelContainer = document.getElementById('guru_mapel');
    if (mapelContainer) {
      mapelContainer.innerHTML = '';
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
  } catch (error) {
    console.error('Error fetching mapel:', error);
  }
}
async function updateUserData() {
  await loading();
  try {
    const userId = document.getElementById('user_id').value;
    const userNo = document.getElementById('user_no').value;
    const name = document.getElementById('username').value;
    const address = document.getElementById('address').value;
    const role = document.getElementById('role').value;
    const updateData = {
      name,
      address,
      user_no: userNo
    };
    const error = await updateUser(userId, updateData);
    if (error) {
      throw new Error('Gagal mengupdate user: ' + error.message);
    }
    await updateAdditionalData(userId, role);
    alert('Data user berhasil diperbarui!');
    window.location.href = '#/users_list';
  } catch (error) {
    alert(error.message);
  } finally {
    await loadingout();
  }
}
async function updateAdditionalData(userId, role) {
  try {
    const { data: currentUser } = await getUserById(userId);
    if (role === 'siswa') {
      const jurusan = document.getElementById('jurusan').value;
      const semester = document.getElementById('semester').value;
      const { data: siswaData } = await getSiswaDetail(currentUser.user_no, currentUser.id_sekolah);
      if (siswaData && siswaData.length > 0) {
        const updateSiswaData = {
          jurusan,
          semester
        };
        const error = await updateSiswa(siswaData[0].id, updateSiswaData);
        if (error) {
          console.error('Gagal update data siswa:', error);
        }
      } else {
        const newSiswaData = {
          jurusan,
          semester,
          user_no: currentUser.user_no,
          id_sekolah: currentUser.id_sekolah,
          id_siswa: currentUser.id
        };
        const error = await insertSiswa(newSiswaData);
        if (error) {
          console.error('Gagal membuat data siswa:', error);
        }
      }
    } else if (role === 'guru') {
      const mapel = Array.from(document.querySelectorAll('input[name="guru_mapel"]:checked'))
        .map(cb => cb.value).join(',');
      const semester = Array.from(document.querySelectorAll('input[name="semester"]:checked'))
        .map(el => el.value).join(',');
      const guru_jurusan = document.getElementById('guru_jurusan').value;
      const { data: guruData } = await getGuruDetail(currentUser.user_no, currentUser.id_sekolah);
      if (guruData && guruData.length > 0) {
        const updateGuruData = {
          guru_mapel: mapel,
          guru_semester: semester,
          guru_jurusan: guru_jurusan
        };
        const error = await updateGuru(guruData[0].id, updateGuruData);
        if (error) {
          console.error('Gagal update data guru:', error);
        }
      } else {
        const newGuruData = {
          guru_mapel: mapel,
          guru_semester: semester,
          guru_jurusan: guru_jurusan,
          user_no: currentUser.user_no,
          id_sekolah: currentUser.id_sekolah,
          id_guru: currentUser.id
        };
        const error = await insertGuru(newGuruData);
        if (error) {
          console.error('Gagal membuat data guru:', error);
        }
      }
    } else if (role === 'wali') {
      const siswa_no = document.getElementById('siswa_no').value;
      const { data: waliData } = await getWaliDetail(currentUser.user_no, currentUser.id_sekolah);
      if (waliData && waliData.length > 0) {
        const updateWaliData = {
          siswa_no: siswa_no
        };
        const error = await updateWali(waliData[0].id, updateWaliData);
        if (error) {
          console.error('Gagal update data wali:', error);
        }
      } else {
        const newWaliData = {
          siswa_no: siswa_no,
          user_no: currentUser.user_no,
          id_sekolah: currentUser.id_sekolah,
          user_id: currentUser.id
        };
        const error = await insertWali(newWaliData);
        if (error) {
          console.error('Gagal membuat data wali:', error);
        }
      }
    }
  } catch (error) {
    console.error('Error updating additional data:', error);
  }
}