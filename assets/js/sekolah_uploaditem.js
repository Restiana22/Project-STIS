let parsedData = [];
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const fileInfo = document.getElementById('fileInfo');
const previewContainer = document.getElementById('previewContainer');
const previewTable = document.getElementById('previewTable');
const previewBody = document.getElementById('previewBody');
const uploadBtn = document.getElementById('uploadBtn');
const progressFill = document.getElementById('progressFill');
const progressPercent = document.getElementById('progressPercent');
const progressDetails = document.getElementById('progressDetails');
const downloadTemplateBtn = document.getElementById('downloadTemplate');
const idSekolah = user.id_sekolah;
selectFileBtn.addEventListener('click', () => {
    fileInput.click();
});
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleFile(e.target.files[0]);
    }
});
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
});
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
        dropZone.classList.add('active');
    }, false);
});
['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
        dropZone.classList.remove('active');
    }, false);
});
dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const file = dt.files[0];
    handleFile(file);
}, false);
downloadTemplateBtn.addEventListener('click', downloadTemplate);
async function handleFile(file) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        showError('Hanya file Excel (.xlsx, .xls) yang diperbolehkan');
        return;
    }
    fileInfo.innerHTML = `
        <div class="status status-success">
            <i class="fas fa-check-circle"></i> File dipilih: ${file.name}
        </div>
    `;
    try {
        const data = await readExcelFile(file);
        parsedData = data;
        renderPreview(data);
        previewContainer.classList.remove('hidden');
        uploadBtn.classList.remove('hidden');
    } catch (error) {
        showError('Gagal membaca file Excel: ' + error.message);
    }
}
function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                if (jsonData.length === 0) {
                    throw new Error('File Excel kosong atau format tidak sesuai');
                }
                const requiredFields = ['JENIS', 'KODE', 'NAMA'];
                const validatedData = jsonData.flatMap((row, idx) => {
                    requiredFields.forEach(field => {
                        if (row[field] === undefined || row[field] === null || row[field] === '') {
                            throw new Error(`Baris ${idx + 2}: Kolom '${field}' harus diisi`);
                        }
                    });
                    if (row['JENIS'] !== 'jurusan' && row['JENIS'] !== 'mapel') {
                        throw new Error(`Baris ${idx + 2}: Jenis harus 'jurusan' atau 'mapel'`);
                    }
                    if (row['JENIS'] === 'jurusan') {
                        return [{
                            jenis: row['JENIS'],
                            kode: row['KODE'],
                            nama: row['NAMA'],
                            semester: row['SEMESTER'] || null,
                            jurusan: row['JURUSAN'] || null,
                            status: 'pending',
                            errorMessage: null
                        }];
                    }
                    if (!row['SEMESTER']) {
                        throw new Error(`Baris ${idx + 2}: Kolom 'SEMESTER' harus diisi untuk mapel`);
                    }
                    const semester = parseInt(row['SEMESTER']);
                    if (isNaN(semester)) {
                        throw new Error(`Baris ${idx + 2}: Semester harus angka`);
                    }
                    if (!row['JURUSAN']) {
                        throw new Error(`Baris ${idx + 2}: Kolom 'JURUSAN' harus diisi untuk mapel`);
                    }
                    const jurusanList = row['JURUSAN'].split(',').map(j => j.trim());
                    return jurusanList.map(jurusanCode => ({
                        jenis: row['JENIS'],
                        kode: row['KODE'],
                        nama: row['NAMA'],
                        semester: row['SEMESTER'],
                        jurusan: jurusanCode,
                        status: 'pending',
                        errorMessage: null
                    }));
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
    data.forEach((item) => {
        const tr = document.createElement('tr');
        let statusHtml = '';
        if (item.status === 'pending') {
            statusHtml = `<span class="status" style="background-color: rgba(245, 158, 11, 0.2); color: #f59e0b;">Menunggu</span>`;
        } else if (item.status === 'success') {
            statusHtml = `<span class="status status-success">Berhasil</span>`;
        } else if (item.status === 'error') {
            statusHtml = `<span class="status status-error">Error: ${item.errorMessage || 'Unknown error'}</span>`;
        }
        tr.innerHTML = `
            <td>${item.jenis}</td>
            <td>${item.kode}</td>
            <td>${item.nama}</td>
            <td>${item.semester || '-'}</td>
            <td>${item.jurusan || '-'}</td>
            <td>${statusHtml}</td>
        `;
        previewBody.appendChild(tr);
    });
}
function downloadTemplate() {
    const templateData = [
        {
            'JENIS': 'jurusan',
            'KODE': 'JRS001',
            'NAMA': 'Teknik Informatika',
            'SEMESTER': '',
            'JURUSAN': ''
        },
        {
            'JENIS': 'jurusan',
            'KODE': 'JRS002',
            'NAMA': 'Akuntansi',
            'SEMESTER': '',
            'JURUSAN': ''
        },
        {
            'JENIS': 'mapel',
            'KODE': 'MP001',
            'NAMA': 'Pemrograman Web',
            'SEMESTER': 3,
            'JURUSAN': 'JRS001'
        },
        {
            'JENIS': 'mapel',
            'KODE': 'MP002',
            'NAMA': 'Basis Data',
            'SEMESTER': 2,
            'JURUSAN': 'JRS001'
        }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Sekolah");
    XLSX.writeFile(wb, "Template_Informasi_Sekolah.xlsx");
}
uploadBtn.addEventListener('click', async () => {
    if (!parsedData.length) {
        showError('Tidak ada data untuk diupload');
        return;
    }
    updateProgress(0, 'Memulai proses upload...');
    parsedData = parsedData.map(item => ({ ...item, status: 'pending', errorMessage: null }));
    renderPreview(parsedData);
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
    let successCount = 0;
    let errorCount = 0;
    for (let i = 0; i < parsedData.length; i++) {
        const item = parsedData[i];
        const progress = Math.round(((i + 1) / parsedData.length) * 100);
        try {
            updateProgress(
                progress, 
                `Memproses data ${i+1}/${parsedData.length}: ${item.jenis} ${item.nama}`
            );
            if (item.jenis === 'jurusan') {
                const { error } = await supabase.from('jurusan').insert([{
                    id_sekolah: idSekolah,
                    kode_jurusan: item.kode,
                    nama_jurusan: item.nama
                }]);
                if (error) throw error;
            } else if (item.jenis === 'mapel') {
                const { data: jurusan, error: jurusanError } = await supabase
                    .from('jurusan')
                    .select('id','kode_jurusan')
                    .eq('kode_jurusan', item.jurusan)
                    .eq('id_sekolah', idSekolah)
                    .single();
                if (jurusanError || !jurusan) {
                    throw new Error(`Jurusan ${item.jurusan} tidak ditemukan`);
                }
                const { error } = await supabase.from('mapel').insert([{
                    id_sekolah: idSekolah,
                    kode_mapel: item.kode,
                    nama_mapel: item.nama,
                    id_jurusan: jurusan.id, // Menggunakan kode_jurusan sebagai referensi
                    semester: item.semester.toString() // Pastikan string
                }]);
                if (error) throw error;
            }
            parsedData[i].status = 'success';
            successCount++;
        } catch (error) {
            console.error('Error upload data:', error);
            parsedData[i].status = 'error';
            parsedData[i].errorMessage = error.message || 'Gagal menyimpan data';
            errorCount++;
            updateProgress(
                progress, 
                `Error pada data ${i+1}/${parsedData.length}: ${error.message}`
            );
        }
        renderPreview(parsedData);
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    updateProgress(100, `Proses selesai! Berhasil: ${successCount}, Gagal: ${errorCount}`);
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Data';
    showNotification(
        `Upload selesai!<br>Berhasil: ${successCount}, Gagal: ${errorCount}`,
        errorCount > 0 ? 'warning' : 'success'
    );
});
function updateProgress(percent, message) {
    progressFill.style.width = `${percent}%`;
    progressPercent.textContent = `${percent}%`;
    progressDetails.textContent = message;
}
function showError(message) {
    fileInfo.innerHTML = `
        <div class="status status-error">
            <i class="fas fa-exclamation-triangle"></i> ${message}
        </div>
    `;
}
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-lg ${
        type === 'success' ? 'bg-green-500' : 'bg-yellow-500'
    } text-white`;
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} mr-2"></i>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 5000);
}