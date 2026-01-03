export async function initPage() {
  document.getElementById('nama-skill').focus();
}
window.tambahSkills = async () => {
  const namaSkill = document.getElementById('nama-skill').value.trim();
  if (!namaSkill) {
    alert('Nama skill harus diisi!');
    return;
  }
  try {
    const data = {
      nama_skill: namaSkill,
    };
    const { error } = await supabase
      .from('skills')
      .insert([data]);
    if (error) throw error;
    alert('Skill berhasil ditambahkan!');
    window.location.hash = '#/pelanggaran_list';
  } catch (err) {
    console.error('Gagal menambahkan skill:', err);
    alert('Gagal menambahkan skill');
  }
};
