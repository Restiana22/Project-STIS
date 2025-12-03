let importData = [];
let currentFile = null;
export async function initPage() {
    setupEventListeners();
}
function setupEventListeners() {
    const fileInput = document.getElementById('excelFile');
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            currentFile = file;
            document.getElementById('fileName').textContent = file.name;
            readExcelFile(file);
        }
    });
}
function readExcelFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            if (jsonData.length === 0) {
                showError('File Excel kosong atau format tidak sesuai');
                return;
            }
            const requiredColumns = ['kelompok', 'nama_pelanggaran', 'bobot_point', 'urutan'];
            const firstRow = jsonData[0];
            const missingColumns = requiredColumns.filter(col => !(col in firstRow));
            if (missingColumns.length > 0) {
                showError(`Kolom yang diperlukan tidak ditemukan: ${missingColumns.join(', ')}`);
                return;
            }
            importData = jsonData;
            showPreview(importData);
            document.getElementById('importBtn').disabled = false;
        } catch (error) {
            console.error('Error reading Excel file:', error);
            showError('Gagal membaca file Excel. Pastikan format file benar.');
        }
    };
    reader.onerror = function() {
        showError('Gagal membaca file');
    };
    reader.readAsArrayBuffer(file);
}
function showPreview(data) {
    const previewContent = document.getElementById('previewContent');
    const previewSection = document.getElementById('previewSection');
    const previewRows = data.slice(0, 5);
    let html = '<div class="space-y-1">';
    previewRows.forEach((row, index) => {
        html += `
            <div class="flex justify-between text-xs border-b pb-1">
                <span class="font-medium">${row.nama_pelanggaran}</span>
                <span class="text-gray-500">${row.kelompok} • ${row.bobot_point || 0} poin</span>
            </div>
        `;
    });
    if (data.length > 5) {
        html += `<div class="text-center text-gray-500 text-xs">... dan ${data.length - 5} baris lainnya</div>`;
    }
    html += '</div>';
    previewContent.innerHTML = html;
    previewSection.classList.remove('hidden');
}
function showError(message) {
    alert(`Error: ${message}`);
    resetForm();
}
function resetForm() {
    document.getElementById('excelFile').value = '';
    document.getElementById('fileName').textContent = '';
    document.getElementById('previewSection').classList.add('hidden');
    document.getElementById('importBtn').disabled = true;
    importData = [];
    currentFile = null;
}
function processImport() {
    if (importData.length === 0) {
        showError('Tidak ada data untuk diimport');
        return;
    }
    document.getElementById('confirmModal').classList.remove('hidden');
}
function closeConfirmModal() {
    document.getElementById('confirmModal').classList.add('hidden');
}
async function confirmImport() {
    closeConfirmModal();
    document.getElementById('progressSection').classList.remove('hidden');
    document.getElementById('importBtn').disabled = true;
    try {
        await importDataToDatabase(importData);
    } catch (error) {
        console.error('Import failed:', error);
        showError(`Import gagal: ${error.message}`);
    } finally {
        document.getElementById('progressSection').classList.add('hidden');
    }
}
async function importDataToDatabase(data) {
    await loading();
    try {
        updateProgress(0, 'Menghapus data existing...');
        const { error: deleteError } = await supabase
            .from('pelanggaran_jenis')
            .delete()
            .eq('id_sekolah', user.id_sekolah);
        if (deleteError) throw deleteError;
        updateProgress(10, 'Mempersiapkan data...');
        const parentMap = new Map();
        const parentItems = data.filter(item => !item.parent_nama);
        const childItems = data.filter(item => item.parent_nama);
        updateProgress(20, 'Mengimport data utama...');
        for (let i = 0; i < parentItems.length; i++) {
            const item = parentItems[i];
            const { data: inserted, error } = await supabase
                .from('pelanggaran_jenis')
                .insert([{
                    id_sekolah: user.id_sekolah,
                    kelompok: item.kelompok,
                    nama_pelanggaran: item.nama_pelanggaran,
                    bobot_point: item.bobot_point || null,
                    parent_id: null,
                    tingkat: item.tingkat || null,
                    urutan: item.urutan || 1
                }])
                .select()
                .single();
            if (error) throw error;
            if (inserted) {
                parentMap.set(item.nama_pelanggaran, inserted.id);
            }
            const progress = 20 + (i / parentItems.length) * 40;
            updateProgress(progress, `Mengimport ${i + 1}/${parentItems.length} data utama...`);
        }
        updateProgress(60, 'Mengimport sub-data...');
        for (let i = 0; i < childItems.length; i++) {
            const item = childItems[i];
            const parentId = parentMap.get(item.parent_nama);
            if (!parentId) {
                console.warn(`Parent tidak ditemukan untuk: ${item.nama_pelanggaran}`);
                continue;
            }
            const { error } = await supabase
                .from('pelanggaran_jenis')
                .insert([{
                    id_sekolah: user.id_sekolah,
                    kelompok: item.kelompok,
                    nama_pelanggaran: item.nama_pelanggaran,
                    bobot_point: item.bobot_point || null,
                    parent_id: parentId,
                    tingkat: item.tingkat || null,
                    urutan: item.urutan || 1
                }]);
            if (error) throw error;
            const progress = 60 + (i / childItems.length) * 35;
            updateProgress(progress, `Mengimport ${i + 1}/${childItems.length} sub-data...`);
        }
        updateProgress(95, 'Menyelesaikan...');
        await new Promise(resolve => setTimeout(resolve, 500));
        updateProgress(100, 'Import berhasil!');
        await loadingout();
        setTimeout(() => {
            alert('✅ Data pelanggaran berhasil diimport!');
            window.location.hash = '#/pelanggaran_list';
        }, 1000);
    } catch (error) {
        await loadingout();
        throw error;
    }
}
function updateProgress(percent, message) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    progressBar.style.width = `${percent}%`;
    progressText.textContent = `${Math.round(percent)}% - ${message}`;
}
function downloadTemplate() {
    const templateData = [
        {
            'kelompok': 'KETERLAMBATAN',
            'nama_pelanggaran': 'Terlambat',
            'bobot_point': 2,
            'urutan': 1,
            'parent_nama': '',
            'tingkat': ''
        },
        {
            'kelompok': 'PELANGGARAN ATRIBUT / PAKAIAN',
            'nama_pelanggaran': 'Memakai seragam / Atribut tidak sesuai aturan',
            'bobot_point': '',
            'urutan': 1,
            'parent_nama': '',
            'tingkat': ''
        },
        {
            'kelompok': 'PELANGGARAN ATRIBUT / PAKAIAN',
            'nama_pelanggaran': 'Teguran 1',
            'bobot_point': 2,
            'urutan': 1,
            'parent_nama': 'Memakai seragam / Atribut tidak sesuai aturan',
            'tingkat': 'a'
        }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Pelanggaran');
    const guideData = [
        {'KOLOM': 'kelompok', 'DESKRIPSI': 'Kelompok pelanggaran (wajib)', 'CONTOH': 'KETERLAMBATAN'},
        {'KOLOM': 'nama_pelanggaran', 'DESKRIPSI': 'Nama jenis pelanggaran (wajib)', 'CONTOH': 'Terlambat'},
        {'KOLOM': 'bobot_point', 'DESKRIPSI': 'Bobot point (angka, kosongkan untuk parent)', 'CONTOH': '2'},
        {'KOLOM': 'urutan', 'DESKRIPSI': 'Urutan tampil (angka)', 'CONTOH': '1'},
        {'KOLOM': 'parent_nama', 'DESKRIPSI': 'Nama parent untuk sub-pelanggaran', 'CONTOH': 'Memakai seragam...'},
        {'KOLOM': 'tingkat', 'DESKRIPSI': 'Tingkat untuk sub-pelanggaran', 'CONTOH': 'a'}
    ];
    const guideWs = XLSX.utils.json_to_sheet(guideData);
    XLSX.utils.book_append_sheet(wb, guideWs, 'Panduan');
    XLSX.writeFile(wb, 'template_pelanggaran.xlsx');
}
window.downloadTemplate = downloadTemplate;
window.processImport = processImport;
window.confirmImport = confirmImport;
window.closeConfirmModal = closeConfirmModal;