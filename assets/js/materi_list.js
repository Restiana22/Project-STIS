import ReusableTable from './reusableTable.js';

let dataMateri = [];

export async function initPage() {
  try {
    await loading();
    
    const materi = await getGuruJurusanMapelMateriTugas(user.user_no, user.id_sekolah, user.role);
    if (materi.error) {
      console.error('❌ Gagal ambil data materi:', materi.error.message);
      return;
    }
    
    dataMateri = materi.data.materi || [];
    
    // Gunakan ReusableTable
    const table = new ReusableTable({
      containerId: 'materi-list',
      title: 'Daftar Materi',
      subtitle: 'Kelola materi pembelajaran untuk semua mata pelajaran',
      icon: 'file-text',
      enableStatistics: true,
      emptyStateTitle: 'Belum ada materi',
      emptyStateMessage: 'Mulai dengan membuat materi pertama Anda.',
      emptyStateIcon: 'file',
      emptyStateButton: {
        text: 'Tambah Materi',
        icon: 'plus',
        onclick: "window.location.hash = '#/materi_add'"
      },
      columns: [
        {
          key: 'nama_mapel',
          label: 'Mata Pelajaran',
          type: 'icon',
          iconName: 'book',
          subtitleKey: 'kode_mapel'
        },
        {
          key: 'kode_materi',
          label: 'Kode Materi',
          render: (value) => `
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                ${value || '-'}
              </span>
            </td>
          `
        },
        {
          key: 'nama_materi',
          label: 'Judul Materi',
          render: (value, item) => `
            <td class="px-6 py-4">
              <div class="font-semibold text-gray-900 dark:text-white">${value || '-'}</div>
              ${item.isi ? `<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${getPreviewText(item.isi)}</div>` : ''}
            </td>
          `
        },
        {
          key: 'jurusan_semester',
          label: 'Jurusan & Semester',
          render: (value, item) => `
            <td class="px-6 py-4">
              <div class="space-y-1">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  ${item.jurusan || '-'}
                </span>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  Semester: ${item.semester || '-'}
                </div>
              </div>
            </td>
          `
        },
        {
          key: 'nama_guru',
          label: 'Guru Pengajar',
          render: (value) => `
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex items-center">
                <div class="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center mr-3">
                  <i data-feather="user" class="w-4 h-4 text-white"></i>
                </div>
                <span class="text-gray-700 dark:text-gray-200">${value || '-'}</span>
              </div>
            </td>
          `
        }
      ],
      dataLoader: () => prepareMateriData(dataMateri),
      statistics: (data) => generateMateriStatistics(data),
      onRowClick: (item) => handleMateriClick(item)
    });

    await table.init();
    
  } catch (err) {
    console.error('❌ Error ambil materi:', err);
  } finally {
    await loadingout();
  }
}

function prepareMateriData(rawMateri) {
  return rawMateri.map(materi => ({
    id: materi.id,
    nama_mapel: materi.nama_mapel || '-',
    kode_mapel: materi.kode_mapel || '-',
    kode_materi: materi.kode_materi || '-',
    nama_materi: materi.nama_materi || 'Materi Tanpa Judul',
    jurusan: materi.jurusan || '-',
    semester: materi.semester || '-',
    nama_guru: materi.nama_guru || '-',
    isi: materi.isi,
    created_at: materi.created_at,
    _raw: materi
  }));
}

function generateMateriStatistics(data) {
  const totalMateri = data.length;
  const mapelCount = [...new Set(data.map(item => item.nama_mapel))].length;
  const jurusanCount = [...new Set(data.map(item => item.jurusan))].length;

  return `
    <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-blue-100 text-sm">Total Materi</p>
          <p class="text-2xl font-bold">${totalMateri}</p>
        </div>
        <div class="bg-white/20 p-3 rounded-xl">
          <i data-feather="file-text" class="w-6 h-6"></i>
        </div>
      </div>
    </div>
    
    <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-green-100 text-sm">Mata Pelajaran</p>
          <p class="text-2xl font-bold">${mapelCount}</p>
        </div>
        <div class="bg-white/20 p-3 rounded-xl">
          <i data-feather="book" class="w-6 h-6"></i>
        </div>
      </div>
    </div>
    
    <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-purple-100 text-sm">Jurusan</p>
          <p class="text-xl font-bold">${jurusanCount}</p>
        </div>
        <div class="bg-white/20 p-3 rounded-xl">
          <i data-feather="users" class="w-6 h-6"></i>
        </div>
      </div>
    </div>
  `;
}

function handleMateriClick(item) {
  const id_materi = item._raw.id;
  if (id_materi) {
    sessionStorage.setItem('selected_materi_id', id_materi);
    window.location.hash = '#/materi_detail';
  }
}

function getPreviewText(html, maxLength = 60) {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const text = temp.textContent || temp.innerText || '';
  return text.length > maxLength ? text.substring(0, maxLength) + '…' : text;
}