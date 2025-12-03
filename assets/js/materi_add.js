import Quill from 'https://cdn.skypack.dev/quill';
export function initPage() {
  const form = document.getElementById('addMateriForm');
  const mapelSelect = document.getElementById('mapel');
  const quill = new Quill('#editor', {
    theme: 'snow',
    placeholder: 'Tulis materi di sini...',
    modules: {
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline'],
        ['link', 'blockquote', 'code-block', 'image'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ color: [] }, { background: [] }],
        ['clean']
      ]
    }
  });
  setupDropdownFilters({ user_no: user.user_no, id_sekolah: user.id_sekolah, role: user.role}, {
    jurusanEl: document.getElementById('jurusan'),
    mapelEl: document.getElementById('mapel'),
    semesterContainerEl: document.getElementById('semesterContainer'),
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await loading();
    const mapel = mapelSelect.value;
    const kode_materi = document.getElementById('kode_materi').value;
    const nama_materi = document.getElementById('nama_materi').value;
    const isi_materi = quill.root.innerHTML;
    const fileInput = document.getElementById('file_materi');
    const semesterNodes = document.querySelectorAll('input[name="semester"]:checked');
    const semesters = Array.from(semesterNodes).map(node => parseInt(node.value));
    let fileUrl = null;
    let data = {};
    if (semesterNodes.length === 0) {
      alert('Pilih minimal satu semester.');
      return;
    }
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const filePath = `materi/${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('materi').upload(filePath, file);
      if (uploadError) {
        alert('Upload file gagal: ' + uploadError.message);
        return;
      }
      fileUrl = `${SUPABASE_URL}/storage/v1/object/public/materi/${filePath}`;
    }
    let berhasil = 0;
    for (const sem of semesters) {
      data = {
        kode_materi: kode_materi,
        nama_materi: nama_materi,
        id_sekolah: user.id_sekolah,
        isi: isi_materi || null,
        file_url: fileUrl,
        semester: sem,
        id_guru: user.id,
        id_mapel: mapel,
      };
      const insertError = await insertMateri(data);
      if (insertError) {
        alert('Gagal menambahkan materi: ' + insertError.message);
      } else {
        berhasil ++;
      }
    };
      if (berhasil = 0) {
        alert('Gagal menambahkan materi: ' + insertError.message);
      } else {
        alert('Materi berhasil ditambahkan!');
        form.reset();
        window.location.href = "#/materi_list";
      }
      await loadingout();
  });
}