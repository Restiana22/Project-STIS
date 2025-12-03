import ReusableTable from './reusableTable.js';

let dataTugas = [];

export async function initPage() {
  try {
    await loading();
    
    const tugas = await getGuruJurusanMapelMateriTugas(user.user_no, user.id_sekolah, user.role);
    if (tugas.error) {
      console.error('❌ Gagal ambil data Tugas:', tugas.error.message);
      return;
    }
    
    // Flatten data tugas
    dataTugas = (tugas.data.materi || [])
      .filter(item => Array.isArray(item.tugas) && item.tugas.length > 0)
      .flatMap(materi => 
        materi.tugas.map(tugasItem => ({
          ...tugasItem,
          materi_nama: materi.nama_materi,
          mapel_nama: materi.nama_mapel,
          mapel_kode: materi.kode_mapel,
          jurusan: materi.jurusan,
          semester: materi.semester
        }))
      );
    
    // Gunakan ReusableTable
    const table = new ReusableTable({
      containerId: 'tugas-list',
      title: 'Daftar Tugas',
      subtitle: 'Kelola tugas untuk semua mata pelajaran',
      icon: 'clipboard',
      enableStatistics: true,
      emptyStateTitle: 'Belum ada tugas',
      emptyStateMessage: 'Mulai dengan membuat tugas pertama Anda.',
      emptyStateIcon: 'clipboard',
      emptyStateButton: {
        text: 'Tambah Tugas',
        icon: 'plus',
        onclick: "window.location.hash = '#/tugas_add'"
      },
      columns: [
        {
          key: 'mapel_nama',
          label: 'Mata Pelajaran',
          type: 'icon',
          iconName: 'book',
          subtitleKey: 'mapel_kode'
        },
        {
          key: 'semester',
          label: 'Semester',
          type: 'badge',
          colorType: 'status'
        },
        {
          key: 'jurusan',
          label: 'Jurusan',
          render: (value) => `
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                ${value || '-'}
              </span>
            </td>
          `
        },
        {
          key: 'materi_nama',
          label: 'Nama Materi',
          render: (value) => `
            <td class="px-6 py-4">
              <div class="font-medium text-gray-900 dark:text-white">${value || '-'}</div>
            </td>
          `
        },
        {
          key: 'nama_tugas',
          label: 'Judul Tugas',
          render: (value, item) => `
            <td class="px-6 py-4">
              <div class="font-semibold text-gray-900 dark:text-white">${value || '-'}</div>
              ${item.deskripsi ? `<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${getPreviewText(item.deskripsi)}</div>` : ''}
            </td>
          `
        }
      ],
      dataLoader: () => prepareTugasData(dataTugas),
      statistics: (data) => generateTugasStatistics(data),
      onRowClick: (item) => handleTugasClick(item)
    });

    await table.init();
    
  } catch (err) {
    console.error('❌ Error ambil Tugas:', err);
  } finally {
    await loadingout();
  }
}

function prepareTugasData(rawTugas) {
  return rawTugas.map(tugas => ({
    id: tugas.id,
    mapel_nama: tugas.mapel_nama || '-',
    mapel_kode: tugas.mapel_kode || '-',
    semester: tugas.semester || '-',
    jurusan: tugas.jurusan || '-',
    materi_nama: tugas.materi_nama || '-',
    nama_tugas: tugas.nama_tugas || 'Tugas Tanpa Judul',
    deskripsi: tugas.deskripsi,
    deadline: tugas.deadline,
    _raw: tugas
  }));
}

function generateTugasStatistics(data) {
  const totalTugas = data.length;
  const mapelCount = [...new Set(data.map(item => item.mapel_nama))].length;
  const jurusanCount = [...new Set(data.map(item => item.jurusan))].length;

  return `
    <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-blue-100 text-sm">Total Tugas</p>
          <p class="text-2xl font-bold">${totalTugas}</p>
        </div>
        <div class="bg-white/20 p-3 rounded-xl">
          <i data-feather="clipboard" class="w-6 h-6"></i>
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

function handleTugasClick(item) {
  const id_tugas = item._raw.id;
  localStorage.setItem('selected_tugas_id', id_tugas);
  window.location.hash = '#/tugas_detail';
}

function getPreviewText(text, maxLength = 60) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '…' : text;
}