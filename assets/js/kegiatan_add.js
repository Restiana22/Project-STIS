let stream = null;
let timeInterval = null;
async function startCamera() {
  stream = await navigator.mediaDevices.getUserMedia({ video: true });
  document.getElementById('video').srcObject = stream;
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    document.getElementById('video').srcObject = null;
    stream = null;
  }
}

function getLocation() {
  const locationPreview = document.getElementById('locationPreview');
  const mapPreview = document.getElementById('mapPreview');
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      locationPreview.textContent = `Latitude: ${latitude.toFixed(5)}, Longitude: ${longitude.toFixed(5)}, Akurasi: ±${Math.round(accuracy)} meter`;
      mapPreview.src = `https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`;
      locationPreview.dataset.lat = latitude;
      locationPreview.dataset.lon = longitude;
    },
    (err) => {
      locationPreview.textContent = 'Gagal mengambil lokasi: ' + err.message;
      console.error('Error lokasi:', err);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

function startTimeUpdater() {
  const waktuInput = document.getElementById('waktu');
  function updateTime() {
    waktuInput.value = new Date().toISOString();
  }
  updateTime();
  return setInterval(updateTime, 1000);
}


export async function initPage() {
  await loading();
  getLocation();
  if (timeInterval) clearInterval(timeInterval);
  timeInterval = startTimeUpdater();
  const openCameraBtn = document.getElementById('openCameraBtn');
  const cameraModal = document.getElementById('cameraModal');
  const captureBtn = document.getElementById('captureBtn');
  const canvas = document.getElementById('canvas');
  const video = document.getElementById('video');
  const previewImage = document.getElementById('previewImage');
  const submitBtn = document.getElementById('submitKegiatan');
  const captureNotice = document.getElementById('captureNotice');
  const refreshLocationBtn = document.getElementById('refreshLocationBtn');
  if (refreshLocationBtn) {
    refreshLocationBtn.onclick = () => getLocation();
  }
  openCameraBtn.onclick = async () => {
    cameraModal.classList.remove('hidden');
    await startCamera();
  };
  captureBtn.onclick = () => {
    const resizeWidth = 320;
    const resizeHeight = 240;
    canvas.width = resizeWidth;
    canvas.height = resizeHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, resizeWidth, resizeHeight);
    const imageData = canvas.toDataURL('image/jpeg', 0.7);
    previewImage.src = imageData;
    previewImage.classList.remove('hidden');
    captureNotice.classList.add('hidden');
    cameraModal.classList.add('hidden');
    stopCamera();
    submitBtn.disabled = false;
    submitBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
    submitBtn.classList.add('bg-green-600', 'hover:bg-green-700');
  };
  submitBtn.onclick = async () => {
  const jenisKegiatan = document.getElementById('jenisKegiatan').value;
  const keterangan = document.getElementById('keterangan').value || '';
  const waktu = document.getElementById('waktu').value;
  const locationPreview = document.getElementById('locationPreview');
  const lat = locationPreview.dataset.lat;
  const lon = locationPreview.dataset.lon;
  const base64Data = previewImage.src;
  try {
    if (!jenisKegiatan) {
      alert('Silakan pilih jenis kegiatan');
      return;
    }
    if (!lat || !lon) {
      alert('Lokasi belum terdeteksi, silakan refresh lokasi');
      return;
    }
    if (previewImage.classList.contains('hidden')) {
      alert('Silakan ambil foto kegiatan terlebih dahulu');
      return;
    }
    const response = await fetch(base64Data);
    const blob = await response.blob();
    const fileName = `kegiatan_${Date.now()}_${user.user_no}.jpg`;
    const filePath = `kegiatan/${fileName}`;
    const { error: uploadError } = await supabase
      .storage
      .from('kegiatan')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: false
      });
    if (uploadError) throw new Error('Gagal upload foto: ' + uploadError.message);
    const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/kegiatan/${filePath}`;
    const { error: insertError } = await supabase
      .from('kegiatan')
      .insert({
        jenis_kegiatan: jenisKegiatan,
        keterangan: keterangan,
        foto: fileUrl,
        lokasi: `${lat},${lon}`,
        waktu: waktu,
        user_id: user.id,
        id_sekolah: user.id_sekolah
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Prefer': 'resolution=ignore'
        }
      });
    if (insertError) throw new Error('Gagal menyimpan kegiatan: ' + insertError.message);
    alert('Kegiatan berhasil disimpan!');
    window.location.hash = "#/kegiatan_list";
  } catch (err) {
    alert(err.message);
    console.error("Error:", err);
  }
}; 
  await loadingout();
}