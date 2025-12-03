function validateAuth() {
   const user = JSON.parse(localStorage.getItem('user'));
    const schoolConfig = JSON.parse(localStorage.getItem('schoolConfig')) || {};
    
    if (!user || !user.id) {
        console.warn('⚠️ User not authenticated, redirecting to login');
        // Clear any invalid data
        localStorage.removeItem('user');
        localStorage.removeItem('schoolConfig');
        window.location.href = "login.html";
        return false;
    }
    
    return true;
}

// ✅ Validasi sebelum Vue mounting
if (!validateAuth()) {
    // Hentikan execution jika tidak valid
    throw new Error('Authentication failed');
}
const app = Vue.createApp({
  data() {
    return {
      currentRoute: 'home'
    };
  },
  methods: {
    async loadPage(route) {
      if (!validateAuth()) return;
      try {
        document.querySelectorAll('link[data-page-css="true"]').forEach(link => link.remove());
        if (route === 'login') {
          const res = await fetch(`${route}.html`);
          if (!res.ok) throw new Error(`Halaman ${route} tidak ditemukan`);
          const html = await res.text();
          document.getElementById('mainContent').innerHTML = html;
          return;
        }
        const res = await fetch(`${route}.html`);
        if (!res.ok) throw new Error(`Halaman ${route} tidak ditemukan`);
        const html = await res.text();
        document.getElementById('mainContent').innerHTML = html;
        const cssPath = `/assets/css/${route}.css`;
        const cssCheck = await fetch(cssPath);
        if (cssCheck.ok) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = cssPath;
          link.dataset.pageCss = 'true';
          document.head.appendChild(link);
        }
        const scriptPath = `/assets/js/${route}.js`;
        const scriptCheck = await fetch(scriptPath);
        if (scriptCheck.ok) {
          try {
            const module = await import(scriptPath);
            if (module.initPage) {
              module.initPage();
            }
          } catch (err) {
            console.error("Error loading module:", err);
          }
        }
        const schoolConfig = JSON.parse(localStorage.getItem('schoolConfig')) || {};
        if (schoolConfig.id) {
          const schoolScriptPath = `/schools/${schoolConfig.id}/js/${route}.js`;
          const schoolScriptCheck = await fetch(schoolScriptPath);
          if (schoolScriptCheck.ok) {
            try {
              const module = await import(schoolScriptPath);
              if (module.initPage) {
                module.initPage();
              }
            } catch (err) {
              console.error("Error loading school module:", err);
            }
          }
        }
      } catch (err) {
       console.error('Error loading page:', err);
        document.getElementById('mainContent').innerHTML = `
          <div class="p-4 text-center">
            <p class="text-red-500">Gagal memuat halaman: ${err.message}</p>
            <button onclick="window.location.href='login.html'" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
              Kembali ke Login
            </button>
          </div>
        `;
      }
    },
    updateRoute() {
      const route = window.location.hash.replace('#/', '') || 'dashboard';
      this.currentRoute = route;
      this.loadPage(route);
    }
  },
  mounted() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
      console.warn('User not found, waiting for auth...');
      // Don't throw error, just wait for proper redirect
    }
    window.addEventListener('hashchange', this.updateRoute);
    this.updateRoute();
  }
});
app.mount('#app'); // ✅ now mounted safely
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => console.log('SW registered!'))
      .catch(err => console.log('SW registration failed: ', err));
  });
}