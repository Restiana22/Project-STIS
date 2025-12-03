export async function initPage() {
  let parsedData = [];
  let uploadResults = [];
  const excelFileInput = document.getElementById('excelFile');
  const btnSelectExcel = document.getElementById('btnSelectExcel');
  const excelDropZone = document.getElementById('excelDropZone');
  const excelFileName = document.getElementById('excelFileName');
  const btnPreview = document.getElementById('btnPreview');
  const previewContainer = document.getElementById('previewContainer');
  const btnSubmit = document.getElementById('btnSubmit');
  const btnDownloadTemplate = document.getElementById('btnDownloadTemplate');
  const previewBody = document.getElementById('previewBody');
  const rowCount = document.getElementById('rowCount');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const progressPercentage = document.getElementById('progressPercentage');
  const progressDetails = document.getElementById('progressDetails');
  btnSelectExcel.addEventListener('click', () => excelFileInput.click());
  excelFileInput.addEventListener('change', handleExcelFileSelect);
  setupDragAndDrop();
  btnPreview.addEventListener('click', previewExcelData);
  btnDownloadTemplate.addEventListener('click', downloadTemplate);
  btnSubmit.addEventListener('click', processUpload);
  function handleExcelFileSelect(e) {
    if (e.target.files.length) {
      const file = e.target.files[0];
      excelFileName.textContent = file.name;
      btnPreview.classList.remove('hidden');
    }
  }
  function setupDragAndDrop() {
    excelDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      excelDropZone.classList.add('border-blue-500', 'bg-blue-50');
    });
    excelDropZone.addEventListener('dragleave', () => {
      excelDropZone.classList.remove('border-blue-500', 'bg-blue-50');
    });
    excelDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      excelDropZone.classList.remove('border-blue-500', 'bg-blue-50');
      if (e.dataTransfer.files.length) {
        const file = e.dataTransfer.files[0];
        if (file.name.match(/\.(xlsx|xls)$/i)) {
          excelFileInput.files = e.dataTransfer.files;
          excelFileName.textContent = file.name;
          btnPreview.classList.remove('hidden');
        } else {
          alert('Hanya file Excel (.xlsx, .xls) yang diperbolehkan');
        }
      }
    });
  }
  async function downloadTemplate() {
    try {
      const templateData = [{
        user_no: '',
        name: '',
        password: '',
        address: '',
        role: 'siswa', // atau admin/guru/wali
        jurusan: '', // hanya untuk siswa
        semester: '', // hanya untuk siswa
        guru_mapel: '', // hanya untuk guru (pisahkan dengan koma jika multiple)
        siswa_no: '', // hanya untuk wali
        no_hp: ''
      }];
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template User");
      XLSX.writeFile(wb, "Template_Upload_User.xlsx");
    } catch (error) {
      console.error('Error membuat template:', error);
      alert('Terjadi kesalahan saat membuat template');
    }
  }
  async function previewExcelData() {
    showLoading(true);
    try {
      const file = excelFileInput.files[0];
      const data = await readExcelFile(file);
      parsedData = data;
      renderPreview(data);
      previewContainer.classList.remove('hidden');
    } catch (error) {
      console.error('Error reading Excel:', error);
      alert('Gagal membaca file Excel: ' + error.message);
    } finally {
      showLoading(false);
    }
  }
  function readExcelFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target.result, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          if (jsonData.length === 0) {
            throw new Error('File Excel kosong atau format tidak sesuai');
          }
          const requiredFields = ['user_no', 'name', 'password', 'role'];
          const validatedData = jsonData.map((row, idx) => {
            requiredFields.forEach(field => {
              if (row[field] === undefined || row[field] === null || row[field] === '') {
                throw new Error(`Baris ${idx + 2}: Kolom '${field}' harus diisi!`);
              }
            });
            const validRoles = ['admin', 'guru', 'siswa', 'wali','karyawan','keuangan','kurikulum','kesiswaan'];
            if (!validRoles.includes(row.role)) {
              throw new Error(`Baris ${idx + 2}: Role tidak valid. Harus salah satu dari: ${validRoles.join(', ')}`);
            }
            return {
              user_no: row.user_no,
              name: row.name,
              password: row.password,
              address: row.address || '',
              role: row.role,
              jurusan: row.jurusan || '',
              semester: row.semester || '',
              guru_mapel: row.guru_mapel || '',
              siswa_no: row.siswa_no || '',
              no_hp: row.no_hp || ''
            };
          });
          resolve(validatedData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(new Error('Gagal membaca file: ' + error));
      reader.readAsArrayBuffer(file);
    });
  }
  function renderPreview(data) {
    previewBody.innerHTML = '';
    rowCount.textContent = data.length;
    data.forEach(item => {
      const tr = document.createElement('tr');
      tr.className = 'border-b dark:border-gray-700';
      let detail = '';
      if (item.role === 'siswa') {
        detail = `Jurusan: ${item.jurusan || '-'}, Semester: ${item.semester || '-'},No HP: ${item.no_hp || '-'}`;
      } else if (item.role === 'guru') {
        detail = `Mapel: ${item.guru_mapel || '-'},No HP: ${item.no_hp || '-'}`;
      } else if (item.role === 'wali') {
        detail = `Siswa No: ${item.siswa_no || '-'},No HP: ${item.no_hp || '-'}`;
      } else {
        detail = 'Admin';
      }
      tr.innerHTML = `
        <td class="p-3 text-gray-700 dark:text-gray-300">${item.user_no}</td>
        <td class="p-3 text-gray-700 dark:text-gray-300">${item.name}</td>
        <td class="p-3 text-gray-700 dark:text-gray-300">${item.role}</td>
        <td class="p-3 text-gray-700 dark:text-gray-300">${item.address || '-'}</td>
        <td class="p-3 text-gray-700 dark:text-gray-300">${detail}</td>
      `;
      previewBody.appendChild(tr);
    });
  }
  async function processUpload() {
    if (parsedData.length === 0) {
      alert('Tidak ada data untuk diupload!');
      return;
    }
    showLoading(true);
    previewContainer.classList.add('hidden');
    progressContainer.classList.remove('hidden');
    try {
      uploadResults = [];
      updateProgress(0, `Memulai proses upload ${parsedData.length} user...`);
      for (let i = 0; i < parsedData.length; i++) {
        const item = parsedData[i];
        const result = await saveUser(item);
        uploadResults.push(result);
        const progress = Math.round(((i + 1) / parsedData.length) * 100);
        updateProgress(progress, `Memproses user ${i+1} dari ${parsedData.length}: ${item.name}`);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      showResults();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Error saat upload: ' + error.message);
    } finally {
      showLoading(false);
    }
  }
  async function saveUser(data) {
    try {
      const userData = {
        user_no: data.user_no,
        name: data.name,
        password: data.password,
        address: data.address,
        role: data.role,
        kode_sekolah: user.kode_sekolah,
        id_sekolah: user.id_sekolah,
        no_hp: data.no_hp
      };
      const error = await insertUser(userData);
      if (error) {
        throw new Error(`Gagal menyimpan user: ${error.message}`);
      }
      const getUser = await getUserByUserNo(data.user_no, user.kode_sekolah);
      if (!getUser.data) {
        throw new Error('Gagal mendapatkan data user yang baru dibuat');
      }
      if (data.role === 'guru' && (!data.guru_mapel || data.guru_mapel.trim() === '')) {
        throw new Error('Kolom guru_mapel harus diisi untuk role guru');
      }
      let additionalError = null;
      if (data.role === 'siswa') {
        const { data: jurusanbyid, error } = await getJurusan(user.id_sekolah);
        if (error) {
          console.error('Gagal mengambil jurusan:', error.message);
          return;
        }
        const kodeList = data.jurusan.split(',').map(k => k.trim());
        const idJurusanList = kodeList.map(kode => {
          const jurusan = jurusanbyid.find(j => j.kode_jurusan === kode);
          return jurusan?.id;
        }).filter(Boolean);
        const additionalData = {
          jurusan: idJurusanList.join(','),
          semester: data.semester,
          user_no: getUser.data.user_no,
          id_sekolah: getUser.data.id_sekolah,
          id_siswa: getUser.data.id
        };
        additionalError = await insertSiswa(additionalData);
      } 
      else if (data.role === 'guru') {
        const { data: mapelbyid, error1} = await getMapel(user.id_sekolah);
        if (error1) {
          console.error('Gagal mengambil mapel:', error.message);
          return;
        }
        const kodeList1 = data.guru_mapel.split(',').map(l => l.trim()).filter(Boolean);
        const idmapelList = kodeList1.flatMap(kode => 
          mapelbyid
            .filter(item => item.kode_mapel === kode)
            .map(item => item.id)
        );
        const uniqueIdMapelList = Array.from(new Set(idmapelList)).filter(Boolean);
        const additionalData = {
          guru_mapel: uniqueIdMapelList.join(','),
          user_no: getUser.data.user_no,
          id_sekolah: getUser.data.id_sekolah,
          id_guru: getUser.data.id
        };
        additionalError = await insertGuru(additionalData);
      } 
      else if (data.role === 'wali') {
        const additionalData = {
          siswa_no: data.siswa_no,
          user_no: getUser.data.user_no,
          id_sekolah: getUser.data.id_sekolah,
          user_id: getUser.data.id
        };
        additionalError = await insertWali(additionalData);
      }
      if (additionalError) {
        throw new Error(`Gagal menyimpan data tambahan: ${additionalError.message}`);
      }
      return { 
        success: true,
        name: data.name,
        role: data.role
      };
    } catch (error) {
      console.error('Error saving user:', data.name, error);
      return { 
        success: false,
        error,
        name: data.name
      };
    }
  }
  function updateProgress(percent, message) {
    progressBar.style.width = `${percent}%`;
    progressPercentage.textContent = `${percent}%`;
    progressDetails.innerHTML = `<p>${message}</p>`;
  }
  function showResults() {
    const successCount = uploadResults.filter(r => r.success).length;
    const failedItems = uploadResults.filter(r => !r.success);
    let resultHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h2 class="text-xl font-bold mb-4 text-green-600 dark:text-green-400">
          <i class="fas fa-check-circle mr-2"></i>Upload Selesai!
        </h2>
        <div class="mb-6 p-4 bg-green-50 dark:bg-green-900 rounded-lg">
          <p class="text-lg font-medium text-green-800 dark:text-green-200">
            Berhasil mengupload ${successCount} dari ${parsedData.length} user!
          </p>
        </div>
    `;
    if (failedItems.length > 0) {
      resultHTML += `
        <div class="flex items-start p-4 bg-red-50 dark:bg-red-900 rounded-lg">
          <i class="fas fa-times-circle text-red-500 mt-1 mr-3"></i>
          <div>
            <p class="font-medium text-red-800 dark:text-red-200">${failedItems.length} user gagal diupload</p>
            <ul class="list-disc pl-5 mt-2 text-sm text-red-700 dark:text-red-300">
              ${failedItems.map(item => `<li>${item.name} - ${item.error?.message || 'Error tidak diketahui'}</li>`).join('')}
            </ul>
          </div>
        </div>
      `;
    }
    resultHTML += `
      <div class="flex justify-center mt-6">
        <a href="#/users_list">
          <button class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md font-medium">
            <i class="fas fa-list mr-2"></i>Lihat Daftar User
          </button>
        </a>
      </div>
      </div>
    `;
    progressContainer.innerHTML = resultHTML;
  }
  function showLoading(isLoading) {
    if (isLoading) {
      document.body.classList.add('loading');
    } else {
      document.body.classList.remove('loading');
    }
  }
}