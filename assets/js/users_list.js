let allUsers = [];
let currentView = 'grid'; // 'grid' or 'list'
let groupByRole = true;
export function initPage() {
  loadUsers();
  setupEventListeners();
}
async function loadUsers() {
  await loading();
  const { data, error } = await getAllUsersWithSekolah(user.kode_sekolah);
  if (error) {
    showError('Gagal memuat data pengguna');
    await loadingout();
    return;
  }
  allUsers = data;
  renderUsers(allUsers);
  await loadingout();
}
function setupEventListeners() {
  const viewGridBtn = document.getElementById('view-grid');
  const viewListBtn = document.getElementById('view-list');
  if (viewGridBtn && viewListBtn) {
    viewGridBtn.addEventListener('click', () => {
      currentView = 'grid';
      updateViewToggle();
      renderUsers(allUsers);
    });
    viewListBtn.addEventListener('click', () => {
      currentView = 'list';
      updateViewToggle();
      renderUsers(allUsers);
    });
  }
  const groupBySelect = document.getElementById('group-by');
  if (groupBySelect) {
    groupBySelect.addEventListener('change', (e) => {
      groupByRole = e.target.value === 'role';
      renderUsers(allUsers);
    });
  }
  const userSearch = document.getElementById('user-search');
  if (userSearch) {
    userSearch.addEventListener('input', (e) => {
      const roleFilter = document.getElementById('role-filter');
      filterUsers(e.target.value, roleFilter ? roleFilter.value : '');
    });
  }
  const roleFilter = document.getElementById('role-filter');
  if (roleFilter) {
    roleFilter.addEventListener('change', (e) => {
      const userSearch = document.getElementById('user-search');
      filterUsers(userSearch ? userSearch.value : '', e.target.value);
    });
  }
  const resetFilter = document.getElementById('reset-filter');
  if (resetFilter) {
    resetFilter.addEventListener('click', () => {
      const userSearch = document.getElementById('user-search');
      const roleFilter = document.getElementById('role-filter');
      if (userSearch) userSearch.value = '';
      if (roleFilter) roleFilter.value = '';
      filterUsers('', '');
    });
  }
}
function updateViewToggle() {
  const gridBtn = document.getElementById('view-grid');
  const listBtn = document.getElementById('view-list');
  if (!gridBtn || !listBtn) return;
  if (currentView === 'grid') {
    gridBtn.classList.add('bg-blue-100', 'dark:bg-blue-900', 'text-blue-600', 'dark:text-blue-300');
    gridBtn.classList.remove('bg-gray-100', 'dark:bg-gray-700', 'text-gray-600', 'dark:text-gray-300');
    listBtn.classList.add('bg-gray-100', 'dark:bg-gray-700', 'text-gray-600', 'dark:text-gray-300');
    listBtn.classList.remove('bg-blue-100', 'dark:bg-blue-900', 'text-blue-600', 'dark:text-blue-300');
  } else {
    listBtn.classList.add('bg-blue-100', 'dark:bg-blue-900', 'text-blue-600', 'dark:text-blue-300');
    listBtn.classList.remove('bg-gray-100', 'dark:bg-gray-700', 'text-gray-600', 'dark:text-gray-300');
    gridBtn.classList.add('bg-gray-100', 'dark:bg-gray-700', 'text-gray-600', 'dark:text-gray-300');
    gridBtn.classList.remove('bg-blue-100', 'dark:bg-blue-900', 'text-blue-600', 'dark:text-blue-300');
  }
}
function filterUsers(searchTerm, roleFilter) {
  const filtered = allUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.user_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (user.address && user.address.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = !roleFilter || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });
  renderUsers(filtered);
}
function renderUsers(users) {
  const container = document.getElementById('user-container');
  const emptyState = document.getElementById('empty-users');
  if (!container) return;
  container.innerHTML = '';
  if (!users || users.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }
  if (emptyState) emptyState.classList.add('hidden');
  if (groupByRole) {
    renderUsersGroupedByRole(users);
  } else {
    renderUsersUngrouped(users);
  }
}
function renderUsersGroupedByRole(users) {
  const container = document.getElementById('user-container');
  if (!container) return;
  const groupedUsers = {};
  users.forEach(user => {
    if (!groupedUsers[user.role]) {
      groupedUsers[user.role] = [];
    }
    groupedUsers[user.role].push(user);
  });
  const roleOrder = ['admin', 'kurikulum', 'keuangan', 'karyawan', 'kesiswaan', 'guru', 'siswa', 'wali'];
  const roleLabels = {
    'admin': 'Administrator',
    'kurikulum': 'Kurikulum',
    'keuangan': 'Keuangan',
    'karyawan': 'Karyawan',
    'kesiswaan': 'Kesiswaan',
    'guru': 'Guru',
    'siswa': 'Siswa',
    'wali': 'Wali Murid'
  };
  roleOrder.forEach(role => {
    if (groupedUsers[role] && groupedUsers[role].length > 0) {
      const groupSection = document.createElement('div');
      groupSection.className = 'mb-8';
      const roleLabel = roleLabels[role] || role;
      groupSection.innerHTML = `
        <h2 class="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
          <span class="${getRoleBadgeColor(role)} text-sm font-medium mr-2 px-2.5 py-0.5 rounded">${groupedUsers[role].length}</span>
          ${roleLabel}
        </h2>
        <div class="${currentView === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-4'}">
          ${groupedUsers[role].map(user => createUserCard(user)).join('')}
        </div>
      `;
      container.appendChild(groupSection);
    }
  });
}
function renderUsersUngrouped(users) {
  const container = document.getElementById('user-container');
  if (!container) return;
  const usersContainer = document.createElement('div');
  usersContainer.className = currentView === 'grid' 
    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' 
    : 'space-y-4';
  users.forEach(user => {
    usersContainer.innerHTML += createUserCard(user);
  });
  container.appendChild(usersContainer);
}
function getRoleBadgeColor(role) {
  const roleColors = {
    'admin': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'kurikulum': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    'keuangan': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
    'karyawan': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    'kesiswaan': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    'guru': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'siswa': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'wali': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
  };
  return roleColors[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
}
function getRoleIconColor(role) {
  const roleIconColors = {
    'admin': 'text-purple-600 dark:text-purple-400',
    'kurikulum': 'text-indigo-600 dark:text-indigo-400',
    'keuangan': 'text-teal-600 dark:text-teal-400',
    'karyawan': 'text-gray-600 dark:text-gray-400',
    'kesiswaan': 'text-pink-600 dark:text-pink-400',
    'guru': 'text-blue-600 dark:text-blue-400',
    'siswa': 'text-green-600 dark:text-green-400',
    'wali': 'text-amber-600 dark:text-amber-400'
  };
  return roleIconColors[role] || 'text-blue-600 dark:text-blue-400';
}
function getRoleIconBgColor(role) {
  const roleIconBgColors = {
    'admin': 'bg-purple-100 dark:bg-purple-900',
    'kurikulum': 'bg-indigo-100 dark:bg-indigo-900',
    'keuangan': 'bg-teal-100 dark:bg-teal-900',
    'karyawan': 'bg-gray-100 dark:bg-gray-900',
    'kesiswaan': 'bg-pink-100 dark:bg-pink-900',
    'guru': 'bg-blue-100 dark:bg-blue-900',
    'siswa': 'bg-green-100 dark:bg-green-900',
    'wali': 'bg-amber-100 dark:bg-amber-900'
  };
  return roleIconBgColors[role] || 'bg-blue-100 dark:bg-blue-900';
}
function createUserCard(user) {
  const roleColor = getRoleBadgeColor(user.role);
  const iconColor = getRoleIconColor(user.role);
  const iconBgColor = getRoleIconBgColor(user.role);
  if (currentView === 'grid') {
    return `
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow">
        <div class="flex items-center justify-between mb-3">
          <div class="${iconBgColor} w-10 h-10 rounded-full flex items-center justify-center">
            <i class="fas fa-user ${iconColor}"></i>
          </div>
          <span class="text-xs px-2 py-1 rounded-full ${roleColor}">${user.role}</span>
        </div>
        <h3 class="font-semibold text-gray-800 dark:text-white mb-1 truncate">${user.name}</h3>
        <div class="text-sm text-gray-600 dark:text-gray-300 space-y-1">
          <div class="flex items-center">
            <i class="fas fa-id-card mr-2 text-gray-400"></i>
            <span class="truncate">${user.user_no}</span>
          </div>
          ${user.address ? `
            <div class="flex items-center">
              <i class="fas fa-map-marker-alt mr-2 text-gray-400"></i>
              <span class="truncate">${user.address}</span>
            </div>
          ` : ''}
        </div>
        <div class="flex justify-end space-x-2 mt-4">
          <button onclick="handleEdit('${user.id}')" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
            <i class="fas fa-edit"></i>
          </button>
          <button onclick="handleResetPassword('${user.id}', '${user.name}')" class="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-300" title="Reset Password">
            <i class="fas fa-key"></i>
          </button>
          <button onclick="handleDelete('${user.id}')" class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  } else {
    return `
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between">
          <div class="flex items-center space-x-4 mb-4 sm:mb-0">
            <div class="${iconBgColor} w-12 h-12 rounded-full flex items-center justify-center">
              <i class="fas fa-user ${iconColor}"></i>
            </div>
            <div>
              <h3 class="font-semibold text-gray-800 dark:text-white">${user.name}</h3>
              <span class="text-xs px-2 py-1 rounded-full ${roleColor}">${user.role}</span>
              <div class="mt-2 text-sm text-gray-600 dark:text-gray-300">
                <div class="flex items-center">
                  <i class="fas fa-id-card mr-2"></i> ${user.user_no}
                </div>
              </div>
            </div>
          </div>
          <div class="flex space-x-3 self-end sm:self-auto">
            <button onclick="handleEdit('${user.id}')" class="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 px-3 py-2 rounded-lg transition-colors">
              <i class="fas fa-edit mr-1"></i> Edit
            </button>
            <button onclick="handleResetPassword('${user.id}', '${user.name}')" class="bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800 px-3 py-2 rounded-lg transition-colors">
              <i class="fas fa-key mr-1"></i> Reset Password
            </button>
            <button onclick="handleDelete('${user.id}')" class="bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 px-3 py-2 rounded-lg transition-colors">
              <i class="fas fa-trash mr-1"></i> Hapus
            </button>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div class="flex items-center">
            <i class="fas fa-school mr-2 text-gray-400"></i>
            <span>${user.kode_sekolah}</span>
          </div>
          ${user.address ? `
            <div class="flex items-center">
              <i class="fas fa-map-marker-alt mr-2 text-gray-400"></i>
              <span>${user.address}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
}
function showError(message) {
  const container = document.getElementById('user-container');
  if (!container) return;
  container.innerHTML = `
    <div class="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-4 rounded-lg text-center">
      <i class="fas fa-exclamation-circle mr-2"></i> ${message}
    </div>
  `;
}
async function handleDelete(id) {
  if (confirm("Yakin ingin menghapus pengguna ini?")) {
    await loading();
    const error = await deleteUser(id);
    if (error) {
      alert(`Gagal menghapus pengguna: ${error.message}`);
    } else {
      allUsers = allUsers.filter(user => user.id !== id);
      renderUsers(allUsers);
    }
    await loadingout();
  }
}
async function handleEdit(id) {
  localStorage.setItem('editUserId', id);
  window.location.hash = '#/users_edit';
}
async function handleResetPassword(userId, userName) {
  if (confirm(`Reset password untuk ${userName}? Password akan direset ke "password123".`)) {
    await loading();
    const defaultPassword = "password123";
    const error = await updateUser(userId, { password: defaultPassword });
    if (error) {
      alert(`Gagal mereset password: ${error.message}`);
    } else {
      alert(`Password untuk ${userName} telah direset ke "password123".`);
    }
    await loadingout();
  }
}
window.handleDelete = handleDelete;
window.handleEdit = handleEdit;
window.handleResetPassword = handleResetPassword;