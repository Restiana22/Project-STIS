let dataJurusan = [];
let dataMapel = [];
export async function initPage() {
  await loading();
  const user = JSON.parse(localStorage.getItem('user'));
  await fetchJurusan(user.id_sekolah);
  await fetchMapel(user.id_sekolah);
  setupSearchFunctionality();
  await loadingout();
}
async function fetchJurusan(idSekolah) {
  const { data, error } = await getJurusan(idSekolah);
  if (error) {
    console.error("❌ Gagal ambil jurusan:", error.message);
    showError('jurusan', 'Gagal memuat data jurusan');
    return;
  }
  dataJurusan = data;
  renderList('jurusan', dataJurusan);
}
async function fetchMapel(idSekolah) {
  const { data, error } = await getMapel(idSekolah);
  if (error) {
    console.error("❌ Gagal ambil mapel:", error.message);
    showError('mapel', 'Gagal memuat data mata pelajaran');
    return;
  }
  dataMapel = data;
  renderList('mapel', dataMapel);
}
function renderList(key, dataArr) {
  const ul = document.getElementById(`list-${key}`);
  const totalElement = document.getElementById(`total-${key}`);
  const emptyState = document.getElementById(`empty-${key}`);
  totalElement.textContent = dataArr.length;
  ul.innerHTML = '';
  if (!Array.isArray(dataArr) || dataArr.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');
  dataArr.forEach((item, index) => {
    if (key === 'jurusan') {
      renderJurusanItem(ul, item);
    } else if (key === 'mapel') {
      renderMapelItem(ul, item);
    }
  });
  attachEventListeners(key);
}
function renderJurusanItem(container, item) {
  const li = document.createElement('li');
  li.className = 'bg-gray-50 dark:bg-gray-700 p-3 rounded-lg flex justify-between items-center';
  li.innerHTML = `
    <div>
      <h3 class="font-medium text-gray-800 dark:text-white">${item.nama_jurusan}</h3>
      <p class="text-sm text-gray-600 dark:text-gray-300">Kode: ${item.kode_jurusan}</p>
    </div>
    <div class="flex space-x-2">
      <button class="edit-btn text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1" data-id="${item.id}" data-type="jurusan">
        <i class="fas fa-edit"></i>
      </button>
      <button class="delete-btn text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1" data-id="${item.id}" data-type="jurusan">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  `;
  container.appendChild(li);
}
function renderMapelItem(container, item) {
  const li = document.createElement('li');
  li.className = 'bg-gray-50 dark:bg-gray-700 p-3 rounded-lg';
  let namaJurusan = "Tidak diketahui";
  if (item.id_jurusan && dataJurusan.length > 0) {
    const jurusan = dataJurusan.find(j => j.id == item.id_jurusan);
    if (jurusan) {
      namaJurusan = jurusan.nama_jurusan;
    }
  }
  li.innerHTML = `
    <div class="flex justify-between items-start mb-2">
      <div>
        <h3 class="font-medium text-gray-800 dark:text-white">${item.nama_mapel}</h3>
        <p class="text-sm text-gray-600 dark:text-gray-300">Kode: ${item.kode_mapel}</p>
      </div>
      <div class="flex space-x-2">
        <button class="edit-btn text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1" data-id="${item.id}" data-type="mapel">
          <i class="fas fa-edit"></i>
        </button>
        <button class="delete-btn text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1" data-id="${item.id}" data-type="mapel">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
      <div class="flex items-center">
        <i class="fas fa-graduation-cap mr-1"></i>
        <span>Jurusan: ${namaJurusan}</span>
      </div>
      <div class="flex items-center">
        <i class="fas fa-calendar-alt mr-1"></i>
        <span>Semester: ${item.semester || 'Tidak ditentukan'}</span>
      </div>
    </div>
  `;
  container.appendChild(li);
}
function attachEventListeners(type) {
  document.querySelectorAll(`.edit-btn[data-type="${type}"]`).forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      const item = type === 'jurusan' 
        ? dataJurusan.find(item => item.id == id) 
        : dataMapel.find(item => item.id == id);
      if (item) {
        const fieldName = type === 'jurusan' ? 'nama_jurusan' : 'nama_mapel';
        const currentName = item[fieldName];
        const newName = prompt(`Edit ${type === 'jurusan' ? 'jurusan' : 'mata pelajaran'}:`, currentName);
        if (newName && newName !== currentName) {
          await loading();
          const table = type;
          const { error } = await supabase
            .from(table)
            .update({ [fieldName]: newName })
            .eq('id', id);
          if (error) {
            alert(`Gagal mengupdate: ${error.message}`);
          } else {
            item[fieldName] = newName;
            renderList(type, type === 'jurusan' ? dataJurusan : dataMapel);
          }
          await loadingout();
        }
      }
    });
  });
  document.querySelectorAll(`.delete-btn[data-type="${type}"]`).forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      const item = type === 'jurusan' 
        ? dataJurusan.find(item => item.id == id) 
        : dataMapel.find(item => item.id == id);
      if (item && confirm(`Yakin ingin menghapus "${item.nama_jurusan || item.nama_mapel}"?`)) {
        await loading();
        const table = type;
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('id', id);
        if (error) {
          alert(`Gagal menghapus: ${error.message}`);
        } else {
          if (type === 'jurusan') {
            dataJurusan = dataJurusan.filter(item => item.id != id);
            renderList(type, dataJurusan);
          } else {
            dataMapel = dataMapel.filter(item => item.id != id);
            renderList(type, dataMapel);
          }
        }
        await loadingout();
      }
    });
  });
}
function setupSearchFunctionality() {
  const jurusanSearch = document.getElementById('search-jurusan');
  jurusanSearch.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = dataJurusan.filter(item => 
      item.nama_jurusan.toLowerCase().includes(searchTerm) || 
      item.kode_jurusan.toLowerCase().includes(searchTerm)
    );
    renderList('jurusan', filtered);
  });
  const mapelSearch = document.getElementById('search-mapel');
  mapelSearch.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = dataMapel.filter(item => 
      item.nama_mapel.toLowerCase().includes(searchTerm) || 
      item.kode_mapel.toLowerCase().includes(searchTerm)
    );
    renderList('mapel', filtered);
  });
}
function showError(type, message) {
  const ul = document.getElementById(`list-${type}`);
  ul.innerHTML = `
    <li class="text-center py-4 text-red-600 dark:text-red-400">
      <i class="fas fa-exclamation-circle mr-2"></i> ${message}
    </li>
  `;
}