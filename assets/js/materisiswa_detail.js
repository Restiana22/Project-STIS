export async function initPage() {
  try {
    await loading();
    const idMateri = localStorage.getItem('selected_materi_id');
    if (!idMateri) {
      console.error('❌ ID materi tidak ditemukan.');
      showError('ID materi tidak ditemukan');
      return;
    }
    const materiDetail = await getDetailMateriLengkap(idMateri);
    if (!materiDetail || materiDetail.error) {
      console.error('❌ Gagal ambil detail materi:', materiDetail?.error?.message);
      showError('Gagal memuat detail materi');
      return;
    }
    renderMateriDetail(materiDetail);
  } catch (err) {
    console.error('❌ Error load detail materi:', err);
    showError('Terjadi kesalahan saat memuat materi');
  } finally {
    await loadingout();
  }
}
async function getDetailMateriLengkap(materiId) {
  try {
    const { data: materi, error } = await supabase
      .from('materi')
      .select('*')
      .eq('id', materiId)
      .single();
    if (error || !materi) {
      return { error: error || new Error('Materi tidak ditemukan') };
    }
    let namaGuru = 'Tidak diketahui';
    if (materi.id_guru) {
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('name')
        .eq('id', materi.id_guru)
        .limit(1);
      if (!userError && users && users.length > 0) {
        namaGuru = users[0].name;
      }
    }
    let namaJurusan = '-';
    if (materi.id_mapel) {
      const { data: mapel, error: mapelError } = await supabase
        .from('mapel')
        .select('id_jurusan')
        .eq('id', materi.id_mapel)
        .single();
      if (!mapelError && mapel) {
        const { data: jurusan, error: jurusanError } = await supabase
          .from('jurusan')
          .select('nama_jurusan')
          .eq('id', mapel.id_jurusan)
          .single();
        if (!jurusanError && jurusan) {
          namaJurusan = jurusan.nama_jurusan;
        }
      }
    }
    return {
      ...materi,
      namaGuru,
      namaJurusan
    };
  } catch (error) {
    console.error('Error mendapatkan detail materi:', error);
    return { error };
  }
}
function renderMateriDetail(materi) {
  document.getElementById('judul-materi').textContent = materi.nama_materi || 'Tidak ada judul';
  document.getElementById('author').textContent = materi.namaGuru;
  document.getElementById('tanggal-dibuat').textContent = formatTanggal(materi.created_at);
  document.getElementById('semester').textContent = materi.semester || '-';
  document.getElementById('jurusan').textContent = materi.namaJurusan;
  renderContent(materi.isi);
  renderFile(materi.file_url);
}
function renderContent(content) {
  const contentContainer = document.getElementById('isi-materi');
  if (!content) {
    contentContainer.innerHTML = `
      <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-6 text-center">
        <i class="fas fa-file-alt text-4xl text-gray-400 mb-3"></i>
        <p class="text-gray-500 dark:text-gray-400">Isi materi belum tersedia</p>
      </div>
    `;
    return;
  }
  contentContainer.innerHTML = content;
}
function renderPreviewSection(fileUrl, extension, fileInfo) {
  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
  const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
  switch(extension) {
    case 'pdf':
      return `
        <div class="h-96">
          <iframe src="${fileUrl}" class="w-full h-full" frameborder="0"></iframe>
        </div>
      `;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return `
        <div class="flex items-center justify-center p-4 h-96">
          <img src="${fileUrl}" alt="Preview Gambar" class="max-h-full max-w-full object-contain">
        </div>
      `;
    case 'doc':
    case 'docx':
    case 'xls':
    case 'xlsx':
    case 'ppt':
    case 'pptx':
      return `
        <div class="h-96">
          <iframe src="${officeViewerUrl}" class="w-full h-full" frameborder="0"></iframe>
          <div class="text-xs text-gray-500 mt-2 text-center">
            Preview menggunakan Microsoft Office Online Viewer (read-only)
          </div>
        </div>
      `;
    default:
      return `
        <div class="flex flex-col items-center justify-center p-8 h-96 text-center">
          <i class="fas ${fileInfo.icon} text-6xl ${fileInfo.color} mb-4"></i>
          <p class="text-gray-500 dark:text-gray-400">Preview tidak tersedia untuk file ini</p>
          <p class="text-sm text-gray-400 mt-2">Gunakan tombol "Unduh File" untuk melihat isinya</p>
        </div>
      `;
  }
}
window.openFullscreenPreview = function(fileUrl, extension) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col p-4';
  let previewContent = '';
  if (extension.match(/(jpg|jpeg|png|gif)$/)) {
    previewContent = `<img src="${fileUrl}" class="max-h-full max-w-full object-contain" alt="Fullscreen Preview">`;
  } 
  else if (extension === 'pdf') {
    previewContent = `<iframe src="${fileUrl}" class="w-full h-full" frameborder="0"></iframe>`;
  }
  else if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) {
    const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
    previewContent = `
      <iframe src="${officeViewerUrl}" class="w-full h-full" frameborder="0"></iframe>
      <div class="text-sm text-white mt-2 text-center">
        Preview menggunakan Microsoft Office Online Viewer (read-only)
      </div>
    `;
  }
  else {
    previewContent = `
      <div class="flex flex-col items-center justify-center text-white">
        <i class="fas fa-file text-6xl mb-4"></i>
        <p>Preview tidak tersedia untuk file ini</p>
      </div>
    `;
  }
  overlay.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-semibold text-white">Preview File</h3>
      <button onclick="this.parentElement.parentElement.remove()" 
        class="text-white hover:text-gray-300 text-2xl">
        &times;
      </button>
    </div>
    <div class="flex-1 flex items-center justify-center">
      ${previewContent}
    </div>
    <div class="mt-4 flex justify-center space-x-4">
      <a href="${fileUrl}" download
        class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
        <i class="fas fa-download mr-2"></i>Unduh File
      </a>
      <button onclick="this.parentElement.parentElement.remove()" 
        class="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg">
        Tutup
      </button>
    </div>
  `;
  document.body.appendChild(overlay);
};
function getFileInfo(extension) {
  const types = {
    pdf: { icon: 'fa-file-pdf', color: 'text-red-500', type: 'PDF Document' },
    jpg: { icon: 'fa-file-image', color: 'text-green-500', type: 'Image JPEG' },
    jpeg: { icon: 'fa-file-image', color: 'text-green-500', type: 'Image JPEG' },
    png: { icon: 'fa-file-image', color: 'text-green-500', type: 'Image PNG' },
    gif: { icon: 'fa-file-image', color: 'text-green-500', type: 'Image GIF' },
    doc: { icon: 'fa-file-word', color: 'text-blue-500', type: 'Word Document' },
    docx: { icon: 'fa-file-word', color: 'text-blue-500', type: 'Word Document' },
    xls: { icon: 'fa-file-excel', color: 'text-green-600', type: 'Excel Spreadsheet' },
    xlsx: { icon: 'fa-file-excel', color: 'text-green-600', type: 'Excel Spreadsheet' },
    ppt: { icon: 'fa-file-powerpoint', color: 'text-orange-500', type: 'PowerPoint' },
    pptx: { icon: 'fa-file-powerpoint', color: 'text-orange-500', type: 'PowerPoint' },
    txt: { icon: 'fa-file-alt', color: 'text-gray-500', type: 'Text File' },
    zip: { icon: 'fa-file-archive', color: 'text-yellow-500', type: 'Archive File' },
    rar: { icon: 'fa-file-archive', color: 'text-yellow-500', type: 'Archive File' },
    default: { icon: 'fa-file', color: 'text-gray-500', type: 'File' }
  };
  return types[extension] || types.default;
}
function renderFile(fileUrl) {
  const fileContainer = document.getElementById('file-container');
  if (!fileUrl) {
    fileContainer.innerHTML = '';
    return;
  }
  if (!fileContainer) {
    const isiMateri = document.getElementById('isi-materi');
    const newFileContainer = document.createElement('div');
    newFileContainer.id = 'file-container';
    isiMateri.parentNode.insertBefore(newFileContainer, isiMateri.nextSibling);
  }
  const fileName = fileUrl.split('/').pop() || 'File Materi';
  const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'file';
  const fileInfo = getFileInfo(fileExtension);
  fileContainer.innerHTML = `
    <div class="mt-8 border-t pt-6">
      <h3 class="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300 flex items-center">
        <i class="fas fa-paperclip mr-2"></i>Lampiran Materi
      </h3>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Preview Section -->
        <div class="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          ${renderPreviewSection(fileUrl, fileExtension, fileInfo)}
        </div>
        <!-- File Info Section -->
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div class="flex items-start mb-4">
            <i class="fas ${fileInfo.icon} text-2xl mr-3 ${fileInfo.color}"></i>
            <div>
              <p class="font-medium text-gray-800 dark:text-gray-200 break-all">${fileName}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">${fileInfo.type}</p>
            </div>
          </div>
          <div class="space-y-3">
            <a href="${fileUrl}" target="_blank" download
              class="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              <i class="fas fa-download mr-2"></i>Unduh File
            </a>
            <button onclick="openFullscreenPreview('${fileUrl}', '${fileExtension}')"
              class="w-full flex items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors">
              <i class="fas fa-expand mr-2"></i>Buka Fullscreen
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}
window.openFullscreenPreview = function(fileUrl, extension) {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col p-4';
  overlay.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-semibold text-white">Preview File</h3>
      <button onclick="this.parentElement.parentElement.remove()" 
        class="text-white hover:text-gray-300 text-2xl">
        &times;
      </button>
    </div>
    <div class="flex-1 flex items-center justify-center">
      ${extension.match(/(jpg|jpeg|png|gif)$/) ? 
        `<img src="${fileUrl}" class="max-h-full max-w-full object-contain" alt="Fullscreen Preview">` : 
        `<iframe src="${fileUrl}" class="w-full h-full" frameborder="0"></iframe>`
      }
    </div>
    <div class="mt-4 flex justify-center">
      <a href="${fileUrl}" download
        class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
        <i class="fas fa-download mr-2"></i>Unduh File
      </a>
    </div>
  `;
  document.body.appendChild(overlay);
};
function formatTanggal(tanggalString) {
  if (!tanggalString) return '-';
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return new Date(tanggalString).toLocaleDateString('id-ID', options);
}
function showError(message) {
  const container = document.querySelector('.max-w-3xl');
  if (container) {
    container.innerHTML = `
      <div class="text-center py-10">
        <i class="fas fa-exclamation-triangle text-yellow-500 text-5xl mb-4"></i>
        <h2 class="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">Gagal Memuat Materi</h2>
        <p class="text-gray-600 dark:text-gray-400 mb-6">${message}</p>
        <a href="#/materisiswa_list" class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">
          <i class="fas fa-arrow-left mr-2"></i>Kembali ke Daftar Materi
        </a>
      </div>
    `;
  }
}
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  };
  toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg text-white ${colors[type]} shadow-lg flex items-center`;
  toast.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                     type === 'error' ? 'fa-exclamation-circle' : 
                     'fa-info-circle'} mr-2"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
}