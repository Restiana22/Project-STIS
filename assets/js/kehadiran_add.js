let stream = null;
let timeInterval = null;
let isWithinRadius = false;
let debugInfo = {
  camera: { status: 'Belum diinisialisasi', error: null },
  location: { status: 'Belum diinisialisasi', error: null },
  browser: navigator.userAgent,
  https: window.location.protocol,
  errors: []
};

// Fungsi untuk update debug display
function updateDebugDisplay() {
  document.getElementById('debugCamera').textContent = debugInfo.camera.status;
  document.getElementById('debugLocation').textContent = debugInfo.location.status;
  document.getElementById('debugBrowser').textContent = debugInfo.browser.substring(0, 50) + '...';
  document.getElementById('debugHTTPS').textContent = debugInfo.https;
  
  const errorsHtml = debugInfo.errors.map(err => 
    `<div class="text-red-600">${new Date().toLocaleTimeString()}: ${err}</div>`
  ).join('');
  document.getElementById('debugErrors').innerHTML = errorsHtml;
}
function logError(context, error) {
  const errorMsg = `${context}: ${error.message || error}`;
  console.error(errorMsg);
  debugInfo.errors.push(errorMsg);
  
  // Keep only last 10 errors
  if (debugInfo.errors.length > 10) {
    debugInfo.errors.shift();
  }
  
  updateDebugDisplay();
  
  // Show alert for critical errors
  if (context.includes('kamera') || context.includes('lokasi')) {
    alert(`ERROR: ${errorMsg}`);
  }
}





async function startCamera() {
  try {
    debugInfo.camera.status = 'Membuka kamera...';
    updateDebugDisplay();
    
    // Constraints yang lebih kompatibel
    const constraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
      audio: false
    };
    
    // Cek dulu apakah getUserMedia tersedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Browser tidak mendukung akses kamera');
    }
    
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    const video = document.getElementById('video');
    video.srcObject = stream;
    
    // Untuk iOS, tambahkan event listener untuk memastikan video play
    video.addEventListener('loadedmetadata', () => {
      video.play().catch(e => {
        logError('Video play failed', e);
      });
    });
    
    debugInfo.camera.status = 'Kamera aktif';
    debugInfo.camera.error = null;
    updateDebugDisplay();
    
  } catch (error) {
    debugInfo.camera.status = 'Error kamera';
    debugInfo.camera.error = error.message;
    logError('Membuka kamera', error);
    
    let userMessage = 'Tidak dapat mengakses kamera. ';
    if (error.name === 'NotAllowedError') {
      userMessage += 'Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser.';
    } else if (error.name === 'NotFoundError') {
      userMessage += 'Kamera tidak ditemukan.';
    } else if (error.name === 'NotSupportedError') {
      userMessage += 'Browser tidak mendukung akses kamera.';
    } else {
      userMessage += error.message;
    }
    
    alert(userMessage);
    throw error;
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    document.getElementById('video').srcObject = null;
    stream = null;
  }
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



async function getLocation() {
  const secureInfo = isSecureForGeolocation();
  
  if (!secureInfo.ok) {
    debugInfo.location.status = 'Error: Context tidak aman';
    updateDebugDisplay();
    
    showMsg(`
      Akses lokasi memerlukan secure context (HTTPS atau localhost).<br>
      Saat ini: protocol = <strong>${secureInfo.proto}</strong>, hostname = <strong>${secureInfo.host}</strong>.<br>
      Jika kamu buka lewat IP (mis. 192.168.x.x) tanpa TLS, browser menganggap situs tidak aman untuk akses lokasi.<br>
      Solusi: buka lewat https://domain-atau-ngrok, atau jalankan di http://localhost untuk testing.
    `, true);
    isWithinRadius = false;
    updateSubmitButtonState();
    return;
  }

  const locationPreview = document.getElementById('locationPreview');
  const mapPreview = document.getElementById('mapPreview');
  
  debugInfo.location.status = 'Mengambil konfigurasi sekolah...';
  updateDebugDisplay();
  
  const { data: schoolConfig, error } = await getSchoolLocationConfig(user.kode_sekolah);
  
  if (error || !schoolConfig.lokasi_absensi_lat) {
    debugInfo.location.status = 'Error: Sekolah belum atur lokasi';
    updateDebugDisplay();
    
    locationPreview.textContent = 'Sekolah belum mengatur lokasi absensi. Hubungi administrator.';
    locationPreview.classList.add('text-red-500');
    isWithinRadius = false;
    updateSubmitButtonState();
    return;
  }

  function showMsg(msg, isError = false) {
    locationPreview.innerHTML = msg;
    locationPreview.classList.toggle('text-red-500', isError);
    locationPreview.classList.toggle('text-green-500', !isError);
  }

  async function checkPermissionState() {
    debugInfo.location.status = 'Mengecek permission...';
    updateDebugDisplay();
    if (!navigator.permissions) return null;
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      debugInfo.location.status = `Permission: ${status.state}`;
      updateDebugDisplay();
      return status.state;
    } catch (e) {
      debugInfo.location.status = 'Error cek permission';
      updateDebugDisplay();
      return null;
    }
  }

  function getCurrentPositionPromise(options = {}) {
    return new Promise((resolve, reject) => {
      debugInfo.location.status = `Mencari lokasi (timeout: ${options.timeout/1000}s)...`;
      updateDebugDisplay();
      
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  async function getBestPosition({ maxAttempts = 3, accuracyThreshold = 50, singleTimeout = 10000 } = {}) {
    debugInfo.location.status = 'Mencoba metode cepat...';
    updateDebugDisplay();
    
    try {
      const quick = await getCurrentPositionPromise({
        enableHighAccuracy: true,
        timeout: 5000, // Kurangi dari 7000 ke 5000
        maximumAge: 3000 // Kurangi dari 5000 ke 3000
      });
      
      if (quick && quick.coords && quick.coords.accuracy <= accuracyThreshold) {
        debugInfo.location.status = 'Lokasi ditemukan (metode cepat)';
        updateDebugDisplay();
        return quick;
      } else if (quick) {
        debugInfo.location.status = `Akurasi rendah: ${Math.round(quick.coords.accuracy)}m, coba metode presisi...`;
        updateDebugDisplay();
      }
    } catch (e) {
      debugInfo.location.status = 'Metode cepat gagal, coba metode presisi...';
      updateDebugDisplay();
    }

    // 2) watchPosition dengan timeout lebih singkat
    return new Promise((resolve, reject) => {
      let settled = false;
      let progressReported = false;
      
      debugInfo.location.status = 'Menggunakan GPS presisi tinggi...';
      updateDebugDisplay();

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (settled) return;
          
          const accuracy = pos.coords.accuracy;
          if (!progressReported) {
            debugInfo.location.status = `GPS aktif, akurasi: ${Math.round(accuracy)}m`;
            updateDebugDisplay();
            progressReported = true;
          }
          
          if (pos.coords && accuracy <= accuracyThreshold) {
            settled = true;
            navigator.geolocation.clearWatch(watchId);
            debugInfo.location.status = `Lokasi optimal: ${Math.round(accuracy)}m`;
            updateDebugDisplay();
            resolve(pos);
          } else if (accuracy <= 100) { // Jika akurasi sudah cukup baik (<100m), terima saja
            settled = true;
            navigator.geolocation.clearWatch(watchId);
            debugInfo.location.status = `Lokasi diterima: ${Math.round(accuracy)}m`;
            updateDebugDisplay();
            resolve(pos);
          }
        },
        (err) => {
          if (settled) return;
          settled = true;
          navigator.geolocation.clearWatch(watchId);
          debugInfo.location.status = 'Error watchPosition';
          updateDebugDisplay();
          reject(err);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: singleTimeout
        }
      );

      // Timeout lebih singkat
      const fallbackTimer = setTimeout(async () => {
        if (settled) return;
        navigator.geolocation.clearWatch(watchId);
        settled = true;
        
        debugInfo.location.status = 'Timeout, coba metode fallback...';
        updateDebugDisplay();
        
        try {
          const last = await getCurrentPositionPromise({
            enableHighAccuracy: false, // Fallback ke akurasi rendah
            timeout: 5000,
            maximumAge: 30000 // Accept cached position for fallback
          });
          debugInfo.location.status = 'Lokasi dari fallback';
          updateDebugDisplay();
          resolve(last);
        } catch (e) {
          debugInfo.location.status = 'Fallback juga gagal';
          updateDebugDisplay();
          reject(e);
        }
      }, singleTimeout); // Kurangi dari singleTimeout + 5000 menjadi singleTimeout saja
    });
  }

  // MAIN flow
  try {
    debugInfo.location.status = 'Memulai proses lokasi...';
    updateDebugDisplay();

    // 1) check permission state
    const perm = await checkPermissionState();
    if (perm === 'denied') {
      debugInfo.location.status = 'Permission ditolak';
      updateDebugDisplay();
      
      showMsg(`
        Izin lokasi diblokir. Silakan buka pengaturan browser / aplikasi dan izinkan Lokasi untuk situs ini.
        <br><small>Contoh: Android: Settings → Apps → Browser → Permissions → Location → Allow while using the app.<br>
        iPhone (Safari): Settings → Privacy → Location Services → Safari → While Using the App.</small>
      `, true);
      isWithinRadius = false;
      updateSubmitButtonState();
      return;
    }

    // 2) mulai ambil posisi terbaik dengan timeout lebih singkat
    showMsg('Mencari lokasi... (pastikan GPS / Location mode: High accuracy aktif)', false);
    
    debugInfo.location.status = 'Memulai pencarian lokasi...';
    updateDebugDisplay();
    
    let pos = null;
    let attempt = 0;
    const maxAttempts = 2;
    
    while (attempt < maxAttempts && !pos) {
      attempt++;
      debugInfo.location.status = `Percobaan ke-${attempt} dari ${maxAttempts}`;
      updateDebugDisplay();
      
      try {
        // Kurangi timeout dari 20000 ke 10000 (20 detik -> 10 detik)
        pos = await getBestPosition({ 
          maxAttempts: 2, // Kurangi dari 3 ke 2
          accuracyThreshold: 100, // Naikkan threshold dari 50m ke 100m untuk lebih cepat
          singleTimeout: 10000 // Kurangi dari 20000 ke 10000
        });
        
        debugInfo.location.status = `Percobaan ${attempt} berhasil`;
        updateDebugDisplay();
      } catch (err) {
        debugInfo.location.status = `Percobaan ${attempt} gagal`;
        updateDebugDisplay();
        
        if (err && err.code === 1) {
          showMsg('User denied permission untuk lokasi. Mohon izinkan untuk melanjutkan.', true);
          isWithinRadius = false;
          updateSubmitButtonState();
          return;
        }
        
        if (attempt < maxAttempts) {
          showMsg('Gagal mendapatkan lokasi akurat, mencoba lagi...', true);
          await new Promise(r => setTimeout(r, 1000)); // Kurangi dari 1200 ke 1000
          continue;
        } else {
          throw err;
        }
      }
    }

    if (!pos) throw new Error('Tidak bisa mendapatkan posisi.');

    const { latitude, longitude, accuracy } = pos.coords;
    const distance = calculateDistance(
      latitude,
      longitude,
      schoolConfig.lokasi_absensi_lat,
      schoolConfig.lokasi_absensi_lon
    );

    if (distance > schoolConfig.radius_absensi) {
      debugInfo.location.status = 'Di luar radius';
      updateDebugDisplay();
      
      showMsg(`
        <span style="color:#ff6b6b;font-weight:600">Anda berada di luar radius absensi!</span><br>
        Jarak: ${Math.round(distance)} meter dari titik absensi<br>
        Radius maksimal: ${schoolConfig.radius_absensi} meter
      `, true);
      isWithinRadius = false;
    } else {
      debugInfo.location.status = 'Dalam radius - Siap absen!';
      updateDebugDisplay();
      
      showMsg(`
        <span style="color:#5eead4;font-weight:600">Anda berada dalam radius absensi.</span><br>
        Jarak: ${Math.round(distance)} meter dari titik absensi<br>
        Akurasi: ±${Math.round(accuracy)} meter
      `, false);
      isWithinRadius = true;
    }

    // tampilkan peta
    mapPreview.src = `https://maps.google.com/maps?q=${latitude},${longitude}&z=16&output=embed`;
    locationPreview.dataset.lat = latitude;
    locationPreview.dataset.lon = longitude;
    locationPreview.dataset.accuracy = accuracy;

    updateSubmitButtonState();

  } catch (err) {
    console.error('Error lokasi:', err);
    const msg = (err && err.message) ? err.message : 'Gagal mengambil lokasi.';
    showMsg('Gagal mengambil lokasi: ' + msg, true);
    isWithinRadius = false;
    updateSubmitButtonState();
    debugInfo.location.status = 'Error: ' + msg;
    updateDebugDisplay();
    logError('Mengambil lokasi', err);
  }
}





function updateSubmitButtonState() {
  const submitBtn = document.getElementById('submitAbsen');
  const previewContainer = document.getElementById('previewContainer');
  const hasPhoto = !previewContainer.classList.contains('hidden');
  
  if (hasPhoto && isWithinRadius) {
    submitBtn.disabled = false;
    submitBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
    submitBtn.classList.add('bg-gradient-to-r', 'from-green-500', 'to-emerald-600', 'hover:from-green-600', 'hover:to-emerald-700');
    submitBtn.innerHTML = `
      <i data-feather="check-circle" class="w-4 h-4 inline mr-2"></i>
      Submit Absen
    `;
  } else {
    submitBtn.disabled = true;
    submitBtn.classList.remove('bg-gradient-to-r', 'from-green-500', 'to-emerald-600', 'hover:from-green-600', 'hover:to-emerald-700');
    submitBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
    submitBtn.innerHTML = `
      <i data-feather="x-circle" class="w-4 h-4 inline mr-2"></i>
      Submit Absen
    `;
  }
  feather.replace();
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
  const browserIssues = detectBrowserIssues();
  if (browserIssues.length > 0) {
    debugInfo.errors.push('Deteksi browser: ' + browserIssues.join(', '));
    updateDebugDisplay();
  }
  updateDebugDisplay();
  document.getElementById('toggleDebug').onclick = () => {
    const panel = document.getElementById('debugPanel');
    panel.classList.toggle('hidden');
  };
  document.getElementById('copyDebugInfo').onclick = () => {
    const debugText = `
      DEBUG INFO:
      - Kamera: ${debugInfo.camera.status} ${debugInfo.camera.error ? '(' + debugInfo.camera.error + ')' : ''}
      - Lokasi: ${debugInfo.location.status} ${debugInfo.location.error ? '(' + debugInfo.location.error + ')' : ''}
      - Browser: ${debugInfo.browser}
      - HTTPS: ${debugInfo.https}
      - Errors: ${debugInfo.errors.join('\n  ')}
    `.trim();
    
    navigator.clipboard.writeText(debugText).then(() => {
      alert('Info debug disalin ke clipboard!');
    }).catch(() => {
      // Fallback untuk browser yang tidak support clipboard
      const textArea = document.createElement('textarea');
      textArea.value = debugText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Info debug disalin!');
    });
  };

  getLocation();
  if (timeInterval) clearInterval(timeInterval);
  timeInterval = startTimeUpdater();
  const openCameraBtn = document.getElementById('openCameraBtn');
  const cameraModal = document.getElementById('cameraModal');
  const captureBtn = document.getElementById('captureBtn');
  const canvas = document.getElementById('canvas');
  const video = document.getElementById('video');
  const previewImage = document.getElementById('previewImage');
  const submitBtn = document.getElementById('submitAbsen');
  const captureNotice = document.getElementById('captureNotice');
  const refreshLocationBtn = document.getElementById('refreshLocationBtn');
  if (refreshLocationBtn) {
    refreshLocationBtn.onclick = () => getLocation();
  }
  // Tambahkan di dalam initPage(), setelah deklarasi variabel
  const retakePhotoBtn = document.getElementById('retakePhoto');
  if (retakePhotoBtn) {
    retakePhotoBtn.onclick = () => {
      previewContainer.classList.add('hidden');
      captureNotice.classList.remove('hidden');
      openCameraBtn.click(); // Buka kamera lagi
    };
  }
  openCameraBtn.onclick = async () => {
     try {
      cameraModal.classList.remove('hidden');
      await startCamera();
    } catch (error) {
      cameraModal.classList.add('hidden');
    }
  };

  function dataURLToBlob(dataURL) {
    const parts = dataURL.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const uInt8Array = new Uint8Array(raw.length);
    
    for (let i = 0; i < raw.length; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    
    return new Blob([uInt8Array], { type: contentType });
  }


  captureBtn.onclick = () => {
    try {
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        alert('Video belum siap. Tunggu sebentar...');
        return;
      }

      // 🔽 TURUNKAN RESOLUSI LEBIH RENDAH
      const targetWidth = 180;  // Turun dari 300 ke 180
      const targetHeight = 180; // Turun dari 300 ke 180
      
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      
      // Draw image
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      
      // 🔽 KOMPRESI LEBIH AGGRESIF
      let imageData;
      let quality = 0.5; // Turun dari 0.6 ke 0.5
      let finalBlob;
      
      // Coba beberapa level kualitas
      for (let i = 0; i < 3; i++) {
        imageData = canvas.toDataURL('image/jpeg', quality);
        finalBlob = dataURLToBlob(imageData);
        console.log(`Quality ${quality}: ${finalBlob.size} bytes (${(finalBlob.size/1024).toFixed(2)}KB)`);
        
        // Jika sudah di bawah 3KB, stop
        if (finalBlob.size < 3000) break;
        
        // Turunkan kualitas lebih jauh
        quality -= 0.15;
        if (quality < 0.3) quality = 0.3; // Batas minimum
      }
      
      // Update preview
      previewImage.src = imageData;
      
      const previewContainer = document.getElementById('previewContainer');
      previewContainer.classList.remove('hidden');
      captureNotice.classList.add('hidden');
      cameraModal.classList.add('hidden');
      stopCamera();
      updateSubmitButtonState();

      // Debug info
      debugInfo.camera.status = `Foto - ${finalBlob.size} bytes (${(finalBlob.size/1024).toFixed(2)}KB)`;
      updateDebugDisplay();
      
      console.log('📸 Final size:', finalBlob.size, 'bytes', `(${(finalBlob.size/1024).toFixed(2)}KB)`);
      
      feather.replace();

    } catch (error) {
      logError('Mengambil foto', error);
      alert('Gagal mengambil foto: ' + error.message);
    }
  };


  
  submitBtn.onclick = async () => {
    let absenerror = {};
    let dataAbsen = {};
    const waktu = document.getElementById('waktu').value;
    const lat = document.getElementById('locationPreview').dataset.lat;
    const lon = document.getElementById('locationPreview').dataset.lon;
    const base64Data = previewImage.src;
    
    // Konversi base64 ke blob
    const blob = dataURLToBlob(base64Data);
    
    console.log('🔍 DEBUG - Ukuran gambar:', blob.size, 'bytes', `(${(blob.size/1024).toFixed(2)}KB)`);
    
    // 🔽 LONGGARKAN BATAS VALIDASI - naikkan ke 10KB
    if (blob.size > 10000) { // Naikkan dari 3000 ke 10000 (10KB)
      alert(`Ukuran gambar terlalu besar (${(blob.size/1024).toFixed(2)}KB). Silakan ambil foto ulang dengan pencahayaan lebih baik.`);
      return;
    }
    
    const fileName = `absen_${Date.now()}_${user.user_no}.jpg`;
    const filePath = `absensi/${fileName}`;
    
    console.log('📤 Uploading foto...');
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('absensi')
      .upload(filePath, blob);
      
    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      alert('Gagal upload foto: ' + uploadError.message);
      return;
    }
    
    const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/absensi/${filePath}`;
    const waktuObj = new Date(waktu);
    const tanggal = waktuObj.toISOString().split('T')[0];
    const jam = waktuObj.toLocaleTimeString('en-GB');
    
    const getAbsen = await getAbsenById(user.id, waktu);
    if (getAbsen.data.length){
      const locsplit = getAbsen.data[0].lokasi.split('***');
      const mergeloc = locsplit[0]+'***'+`${lat},${lon}`;
      const fotosplit = getAbsen.data[0].foto.split('***');
      const mergefoto = fotosplit[0]+'***'+fileUrl;
      dataAbsen ={
          jam_keluar:jam,
          lokasi: mergeloc,
          foto: mergefoto,
          id_user:user.id
        };
        absenerror = await updateAbsen(dataAbsen,getAbsen.data[0].id_user,getAbsen.data[0].tanggal);
    }else{
        dataAbsen ={
          tanggal: tanggal,
          jam_masuk:jam,
          lokasi: `${lat},${lon}`,
          foto: fileUrl,
          id_user:user.id,
          id_sekolah: user.id_sekolah
        };
        absenerror = await insertAbsen(dataAbsen);
    }
    
    if (absenerror) {
      alert('Gagal menyimpan absen: ' + absenerror.message);
    } else {
      alert('Absen berhasil!');
      previewImage.classList.add('hidden');
      submitBtn.disabled = true;
      submitBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
      submitBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
      window.location.href = "#/kehadiran_list";
    }
  }
  await loadingout();
}



document.getElementById('refreshLocationBtn').addEventListener('click', getLocation);


function isSecureForGeolocation() {
  try {
    // navigator.geolocation biasanya ada di secure context only (kecuali localhost)
    // accept if protocol is https OR hostname is localhost/127.0.0.1 OR running on file with dev flag (rare)
    const proto = window.location.protocol || '';
    const host = window.location.hostname || '';
    // IPv4 local network like 192.168.x.x is NOT considered secure by browsers even if served over https? (if served via https it's fine)
    // But we accept 127.0.0.1 and ::1 as localhost
    const allowedLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';
    const isHttps = proto === 'https:';
    const isSecureContext = (window.isSecureContext === true) || isHttps || allowedLocal;

    // log for debugging
    console.info('[GeolocCheck] protocol=', proto, 'hostname=', host, 'isSecureContext=', window.isSecureContext, '=> allowed=', isSecureContext);

    return { ok: isSecureContext, proto, host, isSecureContext };
  } catch (e) {
    console.warn('[GeolocCheck] error', e);
    return { ok: false, proto: window.location.protocol, host: window.location.hostname, isSecureContext: false };
  }
}

function detectBrowserIssues() {
  const ua = navigator.userAgent;
  const issues = [];
  
  // Deteksi iOS
  if (/iPad|iPhone|iPod/.test(ua)) {
    issues.push('Perangkat iOS - mungkin butuh setting khusus');
  }
  
  // Deteksi Samsung Browser
  if (/SamsungBrowser/.test(ua)) {
    issues.push('Samsung Browser - kadang ada masalah permission');
  }
  
  // Deteksi Chrome Mobile
  if (/Chrome/.test(ua) && /Mobile/.test(ua)) {
    issues.push('Chrome Mobile - umumnya kompatibel');
  }
  
  return issues;
}