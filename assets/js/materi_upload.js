export async function initPage() {
  let parsedData = [];
  const attachments = {};
  let uploadResults = [];
  const excelFileInput = document.getElementById('excelFile');
  const btnSelectExcel = document.getElementById('btnSelectExcel');
  const excelDropZone = document.getElementById('excelDropZone');
  const excelFileName = document.getElementById('excelFileName');
  const btnPreview = document.getElementById('btnPreview');
  const previewContainer = document.getElementById('previewContainer');
  const attachmentContainer = document.getElementById('attachmentContainer');
  const btnSubmit = document.getElementById('btnSubmit');
  const btnDownloadTemplate = document.getElementById('btnDownloadTemplate');
  const btnAddAttachment = document.getElementById('btnAddAttachment');
  const singleAttachment = document.getElementById('singleAttachment');
  const attachmentList = document.getElementById('attachmentList');
  const previewBody = document.getElementById('previewBody');
  const rowCount = document.getElementById('rowCount');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const progressPercentage = document.getElementById('progressPercentage');
  const progressDetails = document.getElementById('progressDetails');
  const emptyAttachmentMessage = document.getElementById('emptyAttachmentMessage');
  btnSelectExcel.addEventListener('click', () => excelFileInput.click());
  excelFileInput.addEventListener('change', handleExcelFileSelect);
  setupDragAndDrop();
  btnPreview.addEventListener('click', previewExcelData);
  btnDownloadTemplate.addEventListener('click', downloadTemplate);
  btnAddAttachment.addEventListener('click', addAttachment);
  attachmentList.addEventListener('click', handleRemoveAttachment);
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
        const { data: mapelData, error } = await getMapelJurusanSemesterByGuru(user.id, user.id_sekolah);
        if (error) {
          console.error('Gagal mengambil data mapel:', error);
          alert('Gagal mengambil data mata pelajaran');
          return;
          }
        if (!mapelData || mapelData.length === 0) {
          alert('Guru tidak memiliki mata pelajaran yang diajarkan');
          return;
        }
        const templateData = mapelData.map(item => ({
          kode_mapel: item.kode_mapel || '',
          kode_jurusan: item.kode_jurusan || '',
          semester: item.semester || '',
          judul_materi: '',
          file_name: '',
          deskripsi: ''
        }));
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template Materi");
        XLSX.writeFile(wb, "Template_Upload_Materi.xlsx");
      } catch (error) {
        console.error('Error membuat template:', error);
        alert('Terjadi kesalahan saat membuat template');
      }
    }
    async function previewExcelData() {
      showLoading(true);try {
        const file = excelFileInput.files[0];
        const data = await readExcelFile(file);
        parsedData = data;
        renderPreview(data);
        previewContainer.classList.remove('hidden');
        attachmentContainer.classList.remove('hidden');
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
            const requiredFields = ['kode_mapel', 'kode_jurusan', 'semester', 'judul_materi'];
            const validatedData = jsonData.map((row, idx) => {
              requiredFields.forEach(field => {
                if (row[field] === undefined || row[field] === null || row[field] === '') {
                  throw new Error(`Baris ${idx + 2}: Kolom '${field}' harus diisi!`);
                }
              });
              const semester = parseInt(row.semester);
              if (isNaN(semester)) {
                throw new Error(`Baris ${idx + 2}: Semester harus angka!`);
              }
              return {
                id_mapel: row.kode_mapel,
                jurusan: row.kode_jurusan,
                semester: semester,
                nama_materi: row.judul_materi,
                deskripsi: row.deskripsi || '',
                file_name: row.file_name || null
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
      rowCount.textContent = data.length;data.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = 'border-b dark:border-gray-700';
        const isAttachmentMissing = item.file_name && !attachments[item.file_name];
        tr.innerHTML = `
          <td class="p-3 text-gray-700 dark:text-gray-300">${item.id_mapel}</td>
          <td class="p-3 text-gray-700 dark:text-gray-300">${item.jurusan}</td>
          <td class="p-3 text-gray-700 dark:text-gray-300">${item.semester}</td>
          <td class="p-3 text-gray-700 dark:text-gray-300">${item.nama_materi}</td>
          <td class="p-3 text-gray-700 dark:text-gray-300">
            ${item.file_name || '-'}
            ${isAttachmentMissing ? 
              '<span class="ml-2 text-red-500 text-xs bg-red-100 dark:bg-red-900 px-2 py-1 rounded">Belum diupload</span>' : 
              (item.file_name ? '<span class="ml-2 text-green-500 text-xs bg-green-100 dark:bg-green-900 px-2 py-1 rounded">Sudah diupload</span>' : '')
            }
          </td>
        `;
        previewBody.appendChild(tr);
      });
    }
    function addAttachment() {
      if (!singleAttachment.files.length) {
        alert('Pilih file terlebih dahulu!');
        return;
      }const file = singleAttachment.files[0];
      const fileName = file.name;
      if (attachments[fileName]) {
        alert(`File "${fileName}" sudah ditambahkan!`);
        return;
      }
      attachments[fileName] = file;
      if (emptyAttachmentMessage) {
        emptyAttachmentMessage.classList.add('hidden');
      }
      const div = document.createElement('div');
      div.className = 'file-item flex items-center justify-between p-3 border-b dark:border-gray-700';
      div.innerHTML = `
        <div class="flex items-center">
          <i class="fas fa-file-pdf text-red-500 mr-3"></i>
          <span class="text-gray-700 dark:text-gray-300 truncate max-w-xs">${fileName}</span>
        </div>
        <button class="text-red-500 hover:text-red-700" data-file="${fileName}">
          <i class="fas fa-times"></i>
        </button>
      `;attachmentList.appendChild(div);
      singleAttachment.value = '';
      if (previewContainer.classList.contains('hidden') === false) {
        renderPreview(parsedData);
      }
    }
    function handleRemoveAttachment(e) {
      if (e.target.closest('button')) {
        const fileName = e.target.closest('button').dataset.file;
        delete attachments[fileName];
        e.target.closest('.file-item').remove();
        if (attachmentList.children.length === 1) { 
          emptyAttachmentMessage.classList.remove('hidden');
        }
        if (previewContainer.classList.contains('hidden') === false) {
          renderPreview(parsedData);
        }
      }
    }
    async function processUpload() {
      if (parsedData.length === 0) {
        alert('Tidak ada data untuk diupload!');
        return;
      }
      const missingFiles = parsedData
        .filter(item => item.file_name && !attachments[item.file_name])
        .map(item => item.file_name);
      if (missingFiles.length > 0) {
        const confirmUpload = confirm(
          `File-file berikut belum diupload:\n\n${missingFiles.join('\n')}\n\nLanjutkan tanpa file-file ini?`
        );
        if (!confirmUpload) {
          return;
        }
      }
      showLoading(true);
      previewContainer.classList.add('hidden');
      attachmentContainer.classList.add('hidden');
      progressContainer.classList.remove('hidden');try {
        uploadResults = [];
        updateProgress(0, `Memulai proses upload ${parsedData.length} materi...`);
        for (let i = 0; i < parsedData.length; i++) {
          const item = parsedData[i];
          const result = await saveMateri(item, attachments);
          uploadResults.push(result);
          console.log('finishprosesup');
          const progress = Math.round(((i + 1) / parsedData.length) * 100);
          updateProgress(progress, `Memproses materi ${i+1} dari ${parsedData.length}: ${item.nama_materi}`);
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
    async function saveMateri(data, attachments) {
      try {
        let id_mapel = data.id_mapel;
        const { data: mapelData, error: mapelError } = await getMapelByCode(data.id_mapel, user.id_sekolah);
        if (mapelError || !mapelData || mapelData.length === 0) {
          throw new Error(`Mapel dengan kode ${data.id_mapel} tidak ditemukan`);
        }
        id_mapel = mapelData[0].id;
        let fileUrl = null;
        let warning = null;
        if (data.file_name && attachments[data.file_name]) {
          fileUrl = await uploadFile(attachments[data.file_name]);
        } else if (data.file_name) {
          warning = `File "${data.file_name}" tidak ditemukan`;
        }
        const kode_materi = `M-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const materiData = {
          kode_materi: kode_materi,
          nama_materi: data.nama_materi,
          id_sekolah: user.id_sekolah,
          isi: data.deskripsi || null,
          file_url: fileUrl,
          semester: data.semester,
          id_guru: user.id,
          id_mapel: id_mapel,
        };
        const { data: insertedData, error } = await supabase
          .from('materi')
          .insert(materiData)
          .select();
        if (error) {
          console.error('Insert materi error:', error);
          throw new Error(`Gagal menyimpan materi: ${error.message}`);
        }
        return { 
          success: !error, 
          error,
          nama_materi: data.nama_materi,
          warning,
          file_attached: !!fileUrl,
          inserted_id: insertedData ? insertedData[0]?.id : null
        };
      } catch (error) {
        console.error('Error saving materi:', data.nama_materi, error);
        return { 
          success: false, 
          error,
          nama_materi: data.nama_materi
        };
      }
    }
async function uploadFile(file) {
  try {
    const fileName = `materi_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const filePath = `materi/${user.id_sekolah}/${user.id}/${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from('materi')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
    if (uploadError) {
      throw uploadError;
    }
    const { data: { publicUrl } } = supabase.storage
      .from('materi')
      .getPublicUrl(filePath);
    return publicUrl;
  } catch (error) {
    console.error('Upload error:', file.name, error);
    throw new Error(`Gagal upload ${file.name}: ${error.message}`);
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
      const warnings = uploadResults.filter(r => r.warning).map(r => r.warning);
      const withoutAttachment = uploadResults.filter(r => r.success && !r.file_attached && r.warning).length;let resultHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <h2 class="text-xl font-bold mb-4 text-green-600 dark:text-green-400">
            <i class="fas fa-check-circle mr-2"></i>Upload Selesai!
          </h2>
          <div class="mb-6 p-4 bg-green-50 dark:bg-green-900 rounded-lg">
            <p class="text-lg font-medium text-green-800 dark:text-green-200">
              Berhasil mengupload ${successCount} dari ${parsedData.length} materi!
            </p>
          </div>
      `;
      if (warnings.length > 0 || failedItems.length > 0) {
        resultHTML += `<div class="mb-6">`;
        if (withoutAttachment > 0) {
          resultHTML += `
            <div class="flex items-start p-4 mb-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
              <i class="fas fa-exclamation-triangle text-yellow-500 mt-1 mr-3"></i>
              <div>
                <p class="font-medium text-yellow-800 dark:text-yellow-200">${withoutAttachment} materi diupload tanpa file attachment</p>
                <p class="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  File tidak ditemukan saat proses upload
                </p>
              </div>
            </div>
          `;
        }
        if (failedItems.length > 0) {
          resultHTML += `
            <div class="flex items-start p-4 bg-red-50 dark:bg-red-900 rounded-lg">
              <i class="fas fa-times-circle text-red-500 mt-1 mr-3"></i>
              <div>
                <p class="font-medium text-red-800 dark:text-red-200">${failedItems.length} materi gagal diupload</p>
                <ul class="list-disc pl-5 mt-2 text-sm text-red-700 dark:text-red-300">
                  ${failedItems.map(item => `<li>${item.nama_materi} - ${item.error?.message || 'Error tidak diketahui'}</li>`).join('')}
                </ul>
              </div>
            </div>
          `;
        }
        resultHTML += `</div>`;
      }resultHTML += `
        <div class="flex justify-center">
          <a href="#/materi_list"
            <button class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md font-medium">
              <i class="fas fa-list mr-2"></i>Lihat Daftar Materi
            </button>
          </a>
        </div>
      </div>
      `;progressContainer.innerHTML = resultHTML;
    }
    function showLoading(isLoading) {
      if (isLoading) {
        document.body.classList.add('loading');
      } else {
        document.body.classList.remove('loading');
      }
    }
  }