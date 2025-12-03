import ReusableTable from './reusableTable.js';

let dataMateri = [];
let selectedMapelData = null;

export async function initPage() {
  try {
    await loading();
    const storedData = localStorage.getItem('selectmateri');
    if (!storedData) {
      console.error('❌ Tidak ada data mapel yang dipilih');
      window.location.hash = '#/mapelsiswa_list';
      return;
    }
    
    selectedMapelData = JSON.parse(storedData);
    const { mapel, materi, siswa } = selectedMapelData;
    dataMateri = materi;

    // Render header info
    renderMapelInfo(mapel, materi);

    // Gunakan reusable table untuk daftar materi
    const table = new ReusableTable({
      containerId: 'materi-list',
      title: 'Daftar Materi',
      subtitle: `Materi pembelajaran untuk ${mapel.nama_mapel}`,
      icon: 'file-text',
      enableStatistics: false,
      emptyStateTitle: 'Belum ada materi',
      emptyStateMessage: 'Tidak ada materi yang tersedia untuk mata pelajaran ini.',
      emptyStateIcon: 'file',
      emptyStateButton: {
        text: 'Kembali ke Mapel',
        icon: 'arrow-left',
        onclick: "window.location.hash = '#/mapelsiswa_list'"
      },
      columns: [
        {
          key: 'nama_materi',
          label: 'Materi',
          type: 'icon',
          iconName: 'file-text',
          subtitleKey: 'kode_materi'
        },
        {
          key: 'semester',
          label: 'Semester',
          type: 'badge',
          colorType: 'status'
        },
        {
          key: 'created_at',
          label: 'Tanggal Dibuat',
          render: (value) => `
            <td class="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-200">
              ${value ? new Date(value).toLocaleDateString('id-ID') : '-'}
            </td>
          `
        },
        {
          key: 'tugas_count',
          label: 'Jumlah Tugas',
          render: (value, item) => {
            const tugasCount = item.tugas ? item.tugas.length : 0;
            const colorClass = tugasCount === 0 ? 'text-gray-500' : 'text-green-500 font-semibold';
            return `
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <span class="${colorClass}">${tugasCount}</span>
              </td>
            `;
          }
        },
        {
          key: 'preview',
          label: 'Preview',
          render: (value, item) => {
            const preview = getPreviewText(item.isi, 50);
            return `
              <td class="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm">
                ${preview}
              </td>
            `;
          }
        }
      ],
      dataLoader: () => prepareMateriData(dataMateri),
      statistics: (data) => generateMateriStatistics(data),
      onRowClick: (item) => handleMateriClick(item)
    });

    await table.init();
    
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await loadingout();
  }
}

function renderMapelInfo(mapel, materi) {
  const mapelInfoElement = document.getElementById('mapelInfo');
  if (mapelInfoElement) {
    mapelInfoElement.innerHTML = `
      <div class="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg mb-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="bg-white/20 p-3 rounded-xl">
              <i data-feather="book" class="w-6 h-6"></i>
            </div>
            <div>
              <h2 class="text-xl font-bold">${mapel.nama_mapel}</h2>
              <p class="text-blue-100 text-sm">Detail mata pelajaran dan materi pembelajaran</p>
            </div>
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold">${materi.length}</div>
            <div class="text-blue-100 text-sm">Total Materi</div>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/20">
          <div class="text-sm">
            <div class="font-semibold">Jurusan:</div>
            <div class="text-blue-100">${mapel.jurusan.join(', ') || '-'}</div>
          </div>
          <div class="text-sm">
            <div class="font-semibold">Semester:</div>
            <div class="text-blue-100">${mapel.semester.join(', ') || '-'}</div>
          </div>
          <div class="text-sm">
            <div class="font-semibold">Guru Pengajar:</div>
            <div class="text-blue-100">${mapel.guru.join(', ') || '-'}</div>
          </div>
        </div>
      </div>
    `;
    feather.replace();
  }
}

function prepareMateriData(rawMateri) {
  return rawMateri.map(materi => ({
    id: materi.id,
    nama_materi: materi.nama_materi || 'Materi Tanpa Judul',
    kode_materi: materi.kode_materi || '-',
    semester: materi.semester || '-',
    created_at: materi.created_at,
    isi: materi.isi,
    tugas: materi.tugas || [],
    tugas_count: materi.tugas ? materi.tugas.length : 0,
    _raw: materi
  }));
}

function generateMateriStatistics(data) {
  const totalMateri = data.length;
  const totalTugas = data.reduce((sum, item) => sum + item.tugas_count, 0);
  const materiDenganTugas = data.filter(item => item.tugas_count > 0).length;

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
          <p class="text-green-100 text-sm">Total Tugas</p>
          <p class="text-2xl font-bold">${totalTugas}</p>
        </div>
        <div class="bg-white/20 p-3 rounded-xl">
          <i data-feather="clipboard" class="w-6 h-6"></i>
        </div>
      </div>
    </div>
    
    <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-purple-100 text-sm">Materi dengan Tugas</p>
          <p class="text-xl font-bold">${materiDenganTugas}</p>
        </div>
        <div class="bg-white/20 p-3 rounded-xl">
          <i data-feather="check-circle" class="w-6 h-6"></i>
        </div>
      </div>
    </div>
  `;
}

function handleMateriClick(item) {
  localStorage.setItem('selected_materi_id', item.id);
  window.location.hash = '#/materisiswa_detail';
}

function getPreviewText(html, maxLength = 100) {
  if (!html) return 'Tidak ada deskripsi';
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const text = temp.textContent || temp.innerText || '';
  return text.length > maxLength ? text.substring(0, maxLength) + '…' : text;
}