let dataUser = {};
let Datanya = {};
let user = {};
let detailUser = {};  
let errorUser = {};
export async function initPage() {
  await loading();
  try{
    user = JSON.parse(localStorage.getItem('user'));
    const { data, error } = await getUserById(user.id);
    if (user.role === "siswa") {
      const result = await getSiswaDetail(user.user_no, user.id_sekolah);
      detailUser = result.data;
      errorUser = result.error;
    } else if (user.role === "guru") {
      const result = await getGuruJurusanMapelMateriTugas(user.user_no, user.id_sekolah, user.role);
      detailUser = result.data;
      errorUser = result.error;
    } else if (user.role === "wali") {   
      const result = await getWaliDetail(user.user_no, user.id_sekolah);
      detailUser = result.data;
      errorUser = result.error;
    } else {
      const result = await getUserById(user.id);
      detailUser = result.data;
      errorUser = result.error;
    }
    if (errorUser) {
      console.error("❌ Gagal ambil data:", errorUser.message);
      return;
    }
    dataUser = {
      user: data,
      detailUser: detailUser,
    };
    if (dataUser.user.role === "siswa") {
      Datanya = {
        nama: dataUser.user.name,
        nis: dataUser.user.user_no,
        alamat: dataUser.user.address,
        semester: dataUser.detailUser.semester,
        jurusan: dataUser.detailUser.jurusan,
        tgl_lahir: "-"
      };
    } else if (dataUser.user.role === "guru") {
      Datanya = {
        nama: dataUser.user.name,
        nip: dataUser.user.user_no,
        alamat: dataUser.user.address,
        jurusan: dataUser.detailUser.jurusan.map(m=>m.nama_jurusan).join(', '),
        semester_diampu: dataUser.detailUser.guru_semester,
        mapel:  dataUser.detailUser.mapelData.map(m=>m.nama_mapel).join(', '),
        pengalaman: "8 tahun"
      };
    } else if (dataUser.user.role === "wali") {
      Datanya = {
        nama: dataUser.user.name,
        id_wali: "WL00234",
        alamat: "Jl. Beringin No. 9",
        anak: [
          "Rani Salsabila – Kelas 10 IPA 1",
          "Dino Firmansyah – Kelas 12 IPS 2"
        ],
        no_hp: "0812-3456-7890",
        email: "sumarno.wali@email.com"
      };
    } else {
      Datanya = {
        nama: dataUser.user.name || "User Tidak Dikenal",
        id: dataUser.user.user_no,
        alamat: dataUser.user.address,
      };
    }
    const container = document.getElementById("info-container");
    container.innerHTML = renderInfo(Datanya);
  }catch(err){
    console.error('❌ Error ambil data:', err);
  }finally{
    await loadingout();
  }
}


function renderInfo(data) {
  const cardBase = (content) => `
    <div class="max-w-xl w-full text-left ml-0 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
      ${content}
    </div>
  `;
  if (user.role === "siswa") {
    return cardBase(`
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        🎓 ${data.nama}
      </h2>
      <p class="text-sm text-gray-700 dark:text-gray-300">📄 NIS: <span class="font-medium">${data.nis}</span></p>
      <p class="text-sm text-gray-700 dark:text-gray-300 mt-2">📍 Alamat: ${data.alamat}</p>
      <p class="text-sm text-gray-700 dark:text-gray-300 mt-2">🧪 Jurusan: ${data.jurusan}</p>
      <p class="text-sm text-gray-700 dark:text-gray-300 mt-2">🎂 Tanggal Lahir: ${data.tgl_lahir}</p>
      <p class="text-sm text-gray-700 dark:text-gray-300 mt-2">📚 Semester: ${data.semester}</p>
    `);
  }
  else if (user.role === "guru") {
    return cardBase(`
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        👨‍🏫 ${data.nama}
      </h2>
      <p class="text-sm text-gray-700 dark:text-gray-300">🆔 NIP: ${data.nip}</p>
      <p class="text-sm text-gray-700 dark:text-gray-300 mt-2">📍 Alamat: ${data.alamat}</p>
      <p class="text-sm text-gray-700 dark:text-gray-300 mt-2">📘 Mata Pelajaran: ${data.mapel}</p>
      <p class="text-sm text-gray-700 dark:text-gray-300 mt-2">🧪 Jurusan: ${data.jurusan}</p>
      <p class="text-sm text-gray-700 dark:text-gray-300 mt-2">📚 Semester Diampu: ${data.semester_diampu}</p>
      <p class="text-sm text-gray-700 dark:text-gray-300 mt-2">🕰️ Pengalaman: ${data.pengalaman}</p>
    `);
  }
  else if (user.role === "wali") {
    const anakList = data.anak.map(nama => `<li class="text-sm text-gray-700 dark:text-gray-300">👧 ${nama}</li>`).join('');
    return cardBase(`
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        🧑‍💼 ${data.nama}
      </h2>
      <p class="text-sm text-gray-700 dark:text-gray-300">🆔 ID Wali: ${data.id_wali}</p>
      <p class="text-sm text-gray-700 dark:text-gray-300 mt-2">📍 Alamat: ${data.alamat}</p>
      <p class="text-sm text-gray-700 dark:text-gray-300 mt-2">📞 No HP: ${data.no_hp}</p>
      <p class="text-sm text-gray-700 dark:text-gray-300 mt-2">✉️ Email: ${data.email}</p>
      <p class="text-sm text-gray-700 dark:text-gray-300 mt-2 font-semibold">👨‍👩‍👧 Anak-anak:</p>
      <ul class="list-inside list-disc pl-2 mt-1">
        ${anakList}
      </ul>
    `);
  }
  else {
    return cardBase(`
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">👤 ${data.nama}</h2>
      <p class="text-sm text-gray-700 dark:text-gray-300">ID: ${data.id || "-"}</p>
      <p class="text-sm text-gray-700 dark:text-gray-300 mt-2">📍 Alamat: ${data.alamat}</p>
    `);
  }
}
