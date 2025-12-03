export function initPage() {
    let parsedData = [];
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const previewContainer = document.getElementById('previewContainer');
    const previewBody = document.getElementById('previewBody');
    const uploadBtn = document.getElementById('uploadBtn');
    const progressFill = document.getElementById('progressFill');
    const progressPercent = document.getElementById('progressPercent');
    const progressDetails = document.getElementById('progressDetails');
    const downloadTemplateBtn = document.getElementById('downloadTemplate');
    downloadTemplateBtn.addEventListener('click', downloadTemplate);
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });
    dropZone.addEventListener('drop', handleDrop, false);
    uploadBtn.addEventListener('click', processUpload);
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    function highlight() {
        dropZone.classList.add('bg-blue-50', 'dark:bg-gray-700');
        dropZone.classList.remove('bg-white', 'dark:bg-gray-800');
    }
    function unhighlight() {
        dropZone.classList.remove('bg-blue-50', 'dark:bg-gray-700');
        dropZone.classList.add('bg-white', 'dark:bg-gray-800');
    }
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length) {
            handleFile(files[0]);
        }
    }
    function handleFileSelect(e) {
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
        }
    }
    async function handleFile(file) {
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            showError('Hanya file Excel (.xlsx, .xls) yang diperbolehkan');
            return;
        }
        fileInfo.innerHTML = `
            <div class="p-3 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 rounded-lg">
                <i class="fas fa-check-circle mr-2"></i> File dipilih: ${file.name}
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
                    const requiredFields = ['User_no', 'Mapel', 'Jurusan', 'Semester', 'Hari', 'Jam Mulai', 'Jam Selesai'];
                    const validatedData = jsonData.map((row, idx) => {
                        requiredFields.forEach(field => {
                            if (row[field] === undefined || row[field] === null || row[field] === '') {
                                throw new Error(`Baris ${idx + 2}: Kolom '${field}' harus diisi`);
                            }
                        });
                        let semesterRaw = row['Semester'].toString().trim();
                        semesterRaw = semesterRaw.replace(/\./g, ',');
                        const semesterArr = semesterRaw.split(',').map(s => s.trim().replace(/[^0-9]/g, ''));
                        semesterArr.forEach((s, idx2) => {
                            if (isNaN(parseInt(s))) {
                                throw new Error(`Baris ${idx + 2}: Semester ke-${idx2+1} harus angka`);
                            }
                        });
                        const jamMulai = row['Jam Mulai'].toString().replace('.', ':');
                        const jamSelesai = row['Jam Selesai'].toString().replace('.', ':');
                        if (!isValidTimeFormat(jamMulai) || !isValidTimeFormat(jamSelesai)) {
                            throw new Error(`Baris ${idx + 2}: Format jam tidak valid. Gunakan format HH:MM atau HH.MM`);
                        }
                        const hariValid = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
                        if (!hariValid.includes(row['Hari'])) {
                            throw new Error(`Baris ${idx + 2}: Hari '${row['Hari']}' tidak valid. Pilih dari: ${hariValid.join(', ')}`);
                        }
                        return {
                            user_no: row['User_no'],
                            mapel: row['Mapel'],
                            jurusan: row['Jurusan'] ? row['Jurusan'].toString().trim() : '',
                            semester: semesterArr,
                            hari: row['Hari'],
                            jam_mulai: jamMulai,
                            jam_selesai: jamSelesai,
                            status: 'pending',
                            errorMessage: null
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

    function isValidTimeFormat(time) {
        return /^([0-1]?[0-9]|2[0-3])(:|\.)[0-5][0-9]$/.test(time);
    }

    function renderPreview(data) {
        previewBody.innerHTML = '';
        data.forEach((item, index) => {
            const tr = document.createElement('tr');
            let statusHtml = '';
            if (item.status === 'pending') {
                statusHtml = `<span class="px-2 py-1 bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-full text-xs">Menunggu</span>`;
            } else if (item.status === 'success') {
                statusHtml = `<span class="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 rounded-full text-xs">Berhasil</span>`;
            } else if (item.status === 'error') {
                statusHtml = `<span class="px-2 py-1 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 rounded-full text-xs">Error</span>`;
            } else if (item.status === 'partial') {
                statusHtml = `<span class="px-2 py-1 bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 rounded-full text-xs">Sebagian Berhasil</span>`;
            }
            let errorDetails = '';
            if (item.errorMessage) {
                if (Array.isArray(item.errorMessage)) {
                    errorDetails = item.errorMessage.map(msg => `- ${msg}`).join('<br>');
                } else {
                    errorDetails = item.errorMessage;
                }
            }
            tr.innerHTML = `
                <td class="px-4 py-2 whitespace-nowrap">${item.user_no}</td>
                <td class="px-4 py-2 whitespace-nowrap">${item.mapel}</td>
                <td class="px-4 py-2 whitespace-nowrap">${item.jurusan || '-'}</td>
                <td class="px-4 py-2 whitespace-nowrap">${item.semester}</td>
                <td class="px-4 py-2 whitespace-nowrap">${item.hari}</td>
                <td class="px-4 py-2 whitespace-nowrap">${item.jam_mulai}</td>
                <td class="px-4 py-2 whitespace-nowrap">${item.jam_selesai}</td>
                <td class="px-4 py-2 whitespace-nowrap">
                    <div>${statusHtml}</div>
                    ${errorDetails ? `<div class="text-xs text-red-500 dark:text-red-400 mt-1">${errorDetails}</div>` : ''}
                </td>
            `;
            previewBody.appendChild(tr);
        });
    }

    function downloadTemplate() {
        const templateData = [
            { 'User_no':'014','Mapel':'MP020','Jurusan':'TKR','Semester':'1','Hari':'Senin','Jam Mulai':'08:10','Jam Selesai':'15:15' },
            { 'User_no':'025','Mapel':'MP011','Jurusan':'TKJ','Semester':'2','Hari':'Senin','Jam Mulai':'08.10','Jam Selesai':'09.55' },
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template Jadwal");
        XLSX.writeFile(wb, "Template_Jadwal_Pelajaran.xlsx");
    }

    async function processUpload() {
        if (!parsedData.length) {
            showError('Tidak ada data untuk diupload');
            return;
        }
        updateProgress(0, 'Memulai proses upload...');
        parsedData = parsedData.map(item => ({ 
            ...item, 
            status: 'pending', 
            errorMessage: null, 
            _generatedCount: 0 
        }));
        renderPreview(parsedData);
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Memproses...';
        try {
            updateProgress(2, 'Memuat data guru & mapel...');
            const userNos = Array.from(new Set(parsedData.map(d => d.user_no)));
            const { data: allJurusan, error: jurusanErr } = await supabase
            .from('jurusan')
            .select('id, kode_jurusan, nama_jurusan')
            .eq('id_sekolah', user.id_sekolah);
            if (jurusanErr) throw new Error('Gagal memuat data jurusan: ' + jurusanErr.message);
            const jurusanByCode = {};
            const jurusanByName = {};
            (allJurusan || []).forEach(j => {
                const kode = (j.kode_jurusan || '').toString().toUpperCase().trim();
                const nama = (j.nama_jurusan || '').toString().toUpperCase().trim();
                if (kode) jurusanByCode[kode] = j;
                if (nama) jurusanByName[nama] = j;
            });
            const { data: gurus, error: guruErr } = await supabase
                .from('guru')
                .select('id, user_no, id_guru, guru_mapel, id_sekolah')
                .in('user_no', userNos)
                .eq('id_sekolah', user.id_sekolah);
            if (guruErr) throw new Error('Gagal memuat data guru: ' + guruErr.message);
            const guruByUser = (gurus || []).reduce((acc, g) => {
                acc[g.user_no] = g;
                return acc;
            }, {});
            const { data: allMapel, error: mapelErr } = await supabase
                .from('mapel')
                .select('id, kode_mapel, nama_mapel, id_jurusan, semester')
                .eq('id_sekolah', user.id_sekolah);
            if (mapelErr) throw new Error('Gagal memuat data mapel: ' + mapelErr.message);
            const mapelByKode = {};
            allMapel.forEach(m => {
                const kode = (m.kode_mapel || '').toString().toUpperCase().trim();
                if (!mapelByKode[kode]) mapelByKode[kode] = [];
                const semesters = (m.semester || '').toString().split(',')
                    .map(s => s.trim())
                    .filter(s => s !== '');
                mapelByKode[kode].push({ 
                    ...m, 
                    _semesterArr: semesters 
                });
            });
            updateProgress(10, 'Mentransform data menjadi rows jadwal...');
            const jadwalRows = [];
            const rowSuccessCount = new Array(parsedData.length).fill(0);
            const rowFailMessages = {};
            parsedData.forEach((item, idx) => {
                const rowIndex = idx;
                const userNo = item.user_no;
                const kodeMapel = (item.mapel || '').toString().toUpperCase().trim();
                const guruData = guruByUser[userNo];
                if (!guruData) {
                    parsedData[rowIndex].status = 'error';
                    parsedData[rowIndex].errorMessage = `Guru dengan user_no ${userNo} tidak ditemukan`;
                    parsedData[rowIndex]._generatedCount = 0;
                    return;
                }
                const guruMapelIds = (guruData.guru_mapel || '')
                    .toString()
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean);
                const jurusanRaw = (item.jurusan || '').toString().toUpperCase().trim();
                const jurusanObj = jurusanByCode[jurusanRaw] || jurusanByName[jurusanRaw];
                if (!jurusanObj) {
                parsedData[rowIndex].status = 'error';
                parsedData[rowIndex].errorMessage = `Baris ${rowIndex+2}: Jurusan '${item.jurusan}' tidak ditemukan di database. Gunakan kode atau nama jurusan yang valid.`;
                parsedData[rowIndex]._generatedCount = 0;
                return;
                }
                const jurusanIdStr = String(jurusanObj.id);
                const mapelCandidates = mapelByKode[kodeMapel] || [];
                const validMapel = mapelCandidates.filter(mp => {
                    const guruMengampu = guruMapelIds.includes(String(mp.id));
                    const semesterCocok = item.semester.some(sem => mp._semesterArr.includes(sem.toString()));
                    const jurusanMatch = String(mp.id_jurusan) === jurusanIdStr;
                    return guruMengampu && semesterCocok && jurusanMatch;
                });
                if (validMapel.length === 0) {
                    parsedData[rowIndex].status = 'error';
                    parsedData[rowIndex].errorMessage = 
                        `Tidak ada mapel ${item.mapel} yang cocok untuk semester ${item.semester.join(',')} pada guru ${userNo}`;
                    parsedData[rowIndex]._generatedCount = 0;
                    return;
                }
                let genCount = 0;
                for (const mp of validMapel) {
                    const jadwalData = {
                        id_sekolah: user.id_sekolah,
                        guru: guruData.id_guru,
                        mapel: mp.id,
                        jurusan: jurusanObj.id,
                        hari: item.hari,
                        jamstart: item.jam_mulai,
                        jamend: item.jam_selesai,
                        semester: item.semester.join(','),
                        created_at: new Date().toISOString(),
                        __rowIndex: rowIndex
                    };
                    jadwalRows.push(jadwalData);
                    genCount++;
                }
                parsedData[rowIndex]._generatedCount = genCount;
                if (genCount > 0) {
                    parsedData[rowIndex].status = 'pending';
                    parsedData[rowIndex].errorMessage = null;
                }
            });
            const totalJadwalRows = jadwalRows.length;
            if (totalJadwalRows === 0) {
                updateProgress(100, 'Tidak ada data jadwal yang valid untuk di-insert.');
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = '<i class="fas fa-cloud-upload-alt mr-2"></i> Proses Upload';
                renderPreview(parsedData);
                showNotification('Tidak ada jadwal valid untuk disimpan', 'warning');
                return;
            }
            const CHUNK_SIZE = 100;
            const chunks = [];
            for (let i = 0; i < jadwalRows.length; i += CHUNK_SIZE) {
                chunks.push(jadwalRows.slice(i, i + CHUNK_SIZE));
            }
            let insertedCount = 0;
            for (let ci = 0; ci < chunks.length; ci++) {
                const chunk = chunks[ci];
                updateProgress(15 + Math.round((ci / chunks.length) * 70), 
                    `Menginsert chunk ${ci + 1}/${chunks.length} (${chunk.length} rows)...`);
                const countsByRow = {};
                for (const c of chunk) {
                    countsByRow[c.__rowIndex] = (countsByRow[c.__rowIndex] || 0) + 1;
                }
                const uniqueRowIndexes = Object.keys(countsByRow).map(Number);
                const payload = chunk.map(c => {
                    const { __rowIndex, ...cleanData } = c;
                    return cleanData;
                });
                const { error: insertErr } = await supabase
                    .from('jadwal')
                    .insert(payload);
                if (insertErr) {
                    for (const ri of uniqueRowIndexes) {
                        rowFailMessages[ri] = rowFailMessages[ri] || [];
                        rowFailMessages[ri].push(`Insert chunk gagal: ${insertErr.message}`);
                    }
                    console.error('Insert chunk error:', insertErr);
                    continue;
                }
                insertedCount += chunk.length;
                for (const ri of uniqueRowIndexes) {
                    rowSuccessCount[ri] += countsByRow[ri];
                }
                parsedData.forEach((p, idx) => {
                    if (rowSuccessCount[idx] > 0) {
                        parsedData[idx].status = 'success';
                    }
                });
                renderPreview(parsedData);
            }
            parsedData.forEach((p, idx) => {
                if (p._generatedCount > 0) {
                    if (rowSuccessCount[idx] === 0) {
                        p.status = 'error';
                        p.errorMessage = rowFailMessages[idx] || `Gagal menyimpan jadwal`;
                    } else if (rowSuccessCount[idx] > 0) {
                        p.status = 'success';
                    }
                }
            });
            const successCount = rowSuccessCount.reduce((s, v) => s + v, 0);
            const failCount = totalJadwalRows - successCount;
            updateProgress(100, `Proses selesai! Baris jadwal disimpan: ${successCount}, Gagal: ${failCount}.`);
            renderPreview(parsedData);
            if (failCount > 0) {
                showNotification(`Upload selesai! Berhasil: ${successCount}, Gagal: ${failCount}`, 'warning');
            } else {
                showNotification(`Upload berhasil! ${successCount} jadwal disimpan.`, 'success');
            }
        } catch (err) {
            console.error('Proses upload gagal:', err);
            showError('Proses upload gagal: ' + err.message);
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-cloud-upload-alt mr-2"></i> Proses Upload';
        }
    }
    function updateProgress(percent, message) {
        progressFill.style.width = `${percent}%`;
        progressPercent.textContent = `${percent}%`;
        progressDetails.textContent = message;
    }
    function showError(message) {
        fileInfo.innerHTML = `
            <div class="p-3 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 rounded-lg">
                <i class="fas fa-exclamation-triangle mr-2"></i> ${message}
            </div>
        `;
    }
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
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
}