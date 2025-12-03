let map;
let marker;
let circle;
let isUpdatingFromMap = false;
export async function initPage() {
  await loading();
  try {
    const schoolConfig = JSON.parse(localStorage.getItem('schoolConfig')) || {};
    initMap(
      schoolConfig.lokasi_absensi_lat || -6.2,
      schoolConfig.lokasi_absensi_lon || 106.8,
      schoolConfig.radius_absensi || 100
    );
    if (schoolConfig.lokasi_absensi_lat) {
      document.getElementById('lat').value = schoolConfig.lokasi_absensi_lat;
    }
    if (schoolConfig.lokasi_absensi_lon) {
      document.getElementById('lon').value = schoolConfig.lokasi_absensi_lon;
    }
    if (schoolConfig.radius_absensi) {
      document.getElementById('radius').value = schoolConfig.radius_absensi;
      document.getElementById('radiusSlider').value = schoolConfig.radius_absensi;
      document.getElementById('radiusValue').textContent = `${schoolConfig.radius_absensi}m`;
    }
    document.getElementById('lat').addEventListener('change', updateMapFromInputs);
    document.getElementById('lon').addEventListener('change', updateMapFromInputs);
    document.getElementById('radiusSlider').addEventListener('input', function() {
      document.getElementById('radius').value = this.value;
      document.getElementById('radiusValue').textContent = `${this.value}m`;
      updateCircleRadius(parseInt(this.value));
    });
    document.getElementById('radius').addEventListener('change', function() {
      const radiusValue = Math.max(10, Math.min(1000, parseInt(this.value) || 100));
      this.value = radiusValue;
      document.getElementById('radiusSlider').value = radiusValue;
      document.getElementById('radiusValue').textContent = `${radiusValue}m`;
      updateCircleRadius(radiusValue);
    });
    document.getElementById('getCurrentLocationBtn').addEventListener('click', getCurrentLocation);
    document.getElementById('saveConfigBtn').addEventListener('click', saveLocationConfig);
    document.getElementById('searchBtn').addEventListener('click', searchLocation);
    document.getElementById('searchLocation').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        searchLocation();
      }
    });
    document.addEventListener('click', function(e) {
      const searchResults = document.getElementById('searchResults');
      if (!e.target.closest('#searchResults') && !e.target.closest('#searchLocation') && !e.target.closest('#searchBtn')) {
        searchResults.classList.add('hidden');
      }
    });
  } catch (error) {
    console.error('Error initializing config page:', error);
    alert('Terjadi kesalahan saat memuat halaman konfigurasi');
  } finally {
    await loadingout();
  }
}
function initMap(lat, lon, radius) {
  map = L.map('mapContainer').setView([lat, lon], 16);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  marker = L.marker([lat, lon], { 
    draggable: true,
    icon: L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })
  }).addTo(map);
  circle = L.circle([lat, lon], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.2,
    radius: radius
  }).addTo(map);
  marker.on('drag', function(e) {
    isUpdatingFromMap = true;
    const position = marker.getLatLng();
    document.getElementById('lat').value = position.lat.toFixed(6);
    document.getElementById('lon').value = position.lng.toFixed(6);
    circle.setLatLng(position);
    isUpdatingFromMap = false;
  });
  map.on('click', function(e) {
    isUpdatingFromMap = true;
    marker.setLatLng(e.latlng);
    document.getElementById('lat').value = e.latlng.lat.toFixed(6);
    document.getElementById('lon').value = e.latlng.lng.toFixed(6);
    circle.setLatLng(e.latlng);
    isUpdatingFromMap = false;
  });
}
function updateMapFromInputs() {
  if (isUpdatingFromMap) return;
  const lat = parseFloat(document.getElementById('lat').value);
  const lon = parseFloat(document.getElementById('lon').value);
  if (!isNaN(lat) && !isNaN(lon)) {
    marker.setLatLng([lat, lon]);
    circle.setLatLng([lat, lon]);
    map.setView([lat, lon], 16);
  }
}
function updateCircleRadius(radius) {
  if (circle) {
    circle.setRadius(radius);
  }
}
async function getCurrentLocation() {
  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });
    const { latitude, longitude } = position.coords;
    document.getElementById('lat').value = latitude.toFixed(6);
    document.getElementById('lon').value = longitude.toFixed(6);
    marker.setLatLng([latitude, longitude]);
    circle.setLatLng([latitude, longitude]);
    map.setView([latitude, longitude], 16);
  } catch (error) {
    console.error('Error getting current location:', error);
    alert('Gagal mendapatkan lokasi saat ini. Pastikan Anda mengizinkan akses lokasi.');
  }
}
async function searchLocation() {
  const query = document.getElementById('searchLocation').value.trim();
  if (!query) {
    alert('Masukkan nama sekolah atau alamat untuk dicari');
    return;
  }
  await loading();
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=id&limit=5`);
    const results = await response.json();
    if (results.length === 0) {
      alert('Tidak ada hasil ditemukan. Coba kata kunci lain.');
      return;
    }
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = '';
    resultsContainer.classList.remove('hidden');
    results.forEach(result => {
      const div = document.createElement('div');
      div.className = 'p-2 border-b cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700';
      div.innerHTML = `
        <div class="font-medium">${result.display_name}</div>
        <div class="text-sm text-gray-500">Lat: ${result.lat}, Lon: ${result.lon}</div>
      `;
      div.addEventListener('click', () => {
        selectSearchResult(result);
        resultsContainer.classList.add('hidden');
      });
      resultsContainer.appendChild(div);
    });
  } catch (error) {
    console.error('Error searching location:', error);
    alert('Terjadi kesalahan saat mencari lokasi');
  } finally {
    await loadingout();
  }
}
function selectSearchResult(result) {
  const lat = parseFloat(result.lat);
  const lon = parseFloat(result.lon);
  document.getElementById('lat').value = lat;
  document.getElementById('lon').value = lon;
  document.getElementById('searchLocation').value = result.display_name;
  marker.setLatLng([lat, lon]);
  circle.setLatLng([lat, lon]);
  map.setView([lat, lon], 16);
}
async function saveLocationConfig() {
  await loading();
  try {
    const lat = parseFloat(document.getElementById('lat').value);
    const lon = parseFloat(document.getElementById('lon').value);
    const radius = parseInt(document.getElementById('radius').value);
    if (!lat || !lon || !radius) {
      alert('Harap isi semua field dengan nilai yang valid');
      return;
    }
    if (radius < 10 || radius > 1000) {
      alert('Radius harus antara 10 dan 1000 meter');
      return;
    }
    const schoolConfig = JSON.parse(localStorage.getItem('schoolConfig')) || {};
    const updatedConfig = {
      ...schoolConfig,
      lokasi_absensi_lat: lat,
      lokasi_absensi_lon: lon,
      radius_absensi: radius
    };
    const { error } = await updateSchoolConfig(schoolConfig.id, {
      lokasi_absensi_lat: lat,
      lokasi_absensi_lon: lon,
      radius_absensi: radius
    });
    if (error) {
      throw error;
    }
    localStorage.setItem('schoolConfig', JSON.stringify(updatedConfig));
    alert('Konfigurasi lokasi absensi berhasil disimpan!');
    window.location.hash = '#/dashboard';
  } catch (error) {
    console.error('Error saving location config:', error);
    alert('Gagal menyimpan konfigurasi: ' + error.message);
  } finally {
    await loadingout();
  }
}