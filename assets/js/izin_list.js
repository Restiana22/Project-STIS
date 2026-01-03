import ReusableTable from './reusableTable.js';

let dataizin = [];

export async function initPage() {
  try {
    await loading();
    
    const izin = await getIzinByUserId(user.id);
    if (izin.error) {
      console.error('❌ Gagal ambil data izin:', izin.error.message);
      return;
    }
    dataizin = izin.data || [];
    
    // Gunakan ReusableTable
    const table = new ReusableTable({
      containerId: 'izin-list',
      title: 'Daftar Izin',
      subtitle: 'Kelola izin',
      icon: 'file-text',
      enableStatistics: true,
      emptyStateTitle: 'Belum ada izin',
      emptyStateMessage: 'Mulai dengan membuat izin pertama Anda.',
      emptyStateIcon: 'file',
      emptyStateButton: {
        text: 'Tambah Izin',
        icon: 'plus',
        onclick: "window.location.hash = '#/izin'"
      },
      columns: [
        {
          key: 'nama',
          label: 'Nama',
          type: 'icon',
          iconName: 'book',
          subtitleKey: 'kode_mapel'
        },
        {
          key: 'jenis_izin',
          label: 'Tipe',
          render: (value, item) => `
            <td class="px-6 py-4">
              <div class="font-semibold text-gray-900 dark:text-white">${value || '-'}</div>
              ${item.jenis_izin ? `<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${getPreviewText(item.jenis_izin)}</div>` : ''}
            </td>
          `
        },
        {
          key: 'alasan',
          label: 'Alasan',
          render: (value, item) => `
            <td class="px-6 py-4">
              <div class="font-semibold text-gray-900 dark:text-white">${value || '-'}</div>
              ${item.alasan ? `<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${getPreviewText(item.alasan)}</div>` : ''}
            </td>
          `
        },
        {
          key: 'tanggal',
          label: 'Tanggal',
          render: (value, item) => `
            <td class="px-6 py-4">
              <div class="space-y-1">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  ${item.tanggal || '-'}
                </span>
              </div>
            </td>
          `
        },{
          key: 'status',
          label: 'Status',
          render: (value, item) => `
            <td class="px-6 py-4">
              <div class="font-semibold text-gray-900 dark:text-white">${value || '-'}</div>
              ${item.status ? `<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${getPreviewText(item.status)}</div>` : ''}
            </td>
          `
        },
      ],
      dataLoader: () => prepareMateriData(dataizin),
    });

    await table.init();
    
  } catch (err) {
    console.error('❌ Error ambil materi:', err);
  } finally {
    await loadingout();
  }
}

function prepareMateriData(rawIzin) {
  console.log('Raw Izin Data:', user);
  const name= user.name;
  return rawIzin.map(izin => ({
    id: izin.id,
    nama: user.name || '-',
    jenis_izin: izin.jenis_izin || '-',
    alasan: izin.alasan || '-',
    file: izin.lampiran_url || 'izin Tanpa file',
    status: izin.status || '-',
    tanggal: izin.created_at,
    _raw: izin
  }));
}



function getPreviewText(html, maxLength = 60) {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const text = temp.textContent || temp.innerText || '';
  return text.length > maxLength ? text.substring(0, maxLength) + '…' : text;
}