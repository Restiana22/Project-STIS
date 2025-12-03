export function initPage() {
  function setupTimeInput(inputId) {
    const input = document.getElementById(inputId);
    input.addEventListener('input', function () {
      let value = input.value.replace(/\D/g, '');
      if (value.length > 4) value = value.slice(0, 4);
      if (value.length >= 3) {
        let jam = parseInt(value.slice(0, 2), 10);
        let menit = parseInt(value.slice(2, 4), 10);
        if (jam > 23) jam = 23;
        if (menit > 59) menit = 59;
        value = jam.toString().padStart(2, '0') + ':' + menit.toString().padStart(2, '0');
      }
      input.value = value;
    });
    input.addEventListener('keydown', function (e) {
      const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
      if (!((e.key >= '0' && e.key <= '9') || allowed.includes(e.key))) {
        e.preventDefault();
      }
    });
  }
  setupTimeInput('jamMulai');
  setupTimeInput('jamSelesai');
  setupDropdownFilters({ user_no: user.user_no, id_sekolah: user.id_sekolah, role: user.role }, {
    jurusanEl: document.getElementById('jurusan'),
    mapelEl: document.getElementById('mapel'),
    semesterContainerEl: document.getElementById('semesterContainer'),
  });
  document.getElementById('addJadwalForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await loading();
    const hariList = Array.from(document.querySelectorAll('input[name="hari"]:checked')).map(el => el.value);
    const errorjadwal1=0;
    const semesterNodes = document.querySelectorAll('input[name="semester"]:checked');
    const semesters = Array.from(semesterNodes).map(node => parseInt(node.value));
    for (const hari of hariList) {
      for (const sem of semesters){
        const mapelData = {
          hari: hari,
          semester:sem,
          jamstart: document.getElementById('jamMulai').value,
          jamend: document.getElementById('jamSelesai').value,
          mapel: document.getElementById('mapel').value,
          jurusan: document.getElementById('jurusan').value,
          guru: user.id,
          id_sekolah: user.id_sekolah,
        }
        if (mapelData.hari.length === 0) {
          alert("Pilih hari untuk jadwal mengajar!");
          return;
        }
        const errorjadwal  = await insertJadwal(mapelData);
        if (errorjadwal) {
          alert("Gagal menambahkan jadwal: " + error.message);
          errorjadwal1++;
        }
      }
    };
    await loadingout();
    if (errorjadwal1 > 0) {
      alert("Gagal menambahkan jadwal: " + error.message);
    } else {
      alert(" Jadwal berhasil ditambahkan!");
      window.location.href = "#/jadwalmengajar_list";
    }
  });
}