document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  await loading();
  try {
    const user_no = document.getElementById('user_no').value.trim();
    const password = document.getElementById('password').value.trim();
    const kodesekolah = document.getElementById('kodesekolah').value.trim();
    const { data: sekolah, error: errorSekolah } = await supabase
      .from('sekolah')
      .select('id,nama_sekolah')
      .eq('kode_sekolah', kodesekolah)
      .single();
    if (errorSekolah || !sekolah) {
      alert('Kode Sekolah, User No, atau Password salah' +errorSekolah);
      throw new Error('Kode sekolah tidak valid atau tidak terdaftar');
    }
    const { data: cekuser, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_no', user_no)
      .eq('password', password)
      .eq('kode_sekolah', kodesekolah);
    if (error || !cekuser || cekuser.length === 0) {
      alert('Kode Sekolah, User No, atau Password salah');
      throw new Error('User tidak ditemukan atau password salah');
    }
    if (error) {
      console.error('❌ Error fetch user data:', error.message);
      return;
    }
    const user = cekuser.find(
      u => u.user_no === user_no && 
      u.password === password && 
      u.kode_sekolah === kodesekolah
    );
    if (user) {
      console.log('Login successful');
      const userData = {
        id: user.id,
        name: user.name,
        user_no: user.user_no,
        role: user.role,
        kode_sekolah: user.kode_sekolah,
        id_sekolah: user.id_sekolah,
        address: user.address
      };
      const { data: schoolData } = await getSchoolConfig(user.kode_sekolah);
      if (schoolData) {
        localStorage.setItem('schoolConfig', JSON.stringify(schoolData));
      }
      if (user.role === 'wali') {
        try {
          const { data: cekwali, error } = await getWaliDetail(user.user_no, user.id_sekolah);
          if (error) throw error;
          if (cekwali && Array.isArray(cekwali)) {
            const siswa_no = cekwali.map(m => m.siswa_no).filter(Boolean);
            userData.siswa_no = [...new Set(siswa_no)];
          } else {
            console.warn('siswa_no tidak ditemukan di response:', cekwali);
          }
        } catch (err) {
          console.error('Gagal mengambil data wali:', err);
        }
      }
      localStorage.setItem('user', JSON.stringify(userData));
      window.location.href = "route.html";
    } else {
      console.log('Login failed: Invalid credentials');
      document.getElementById('error').classList.remove('hidden');
      alert('Kode Sekolah, User No, atau Password salah');
    }
  } catch (err) {
    console.error("❌ Terjadi kesalahan saat mengambil data:", err);
  } finally {
    await loadingout();
  }
});

document.addEventListener('DOMContentLoaded', function() {
  const user = JSON.parse(localStorage.getItem('user'));
  const currentPage = window.location.pathname;
  if (user && user.id && currentPage.includes('login.html')) {
    console.log('✅ User already logged in, redirecting to dashboard');
    window.location.href = "route.html";
  }
});