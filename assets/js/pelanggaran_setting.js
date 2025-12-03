let tingkatPeringatan = [];
export async function initPage() {
  await loadCurrentSettings();
  renderTingkatPeringatan();
  setupEventListeners();
}
async function loadCurrentSettings() {
  const { data: settings } = await getSettingPeringatan(user.id_sekolah);
  tingkatPeringatan = settings.sort((a, b) => a.batas_point - b.batas_point);
  if (tingkatPeringatan.length === 0) {
    tingkatPeringatan = [
      { nama_peringatan: "Peringatan 1", batas_point: 50, id_sekolah: user.id_sekolah },
      { nama_peringatan: "Peringatan 2", batas_point: 100, id_sekolah: user.id_sekolah },
      { nama_peringatan: "Peringatan 3", batas_point: 150, id_sekolah: user.id_sekolah }
    ];
  }
}
function renderTingkatPeringatan() {
  const container = document.getElementById('peringatan-container');
  container.innerHTML = '';
  tingkatPeringatan.sort((a, b) => a.batas_point - b.batas_point).forEach((tingkat, index) => {
    const warna = generateColor(index, tingkatPeringatan.length);
    const div = document.createElement('div');
    div.className = `p-4 border rounded-lg flex items-center justify-between`;
    div.style.borderColor = warna.border;
    div.innerHTML = `
      <div class="flex-1">
        <div class="flex items-center space-x-3">
          <div class="w-6 h-6 rounded-full" style="background-color: ${warna.badge}"></div>
          <input type="text" 
                 value="${tingkat.nama_peringatan}" 
                 class="nama-peringatan bg-transparent border-b focus:border-blue-500 outline-none"
                 placeholder="Nama Peringatan">
        </div>
      </div>
      <div class="flex items-center space-x-2">
        <input type="number" 
               value="${tingkat.batas_point}" 
               class="batas-point w-20 p-2 border rounded bg-white dark:bg-gray-700"
               min="1">
        <span>Poin</span>
        <button class="hapus-tingkat text-red-500 hover:text-red-900">
          <i data-feather="trash-2"></i>
        </button>
      </div>
    `;
    container.appendChild(div);
  });
  feather.replace();
}
function generateColor(index, total) {
  const hue = Math.max(0, 50 - (index * (50 / Math.max(1, total-1))));
  return {
    background: `hsla(${hue}, 80%, 90%, 0.5)`,
    border: `hsla(${hue}, 80%, 70%, 0.7)`,
    badge: `hsla(${hue}, 80%, 50%, 1)`
  };
}
function setupEventListeners() {
  document.getElementById('tambahTingkatBtn').addEventListener('click', () => {
    const maxPoint = tingkatPeringatan.length > 0 
      ? Math.max(...tingkatPeringatan.map(t => t.batas_point)) + 50 
      : 50;
    tingkatPeringatan.push({
      nama_peringatan: `Peringatan ${tingkatPeringatan.length + 1}`,
      batas_point: maxPoint,
      id_sekolah: user.id_sekolah
    });
    renderTingkatPeringatan();
  });
  document.getElementById('simpanSettingBtn').addEventListener('click', async () => {
    const inputs = document.querySelectorAll('.nama-peringatan, .batas-point');
    inputs.forEach((input, index) => {
      const tingkatIndex = Math.floor(index / 2);
      if (tingkatIndex < tingkatPeringatan.length) {
        if (input.classList.contains('nama-peringatan')) {
          tingkatPeringatan[tingkatIndex].nama_peringatan = input.value;
        } else {
          tingkatPeringatan[tingkatIndex].batas_point = parseInt(input.value) || 0;
        }
      }
    });
    if (tingkatPeringatan.some(t => !t.nama_peringatan || isNaN(t.batas_point) || t.batas_point <= 0)) {
      alert('Semua tingkat harus memiliki nama dan batas poin yang valid!');
      return;
    }
    tingkatPeringatan.sort((a, b) => a.batas_point - b.batas_point);
    try {
      await supabase
        .from('setting_peringatan')
        .delete()
        .eq('id_sekolah', user.id_sekolah);
      const dataToInsert = tingkatPeringatan.map(({ id, ...rest }) => rest);
      const { error } = await supabase
        .from('setting_peringatan')
        .insert(dataToInsert);
      if (error) throw error;
      alert('Setting peringatan berhasil disimpan!');
      window.location.hash = '#/pelanggaran_list';
    } catch (err) {
      console.error('Gagal menyimpan setting:', err);
      alert('Gagal menyimpan setting: ' + err.message);
    }
  });
  document.getElementById('peringatan-container').addEventListener('click', (e) => {
    if (e.target.closest('.hapus-tingkat')) {
      const tingkatDiv = e.target.closest('div[style*="background-color"]');
      const index = Array.from(document.querySelectorAll('#peringatan-container > div')).indexOf(tingkatDiv);
      if (tingkatPeringatan.length <= 1) {
        alert('Minimal harus ada 1 tingkat peringatan');
        return;
      }
      if (confirm('Hapus tingkat peringatan ini?')) {
        tingkatPeringatan.splice(index, 1);
        renderTingkatPeringatan();
      }
    }
  });
}