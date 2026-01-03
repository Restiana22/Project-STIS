const SUPABASE_URL = "https://gcfbacgemevxgrikfgyc.supabase.co/";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjZmJhY2dlbWV2eGdyaWtmZ3ljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NTE0MzAsImV4cCI6MjA3OTUyNzQzMH0.wHKlRqj-iY1cIvegUes4D7vF_qYkcCWVHoY9NVvenDk";
// const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const supabaseClient = (window.supabase && typeof window.supabase.from === 'function')
  ? window.supabase
  : (window.supabase && typeof window.supabase.createClient === 'function'
      ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
      : null);
window.supabaseClient = supabaseClient;
if (supabaseClient) {
  window.supabase = supabaseClient; // keep backward compatibility
}
async function testConnection() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) {
    console.error("❌ Gagal koneksi ke Supabase:", error.message);
  } else {
    console.log("✅ Koneksi ke Supabase berhasil! Data:", data);
  }
}
async function loading() {
  const loader = document.getElementById("globalLoader");
  if (loader) {
    loader.classList.remove("hidden");
  }
  return true;
}
async function loadingout() {
  const loader = document.getElementById("globalLoader");
  if (loader) {
    loader.classList.add("hidden");
  }
  return true;
}
async function insertUser(data) {
  const { error } = await supabase.from('users').insert([data]);
  return error;
}
async function insertSiswa(data) {
  const { error } = await supabase.from('siswa').insert([data]);
  return error;
}
async function insertGuru(data) {
  const { error } = await supabase.from('guru').insert([data]);
  return error;
}
async function insertWali(data) {
  const { error } = await supabase.from('wali').insert([data]);
  return error;
}
async function insertJurusan(data) {
  const { error } = await supabase.from('jurusan').insert([data]);
  return error;
}
async function insertInventaris(data) {
  const { error } = await supabase.from('inventaris').insert([data]);
  return error;
}
async function insertMapel(data) {
  const { error } = await supabase.from('mapel').insert([data]);
  return error;
}
async function insertJadwal(data) {
  const { error } = await supabase.from('jadwal').insert([data]);
  return error;
}
async function insertMateri(data) {
  const { error } = await supabase.from('materi').insert([data]);
  return error;
}
async function insertTugas(data) {
  const { error } = await supabase.from('tugas').insert([data]);
  return error;
}
async function insertAbsen(data) {
  if (!data.absensi_oleh) {
    data.absensi_oleh = 'siswa';
  }
  const { error } = await supabase.from('kehadiran').insert([data]);
  return error;
}
async function insertJawabanTugas(data) {
  const { error } = await supabase.from('jawabantugas').insert([data]);
  return error;
}
async function updateAbsen(data,id_user, tanggal) {
  const { error } = await supabase.from('kehadiran').update([data]).eq('id_user',id_user).eq('tanggal',tanggal);
  return error;
}
async function updateUser(id, newData) {
  const { error } = await supabase.from('users').update(newData).eq('id', id);
  return error;
}
async function updateRecordTagihan(id,newData) {
  const { error } = await supabase.from('recordtagihan').update(newData).eq('id', id);
  return {error};
}
async function updateRecordBayaran(id,newData) {
  const { error } = await supabase.from('recordpembayaran').update(newData).eq('id', id);
  return {error};
}
async function insertRecordTransaksi(Data) {
  const { error } = await supabase.from('transaksi').insert(Data);
  return {error};
}
async function deleteUser(id) {
  const { error } = await supabase.from('users').delete().eq('id', id);
  return error;
}
async function getUserById(id) {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
  return { data, error };
}


async function getSkillsByUserId() {
  const { data, error } = await supabase.from('skills').select('*');
  return { data, error };
}
async function getAbsenById(user_id, tanggal) {
  const { data, error } = await supabase.from('kehadiran').select('*').eq('id_user', user_id).eq('tanggal', tanggal);
  return { data, error };
}
async function getAbsenbyUserId(user_id) {
  const { data, error } = await supabase.from('kehadiran').select('*').eq('id_user', user_id);
  return { data, error };
}
async function getUserByUserNo(userno,kode_sekolah) {
  const { data, error } = await supabase.from('users').select('*').eq('user_no', userno).eq('kode_sekolah',kode_sekolah).order('created_at', { ascending: false });
  const user = data?.[0] || null;
  return { data: user, error };
}
async function getSiswaDetail(user_no, id_sekolah) {
  const { data: sekolahData } = await supabase
  .from('sekolah')
  .select('semester_aktif')
  .eq('id', id_sekolah)
  .single();
  const semesterAktif = sekolahData?.semester_aktif || 'ganjil';
  const semesterFilter = semesterAktif === 'ganjil' ? ['1', '3', '5'] : ['2', '4', '6'];
  const { data, error } = await supabase
    .from('siswa') 
    .select('*') 
    .eq('user_no', user_no)
    .eq('id_sekolah', id_sekolah)
    .in('semester',semesterFilter);
  return { data, error };
}
async function getGuruDetail(user_no, id_sekolah) {
  const { data, error } = await supabase
    .from('guru')
    .select('*')
    .eq('user_no', user_no)
    .eq('id_sekolah', id_sekolah);
    return { data, error };
}
async function getWaliDetail(user_no, id_sekolah) {
  const { data, error } = await supabase
    .from('wali')
    .select('*')
    .eq('user_no', user_no)
    .eq('id_sekolah', id_sekolah);
  return { data, error };
}
async function getAllUsersWithSekolah(kodeSekolah = null) {
  const { data: users, error: errorUsers } = await supabase
    .from('users')
    .select('*');
  const { data: sekolahs, error: errorSekolah } = await supabase
    .from('sekolah')
    .select('*');
  if (errorUsers || errorSekolah) {
    console.error('❌ Error ambil data:', errorUsers?.message || errorSekolah?.message);
    return { data: null, error: errorUsers || errorSekolah };
  }
  let merged = users.map(user => {
    const sekolah = sekolahs.find(s => s.kode_sekolah === user.kode_sekolah);
    return {
      ...user,
      id_sekolah: sekolah?.id|| null,
    };
  });
  if (kodeSekolah) {
    merged = merged.filter(user => user.kode_sekolah === kodeSekolah);
  }
  return { data: merged, error: null };
}
async function getAllUser(kodeSekolah = null) {
  return await getAllUsersWithSekolah(kodeSekolah);
}
async function getSiswa(kodeSekolah = null) {
  return await getUsersByRoleWithSekolah('siswa', kodeSekolah);
}
async function getGuru(kodeSekolah = null) {
  return await getUsersByRoleWithSekolah('guru', kodeSekolah);
}
async function getAdmin(kodeSekolah = null) {
  return await getUsersByRoleWithSekolah('admin', kodeSekolah);
}
async function getWali(kodeSekolah = null) {
  return await getUsersByRoleWithSekolah('wali', kodeSekolah);
}
async function getJurusan(id_Sekolah = null) {
  const { data, error } = await supabase.from('jurusan')
  .select('*').eq('id_sekolah', id_Sekolah);
  return { data, error };
}
async function getMapel(id_Sekolah = null) {
  const { data, error } = await supabase.from('mapel')
  .select('*').eq('id_sekolah', id_Sekolah);
  return { data, error };
}
async function getMapelByCode(kode_mapel=null,id_Sekolah = null) {
  const { data, error } = await supabase.from('mapel')
  .select('*').eq('id_sekolah', id_Sekolah).eq('kode_mapel',kode_mapel);
  return { data, error };
}
async function getMapelJurusanSemesterByGuru(id_guru = null, id_sekolah = null) {
  try {
    const { data: guruData, error: guruError } = await supabase
      .from('guru')
      .select('guru_mapel')
      .eq('id_guru', id_guru)
      .eq('id_sekolah', id_sekolah)
      .single();
    if (guruError || !guruData) {
      throw guruError || new Error('Guru tidak ditemukan');
    }
    if (!guruData.guru_mapel) {
      return { data: [], error: null };
    }
    const kodeMapelList = guruData.guru_mapel.split(',').map(item => item.trim());
    const { data: mapelData, error: mapelError } = await supabase
      .from('mapel')
      .select('*')
      .in('id', kodeMapelList)
      .eq('id_sekolah', id_sekolah);
    if (mapelError) throw mapelError;
    const { data: allJurusan, error: jurusanError } = await supabase
      .from('jurusan')
      .select('*')
      .eq('id_sekolah', id_sekolah);
    if (jurusanError) throw jurusanError;
    const result = mapelData.map(mapel => {
      const jurusan = allJurusan.find(j => j.id == mapel.id_jurusan);
      return {
        kode_mapel: mapel.kode_mapel,
        nama_mapel: mapel.nama_mapel,
        semester: mapel.semester,
        kode_jurusan: jurusan ? jurusan.kode_jurusan : null
      };
    });
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
async function getMateribyId(id_materi = null,id_Sekolah = null) {
  const { data, error } = await supabase.from('materi')
  .select('*').eq('id_sekolah', id_Sekolah).eq('id',id_materi).single();
  return { data, error };
}
async function getTugasbyId(id_tugas = null) {
  const { data, error } = await supabase.from('tugas')
  .select('*').eq('id', id_tugas).single();
  return { data, error };
}
async function getMasterTagihan(tipe = null) {
  const { data, error } = await supabase.from('mastertagihan')
  .select('*').order('created_at', { ascending: false });
  let tagihan = data?.[0] || null;
  return { data: tagihan, error };
}
async function getsekolah(Id=null) {
  const { data, error } = await supabase
    .from('sekolah')
    .select('nama_sekolah')
    .eq('id', Id)
    .single();
  if (error) {
    console.error('Gagal ambil sekolah:', error.message);
    return 'Manajemen Sekolah';
  }
  return data || 'Manajemen Sekolah';
}
async function getUsersByRoleWithSekolah(role, kodeSekolah = null) {
  const { data: users, error: errorUsers } = await supabase
    .from('users')
    .select('*')
    .eq('role', role);
  const { data: sekolahs, error: errorSekolah } = await supabase
    .from('sekolah')
    .select('*')
    .eq('kode_sekolah', kodeSekolah);
  if (errorUsers || errorSekolah) {
    console.error('❌ Error ambil data:', errorUsers?.message || errorSekolah?.message);
    return { data: null, error: errorUsers || errorSekolah };
  }
  let merged=[];
  if (role === 'siswa') {
    const { data: siswadetail, error: errorSekolah } = await supabase
      .from('siswa')
      .select('*')
      .eq('id_sekolah', sekolahs[0]?.id || -1);
    merged = users.map(user => {
      const sekolah = sekolahs.find(s => s.kode_sekolah === user.kode_sekolah);
      const detail = siswadetail.find(s => s.id_siswa === user.id);
      return {
        ...user,
        nama_sekolah: sekolah?.nama_sekolah || null,
        siswa_detail: detail || null,
      };
    });
  }else{
    merged = users.map(user => {
    const sekolah = sekolahs.find(s => s.kode_sekolah === user.kode_sekolah);
    return {
      ...user,
      nama_sekolah: sekolah?.nama_sekolah || null,
    };
  });
  }
  if (kodeSekolah) {
    merged = merged.filter(user => user.kode_sekolah === kodeSekolah);
  }
  return { data: merged, error: null };
}
async function getJadwalGuru(user_no = null, idSekolah = null, role = 'guru') {
    const { data: sekolahData, error: sekolahError } = await supabase
    .from('sekolah')
    .select('semester_aktif')
    .eq('id', idSekolah)
    .single();
  if (sekolahError) {
    console.error('Error mengambil konfigurasi sekolah:', sekolahError);
    return { data: null, error: sekolahError };
  }
  const semesterAktif = sekolahData.semester_aktif || 'ganjil';
  const semesterFilter = semesterAktif === 'ganjil' ? ['1', '3', '5'] : ['2', '4', '6'];
  if (role !== 'guru') {
    const { data: mapelData, error: mapelError } = await supabase
      .from('mapel')
      .select('*')
      .eq('id_sekolah', idSekolah)
      .in('semester', semesterFilter);
    if (mapelError) return { data: null, error: mapelError };
    const jurusanIds = [...new Set(mapelData.map(m => m.id_jurusan))];
    const { data: jurusanData, error: jurusanError } = await supabase
      .from('jurusan')
      .select('*')
      .in('id', jurusanIds)
      .eq('id_sekolah', idSekolah);
    if (jurusanError) return { data: null, error: jurusanError };
    const mapelIds = mapelData.map(m => m.id);
    const { data: jadwal, error: errorjadwal } = await supabase
      .from('jadwal')
      .select('*')
      .eq('id_sekolah', idSekolah)
      .in('mapel', mapelIds)
      .in('semester', semesterFilter);
    if (errorjadwal) return { data: null, error: errorjadwal };
    const jadwal_materi_mapel = jadwal.map(jadw => {
      const mpl = mapelData.find(m => m.id == jadw.mapel);
      const jrs = jurusanData.find(j => j.id == jadw.jurusan);
      return {
        ...jadw,
        mapel: mpl ? mpl.kode_mapel : '-',
        jurusan: jrs ? jrs.kode_jurusan : '-'
      };
    });
    return {
      data: {
        jadwal: jadwal_materi_mapel,
        mapel: mapelData,
        jurusan: jurusanData,
        semester: Array.from(semesterFilter)
      },
      error: null
    };
  }
  const { data: guruData, error: guruError } = await supabase
    .from('guru')
    .select('*')
    .eq('user_no', user_no)
    .eq('id_sekolah', idSekolah);
  if (guruError || !guruData || guruData.length === 0) {
    return { data: null, error: guruError || 'Guru tidak ditemukan' };
  }
  const guru = guruData[0];
  const mapelIds = guru.guru_mapel
    ? guru.guru_mapel.split(',').map(s => s.trim()).filter(Boolean)
    : [];
  if (mapelIds.length === 0) {
    return { data: null, error: 'Guru belum punya mapel' };
  }
  const { data: mapelData, error: mapelError } = await supabase
    .from('mapel')
    .select('*')
    .in('id', mapelIds)
    .eq('id_sekolah', idSekolah);
  if (mapelError) return { data: null, error: mapelError };
  const jurusanIds = [...new Set(mapelData.map(m => m.id_jurusan))];
  const { data: jurusanData, error: jurusanError } = await supabase
    .from('jurusan')
    .select('*')
    .in('id', jurusanIds)
    .eq('id_sekolah', idSekolah);
  if (jurusanError) return { data: null, error: jurusanError };
  const allSemesters = new Set();
  mapelData.forEach(m => {
    if (m.semester) {
      const semesters = m.semester.split(',').map(s => s.trim());
      semesters.forEach(s => allSemesters.add(s));
    }
  });
  const mapelIdsStr = mapelIds.map(String);
  const jurusanIdsStr = jurusanIds.map(String);
  const semesterArray = Array.from(allSemesters);
  const { data: jadwalraw, error: errorjadwal } = await supabase
    .from('jadwal')
    .select('*')
    .eq('id_sekolah', idSekolah)
    .in('mapel', mapelIdsStr)
    .in('jurusan', jurusanIdsStr)
    .eq('guru', guru.id_guru);
  const jadwal = jadwalraw.filter(m => {
      const semArray = m.semester.split(',').map(s => s.trim());
      return semArray.some(s => semesterFilter.includes(s));
    });
  if (errorjadwal) return { data: null, error: errorjadwal };
  const jadwal_materi_mapel = jadwal.map(jadw => {
    const mpl = mapelData.find(m => m.id.toString() === jadw.mapel.toString());
    const jrs = jurusanData.find(j => j.id.toString() === jadw.jurusan.toString());
    return {
      ...jadw,
      mapel: mpl ? mpl.kode_mapel : '-',
      jurusan: jrs ? jrs.kode_jurusan : '-'
    };
  });
  return {
    data: {
      jadwal: jadwal_materi_mapel,
      mapel: mapelData,
      jurusan: jurusanData,
      semester: semesterArray
    },
    error: null
  };
}
async function getJadwalSiswa(user_no=null, idSekolah = null) {
  try {
    const { data: users, error: errorUsers } = await supabase
      .from('users')
      .select('*')
      .eq('user_no', user_no);
    
    if (errorUsers || !users || users.length === 0) {
      return { data: null, error: errorUsers || 'User tidak ditemukan' };
    }

    const { data: siswa, error: errorsiswa } = await supabase
      .from('siswa')
      .select('*')
      .eq('id_siswa', users[0].id);
    
    if (errorsiswa || !siswa || siswa.length === 0) {
      return { data: null, error: errorsiswa || 'Data siswa tidak ditemukan' };
    }

    const siswaData = siswa[0];
    
    // Ambil konfigurasi semester aktif sekolah
    const { data: sekolahData, error: sekolahError } = await supabase
      .from('sekolah')
      .select('semester_aktif')
      .eq('id', idSekolah)
      .single();
    
    if (sekolahError) {
      console.error('Error mengambil konfigurasi sekolah:', sekolahError);
      return { data: null, error: sekolahError };
    }

    const semesterAktif = sekolahData.semester_aktif || 'ganjil';
    const semesterFilter = semesterAktif === 'ganjil' ? ['1', '3', '5'] : ['2', '4', '6'];

    const { data: jurusan, error: errorjurusan } = await supabase
      .from('jurusan')
      .select('*')
      .eq('id_sekolah', idSekolah)
      .eq('id', siswaData.jurusan);
    
    if (errorjurusan || !jurusan || jurusan.length === 0) {
      return { data: null, error: errorjurusan || 'Jurusan tidak ditemukan' };
    }

    // Ambil semua mapel untuk jurusan siswa
    const { data: mapelData, error: mapelError } = await supabase
      .from('mapel')
      .select('*')
      .eq('id_sekolah', idSekolah)
      .eq('id_jurusan', jurusan[0].id);
    
    if (mapelError) {
      return { data: null, error: mapelError };
    }

    // Filter mapel berdasarkan semester aktif
    const filteredMapel = mapelData.filter(m => {
      if (!m.semester) return false;
      const semArray = m.semester.split(',').map(s => s.trim());
      return semArray.some(s => semesterFilter.includes(s));
    });

    // Ambil semua jadwal untuk jurusan siswa
    const { data: jadwal, error: errorjadwal } = await supabase
      .from('jadwal')
      .select('*')
      .eq('id_sekolah', idSekolah)
      .eq('jurusan', siswaData.jurusan);
    
    if (errorjadwal) {
      return { data: null, error: errorjadwal };
    }

    // Filter jadwal berdasarkan semester aktif
    const filteredJadwal = jadwal.filter(j => {
      if (!j.semester) return false;
      const semArray = j.semester.split(',').map(s => s.trim());
      return semArray.some(s => semesterFilter.includes(s));
    });

    // Map data jadwal dengan informasi mapel dan jurusan
    const jadwal_materi_mapel = filteredJadwal.map(jadw => {
      const mpl = filteredMapel.find(m => m.id == jadw.mapel);
      const jrs = jurusan.find(j => j.id == jadw.jurusan);
      return {
        ...jadw,
        mapel: mpl ? mpl.kode_mapel : '-',
        nama_mapel: mpl ? mpl.nama_mapel : '-', // Tambahkan nama mapel lengkap
        jurusan: jrs ? jrs.kode_jurusan : '-',
        nama_jurusan: jrs ? jrs.nama_jurusan : '-' // Tambahkan nama jurusan lengkap
      };
    });

    console.log('Jadwal siswa:', {
      siswa: siswaData,
      semesterAktif,
      totalMapel: filteredMapel.length,
      totalJadwal: filteredJadwal.length,
      jadwal: jadwal_materi_mapel
    });

    return { data: jadwal_materi_mapel, error: null };
    
  } catch (error) {
    console.error('Error in getJadwalSiswa:', error);
    return { data: null, error };
  }
}
async function getSiswaJurusanMapelMateriTugas(user_no = null, id_sekolah = null) {
  const { data: siswaData, error: siswaError } = await supabase
    .from('siswa')
    .select('*')
    .eq('user_no', user_no)
    .eq('id_sekolah', id_sekolah);
  if (siswaError || !siswaData || siswaData.length === 0) {
    return { data: null, error: siswaError || 'siswa tidak ditemukan' };
  }
  const siswa = siswaData[0];
  const { data: jurusanData, error: jurusanError } = await supabase
    .from('jurusan')
    .select('*')
    .eq('id_sekolah', id_sekolah)
    .eq('id', siswa.jurusan);
    if (jurusanError) {
      return { data: null, error: jurusanError };
    }
  const { data: sekolahData, error: sekolahError } = await supabase
    .from('sekolah')
    .select('semester_aktif')
    .eq('id', id_sekolah)
    .single();
  if (sekolahError) {
    console.error('Error mengambil konfigurasi sekolah:', sekolahError);
    return { data: null, error: sekolahError };
  }
  const semesterAktif = sekolahData.semester_aktif || 'ganjil';
  const semesterFilter = semesterAktif === 'ganjil' ? ['1', '3', '5'] : ['2', '4', '6'];
  const { data: mapelListRaw, error: mapelError } = await supabase
    .from('mapel')
    .select('*')
    .eq('id_jurusan', siswa.jurusan);
    const mapelData = mapelListRaw.filter(m => {
      const semArray = m.semester.split(',').map(s => s.trim());
      return semArray.some(s => semesterFilter.includes(s));
    });
    if (mapelError) {
      return { data: null, error: mapelError };
    }
  const mapelIds = [...new Set(mapelData.map(m => m.id))];
  const { data: materiListRaw, error: materiError } = await supabase
    .from('materi')
    .select('*')
    .eq('id_sekolah', id_sekolah)
    .in('id_mapel', mapelIds);
  const materiData = materiListRaw.filter(m => {
      const semArray = m.semester.split(',').map(s => s.trim());
      return semArray.some(s => semesterFilter.includes(s));
  });
  if (materiError) {
    return { data: null, error: materiError };
  }
  const materiIds = [...new Set(materiData.map(m => m.id))];
  const { data: tugasData, error: tugasError } = await supabase
    .from('tugas')
    .select('*')
    .in('id_materi', materiIds);
  if (tugasError) {
    return { data: null, error: tugasError };
  }
  const { data: guruData, error: guruError } = await supabase
    .from('guru')
    .select('*')
    .eq('id_sekolah', id_sekolah);
  if (guruError) {
    return { data: null, error: tugasError };
  }
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('*')
    .eq('id_sekolah', id_sekolah);
  if (usersError) {
    return { data: null, error: tugasError };
  }
  const mapelWithDetail = mapelData.map((mapel) => {
    const relatedGuru = guruData
      .filter((guru) => {
        const guruMapelIds = guru.guru_mapel.split(',').map(Number);
        return guruMapelIds.includes(mapel.id);
      })
      .map((guru) => {
        const user = usersData.find(u => u.id === guru.id_guru);
        return {
          ...guru,
          name: user ? user.name : null, 
        };
      });
    const relatedMateri = materiData.filter(m => m.id_mapel == mapel.id);
    const materiWithTugas = relatedMateri.map(materi => ({
      ...materi,
      tugas: tugasData.filter(t => t.id_materi == materi.id)
    }));
    return {
      ...mapel,
      guru: relatedGuru,
      materi: materiWithTugas
    };
  });
  return {
    data:{
      mapel: mapelWithDetail,
      jurusan:jurusanData,
      siswa:siswa,
    }, 
    error: null};
}
async function getGuruJurusanMapelMateriTugas(user_no = null, id_sekolah = null, role = null) {
  let guruData = [];
  if (role === 'guru') {
    const { data, error } = await supabase
      .from('guru')
      .select('*')
      .eq('user_no', user_no)
      .eq('id_sekolah', id_sekolah);
    guruData = data;
    if (error || !guruData || guruData.length === 0) {
      return { data: null, error: error || 'Guru tidak ditemukan' };
    }
  }
  let jurusanData = [], mapelData = [], materiData = [];
  const { data: sekolahData, error: sekolahError } = await supabase
    .from('sekolah')
    .select('semester_aktif')
    .eq('id', id_sekolah)
    .single();
  if (sekolahError) {
    console.error('Error mengambil konfigurasi sekolah:', sekolahError);
    return { data: null, error: sekolahError };
  }
  const semesterAktif = sekolahData.semester_aktif || 'ganjil';
  const semesterFilter = semesterAktif === 'ganjil' ? ['1', '3', '5'] : ['2', '4', '6'];
  if (role === 'guru') {
    const guru = guruData[0];
    const mapelIds = guru.guru_mapel
      ? guru.guru_mapel.split(',').map(s => parseInt(s.trim())).filter(Boolean)
      : [];
    if (mapelIds.length === 0) {
      return { data: null, error: 'Guru belum punya mapel' };
    }
    const { data: mapelListRaw, error: mapelError } = await supabase
      .from('mapel')
      .select('*')
      .in('id', mapelIds)
      .eq('id_sekolah', id_sekolah);
    const mapelList = mapelListRaw.filter(m => {
      const semArray = m.semester.split(',').map(s => s.trim());
      return semArray.some(s => semesterFilter.includes(s));
    });
    if (mapelError) return { data: null, error: mapelError };
    mapelData = mapelList || [];
    const jurusanIds = [...new Set(mapelData.map(m => m.id_jurusan))];
    const { data: jurusanList, error: jurusanError } = await supabase
      .from('jurusan')
      .select('*')
      .in('id', jurusanIds)
      .eq('id_sekolah', id_sekolah);
    if (jurusanError) return { data: null, error: jurusanError };
    jurusanData = jurusanList || [];
    const semesterSet = new Set();
    mapelData.forEach(m => {
      if (Array.isArray(m.semester)) {
        m.semester.forEach(s => semesterSet.add(s));
      } else if (m.semester) {
        semesterSet.add(m.semester);
      }
    });
    const { data: materiListRaw, error: materiError } = await supabase
      .from('materi')
      .select('*')
      .eq('id_sekolah', id_sekolah)
      .eq('id_guru', guru.id_guru)
      .in('id_mapel', mapelIds)
    const materiList = materiListRaw.filter(m => {
      const semArray = m.semester.split(',').map(s => s.trim());
      return semArray.some(s => semesterFilter.includes(s));
    });
    if (materiError) return { data: null, error: materiError };
    materiData = materiList || [];
  } else {
    const { data: jurusanList } = await supabase
      .from('jurusan')
      .select('*')
      .eq('id_sekolah', id_sekolah);
    jurusanData = jurusanList || [];
    const { data: mapelListRaw } = await supabase
      .from('mapel')
      .select('*')
      .eq('id_sekolah', id_sekolah);
    const mapelList = mapelListRaw.filter(m => {
      const semArray = m.semester.split(',').map(s => s.trim());
      return semArray.some(s => semesterFilter.includes(s));
    });
    mapelData = mapelList || [];
    const { data: materiList } = await supabase
      .from('materi')
      .select('*')
      .eq('id_sekolah', id_sekolah);
    materiData = materiList || [];
  }
  if (!materiData) return { data: null, error: 'Materi tidak ditemukan' };
  const materiIds = [...new Set(materiData.map(m => m.id))];
  const { data: tugasData, error: tugasError } = await supabase
    .from('tugas')
    .select('*')
    .in('id_materi', materiIds);
  if (tugasError) {
    return { data: null, error: tugasError };
  }
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('*')
    .eq('id_sekolah', id_sekolah);
  if (usersError) {
    return { data: null, error: tugasError };
  }
  const materiWithMapel = materiData.map(materi => {
    const tugas = tugasData.filter(m => m.id_materi == materi.id);
    const mapel = mapelData.find(n => n.id == materi.id_mapel);
    const jurusan = jurusanData.find(o => o.id == mapel.id_jurusan);
    const guru = guruData.find(g => g.id_guru == materi.id_guru);
    let nama_guru = '-';
    if (guru) {
      const userGuru = usersData.find(u => u.id == guru.id_guru);
      nama_guru = userGuru ? userGuru.name : '-';
    }
    return {
      ...materi,
      nama_mapel: mapel?.nama_mapel || '-',
      kode_mapel: mapel?.kode_mapel || '-',
      jurusan: jurusan?.nama_jurusan || '-',
      semester: materi.semester || mapel?.semester || '',
      nama_guru: nama_guru,
      tugas: tugas || []
    };
  });
  return {
    data: {
      jurusan: jurusanData || [],
      mapelData: mapelData || [],
      materi: materiWithMapel || [],
      tugas: tugasData || []
    },
    error: null
  };
}
async function setupDropdownFilters({ user_no, id_sekolah, role }, options = {}) {
  const {
    jurusanEl = document.getElementById('jurusan'),
    mapelEl = document.getElementById('mapel'),
    materiEl = document.getElementById('materi'),
    semesterContainerEl = document.getElementById('semesterContainer')
  } = options;
  const { data, error } = await getGuruJurusanMapelMateriTugas(user_no, id_sekolah, role);
  if (error || !data) {
    console.error("Gagal mendapatkan data:", error);
    return;
  }
  const jurusan = data.jurusan || [];
  const mapelData = data.mapel || data.mapelData || [];
  const materi = data.materi || [];
  if (jurusanEl) {
    jurusanEl.innerHTML = '<option value="">Pilih Jurusan</option>';
    jurusan.forEach(j => {
      const opt = document.createElement('option');
      opt.value = j.id;
      opt.textContent = j.nama_jurusan;
      jurusanEl.appendChild(opt);
    });
  }
  if (jurusanEl && mapelEl) {
    jurusanEl.addEventListener('change', () => {
      const selectedJurusanId = jurusanEl.value;
      mapelEl.innerHTML = '<option value="">Pilih Mapel</option>';
      const filteredMapel = mapelData.filter(m => m.id_jurusan == selectedJurusanId);
      filteredMapel.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.nama_mapel;
        mapelEl.appendChild(opt);
      });
      if (materiEl) materiEl.innerHTML = '<option value="">Pilih Materi</option>';
      if (semesterContainerEl) semesterContainerEl.innerHTML = '';
    });
  }
  if (mapelEl && materiEl) {
    mapelEl.addEventListener('change', () => {
      const selectedMapelId = mapelEl.value;
      materiEl.innerHTML = '<option value="">Pilih Materi</option>';
      const filteredMateri = materi.filter(m => m.id_mapel == selectedMapelId);
      filteredMateri.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `[${m.kode_materi}] ${m.nama_materi}`;
        materiEl.appendChild(opt);
      });
      if (semesterContainerEl) semesterContainerEl.innerHTML = '';
    });
  }
  if (materiEl && semesterContainerEl) {
    materiEl.addEventListener('change', () => {
      const selectedMateriId = materiEl.value;
      const selectedMateri = materi.find(m => m.id == selectedMateriId);
      semesterContainerEl.innerHTML = '';
      if (selectedMateri?.semester) {
        const semesters = selectedMateri.semester.toString().split(',').map(s => s.trim());
        semesters.forEach(s => {
          const label = document.createElement('label');
          label.className = 'inline-flex items-center space-x-2';
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.name = 'semester';
          checkbox.value = s;
          checkbox.className = 'form-checkbox text-blue-600';
          const span = document.createElement('span');
          span.textContent = s;
          label.appendChild(checkbox);
          label.appendChild(span);
          semesterContainerEl.appendChild(label);
        });
      }
    });
  }
  if (mapelEl && semesterContainerEl && !materiEl) {
    mapelEl.addEventListener('change', async () => {
      const selectedMapelId = mapelEl.value;
      semesterContainerEl.innerHTML = '';
      if (!selectedMapelId) return;
      const { data: selectedMapel, error } = await supabase
        .from('mapel')
        .select('semester')
        .eq('id', selectedMapelId)
        .single();
      if (error || !selectedMapel?.semester) {
        console.warn('Semester tidak ditemukan');
        return;
      }
      const semesters = selectedMapel.semester.toString().split(',').map(s => s.trim());
      semesters.forEach(s => {
        const label = document.createElement('label');
        label.className = 'inline-flex items-center space-x-2';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'semester';
        checkbox.value = s;
        checkbox.className = 'form-checkbox text-blue-600';
        const span = document.createElement('span');
        span.textContent = s;
        label.appendChild(checkbox);
        label.appendChild(span);
        semesterContainerEl.appendChild(label);
      });
    });
  }
}
let currentSort = { column: null, asc: true };
let laporanData = [];
async function fetchMultiJoinLaporan({
  baseTable,
  baseColumns = [],
  joins = [],
  filters = [],
  orderby,
  asc,
  limit = 100000 // Tambahkan limit default
}) {
  
  try {
    let baseQuery = supabase
      .from(baseTable)
      .select(baseColumns.length === 1 && baseColumns[0] === '*' ? '*' : baseColumns.join(','))
      .eq('id_sekolah', user.id_sekolah)
      .limit(limit); // Batasi data yang diambil

    let clientSideSortNeeded = false;
    
    if (orderby && orderby !== '') {
      if (baseColumns.includes(orderby) || baseColumns.includes('*')) {
        baseQuery = baseQuery.order(orderby, { ascending: asc });
      } else {
        clientSideSortNeeded = true;
      }
    }

    for (const f of filters) {
      const { column, operator = 'eq', value } = f;
      if (value !== '' && typeof baseQuery[operator] === 'function') {
        baseQuery = baseQuery[operator](column, value);
      }
    }

    const { data: baseData, error: baseError } = await baseQuery;
    if (baseError) {
      console.error("❌ Gagal ambil data base:", baseError);
      return [];
    }
    const joinPromises = baseData.map(async (item) => {
      const joined = { ...item };
      let joinValid = true;

      for (const join of joins) {
        const { joinTable, columns2, joinBaseKey, joinForeignKey } = join;
        
        if (!item[joinBaseKey]) continue;
        
        const uuidValue = item[joinBaseKey];
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        if (!uuidRegex.test(uuidValue)) {
          console.warn(`⚠️ Skip join: ${joinBaseKey} bukan UUID valid:`, uuidValue);
          continue;
        }

        try {
          const selectCols = columns2.join(',');
          const { data: joinData, error: joinError } = await supabase
            .from(joinTable)
            .select(selectCols)
            .eq(joinForeignKey, uuidValue)
            .limit(1);

          if (joinError) {
            console.warn(`⚠️ Gagal join ke ${joinTable}:`, joinError.message);
            continue; // Continue dengan data yang ada, jangan stop processing
          }

          if (joinData?.[0]) {
            Object.assign(joined, joinData[0]);
          }
        } catch (joinError) {
          console.warn(`⚠️ Exception saat join ke ${joinTable}:`, joinError);
        }
      }
      
      return joinValid ? joined : null;
    });

    const results = (await Promise.all(joinPromises)).filter(item => item !== null);
    
    if (clientSideSortNeeded && orderby) {
      results.sort((a, b) => {
        const valA = a[orderby] ?? '';
        const valB = b[orderby] ?? '';
        if (!isNaN(valA) && !isNaN(valB)) {
          return asc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
        }
        return asc ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
      });
    }
    return results;
    
  } catch (error) {
    console.timeEnd('fetchMultiJoinLaporan');
    console.error('❌ Error dalam fetchMultiJoinLaporan:', error);
    return [];
  }
}

async function fetchMultiJoinLaporanPaginated({
  baseTable,
  baseColumns = [],
  joins = [],
  filters = [],
  orderby = 'created_at',
  asc = false,
  page = 1,
  pageSize = 100
}) {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let baseQuery = supabase
      .from(baseTable)
      .select(baseColumns.length === 1 && baseColumns[0] === '*' ? '*' : baseColumns.join(','), 
              { count: 'exact' }) // Get total count
      .eq('id_sekolah', user.id_sekolah)
      .range(from, to)
      .order(orderby, { ascending: asc });

    for (const f of filters) {
      const { column, operator = 'eq', value } = f;
      if (value !== '' && typeof baseQuery[operator] === 'function') {
        baseQuery = baseQuery[operator](column, value);
      }
    }

    const { data: baseData, error: baseError, count } = await baseQuery;
    
    if (baseError) {
      console.error("❌ Gagal ambil data base:", baseError);
      return { data: [], totalCount: 0 };
    }

    // Simple join processing - minimal untuk performa
    const results = await Promise.all(
      baseData.map(async (item) => {
        const joined = { ...item };
        
        for (const join of joins) {
          const { joinTable, columns2, joinBaseKey, joinForeignKey } = join;
          
          if (!item[joinBaseKey]) continue;
          
          try {
            const selectCols = columns2.join(',');
            const { data: joinData } = await supabase
              .from(joinTable)
              .select(selectCols)
              .eq(joinForeignKey, item[joinBaseKey])
              .limit(1);

            if (joinData?.[0]) {
              Object.assign(joined, joinData[0]);
            }
          } catch (joinError) {
            console.warn(`⚠️ Skip join ${joinTable}:`, joinError);
          }
        }
        
        return joined;
      })
    );

    return { data: results, totalCount: count || 0 };
    
  } catch (error) {
    console.error('❌ Error dalam fetchMultiJoinLaporanPaginated:', error);
    return { data: [], totalCount: 0 };
  }
}

function renderLaporanToTable(data, containerId, enableSorting = true, withCheckbox = false, columnOrder = null) {
  if (!window.laporanDataMap) window.laporanDataMap = {};
  window.laporanDataMap[containerId] = data;
  const downloadButtons = `
    <div class="download-section-enhanced mb-6">
      <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300">
          <i class="fas fa-chart-bar mr-2 text-blue-500"></i>
          Hasil Laporan (${data.length} data)
        </h3>
        <div class="flex flex-wrap gap-2">
          <button class="download-btn-enhanced csv" data-format="csv">
            <i class="fas fa-file-csv mr-2"></i>
            CSV
          </button>
          <button class="download-btn-enhanced excel" data-format="excel">
            <i class="fas fa-file-excel mr-2"></i>
            Excel
          </button>
          <button class="download-btn-enhanced pdf" data-format="pdf">
            <i class="fas fa-file-pdf mr-2"></i>
            PDF
          </button>
        </div>
      </div>
    </div>
  `;

  laporanData = [...data];
  const container = document.getElementById(containerId);
  
  if (!data.length) {
    container.innerHTML = `
      <div class="empty-state-enhanced">
        <i class="fas fa-inbox text-6xl text-gray-300 mb-4"></i>
        <h3 class="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">Belum ada data ditemukan</h3>
        <p class="text-gray-500 dark:text-gray-500">Coba ubah kriteria filter atau pastikan data kehadiran tersedia.</p>
      </div>
    `;
    return;
  }

  // Gunakan columnOrder jika provided, otherwise ambil dari data
  const columns = columnOrder || Object.keys(data[0]).filter(c => !c.startsWith('_'));
  
  let html = `
    <div class="laporan-table-enhanced">
      <div class="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table class="w-full">
          <thead>
            <tr class="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              <th class="laporan-th sticky left-0 z-20">No</th>
              ${columns.map(c => `
                <th class="laporan-th sortable ${enableSorting ? 'cursor-pointer hover:bg-blue-600' : ''}" 
                    data-column="${c}">
                  <div class="flex items-center justify-between">
                    <span>${formatColumnName(c)}</span>
                    ${enableSorting ? 
                      `<i class="fas fa-sort ml-2 ${currentSort.column === c ? 'opacity-100' : 'opacity-70'}"></i>` : 
                      ''}
                  </div>
                </th>`).join('')}
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            ${data.map((row, index) => `
              <tr class="laporan-tr hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td class="laporan-td sticky left-0 bg-inherit font-semibold text-center">${index + 1}</td>
                ${columns.map(c => `
                  <td class="laporan-td">
                    <div class="cell-content-enhanced">
                      ${row[c] !== undefined && row[c] !== null && row[c] !== '' ? row[c] : '<span class="text-gray-400 italic">-</span>'}
                    </div>
                  </td>`).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = downloadButtons + html;

  // Update photo thumbnails dengan class baru
  container.querySelectorAll('img[alt="Foto"]').forEach(img => {
    img.className = 'photo-thumbnail-enhanced w-16 h-16 object-cover rounded-lg cursor-pointer border-2 border-gray-200 hover:border-blue-400 transition-all';
  });

  // Event listeners
  container.querySelectorAll('.download-btn-enhanced').forEach(btn => {
    btn.addEventListener('click', function() {
      const format = this.getAttribute('data-format');
      const filenamePrefix = 'laporan_kehadiran';
      
      // Add loading state to button
      const originalHTML = this.innerHTML;
      this.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Menyiapkan...';
      this.disabled = true;
      
      setTimeout(() => {
        downloadTableData(containerId, format, filenamePrefix);
        // Restore button after a delay
        setTimeout(() => {
          this.innerHTML = originalHTML;
          this.disabled = false;
        }, 2000);
      }, 500);
    });
  });

  if (enableSorting) {
    document.querySelectorAll(`#${containerId} .sortable`).forEach(th => {
      th.addEventListener('click', () => {
        const column = th.dataset.column;
        if (currentSort.column === column) {
          currentSort.asc = !currentSort.asc;
        } else {
          currentSort = { column, asc: true };
        }
        sortAndRender(containerId, enableSorting, withCheckbox, columnOrder);
      });
    });
  }
}

/* Update formatColumnName untuk handle user_info */
function formatColumnName(columnName) {
  const nameMap = {
    'user_info': 'USER',
    'user_no': 'NO. USER',
    'name': 'NAMA',
    'jurusan': 'JURUSAN', 
    'semester': 'SEMESTER',
    'tanggal': 'TANGGAL',
    'jam_masuk': 'JAM MASUK',
    'jam_keluar': 'JAM KELUAR',
    'foto_masuk': 'FOTO MASUK',
    'foto_keluar': 'FOTO KELUAR',
    'lokasi': 'LOKASI'
  };
  
  return nameMap[columnName] || columnName.toUpperCase().replace(/_/g, ' ');
}

function sortAndRender(containerId,enableSorting,withCheckbox) {
  laporanData.sort((a, b) => {
    const col = currentSort.column;
    const valA = a[col] ?? '';
    const valB = b[col] ?? '';
    if (typeof valA === 'number' && typeof valB === 'number') {
      return currentSort.asc ? valA - valB : valB - valA;
    } else {
      return currentSort.asc 
        ? String(valA).localeCompare(String(valB)) 
        : String(valB).localeCompare(String(valA));
    }
  });
  renderLaporanToTable(laporanData, containerId,enableSorting,withCheckbox);
}
function setTagihanId(id) {
  localStorage.setItem('selected_tagihan_id', id);
  window.location.hash = '#/keuangan_listusertagihan';
}
function setBayaranId(id) {
  localStorage.setItem('selected_bayaran_id', id);
  window.location.hash = '#/keuangan_listuserbayaran';
}
async function filterMultiColumn(data, value, columns) {
  let result;
  if (Array.isArray(data)) {
    result= data.filter(item => 
      columns.some(col => 
        value.includes(item[col])
      )
    );
  } 
  else {
    result= data.filter(item => 
      columns.some(col => item[col] === value)
    );
  }
  return result;
}
async function getSchoolConfig(kodeSekolah) {
  const { data, error } = await supabase
    .from('sekolah')
    .select('*')
    .eq('kode_sekolah', kodeSekolah)
    .single();
  return { data, error };
}
async function updateSchoolConfig(id, newConfig) {
  const { error } = await supabase
    .from('sekolah')
    .update(newConfig)
    .eq('id', id);
  return { error };
}
async function getJenisPelanggaran(id_sekolah) {
  const { data, error } = await supabase
    .from('pelanggaran_jenis')
    .select('*')
    .eq('id_sekolah', id_sekolah);
  return { data, error };
}
async function insertJenisPelanggaran(data) {
  const { error } = await supabase.from('pelanggaran_jenis').insert([data]);
  return error;
}
async function insertPelanggaranSiswa(data) {
  const { error } = await supabase.from('pelanggaran_siswa').insert([data]);
  return error;
}
async function getPelanggaranBySiswa(id_siswa, id_sekolah) {
  const { data, error } = await supabase
    .from('pelanggaran_siswa')
    .select('*')
    .eq('siswa_id', id_siswa)
    .eq('id_sekolah', id_sekolah);
  return { data, error };
}
async function getSettingPeringatan(id_sekolah) {
  const { data, error } = await supabase
    .from('setting_peringatan')
    .select('*')
    .eq('id_sekolah', id_sekolah);
  return { data, error };
}
async function getPelanggaranLengkap(id_siswa, id_sekolah) {
  const { data: pelanggaran } = await getPelanggaranBySiswa(id_siswa, id_sekolah);
  const { data: jenisPelanggaran } = await getJenisPelanggaran(id_sekolah);
  const result = pelanggaran.map(p => {
    const jenis = jenisPelanggaran.find(j => j.id == p.jenis_pelanggaran_id);
    return {
      ...p,
      jenis_pelanggaran: jenis ? jenis.nama_pelanggaran : 'Unknown',
      bobot_point: jenis ? jenis.bobot_point : 0
    };
  });
  return result;
}
async function getTotalPoinSiswa(id_siswa, id_sekolah) {
  const pelanggaran = await getPelanggaranLengkap(id_siswa, id_sekolah);
  return pelanggaran.reduce((total, p) => total + p.bobot_point, 0);
}
async function updateSettingPeringatan(settings) {
  const { error: deleteError } = await supabase
    .from('setting_peringatan')
    .delete()
    .eq('id_sekolah', user.id_sekolah);
  if (deleteError) return { error: deleteError };
  const { error: insertError } = await supabase
    .from('setting_peringatan')
    .insert(settings);
  
  return { error: insertError };
}
async function insertJenisPelanggaran(data) {
  const { error } = await supabase.from('jenis_pelanggaran').insert([data]);
  return { error };
}
async function getSettingPeringatan(id_sekolah) {
  const { data, error } = await supabase
    .from('setting_peringatan')
    .select('*')
    .eq('id_sekolah', id_sekolah);
  return { data, error };
}
async function updateSiswa(id, newData) {
  const { error } = await supabase.from('siswa').update(newData).eq('id', id);
  return error;
}
async function updateGuru(id, newData) {
  const { error } = await supabase.from('guru').update(newData).eq('id', id);
  return error;
}
async function updateWali(id, newData) {
  const { error } = await supabase.from('wali').update(newData).eq('id', id);
  return error;
}
async function insertMasterPembayaran(data) {
  const { error } = await supabase.from('mastertagihan').insert([data]);
  return error;
}
async function getMasterPembayaran(tipe = null) {
  const { data, error } = await supabase.from('mastertagihan')
  .select('*')
  .eq('id_sekolah', user.id_sekolah)
  .eq('tipe', 'pembayaran')
  .order('created_at', { ascending: false });
  let pembayaran = data?.[0] || null;
  return { data: pembayaran, error };
}
async function insertRecordPembayaran(data) {
  const { error } = await supabase.from('recordpembayaran').insert([data]);
  return error;
}
async function updateRecordPembayaran(id, newData) {
  const { error } = await supabase.from('recordpembayaran').update(newData).eq('id', id);
  return {error};
}
function generatePhotoThumbnail(url) {
  if (!url) return '<div class="photo-thumbnail w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center"><i class="fas fa-camera text-gray-400"></i></div>';
  return `<img src="${url}" alt="Foto" class="photo-thumbnail w-16 h-16 object-cover rounded-lg cursor-pointer" onclick="openImageModal('${url}')">`;
}
function openImageModal(url) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="max-w-4xl max-h-full">
      <img src="${url}" alt="Foto" class="max-w-full max-h-full">
      <button class="absolute top-4 right-4 text-white text-3xl" onclick="this.parentElement.parentElement.remove()">&times;</button>
    </div>
  `;
  document.body.appendChild(modal);
}
function downloadTableData(containerId, format = 'csv', filenamePrefix = 'laporan') {
  const data = window.laporanDataMap ? window.laporanDataMap[containerId] : null;
  if (!data || data.length === 0) {
    alert('Tidak ada data untuk diunduh');
    return;
  }

  // Fungsi untuk membersihkan HTML dan mendapatkan teks bersih
  const cleanHtmlContent = (content) => {
    if (!content) return '';
    
    // Handle user_info khusus (gabungan user_no dan name)
    if (typeof content === 'string' && content.includes('user-info-combined')) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      
      const userNo = tempDiv.querySelector('.user-no-display')?.textContent || '';
      const userName = tempDiv.querySelector('.user-name-display')?.textContent || '';
      
      return `${userNo} - ${userName}`;
    }
    
    // Buat element sementara untuk parsing HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // Handle lokasi display khusus
    const lokasiContainer = tempDiv.querySelector('.lokasi-container');
    if (lokasiContainer) {
      const masuk = lokasiContainer.querySelector('.lokasi-masuk')?.textContent || '';
      const keluar = lokasiContainer.querySelector('.lokasi-keluar')?.textContent || '';
      return `Masuk: ${masuk.replace('Masuk:', '').trim()} | Keluar: ${keluar.replace('Keluar:', '').trim()}`;
    }
    
    // Handle link Google Maps
    const mapsLink = tempDiv.querySelector('a[href*="maps.google.com"]');
    if (mapsLink) {
      return tempDiv.textContent.replace('📍 Lihat Peta', '').trim();
    }
    
    // Untuk foto, return placeholder
    if (tempDiv.querySelector('img')) {
      return '[Foto Tersedia]';
    }
    
    return tempDiv.textContent || content.toString();
  };

  const columns = Object.keys(data[0]);
  
  if (format === 'csv') {
    let csvContent = '\uFEFF'; // BOM untuk UTF-8
    
    // Header dengan nama kolom yang diformat
    csvContent += columns.map(col => {
      // Untuk user_info, pisah menjadi dua kolom
      if (col === 'user_info') {
        return '"NO. USER";"NAMA"';
      }
      return `"${formatColumnName(col)}"`;
    }).join(';') + '\r\n';
    
    data.forEach(row => {
      const values = columns.map(col => {
        let value = row[col] ?? '';
        
        // Handle user_info khusus
        if (col === 'user_info') {
          const cleaned = cleanHtmlContent(value);
          const [userNo = '', userName = ''] = cleaned.split(' - ');
          return `"${userNo.replace(/"/g, '""')}";"${userName.replace(/"/g, '""')}"`;
        }
        
        value = cleanHtmlContent(value);
        
        // Escape quotes dan tambahkan quotes
        value = value.toString().replace(/"/g, '""');
        return `"${value}"`;
      });
      csvContent += values.join(';') + '\r\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `${filenamePrefix}_${getFormattedDate()}.csv`);
    
  } else if (format === 'excel') {
    try {
      if (typeof XLSX === 'undefined') {
        alert('Library Excel tidak dimuat. Silakan tambahkan SheetJS terlebih dahulu.');
        return;
      }
      
      const excelData = data.map(row => {
        const newRow = {};
        columns.forEach(col => {
          let value = row[col] ?? '';
          
          // Handle user_info khusus - pisah menjadi dua kolom
          if (col === 'user_info') {
            const cleaned = cleanHtmlContent(value);
            const [userNo = '', userName = ''] = cleaned.split(' - ');
            newRow['NO. USER'] = userNo;
            newRow['NAMA'] = userName;
          } else {
            value = cleanHtmlContent(value);
            newRow[formatColumnName(col)] = value;
          }
        });
        return newRow;
      });
      
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Laporan Kehadiran");
      
      // Styling untuk Excel
      if (ws['!cols'] === undefined) ws['!cols'] = [];
      columns.forEach((col, index) => {
        // Lebar kolom disesuaikan
        if (col === 'user_info') {
          ws['!cols'][index] = { width: 12 }; // NO. USER
          // Karena user_info jadi dua kolom, kita perlu adjust
        } else {
          ws['!cols'][index] = { width: 15 };
        }
      });
      
      XLSX.writeFile(wb, `${filenamePrefix}_${getFormattedDate()}.xlsx`);
      
    } catch (error) {
      console.error('Error generating Excel:', error);
      alert('Terjadi kesalahan saat membuat file Excel. Pastikan data tidak terlalu besar.');
    }
  } else if (format === 'pdf') {
    try {
      if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined') {
        // Coba load library PDF dynamically
        loadPdfLibrary().then(() => {
          generatePDF(data, columns, filenamePrefix);
        }).catch(() => {
          alert('Library PDF tidak tersedia. Silakan refresh halaman atau gunakan format lain.');
        });
        return;
      }
      generatePDF(data, columns, filenamePrefix);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Terjadi kesalahan saat membuat file PDF. Silakan coba format CSV atau Excel.');
    }
  }
}

// Update generatePDF untuk handle user_info
function generatePDF(data, columns, filenamePrefix) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Judul
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text('LAPORAN KEHADIRAN', 105, 15, { align: 'center' });
  
  // Subjudul
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Tanggal Generate: ${new Date().toLocaleDateString('id-ID')} | Total Data: ${data.length}`, 105, 22, { align: 'center' });
  
  // Siapkan headers dan data untuk tabel
  const headers = [];
  const tableData = data.map(row => {
    const rowData = [];
    columns.forEach(col => {
      let value = row[col] ?? '';
      
      // Handle user_info khusus
      if (col === 'user_info') {
        const cleaned = cleanHtmlContent(value);
        const [userNo = '', userName = ''] = cleaned.split(' - ');
        // Untuk PDF, kita gabungkan saja
        value = `${userNo} - ${userName}`;
      } else {
        value = cleanHtmlContent(value.toString()).substring(0, 50); // Batasi panjang teks
      }
      
      rowData.push(value);
    });
    return rowData;
  });
  
  // Format headers
  columns.forEach(col => {
    headers.push(formatColumnName(col));
  });
  
  // Generate tabel
  doc.autoTable({
    head: [headers],
    body: tableData,
    startY: 30,
    styles: { 
      fontSize: 8,
      cellPadding: 2,
      lineColor: [200, 200, 200],
      lineWidth: 0.1
    },
    headStyles: { 
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    margin: { top: 30 },
    pageBreak: 'auto'
  });
  
  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Halaman ${i} dari ${pageCount}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
  }
  
  doc.save(`${filenamePrefix}_${getFormattedDate()}.pdf`);
}

// Fungsi untuk generate PDF
function generatePDF(data, columns, filenamePrefix) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Judul
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text('LAPORAN KEHADIRAN', 105, 15, { align: 'center' });
  
  // Subjudul
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Tanggal Generate: ${new Date().toLocaleDateString('id-ID')} | Total Data: ${data.length}`, 105, 22, { align: 'center' });
  
  // Siapkan data untuk tabel
  const headers = columns.map(col => formatColumnName(col));
  const tableData = data.map(row => 
    columns.map(col => {
      let value = row[col] ?? '';
      return cleanHtmlContent(value.toString()).substring(0, 50); // Batasi panjang teks
    })
  );
  
  // Generate tabel
  doc.autoTable({
    head: [headers],
    body: tableData,
    startY: 30,
    styles: { 
      fontSize: 8,
      cellPadding: 2,
      lineColor: [200, 200, 200],
      lineWidth: 0.1
    },
    headStyles: { 
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    margin: { top: 30 },
    pageBreak: 'auto'
  });
  
  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Halaman ${i} dari ${pageCount}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
  }
  
  doc.save(`${filenamePrefix}_${getFormattedDate()}.pdf`);
}

// Helper function untuk load PDF library
function loadPdfLibrary() {
  return new Promise((resolve, reject) => {
    if (typeof jspdf !== 'undefined' && typeof jspdf.jsPDF !== 'undefined') {
      resolve();
      return;
    }
    
    // Load jsPDF
    const script1 = document.createElement('script');
    script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script1.onload = () => {
      // Load autoTable
      const script2 = document.createElement('script');
      script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js';
      script2.onload = resolve;
      script2.onerror = reject;
      document.head.appendChild(script2);
    };
    script1.onerror = reject;
    document.head.appendChild(script1);
  });
}

// Helper function untuk download blob
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Helper function untuk format tanggal
function getFormattedDate() {
  const now = new Date();
  return now.toISOString().slice(0, 10).replace(/-/g, '');
}
async function insertIzin(data) {
  const { error } = await supabase.from('izin').insert([data]);
  return error;
}
async function getIzinByUserId(user_id) {
  const { data, error } = await supabase.from('izin').select('*').eq('id_user', user_id).order('tanggal', { ascending: false });
  return { data, error };
}
async function getSchoolLocationConfig(kodeSekolah) {
  const { data, error } = await supabase
    .from('sekolah')
    .select('lokasi_absensi_lat, lokasi_absensi_lon, radius_absensi')
    .eq('kode_sekolah', kodeSekolah)
    .single();
  return { data, error };
}
async function updateSchoolConfig(id, newConfig) {
  const { error } = await supabase
    .from('sekolah')
    .update(newConfig)
    .eq('id', id);
  return { error };
}
async function getIzinByStatus(id_sekolah, status = 'pending') {
  const { data: izinData, error: izinError } = await supabase
    .from('izin')
    .select('*')
    .eq('id_sekolah', id_sekolah)
    .eq('status', status)
    .order('created_at', { ascending: false });
  if (izinError) {
    return { data: null, error: izinError };
  }
  if (!izinData || izinData.length === 0) {
    return { data: [], error: null };
  }
  const userIds = [...new Set(izinData.map(izin => izin.id_user))];
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('id, name, user_no')
    .in('id', userIds);
  
  if (usersError) {
    return { data: null, error: usersError };
  }
  const result = izinData.map(izin => {
    const userData = usersData.find(user => user.id === izin.id_user);
    return {
      ...izin,
      user_name: userData ? userData.name : 'Tidak Diketahui',
      user_no: userData ? userData.user_no : 'Tidak Diketahui'
    };
  });
  return { data: result, error: null };
}
async function updateIzinStatus(id, status, catatan = null) {
  const updateData = { status };
  if (catatan) {
    updateData.catatan_penolakan = catatan;
  }
  const { error } = await supabase
    .from('izin')
    .update(updateData)
    .eq('id', id);
  return { error };
}
async function getKeuanganSiswa(user_no, id_sekolah) {
  const { data, error } = await supabase
    .from('keuangan_siswa')
    .select('*')
    .eq('user_no', user_no)
    .eq('id_sekolah', id_sekolah)
    .single();
  
  return { data, error };
}
async function getAnnouncements(id_sekolah) {
  const { data, error } = await supabase
    .from('pengumuman')
    .select('*')
    .eq('id_sekolah', id_sekolah)
    .gte('tanggal_berlaku', new Date().toISOString().split('T')[0])
    .order('created_at', { ascending: false })
    .limit(5);
  return { data, error };
}
async function processPayment(tagihan, amount, note, paymentSource, idSumber = null, keteranganSumber = '') {
  await loading();
  try {
    if (!amount || amount <= 0 || amount > parseInt(tagihan.sisa_tagihan || 0)) {
      throw new Error('Jumlah pembayaran tidak valid');
    }
    const newPaid = parseInt(tagihan.sudah_bayar || 0) + amount;
    const newRemaining = parseInt(tagihan.sisa_tagihan || 0) - amount;
    const newStatus = newRemaining <= 0 ? 'Lunas' : 'Sebagian';
    const tanggalBayar = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('recordtagihan')
      .update({
        sudah_bayar: newPaid,
        sisa_tagihan: newRemaining,
        status_bayar: newStatus,
        tanggal_bayar: tanggalBayar
      })
      .eq('id', tagihan.id);
    if (updateError) throw updateError;
    const transaksiData = {
      id_user: tagihan.user_id,
      id_tipe: tagihan.id_tagihan,
      nominal: amount.toString(),
      catatan: note,
      tipe: 'tagihan',
      id_sekolah: user.id_sekolah,
      tanggal_bayar: tanggalBayar,
      sumber_dana: paymentSource,
      id_sumber_external: idSumber,
      keterangan_sumber: keteranganSumber
    };
    if (paymentSource === 'saldo' && idSumber) {
      const { error: saldoError } = await updateSaldo(
        idSumber, 
        amount, 
        'debit', 
        null,
        `Pembayaran tagihan: ${tagihan.mastertagihan?.nama_tagihan || ''}`
      );
      if (saldoError) throw saldoError;
    }
    const { data: transaksi, error: transaksiError } = await supabase
      .from('transaksi')
      .insert(transaksiData)
      .select()
      .single();
    if (transaksiError) throw transaksiError;
    if (paymentSource === 'saldo' && idSumber) {
      await supabase
        .from('mutasi_saldo')
        .update({ id_transaksi: transaksi.id })
        .eq('id_saldo', idSumber)
        .is('id_transaksi', null)
        .order('created_at', { ascending: false })
        .limit(1);
    }
    return true;
  } catch (error) {
    console.error('Error processing payment:', error);
    throw error;
  } finally {
    await loadingout();
  }
}
async function updateSaldo(idSaldo, nominal, jenisMutasi, idTransaksi, keterangan) {
  const { data: saldo, error: errorSaldo } = await supabase
    .from('saldo')
    .select('saldo_sekarang')
    .eq('id', idSaldo)
    .single();
  if (errorSaldo) return { error: errorSaldo };
  const saldoSebelum = saldo.saldo_sekarang;
  const saldoSesudah = jenisMutasi === 'debit' 
    ? saldoSebelum - nominal 
    : saldoSebelum + nominal;
  const { error: updateError } = await supabase
    .from('saldo')
    .update({ saldo_sekarang: saldoSesudah, updated_at: new Date().toISOString() })
    .eq('id', idSaldo);
  if (updateError) return { error: updateError };
  const { error: mutasiError } = await supabase
    .from('mutasi_saldo')
    .insert([{
      id_saldo: idSaldo,
      id_transaksi: idTransaksi,
      jenis_mutasi: jenisMutasi,
      nominal: nominal,
      saldo_sebelum: saldoSebelum,
      saldo_sesudah: saldoSesudah,
      keterangan: keterangan
    }]);
  return { error: mutasiError };
}
async function getSumberDanaExternal(idSekolah) {
  const { data, error } = await supabase
    .from('sumber_dana_external')
    .select('*')
    .eq('id_sekolah', idSekolah)
    .eq('is_active', true)
    .order('nama_sumber');
  return { data, error };
}
async function insertSumberDanaExternal(data) {
  const { error } = await supabase.from('sumber_dana_external').insert([data]);
  return error;
}
async function getSaldoByUser(userId, idSekolah, jenisSaldo = null) {
  let query = supabase
    .from('saldo')
    .select('*')
    .eq('id_user', userId)
    .eq('id_sekolah', idSekolah);
  if (jenisSaldo) {
    query = query.eq('jenis_saldo', jenisSaldo);
  }
  const { data, error } = await query;
  return { data, error };
}
async function getSaldoSekolah(idSekolah, jenisSaldo = null) {
  let query = supabase
    .from('saldo')
    .select('*')
    .eq('id_sekolah', idSekolah)
    .is('id_user', null);
  if (jenisSaldo) {
    query = query.eq('jenis_saldo', jenisSaldo);
  }
  const { data, error } = await query;
  return { data, error };
}
async function createSaldo(data) {
  const { data: result, error } = await supabase.from('saldo').insert([data]).select();
  return { data: result, error };
}
async function updateSaldoAmount(idSaldo, nominal, jenisMutasi, idTransaksi, keterangan) {
  const { data: saldo, error: errorSaldo } = await supabase
    .from('saldo')
    .select('saldo_sekarang')
    .eq('id', idSaldo)
    .single();
  if (errorSaldo) return { data: null, error: errorSaldo };
  const saldoSebelum = saldo.saldo_sekarang;
  const saldoSesudah = jenisMutasi === 'debit' 
    ? saldoSebelum - nominal 
    : saldoSebelum + nominal;
  const { data: updateData, error: updateError } = await supabase
    .from('saldo')
    .update({ saldo_sekarang: saldoSesudah, updated_at: new Date().toISOString() })
    .eq('id', idSaldo)
    .select();
  if (updateError) return { data: null, error: updateError };
  const { data: mutasiData, error: mutasiError } = await supabase
    .from('mutasi_saldo')
    .insert([{
      id_saldo: idSaldo,
      id_transaksi: idTransaksi,
      jenis_mutasi: jenisMutasi,
      nominal: nominal,
      saldo_sebelum: saldoSebelum,
      saldo_sesudah: saldoSesudah,
      keterangan: keterangan
    }])
    .select();
  return { data: { saldo: updateData, mutasi: mutasiData }, error: mutasiError };
}
async function getMutasiSaldo(idSaldo) {
  const { data, error } = await supabase
    .from('mutasi_saldo')
    .select('*')
    .eq('id_saldo', idSaldo)
    .order('created_at', { ascending: false });
  return { data, error };
}
async function updateSaldoDetail(idSaldo, data) {
  const { data: result, error } = await supabase
    .from('saldo')
    .update(data)
    .eq('id', idSaldo)
    .select();
  return { data: result, error };
}
async function getTotalSaldoSiswa(idSekolah) {
  const { data: saldoSiswa, error } = await supabase
    .from('saldo')
    .select('saldo_sekarang')
    .not('id_user', 'is', null)
    .eq('id_sekolah', idSekolah);  
  if (error) return { data: 0, error };
  const total = saldoSiswa.reduce((sum, item) => sum + parseInt(item.saldo_sekarang || 0), 0);
  return { data: total, error: null };
}
async function getSumberDanaTersedia(idSekolah, userId = null) {
  const result = {
    saldo_sekolah: [],
    saldo_siswa: [],
    external: []
  };
  try {
    const { data: saldoSekolah } = await getSaldoSekolah(idSekolah);
    result.saldo_sekolah = saldoSekolah || [];
    if (userId) {
      const { data: saldoSiswa } = await getSaldoByUser(userId, idSekolah);
      result.saldo_siswa = saldoSiswa || [];
    }
    const { data: sumberExternal } = await getSumberDanaExternal(idSekolah);
    result.external = sumberExternal || [];
    return { data: result, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
async function processPaymentWithSource(tagihan, amount, note, paymentSource, idSumber = null, keteranganSumber = '') {
  await loading();
  try {
    if (!amount || amount <= 0 || amount > parseInt(tagihan.sisa_tagihan || 0)) {
      throw new Error('Jumlah pembayaran tidak valid');
    }
    const newPaid = parseInt(tagihan.sudah_bayar || 0) + amount;
    const newRemaining = parseInt(tagihan.sisa_tagihan || 0) - amount;
    const newStatus = newRemaining <= 0 ? 'Lunas' : 'Sebagian';
    const tanggalBayar = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('recordtagihan')
      .update({
        sudah_bayar: newPaid,
        sisa_tagihan: newRemaining,
        status_bayar: newStatus,
        tanggal_bayar: tanggalBayar
      })
      .eq('id', tagihan.id);
    if (updateError) throw updateError;
    const transaksiData = {
      id_user: tagihan.user_id,
      id_tipe: tagihan.id_tagihan,
      nominal: amount.toString(),
      catatan: note,
      tipe: 'tagihan',
      id_sekolah: user.id_sekolah,
      tanggal_bayar: tanggalBayar,
      sumber_dana: paymentSource,
      keterangan_sumber: keteranganSumber
    };
    if (paymentSource === 'saldo' && idSumber) {
      transaksiData.id_saldo = idSumber;
      const { error: saldoError } = await updateSaldoAmount(
        idSumber, 
        amount, 
        'debit', 
        null,
        `Pembayaran tagihan: ${tagihan.mastertagihan?.nama_tagihan || ''}`
      );
      if (saldoError) throw saldoError;
    } else if (paymentSource === 'external' && idSumber) {
      transaksiData.id_sumber_external = idSumber;
    }
    const { data: transaksi, error: transaksiError } = await supabase
      .from('transaksi')
      .insert(transaksiData)
      .select()
      .single();
    if (transaksiError) throw transaksiError;
    if (paymentSource === 'saldo' && idSumber) {
      await supabase
        .from('mutasi_saldo')
        .update({ id_transaksi: transaksi.id })
        .eq('id_saldo', idSumber)
        .is('id_transaksi', null)
        .order('created_at', { ascending: false })
        .limit(1);
    }
    return true;
  } catch (error) {
    console.error('Error processing payment:', error);
    throw error;
  } finally {
    await loadingout();
  }
}
async function processPembayaranWithSource(pembayaran, amount, note, paymentSource, idSumber = null, keteranganSumber = '') {
  await loading();
  try {
    if (!amount || amount <= 0 || amount > parseInt(pembayaran.sisa_tunggakan || 0)) {
      throw new Error('Jumlah pembayaran tidak valid');
    }
    const newPaid = parseInt(pembayaran.sudah_bayar || 0) + amount;
    const newRemaining = parseInt(pembayaran.sisa_tunggakan || 0) - amount;
    const newStatus = newRemaining <= 0 ? 'Lunas' : 'Sebagian';
    const tanggalBayar = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('recordpembayaran')
      .update({
        sudah_bayar: newPaid,
        sisa_tunggakan: newRemaining,
        status_bayar: newStatus,
        tanggal_bayar: tanggalBayar
      })
      .eq('id', pembayaran.id);
    if (updateError) throw updateError;
    const transaksiData = {
      id_user: pembayaran.id_user,
      id_tipe: pembayaran.id_tunggakan,
      nominal: amount.toString(),
      catatan: note,
      tipe: 'pembayaran',
      id_sekolah: user.id_sekolah,
      tanggal_bayar: tanggalBayar,
      sumber_dana: paymentSource,
      keterangan_sumber: keteranganSumber
    };
    if (paymentSource === 'saldo' && idSumber) {
      transaksiData.id_saldo = idSumber;
      const { error: saldoError } = await updateSaldoAmount(
        idSumber, 
        amount, 
        'debit', 
        null,
        `Pembayaran: ${pembayaran.masterpembayaran?.nama_tagihan || ''}`
      );
      if (saldoError) throw saldoError;
    } else if (paymentSource === 'external' && idSumber) {
      transaksiData.id_sumber_external = idSumber;
    }
    const { data: transaksi, error: transaksiError } = await supabase
      .from('transaksi')
      .insert(transaksiData)
      .select()
      .single();
    if (transaksiError) throw transaksiError;
    if (paymentSource === 'saldo' && idSumber) {
      await supabase
        .from('mutasi_saldo')
        .update({ id_transaksi: transaksi.id })
        .eq('id_saldo', idSumber)
        .is('id_transaksi', null)
        .order('created_at', { ascending: false })
        .limit(1);
    }
    return true;
  } catch (error) {
    console.error('Error processing payment:', error);
    throw error;
  } finally {
    await loadingout();
  }
}
async function getJenisPelanggaranStructured(id_sekolah) {
  const { data, error } = await supabase
    .from('pelanggaran_jenis')
    .select('*')
    .eq('id_sekolah', id_sekolah)
    .order('kelompok')
    .order('urutan');
  if (error) return { data: null, error };
  const structured = [];
  const parents = data.filter(item => !item.parent_id);
  const children = data.filter(item => item.parent_id);
  parents.forEach(parent => {
    const parentWithChildren = { ...parent, children: [] };
    children.forEach(child => {
      if (child.parent_id === parent.id) {
        parentWithChildren.children.push(child);
      }
    });
    structured.push(parentWithChildren);
  });
  return { data: structured, error: null };
}


function formatLokasiDisplay(lokasi) {
  if (!lokasi) return '';
  
  // Jika lokasi mengandung pemisah ***, artinya ada data masuk dan keluar
  if (lokasi.includes('***')) {
    const [lokasiMasuk, lokasiKeluar] = lokasi.split('***');
    
    const displayMasuk = generateLocationDisplay(lokasiMasuk);
    const displayKeluar = generateLocationDisplay(lokasiKeluar);
    
    return `
      <div class="lokasi-container">
        <div class="lokasi-masuk">
          <strong>Masuk:</strong> ${displayMasuk}
        </div>
        <div class="lokasi-keluar">
          <strong>Keluar:</strong> ${displayKeluar}
        </div>
      </div>
    `;
  } else {
    // Hanya satu lokasi (masuk saja)
    return `<strong>Masuk:</strong> ${generateLocationDisplay(lokasi)}`;
  }
}

function generateLocationDisplay(lokasi) {
  if (!lokasi) return '-';
  
  // Cek apakah lokasi adalah koordinat (format: lat,lon)
  const coordRegex = /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/;
  const match = lokasi.match(coordRegex);
  
  if (match) {
    const lat = match[1];
    const lon = match[2];
    
    // Anda bisa menambahkan logika untuk mengecek apakah dalam range sekolah
    // Untuk sekarang, kita tampilkan link Google Maps
    return `
      <div class="lokasi-koordinat">
        <span class="text-sm">${lokasi}</span>
        <a href="https://maps.google.com/?q=${lat},${lon}" 
           target="_blank" 
           class="text-blue-600 hover:text-blue-800 text-xs ml-2"
           title="Buka di Google Maps">
          📍 Lihat Peta
        </a>
      </div>
    `;
  } else {
    // Jika bukan koordinat, tampilkan langsung
    return `<span>${lokasi}</span>`;
  }
}




async function getNilaiBySiswa(id_siswa, id_sekolah) {
  const { data, error } = await supabase
    .from('nilai')
    .select(`
      *,
      mapel:kode_mapel,
      mapel_data:mapel(nama_mapel, kode_mapel)
    `)
    .eq('id_siswa', id_siswa)
    .eq('id_sekolah', id_sekolah);
  
  return { data, error };
}

async function getNilaiRataRataSiswa(id_siswa, id_sekolah) {
  const { data, error } = await supabase
    .from('nilai')
    .select('nilai')
    .eq('id_siswa', id_siswa)
    .eq('id_sekolah', id_sekolah);
  
  if (error || !data) return { data: 0, error };
  
  const total = data.reduce((sum, item) => sum + parseFloat(item.nilai || 0), 0);
  const average = data.length > 0 ? total / data.length : 0;
  
  return { data: average.toFixed(2), error: null };
}


// window.supabase = supabase;
window.formatLokasiDisplay = formatLokasiDisplay;
window.getNilaiBySiswa = getNilaiBySiswa;
window.getNilaiRataRataSiswa = getNilaiRataRataSiswa;
window.fetchMultiJoinLaporan=fetchMultiJoinLaporan;
window.fetchMultiJoinLaporanPaginated=fetchMultiJoinLaporanPaginated;
window.renderLaporanToTable=renderLaporanToTable;
window.getJenisPelanggaranStructured = getJenisPelanggaranStructured;
window.getTotalSaldoSiswa = getTotalSaldoSiswa;
window.getSumberDanaTersedia = getSumberDanaTersedia;
window.processPaymentWithSource = processPaymentWithSource;
window.processPembayaranWithSource = processPembayaranWithSource;
window.getSumberDanaExternal = getSumberDanaExternal;
window.insertSumberDanaExternal = insertSumberDanaExternal;
window.getSaldoByUser = getSaldoByUser;
window.getSaldoSekolah = getSaldoSekolah;
window.createSaldo = createSaldo;
window.updateSaldoAmount = updateSaldoAmount;
window.getMutasiSaldo = getMutasiSaldo;
window.updateSaldoDetail = updateSaldoDetail;
window.updateSaldo = updateSaldo;
window.getAnnouncements = getKeuanganSiswa;
window.getKeuanganSiswa = getKeuanganSiswa;
window.getIzinByStatus = getIzinByStatus;
window.updateIzinStatus = updateIzinStatus;
window.updateSchoolConfig = updateSchoolConfig;
window.getSchoolLocationConfig = getSchoolLocationConfig;
window.insertIzin = insertIzin;
window.getIzinByUserId = getIzinByUserId;
window.downloadTableData = downloadTableData;
window.generatePhotoThumbnail = generatePhotoThumbnail;
window.openImageModal = openImageModal;
window.insertMasterPembayaran = insertMasterPembayaran;
window.getMasterPembayaran = getMasterPembayaran;
window.insertRecordPembayaran = insertRecordPembayaran;
window.updateRecordPembayaran = updateRecordPembayaran;
window.updateSiswa = updateSiswa;
window.updateGuru = updateGuru;
window.updateWali = updateWali;
window.filterMultiColumn = filterMultiColumn;
window.insertJenisPelanggaran = insertJenisPelanggaran;
window.updateSettingPeringatan = updateSettingPeringatan;
window.getTotalPoinSiswa = getTotalPoinSiswa;
window.getPelanggaranLengkap = getPelanggaranLengkap;
window.getJenisPelanggaran = getJenisPelanggaran;
window.insertJenisPelanggaran = insertJenisPelanggaran;
window.insertPelanggaranSiswa = insertPelanggaranSiswa;
window.getPelanggaranBySiswa = getPelanggaranBySiswa;
window.getSettingPeringatan = getSettingPeringatan;
window.getSchoolConfig = getSchoolConfig;
window.updateSchoolConfig = updateSchoolConfig;
window.loading = loading;
window.loadingout = loadingout;
window.insertUser = insertUser;
window.insertSiswa = insertSiswa;
window.insertGuru = insertGuru;
window.insertWali = insertWali;
window.insertJurusan = insertJurusan;
window.insertMapel = insertMapel;
window.insertInventaris = insertInventaris;
window.insertMateri  = insertMateri;
window.insertAbsen  = insertAbsen;
window.insertJawabanTugas  = insertJawabanTugas;
window.updateUser = updateUser;
window.updateAbsen  = updateAbsen;
window.updateRecordTagihan  = updateRecordTagihan;
window.updateRecordBayaran  = updateRecordBayaran;
window.insertRecordTransaksi  = insertRecordTransaksi;
window.deleteUser = deleteUser;
window.getUserById = getUserById;
window.getUserByUserNo = getUserByUserNo;
window.testConnection = testConnection;
window.getSiswa = getSiswa;
window.getGuru = getGuru;
window.getAdmin = getAdmin;
window.getsekolah = getsekolah;
window.getWali = getWali;
window.getMateribyId = getMateribyId;
window.getTugasbyId = getTugasbyId;
window.getUsersByRoleWithSekolah = getUsersByRoleWithSekolah;
window.getAllUsersWithSekolah = getAllUsersWithSekolah;
window.getJadwalGuru = getJadwalGuru;
window.getGuruJurusanMapelMateriTugas = getGuruJurusanMapelMateriTugas;
window.getSiswaJurusanMapelMateriTugas = getSiswaJurusanMapelMateriTugas;
window.setupDropdownFilters = setupDropdownFilters;
window.getGuruDetail = getGuruDetail;
window.getSiswaDetail = getSiswaDetail;
window.getWaliDetail = getWaliDetail;
window.getJurusan = getJurusan;
window.getMapel = getMapel;
window.getMapelByCode = getMapelByCode;
window.getMapelJurusanSemesterByGuru = getMapelJurusanSemesterByGuru;
window.getAbsenById = getAbsenById;
window.getAbsenbyUserId = getAbsenbyUserId;
window.getAllUser = getAllUser;
window.getMasterTagihan = getMasterTagihan;