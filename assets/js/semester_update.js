export async function initPage() {
  await loading();
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user.role !== 'admin' && user.role !== 'kepsek' && user.role !== 'kurikulum') {
      window.location.hash = '#/dashboard';
      return;
    }
    initTableHeader();
    await loadSchoolSemester(); // Load pengaturan semester sekolah
    await loadJurusan();
    setupEventListeners();
  } catch (error) {
    console.error('Error:', error);
    alert('Terjadi kesalahan saat memuat halaman');
  } finally {
    await loadingout();
  }
}
async function loadSchoolSemester() {
  try {
    const { data: sekolah, error } = await supabase
      .from('sekolah')
      .select('semester_aktif')
      .eq('id', user.id_sekolah)
      .single();
    if (!error && sekolah) {
      const displayElement = document.getElementById('currentSchoolSemester');
      const selectElement = document.getElementById('schoolSemesterSelect');
      const semesterText = sekolah.semester_aktif === 'ganjil' 
        ? 'Ganjil (Semester 1, 3, 5)' 
        : 'Genap (Semester 2, 4, 6)';
      displayElement.textContent = semesterText;
      selectElement.value = sekolah.semester_aktif || 'ganjil';
    }
  } catch (error) {
    console.error('Gagal memuat pengaturan semester sekolah:', error);
  }
}
function setupEventListeners() {
  document.getElementById('jurusanSelect').addEventListener('change', async (e) => {
    await loadStudents(e.target.value);
  });
  document.getElementById('searchStudent').addEventListener('input', (e) => {
    filterStudents(e.target.value);
  });
  document.getElementById('updateButton').addEventListener('click', updateSemesters);
  document.getElementById('updateSchoolSemesterBtn').addEventListener('click', updateSchoolSemester);
  document.getElementById('checkAll')?.addEventListener('change', function(e) {
    const checkboxes = document.querySelectorAll('.studentCheckbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = e.target.checked;
    });
    updateButtonState();
  });
}
async function updateSchoolSemester() {
  const newSemester = document.getElementById('schoolSemesterSelect').value;
  if (!confirm(`Anda yakin ingin mengubah semester aktif menjadi ${newSemester === 'ganjil' ? 'Ganjil' : 'Genap'}?`)) {
    return;
  }
  try {
    await loading();
    const { error } = await supabase
      .from('sekolah')
      .update({ semester_aktif: newSemester })
      .eq('id', user.id_sekolah);
    if (error) throw error;
    const schoolConfig = JSON.parse(localStorage.getItem('schoolConfig')) || {};
    schoolConfig.semester_aktif = newSemester;
    localStorage.setItem('schoolConfig', JSON.stringify(schoolConfig));
    alert('Pengaturan semester sekolah berhasil diperbarui');
    await loadSchoolSemester(); // Reload tampilan
  } catch (error) {
    console.error('Gagal update semester sekolah:', error);
    alert('Gagal update semester sekolah: ' + error.message);
  } finally {
    await loadingout();
  }
}
function initTableHeader() {
  const studentTable = document.getElementById('studentList')?.closest('table');
  if (studentTable) {
    const thead = studentTable.querySelector('thead');
    if (thead) {
      thead.innerHTML = `
        <tr class="bg-gray-100 dark:bg-gray-700">
          <th class="p-3 border text-left">
            <input type="checkbox" id="checkAll" class="mr-2">
          </th>
          <th class="p-3 border text-left">NIS</th>
          <th class="p-3 border text-left">Nama</th>
          <th class="p-3 border text-left">Jurusan</th>
          <th class="p-3 border text-left">Semester Saat Ini</th>
        </tr>
      `;
    }
  }
}
async function loadJurusan() {
  try {
    const { data: jurusan, error } = await getJurusan(user.id_sekolah);
    const select = document.getElementById('jurusanSelect');
    select.innerHTML = '<option value="">Pilih Jurusan</option>';
    if (!error && jurusan) {
      jurusan.forEach(j => {
        const option = document.createElement('option');
        option.value = j.id;
        option.textContent = j.nama_jurusan;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Gagal memuat jurusan:', error);
    throw error;
  }
}
async function loadStudents(jurusanId) {
  if (!jurusanId) {
    renderStudentList([]);
    return;
  }
  try {
    const { data: siswa, error: siswaError } = await supabase
      .from('siswa')
      .select('*')
      .eq('id_sekolah', user.id_sekolah)
      .eq('jurusan', jurusanId);
    if (siswaError) throw siswaError;
    if (!siswa || siswa.length === 0) {
      renderStudentList([]);
      return;
    }
    const userNos = siswa.map(s => s.user_no).filter(Boolean);
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('user_no, name, id')
      .in('user_no', userNos)
      .eq('id_sekolah', user.id_sekolah);
    if (usersError) throw usersError;
    const validUserNos = users.map(u => u.user_no);
    const validStudents = siswa.filter(s => validUserNos.includes(s.user_no));
    const combinedData = validStudents.map(siswa => {
      const userData = users.find(u => u.user_no === siswa.user_no);
      return {
        ...siswa,
        user_id: userData.id,
        user_name: userData.name
      };
    });
    window.currentStudents = combinedData;
    renderStudentList(combinedData);
    updateSemesterDisplay(combinedData);
  } catch (error) {
    console.error('Gagal memuat data siswa:', error);
    alert('Gagal memuat data siswa: ' + error.message);
    renderStudentList([]);
  }
}
function renderStudentList(students) {
  const tbody = document.getElementById('studentList');
  tbody.innerHTML = students.length === 0 ? 
    `<tr><td colspan="5" class="p-3 text-center text-gray-500">Tidak ada siswa ditemukan</td></tr>` : '';
  students.forEach(siswa => {
    const tr = document.createElement('tr');
    tr.className = 'border-b hover:bg-gray-50 dark:hover:bg-gray-700';
    tr.innerHTML = `
      <td class="p-3 border">
        <input type="checkbox" class="studentCheckbox" data-id="${siswa.id}" data-user-id="${siswa.user_id}">
      </td>
      <td class="p-3 border">${siswa.user_no || '-'}</td>
      <td class="p-3 border">${siswa.user_name || '-'}</td>
      <td class="p-3 border">${document.getElementById('jurusanSelect').selectedOptions[0]?.text || '-'}</td>
      <td class="p-3 border">${siswa.semester || '-'}</td>
    `;
    tbody.appendChild(tr);
    tr.querySelector('.studentCheckbox').addEventListener('change', updateButtonState);
  });
  updateButtonState();
  updateCheckAllState();
}
function updateSemesterDisplay(students) {
  const uniqueSemesters = [...new Set(students.map(s => s.semester))];
  const currentSemesterSelect = document.getElementById('currentSemester');
  currentSemesterSelect.innerHTML = uniqueSemesters.map(s => 
    `<option value="${s}">Semester ${s}</option>`
  ).join('');
}
function filterStudents(keyword) {
  if (!window.currentStudents) return;
  const filtered = window.currentStudents.filter(siswa => {
    const searchText = `${siswa.user_no || ''} ${siswa.user_name || ''}`.toLowerCase();
    return searchText.includes(keyword.toLowerCase());
  });
  renderStudentList(filtered);
}
function updateButtonState() {
  const anyChecked = document.querySelectorAll('.studentCheckbox:checked').length > 0;
  const newSemester = document.getElementById('newSemester').value;
  document.getElementById('updateButton').disabled = !anyChecked || !newSemester;
}
function updateCheckAllState() {
  const checkAll = document.getElementById('checkAll');
  if (!checkAll) return;
  const totalCheckboxes = document.querySelectorAll('.studentCheckbox').length;
  const checkedCount = document.querySelectorAll('.studentCheckbox:checked').length;
  checkAll.checked = totalCheckboxes > 0 && checkedCount === totalCheckboxes;
  checkAll.indeterminate = checkedCount > 0 && checkedCount < totalCheckboxes;
}
async function updateSemesters() {
  const newSemester = document.getElementById('newSemester').value;
  const checkboxes = document.querySelectorAll('.studentCheckbox:checked');
  if (!newSemester) {
    alert('Silakan pilih semester baru terlebih dahulu');
    return;
  }
  if (checkboxes.length === 0) {
    alert('Silakan pilih minimal satu siswa');
    return;
  }
  if (!confirm(`Anda yakin ingin mengupdate ${checkboxes.length} siswa ke semester ${newSemester}?`)) {
    return;
  }
  try {
    await loading();
    const updates = Array.from(checkboxes).map(cb => ({
      id: cb.dataset.id,
      user_id: cb.dataset.userId
    }));
    const { error: siswaError } = await supabase
      .from('siswa')
      .update({ semester: newSemester })
      .in('id', updates.map(u => u.id));
    if (siswaError) throw siswaError;
    alert(`Berhasil mengupdate ${updates.length} siswa ke semester ${newSemester}`);
    await loadStudents(document.getElementById('jurusanSelect').value);
  } catch (error) {
    console.error('Gagal update semester:', error);
    alert('Gagal update semester: ' + error.message);
  } finally {
    await loadingout();
  }
}
async function updateRelatedData(updates, newSemester) {
  const { error } = await supabase
    .from('materi')
    .update({ semester: newSemester })
    .in('id_siswa', updates.map(u => u.id));
  if (error) throw error;
}