let dataAbsen = [];
let formattedSkills = [];
let currentSort = {
  column: '',
  direction: 'asc',
};

export async function initPage() {
  try {
    await loading();
    if (user.role == 'admin') {
      document.getElementById('skills_add').classList.remove('hidden');
    }
    const skills = await getSkillsByUserId();
    if (skills.error) {
      console.error('❌ Gagal ambil data Skills:', skills.error.message);
    }
    const izin = await getIzinByUserId(user.id);
    if (izin.error) {
      console.error('❌ Gagal ambil data Izin:', izin.error.message);
    }
    const dataskills = skills.data || [];
    formattedSkills = dataskills.map(item => {
      return {
        skills: item.nama_skill || '-',
      };
    });
    
    renderPresensiList(formattedSkills);
    setupSortHandlers();
  } catch (err) {
    console.error('❌ Error ambil data presensi:', err);
  } finally {
    await loadingout();
  }
}


function renderPresensiList() {
  const tbody = document.querySelector('#absen-list table tbody');
  tbody.innerHTML = '';
  if (!Array.isArray(formattedSkills) || formattedSkills.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 1;
    td.className = 'px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-lg';
    td.textContent = 'Belum ada data skills.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  
  formattedSkills.forEach(item => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-[#f0f9ff] dark:hover:bg-gray-700 transition';
    
    
    tr.innerHTML = `
      <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
        ${item.skills || '-'}
      </td>
    `;
    
    tbody.appendChild(tr);
  });
}


function setupSortHandlers() {
  // Implementasi sorting jika diperlukan
  const thElements = document.querySelectorAll('#absen-list table thead th');
  thElements.forEach((th, index) => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      // Implementasi sorting logic di sini
      sortTableBy(index);
    });
  });
}

function sortTableBy(columnIndex) {
  // Implementasi sorting logic
  console.log('Sort by column:', columnIndex);
}
