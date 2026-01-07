
document.addEventListener('DOMContentLoaded', async () => {
  const user = JSON.parse(localStorage.getItem('user'));
  
  // ✅ Redirect immediate jika tidak ada user
  if (!user) {
    console.error('🚫 User not found - Redirecting to login');
    localStorage.removeItem('user');
    localStorage.removeItem('schoolConfig');
    window.location.href = "login.html";
    return;
  }

  // ✅ Validasi school config dengan timeout
  if (!schoolConfig.id) {
    try {
      console.log('🔄 Loading school configuration...');
      const { data, error } = await supabase
        .from('sekolah')
        .select('*')
        .eq('kode_sekolah', user.kode_sekolah)
        .single();
        
      if (error || !data) {
        throw new Error('School config not found');
      }
      
      localStorage.setItem('schoolConfig', JSON.stringify(data));
      Object.assign(schoolConfig, data);
      console.log('✅ School config loaded');
      
    } catch (error) {
      console.error('❌ Error loading school config:', error);
      // Clear invalid data and redirect
      localStorage.removeItem('user');
      localStorage.removeItem('schoolConfig');
      window.location.href = "login.html";
      return;
    }
  }
  try {
    if (window.feather) {
      feather.replace();
    }
    setupDarkModeToggle();
    setupHeaderUserInfo();
    updateSchoolBranding();
    const toggleSidebarBtn = document.getElementById('toggleSidebar');
    const logoutBtn = document.getElementById('logoutBtn');
    const headerLogoutBtn = document.getElementById('headerLogoutBtn');
    if (toggleSidebarBtn) {
      toggleSidebarBtn.addEventListener('click', toggleSidebar);
    }
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logout);
    }
    if (headerLogoutBtn) {
      headerLogoutBtn.addEventListener('click', logout);
    }
    renderMenu();
    if (localStorage.getItem('darkmode') === 'true') {
      document.documentElement.classList.add('dark');
    }
  } catch (error) {
    console.error('Error during initialization:', error);
  }
});


const user = JSON.parse(localStorage.getItem('user'));
const schoolConfig = JSON.parse(localStorage.getItem('schoolConfig')) || {};
const navIcons = {
  "Dashboard": "layout",
  "Skills" : "star",
  "CV" : "file-text",
  "Izin" : "check-circle",

  "Informasi Sekolah": "info", // ✅ DIPERBAIKI
  "Data Diri": "user",
  "Download App": "download",
  "Kehadiran": "calendar", // ✅ DIPERBAIKI
  "Piket": "clipboard",
  "Absensi Kegiatan": "activity",
  "Jadwal Mengajar": "calendar",
  "Jadwal Pelajaran": "calendar",
  "Persetujuan Izin": "shield", // ✅ DIPERBAIKI
  "Materi": "book-open",
  "Mata Pelajaran": "book",
  "Tugas": "file-text",
  "Tambah Tugas": "plus-square",
  "Input Nilai": "edit-3",
  "Informasi Pengguna": "users",
  "Manajemen Pelanggaran": "alert-octagon",
  "Input Pelanggaran": "edit-2",
  "Setting Peringatan": "settings",
  "Keuangan": "credit-card",
  "Laporan Keuangan Siswa": "dollar-sign",
  "Laporan": "bar-chart-2",
  "Laporan Absensi Siswa": "trending-up",
  "Laporan Nilai Siswa": "award",
  "Update Semester Siswa": "refresh-cw",
  "Game": "gamepad"
};
const iconColors = {
  "Dashboard": "text-blue-500",
  "Informasi Sekolah": "text-blue-500", 
  "Download App": "text-blue-500",
  "Kehadiran": "text-green-500",
  "Piket": "text-green-500", 
  "Kegiatan Dirumah": "text-green-500",
  "Jadwal Mengajar": "text-green-500",
  "Jadwal Pelajaran": "text-green-500",
  "Persetujuan Izin": "text-green-500",
  "Materi": "text-purple-500",
  "Mata Pelajaran": "text-purple-500",
  "Tugas": "text-purple-500",
  "Tambah Tugas": "text-purple-500",
  "Input Nilai": "text-purple-500",
  "Informasi Pengguna": "text-orange-500",
  "Manajemen Pelanggaran": "text-orange-500",
  "Input Pelanggaran": "text-orange-500",
  "Setting Peringatan": "text-orange-500",
  "Data Diri": "text-orange-500",
  "Keuangan": "text-emerald-500",
  "Laporan Keuangan Siswa": "text-emerald-500",
  "Laporan": "text-indigo-500",
  "Laporan Absensi Siswa": "text-indigo-500",
  "Laporan Nilai Siswa": "text-indigo-500",
  "Update Semester Siswa": "text-pink-500",
  "Game": "text-pink-500"
};
const baseRoleMenus = {
  admin: [
    ["Dashboard", "dashboard.html"],
    ["Skills", "skills.html"],
  ],
  instruktur: [
    ["Dashboard", "dashboard.html"],
    ["Izin", "izin_approval.html"],
  ],
  peserta: [
    ["Dashboard", "dashboard.html"],
    ["Skills", "skills.html"],
    ["CV", "cv.html"],
    ["Izin", "izin_list.html"],
  ],
};
function generateMenu() {
  const role = user.role;
  let menus = [...baseRoleMenus[role]];
  if (schoolConfig.menuOverrides?.[role]?.remove) {
    menus = menus.filter(menu => 
      !schoolConfig.menuOverrides[role].remove.includes(
        menu[1].replace('.html', '')
      )
    );
  }
  if (schoolConfig.customMenus?.[role]) {
    menus = [...menus, ...schoolConfig.customMenus[role]];
  }
  return menus;
}
function renderMenu() {
  const navMenu = document.getElementById('navMenu');
  if (!navMenu) return;
  
  navMenu.innerHTML = '';
  
  const welcomeMsg = `
    <div class="text-sm dark:text-white mb-4 px-3 py-3 rounded-lg glass-card text-center">
      <div class="font-semibold">👋 Welcome Back!</div>
      <div class="text-xs mt-1 capitalize">Role : ${user?.role || 'Unknown'}</div>
    </div>
  `;
  navMenu.innerHTML = welcomeMsg;

  const menus = generateMenu();
  
  if (!menus || menus.length === 0) {
    navMenu.innerHTML += '<div class=" dark:text-white text-black p-4 text-center">No menu items</div>';
    return;
  }

  menus.forEach(([name, view]) => {
    const filename = view.split('.')[0];
    const iconName = navIcons[name] || 'file';
    
    const link = document.createElement('a');
    link.href = `#/${filename}`;
    link.className = "flex items-center gap-3 py-3 px-4 rounded-lg menu-item-hover  text-black dark:text-white hover: dark:text-white transition-all duration-200 group glass-card mb-2";
    link.innerHTML = `
      <div class="flex items-center justify-center w-5">
        <i data-feather="${iconName}" class="w-5 h-5"></i>
      </div>
      <span class="font-medium flex-1">${name}</span>
    `;
    
    link.addEventListener('click', (e) => {
      e.preventDefault();
      // Close sidebar on mobile after click
      if (window.innerWidth <= 768) {
        toggleSidebar();
      }
      window.location.hash = `#/${filename}`;
    });
    
    navMenu.appendChild(link);
  });

  setTimeout(() => {
    if (window.feather) feather.replace();
  }, 100);
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const isExpanded = sidebar.getAttribute('data-expanded') === 'true';
  
  sidebar.classList.toggle('sidebar-expanded', !isExpanded);
  sidebar.classList.toggle('sidebar-collapsed', isExpanded);
  sidebar.setAttribute('data-expanded', String(!isExpanded));
  
  // Mobile overlay handling
  if (window.innerWidth <= 768) {
    let overlay = document.querySelector('.sidebar-overlay');
    if (!isExpanded) {
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay fixed inset-0 bg-black/50 z-40 lg:hidden';
        overlay.addEventListener('click', toggleSidebar);
        document.body.appendChild(overlay);
      }
    } else {
      if (overlay) overlay.remove();
    }
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const isExpanded = sidebar.getAttribute('data-expanded') === 'true';
  sidebar.classList.toggle('sidebar-expanded', !isExpanded);
  sidebar.classList.toggle('sidebar-collapsed', isExpanded);
  sidebar.setAttribute('data-expanded', String(!isExpanded));
  if (window.innerWidth <= 768) {
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'sidebar-overlay';
      overlay.addEventListener('click', toggleSidebar);
      document.body.appendChild(overlay);
    }
    if (!isExpanded) {
      overlay.classList.add('active');
    } else {
      overlay.classList.remove('active');
    }
  }
  sidebar.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  setTimeout(() => {
    if (window.feather) {
      feather.replace();
    }
  }, 300);
}
function logout() {
  localStorage.removeItem('user');
  localStorage.removeItem('schoolConfig');
  window.location.href = "login.html";
}
function setupDarkModeToggle() {
  const toggleBtn = document.getElementById('toggleDark');
  if (localStorage.getItem('darkmode') === 'true') {
    toggleBtn.innerHTML = '🌞'; // Sun icon for light mode
  } else {
    toggleBtn.innerHTML = '🌙'; // Moon icon for dark mode
  }
  toggleBtn.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('darkmode', isDark);
    toggleBtn.innerHTML = isDark ? '🌞' : '🌙';
  });
}
function updateSchoolBranding() {
  const schoolNameEl = document.getElementById('schoolName');
  if (schoolNameEl) {
    const schoolName = schoolConfig.nama_sekolah ? 
      `SIVOKASI` : // ✅ SINGKATKAN NAMA
      'SIVOKASI';
    schoolNameEl.textContent = schoolName;
  }
}
function setupHeaderUserInfo() {
  const headerUserName = document.getElementById('headerUserName');
  const userProfileBtn = document.getElementById('userProfileBtn');
  if (headerUserName && user) {
    const isMobile = window.innerWidth < 640;
    const displayName = isMobile ? 
      (user.name.length > 8 ? user.name.substring(0, 8) + '...' : user.name) :
      (user.name.length > 15 ? user.name.substring(0, 15) + '...' : user.name);
    headerUserName.textContent = displayName;
    window.addEventListener('resize', () => {
      const isMobileResized = window.innerWidth < 640;
      const newDisplayName = isMobileResized ? 
        (user.name.length > 8 ? user.name.substring(0, 8) + '...' : user.name) :
        (user.name.length > 15 ? user.name.substring(0, 15) + '...' : user.name);
      headerUserName.textContent = newDisplayName;
    });
    if (userProfileBtn) {
      userProfileBtn.setAttribute('title', user.name);
    }
  }
  if (userProfileBtn) {
    userProfileBtn.addEventListener('click', () => {
      window.location.hash = '#/datadiri';
    });
  }
}