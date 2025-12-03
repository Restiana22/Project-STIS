export function initPage() {
  const user = JSON.parse(localStorage.getItem('user'));
 document.getElementById('addSekolahForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    await loading();
    const item = document.getElementById('item').value;
    let userData = {};
    try {
      if (item === 'jurusan') {
        userData = {
          nama_jurusan: document.getElementById('nama_jurusan').value,
          kode_jurusan: document.getElementById('kode_jurusan').value,
          id_sekolah: user.id_sekolah,
        };
        const push = await insertJurusan(userData);
        if (push) {
          throw new Error(push.message || "Gagal menambahkan item");
        }
      } 
      else if (item === 'mapel') {
        userData = {
          nama_mapel: document.getElementById('nama_mapel').value,
          kode_mapel: document.getElementById('kode_mapel').value,
          id_jurusan: document.getElementById('jurusan').value,
          semester: document.getElementById('semester').value,
          id_sekolah: user.id_sekolah,
        };
        const push = await insertMapel(userData);
        if (push) {
          throw new Error(push.message || "Gagal menambahkan item");
        }
      } 
      else if (item === 'inventaris') {
        userData = {
          nama_inventaris: document.getElementById('nama_inventaris').value,
          kode_inventaris: document.getElementById('kode_inventaris').value,
          id_sekolah: user.id_sekolah,
          kode_item: item,
        };
        const push = await insertInventaris(userData);
        if (push) {
          throw new Error(push.message || "Gagal menambahkan item");
        }
      } 
      else {
        userData = {
          nama_inventaris: document.getElementById('nama_item').value,
          kode_inventaris: document.getElementById('kode_item').value,
          id_sekolah: user.id_sekolah,
          kode_item: document.getElementById('group_item').value,
        };
        const push = await insertInventaris(userData);
        if (error) {
          throw new Error(push.message || "Gagal menambahkan item");
        }
      }
      alert("Item berhasil ditambahkan!");
      document.getElementById('addSekolahForm').reset();
      window.location.href = "#/sekolah_listitem";
    } 
    catch (error) {
      console.error("Error adding item:", error);
      alert(`Gagal menambahkan item: ${error.message}`);
    } 
    finally {
      await loadingout();
    }
  });
  const itemSelect = document.getElementById('item');
  itemSelect.addEventListener('change', function () {
    const selectedItem = this.value;
    const allFieldDivs = document.querySelectorAll('[id$="Fields"]');
    allFieldDivs.forEach(div => {
      div.classList.add('hidden');
      const inputs = div.querySelectorAll('input, select');
      inputs.forEach(input => {
        input.removeAttribute('required');
        input.classList.remove('error');
      });
    });
    const targetDiv = document.getElementById(selectedItem + 'Fields');
    if (targetDiv) {
      targetDiv.classList.remove('hidden');
      const inputs = targetDiv.querySelectorAll('[data-require]');
      inputs.forEach(input => {
        input.setAttribute('required', 'true');
      });
    }
    if (selectedItem === 'mapel') {
      fetchJurusan();
    }
  });
  function validateForm() {
    const selectedItem = document.getElementById('item').value;
    const targetDiv = document.getElementById(selectedItem + 'Fields');
    let isValid = true;
    if (!targetDiv) {
      alert('Silakan pilih jenis item terlebih dahulu');
      return false;
    }
    const requiredInputs = targetDiv.querySelectorAll('[required]');
    requiredInputs.forEach(input => {
      if (!input.value.trim()) {
        input.classList.add('error');
        isValid = false;
        let errorElement = input.nextElementSibling;
        if (!errorElement || !errorElement.classList.contains('error-message')) {
          errorElement = document.createElement('div');
          errorElement.className = 'error-message';
          errorElement.textContent = 'Field ini wajib diisi';
          input.parentNode.appendChild(errorElement);
        }
        errorElement.style.display = 'block';
      } else {
        input.classList.remove('error');
        const errorElement = input.nextElementSibling;
        if (errorElement && errorElement.classList.contains('error-message')) {
          errorElement.style.display = 'none';
        }
      }
    });
    if (selectedItem === 'mapel') {
      const semesterInput = document.getElementById('semester');
      const semesterValue = parseInt(semesterInput.value);
      if (isNaN(semesterValue) || semesterValue < 1 || semesterValue > 12) {
        semesterInput.classList.add('error');
        isValid = false;
        let errorElement = semesterInput.nextElementSibling;
        if (!errorElement || !errorElement.classList.contains('error-message')) {
          errorElement = document.createElement('div');
          errorElement.className = 'error-message';
          semesterInput.parentNode.appendChild(errorElement);
        }
        errorElement.textContent = 'Semester harus antara 1-12';
        errorElement.style.display = 'block';
      }
    }
    return isValid;
  }
  async function fetchJurusan() {
    try {
      const { data: sekolahData, error: sekolahError } = await supabase
        .from('sekolah')
        .select('*')
        .eq('kode_sekolah', user.kode_sekolah)
        .single();
      if (sekolahError || !sekolahData) {
        throw new Error(sekolahError?.message || "Gagal mengambil data sekolah");
      }
      const { data: jurusanData, error: jurusanError } = await supabase
        .from('jurusan')
        .select('*')
        .eq('id_sekolah', sekolahData.id)
        .order('nama_jurusan');
      if (jurusanError || !jurusanData) {
        throw new Error(jurusanError?.message || "Gagal mengambil data jurusan");
      }
      const jurusanSelect = document.getElementById('jurusan');
      jurusanSelect.innerHTML = '<option value="">Pilih jurusan</option>';
      jurusanData.forEach(j => {
        const option = document.createElement('option');
        option.value = j.id;
        option.textContent = j.nama_jurusan;
        jurusanSelect.appendChild(option);
      });
    } 
    catch (error) {
      console.error('Error fetching jurusan:', error);
      alert(`Gagal memuat data jurusan: ${error.message}`);
    }
  }
}