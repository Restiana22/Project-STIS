import ReusableTable from './reusableTable.js';

let dataMapel = [];

export async function initPage() {
  try {
    await loading();
    localStorage.removeItem('selectmateri');
    localStorage.removeItem('selected_materi_id');
    
    const mapel = await getSiswaJurusanMapelMateriTugas(user.user_no, user.id_sekolah);
    if (mapel.error) {
      console.error('❌ Gagal ambil data mapel:', mapel.error.message);
      return;
    }
    
    dataMapel = mapel.data;
    
    // Gunakan reusable table
    const table = new ReusableTable({
      containerId: 'mapel-list',
      title: 'Mata Pelajaran',
      subtitle: 'Daftar mata pelajaran yang tersedia untuk semester aktif',
      icon: 'book',
      enableStatistics: true,
      emptyStateTitle: 'Belum ada mata pelajaran',
      emptyStateMessage: 'Tidak ada mapel untuk semester ini.',
      emptyStateIcon: 'book-open',
      columns: [
        {
          key: 'nama_mapel',
          label: 'Mata Pelajaran',
          type: 'icon',
          iconName: 'book',
          subtitleKey: 'kode_mapel'
        },
        {
          key: 'jurusan',
          label: 'Jurusan',
          type: 'badge',
          colorType: 'status'
        },
        {
          key: 'semester',
          label: 'Semester',
          type: 'badge',
          colorType: 'status'
        },
        {
          key: 'guru',
          label: 'Guru'
        },
        {
          key: 'materi_count',
          label: 'Jumlah Materi',
          render: (value, item) => {
            const colorClass = value === 0 ? 'text-red-500 font-semibold' : 'text-green-500 font-semibold';
            return `
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <span class="${colorClass}">${value}</span>
              </td>
            `;
          }
        }
      ],
      dataLoader: () => prepareMapelData(dataMapel),
      statistics: (data) => generateStatistics(data),
      onRowClick: (item) => handleRowClick(item)
    });

    await table.init();
    
  } catch (err) {
    console.error('❌ Error ambil mapel:', err);
  } finally {
    await loadingout();
  }
}

// Helper methods
function prepareMapelData(rawData) {
  const semesterSiswa = rawData.siswa?.semester;
  const groupedMapel = {};

  rawData.mapel.forEach(item => {
    const key = item.kode_mapel || item.nama_mapel;
    if (!groupedMapel[key]) {
      groupedMapel[key] = {
        kode_mapel: item.kode_mapel,
        nama_mapel: item.nama_mapel,
        jurusan: new Set(),
        semester: new Set(),
        guru: new Set(),
        materi: [],
        items: []
      };
    }

    if (rawData.jurusan && rawData.jurusan.length > 0) {
      groupedMapel[key].jurusan.add(rawData.jurusan[0].nama_jurusan);
    }
    
    groupedMapel[key].semester.add(item.semester);
    
    if (item.guru && item.guru.length > 0) {
      item.guru.forEach(g => {
        if (g.name) groupedMapel[key].guru.add(g.name);
      });
    }

    if (item.materi && Array.isArray(item.materi)) {
      item.materi.forEach(materi => {
        const materiSemesters = materi.semester.split(',').map(s => s.trim());
        const sesuaiSemester = materiSemesters.includes(semesterSiswa.toString());
        if (sesuaiSemester) {
          const existingMateri = groupedMapel[key].materi.find(m => m.id === materi.id);
          if (!existingMateri) {
            groupedMapel[key].materi.push(materi);
          }
        }
      });
    }
    
    groupedMapel[key].items.push(item);
  });

  return Object.values(groupedMapel).map(group => ({
    kode_mapel: group.kode_mapel,
    nama_mapel: group.nama_mapel,
    jurusan: Array.from(group.jurusan).join(', ') || '-',
    semester: Array.from(group.semester).join(', ') || '-',
    guru: Array.from(group.guru).join(', ') || '-',
    materi_count: group.materi.length,
    _raw: group
  }));
}

function generateStatistics(data) {
  const totalMapel = data.length;
  const totalMateri = data.reduce((sum, item) => sum + item.materi_count, 0);
  const mapelDenganMateri = data.filter(item => item.materi_count > 0).length;

  return `
    <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-blue-100 text-sm">Total Mapel</p>
          <p class="text-2xl font-bold">${totalMapel}</p>
        </div>
        <div class="bg-white/20 p-3 rounded-xl">
          <i data-feather="book" class="w-6 h-6"></i>
        </div>
      </div>
    </div>
    
    <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-green-100 text-sm">Total Materi</p>
          <p class="text-2xl font-bold">${totalMateri}</p>
        </div>
        <div class="bg-white/20 p-3 rounded-xl">
          <i data-feather="file-text" class="w-6 h-6"></i>
        </div>
      </div>
    </div>
    
    <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-purple-100 text-sm">Mapel Aktif</p>
          <p class="text-xl font-bold">${mapelDenganMateri}</p>
        </div>
        <div class="bg-white/20 p-3 rounded-xl">
          <i data-feather="check-circle" class="w-6 h-6"></i>
        </div>
      </div>
    </div>
  `;
}

function handleRowClick(item) {
  const dataToSend = {
    mapel: {
      kode_mapel: item._raw.kode_mapel,
      nama_mapel: item._raw.nama_mapel,
      jurusan: Array.from(item._raw.jurusan),
      semester: Array.from(item._raw.semester),
      guru: Array.from(item._raw.guru)
    },
    materi: item._raw.materi,
    jumlah_materi: item._raw.materi.length,
    siswa: dataMapel.siswa,
    semester_siswa: dataMapel.siswa?.semester
  };
  
  localStorage.setItem('selectmateri', JSON.stringify(dataToSend));
  window.location.hash = '#/materisiswa_list';
}