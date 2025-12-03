let stream = null;
let isWithinRadius = false;
let currentJadwalId = null;
let currentMapel = null;
let currentJurusan = null;
export async function initPage() {
  await loading();
  currentJadwalId = localStorage.getItem('selected_jadwal_id');
  currentMapel = localStorage.getItem('selected_mapel');
  currentJurusan = localStorage.getItem('selected_jurusan');
  if (!currentJadwalId) {
    alert('Data jadwal tidak ditemukan. Silakan kembali ke halaman jadwal.');
    window.location.hash = '#/jadwalmengajar_list';
    return;
  }
  document.getElementById('mapelInfo').querySelector('span').textContent = currentMapel || '-';
  document.getElementById('jurusanInfo').querySelector('span').textContent = currentJurusan || '-';
  const { data: jadwalData, error } = await supabase
    .from('jadwal')
    .select('*')
    .eq('id', currentJadwalId)
    .single();
  if (!error && jadwalData) {
    document.getElementById('waktuInfo').querySelector('span').textContent = 
      `${jadwalData.hari}, ${jadwalData.jamstart} - ${jadwalData.jamend}`;
  }
  setupEventListeners();
  getLocation();
  await loadingout();
}

function setupEventListeners() {
  document.getElementById('openCameraBtn').addEventListener('click', openCamera);
  document.getElementById('closeCameraBtn').addEventListener('click', closeCamera);
  document.getElementById('captureBtn').addEventListener('click', capturePhoto);
  document.getElementById('refreshLocationBtn').addEventListener('click', getLocation);
  document.getElementById('cancelBtn').addEventListener('click', () => {
    window.location.hash = '#/jadwalmengajar_list';
  });
  document.getElementById('submitAbsenMengajar').addEventListener('click', submitAbsenMengajar);
}
async function openCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    document.getElementById('video').srcObject = stream;
    document.getElementById('cameraModal').classList.remove('hidden');
  } catch (err) {
    alert('Tidak dapat mengakses kamera: ' + err.message);
  }
}
function closeCamera() {
  stopCamera();
  document.getElementById('cameraModal').classList.add('hidden');
}
function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    document.getElementById('video').srcObject = null;
    stream = null;
  }
}
function capturePhoto() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const previewImage = document.getElementById('previewImage');
  const previewContainer = document.getElementById('previewContainer');
  const captureNotice = document.getElementById('captureNotice');  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imageData = canvas.toDataURL('image/jpeg');
  previewImage.src = imageData;
  previewContainer.classList.remove('hidden');
  captureNotice.classList.add('hidden');
  closeCamera();
  updateSubmitButtonState();
}
async function getLocation() {
  const locationPreview = document.getElementById('locationPreview');
  const mapPreview = document.getElementById('mapPreview');
  const submitBtn = document.getElementById('submitAbsenMengajar');
  const { data: schoolConfig, error } = await getSchoolLocationConfig(user.kode_sekolah);
  if (error || !schoolConfig.lokasi_absensi_lat) {
    locationPreview.textContent = 'Sekolah belum mengatur lokasi absensi. Hubungi administrator.';
    locationPreview.classList.add('text-red-500');
    isWithinRadius = false;
    updateSubmitButtonState();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      const distance = calculateDistance(
        latitude, 
        longitude, 
        schoolConfig.lokasi_absensi_lat, 
        schoolConfig.lokasi_absensi_lon
      );
      if (distance > schoolConfig.radius_absensi) {
        locationPreview.innerHTML = `
          <span class="text-red-500 font-semibold">
            Anda berada di luar radius absensi yang diizinkan!
          </span>
          <br>
          Jarak: ${Math.round(distance)} meter dari titik absensi
          <br>
          Radius maksimal: ${schoolConfig.radius_absensi} meter
        `;
        isWithinRadius = false;
      } else {
        locationPreview.innerHTML = `
          <span class="text-green-500 font-semibold">
            Anda berada dalam radius absensi.
          </span>
          <br>
          Jarak: ${Math.round(distance)} meter dari titik absensi
          <br>
          Akurasi: ±${Math.round(accuracy)} meter
        `;
        isWithinRadius = true;
      }
      updateSubmitButtonState();
      const mapIframe = `
        <iframe 
          width="100%" 
          height="100%" 
          frameborder="0" 
          scrolling="no" 
          marginheight="0" 
          marginwidth="0" 
          src="https://maps.google.com/maps?q=${schoolConfig.lokasi_absensi_lat},${schoolConfig.lokasi_absensi_lon}&z=16&output=embed&iwloc=near"
        >
        </iframe>
      `;      
      mapPreview.innerHTML = mapIframe;
      locationPreview.dataset.lat = latitude;
      locationPreview.dataset.lon = longitude;
    },
    (err) => {
      locationPreview.textContent = 'Gagal mengambil lokasi: ' + err.message;
      console.error('Error lokasi:', err);
      isWithinRadius = false;
      updateSubmitButtonState();
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
function updateSubmitButtonState() {
  const submitBtn = document.getElementById('submitAbsenMengajar');
  const previewContainer = document.getElementById('previewContainer');
  const hasPhoto = !previewContainer.classList.contains('hidden');
  if (hasPhoto && isWithinRadius) {
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    submitBtn.classList.add('hover:bg-green-700');
  } else {
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    submitBtn.classList.remove('hover:bg-green-700');
  }
}

async function submitAbsenMengajar() {
  const submitBtn = document.getElementById('submitAbsenMengajar');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Menyimpan...';  
  try {
    const keterangan = document.getElementById('keterangan').value;
    const lat = document.getElementById('locationPreview').dataset.lat;
    const lon = document.getElementById('locationPreview').dataset.lon;
    const base64Data = document.getElementById('previewImage').src;
    const response = await fetch(base64Data);
    const blob = await response.blob();
    const fileName = `mengajar_${Date.now()}_${user.user_no}.jpg`;
    const filePath = `mengajar/${fileName}`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('kegiatan')
      .upload(filePath, blob);
    if (uploadError) {
      alert('Gagal upload foto: ' + uploadError.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-check-circle mr-1"></i> Simpan Absen';
      return;
    }
    const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/kegiatan/${filePath}`;
    const now = new Date();
    const { error } = await supabase
      .from('kegiatan')
      .insert([{
        jenis_kegiatan: 'Mengajar',
        keterangan: `Mengajar ${currentMapel} - ${keterangan}`,
        foto: fileUrl,
        lokasi: `${lat},${lon}`,
        waktu: now.toISOString(),
        user_id: user.id,
        id_sekolah: user.id_sekolah,
        id_jadwal: currentJadwalId
      }]);
    if (error) {
      alert('Gagal menyimpan absen mengajar: ' + error.message);
    } else {
      alert('Absen mengajar berhasil disimpan!');
      window.location.hash = '#/jadwalmengajar_list';
    }
  } catch (err) {
    console.error('Error:', err);
    alert('Terjadi kesalahan: ' + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-check-circle mr-1"></i> Simpan Absen';
  }
}