import ReusableTable from './reusableTable.js';

let dataTugas = [];
let jurusan = '';

export async function initPage() {
  try {
    await loading();
    localStorage.removeItem('selected_tugas_id');
    
    const tugas = await getSiswaJurusanMapelMateriTugas(user.user_no, user.id_sekolah);
    if (tugas.error) {
      console.error('❌ Gagal ambil data Tugas:', tugas.error.message);
      return;
    }
    
    jurusan = tugas.data.jurusan[0]?.nama_jurusan || '';
    
    // Flatten data tugas untuk siswa
    dataTugas = (tugas.data.mapel || [])
      .flatMap(mapel => 
        (mapel.materi || [])
          .flatMap(materi => 
            (materi.tugas || []).map(tugasItem => ({
              ...tugasItem,
              mapel_nama: mapel.nama_mapel,
              materi_nama: materi.nama_materi,
              semester: materi.semester || mapel.semester
            }))
          )
      )
      .filter(tugas => tugas.id); // Hanya tugas yang valid

    // Gunakan ReusableTable
    const table = new ReusableTable({
      containerId: 'tugas-list',
      title: 'Daftar Tugas',
      subtitle: `Tugas pembelajaran untuk jurusan ${jurusan}`,
      icon: 'clipboard',
      enableStatistics: true,
      emptyStateTitle: 'Belum ada tugas',
      emptyStateMessage: 'Tidak ada tugas yang tersedia saat ini.',
      emptyStateIcon: 'clipboard',
      columns: [
        {
          key: 'mapel_nama',
          label: 'Mata Pelajaran',
          type: 'icon',
          iconName: 'book'
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
                ${jurusan || '-'}
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
              ${item.deadline ? `
                <div class="text-xs text-red-500 dark:text-red-400 mt-1">
                  <i data-feather="clock" class="w-3 h-3 inline mr-1"></i>
                  Deadline: ${new Date(item.deadline).toLocaleDateString('id-ID')}
                </div>
              ` : ''}
            </td>
          `
        }
      ],
      dataLoader: () => prepareTugasSiswaData(dataTugas),
      statistics: (data) => generateTugasSiswaStatistics(data),
      onRowClick: (item) => handleTugasSiswaClick(item)
    });

    await table.init();
    
  } catch (err) {
    console.error('❌ Error ambil Tugas:', err);
  } finally {
    await loadingout();
  }
}

function prepareTugasSiswaData(rawTugas) {
  return rawTugas.map(tugas => ({
    id: tugas.id,
    mapel_nama: tugas.mapel_nama || '-',
    semester: tugas.semester || '-',
    jurusan: jurusan,
    materi_nama: tugas.materi_nama || '-',
    nama_tugas: tugas.nama_tugas || 'Tugas Tanpa Judul',
    deskripsi: tugas.deskripsi,
    deadline: tugas.deadline,
    _raw: tugas
  }));
}

function generateTugasSiswaStatistics(data) {
  const totalTugas = data.length;
  const mapelCount = [...new Set(data.map(item => item.mapel_nama))].length;
  const deadlineMendekati = data.filter(item => {
    if (!item.deadline) return false;
    const deadline = new Date(item.deadline);
    const sekarang = new Date();
    const diffTime = deadline - sekarang;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0;
  }).length;

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
    
    <div class="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-amber-100 text-sm">Deadline Mendekati</p>
          <p class="text-2xl font-bold">${deadlineMendekati}</p>
        </div>
        <div class="bg-white/20 p-3 rounded-xl">
          <i data-feather="clock" class="w-6 h-6"></i>
        </div>
      </div>
    </div>
  `;
}

function handleTugasSiswaClick(item) {
  const id_tugas = item._raw.id;
  localStorage.setItem('selected_tugas_id', id_tugas);
  window.location.hash = '#/tugassiswa_detail';
}

function getPreviewText(text, maxLength = 60) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '…' : text;
}