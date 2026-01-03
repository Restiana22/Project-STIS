export async function initPage() {
  console.log(user);
  document.getElementById('nama').value = user.name || '';
  document.getElementById('address').value = user.address || '';
}

// Fungsi untuk memuat library PDF jika belum dimuat
function loadPdfLibrary() {
  return new Promise((resolve, reject) => {
    if (typeof jspdf !== 'undefined') {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => {
      console.log('jsPDF loaded successfully');
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Fungsi untuk generate PDF CV
function generateCVPDF(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Konfigurasi halaman
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = margin;
  
  // Header dengan nama
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(data.nama, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;
  
  // Alamat
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(data.address, pageWidth / 2, yPos, { align: 'center' });
  yPos += 20;
  
  // Garis pemisah
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 15;
  
  // Fungsi helper untuk menambahkan section
  function addSection(title, content) {
    if (!content || content.trim() === '') return yPos;
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, yPos);
    yPos += 10;
    
    // Handle line breaks dalam teks
    const lines = doc.splitTextToSize(content, pageWidth - (margin * 2));
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(lines, margin, yPos);
    yPos += (lines.length * 7) + 15;
    
    return yPos;
  }
  
  // Tambahkan semua section
  addSection('Riwayat Pendidikan', data.pendidikan);
  addSection('Pelatihan & Sertifikat', data.pelatihan);
  addSection('Skill Vokasional', data.skill);
  addSection('Pengalaman Magang / Praktik', data.pengalaman);
  
  // Footer dengan tanggal
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  const today = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  doc.text(`CV dibuat pada ${today}`, pageWidth / 2, 280, { align: 'center' });
  
  // Simpan file
  const fileName = `CV_${data.nama.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}

window.createCV = async () => {
  // Ambil data dari form
  const nama = document.getElementById('nama').value.trim();
  const address = document.getElementById('address').value.trim();
  const pendidikan = document.getElementById('pendidikan').value.trim();
  const pelatihan = document.getElementById('pelatihan').value.trim();
  const skill = document.getElementById('skill').value.trim();
  const pengalaman = document.getElementById('pengalaman').value.trim();
  
  // Validasi input
  if (!nama) {
    alert('Nama harus diisi!');
    return;
  }
  
  try {
    // Tampilkan loading
    const originalText = document.querySelector('button[onclick="createCV()"]').textContent;
    document.querySelector('button[onclick="createCV()"]').innerHTML = 
      '<i class="fas fa-spinner fa-spin mr-2"></i>Membuat PDF...';
    
    // Muat library PDF jika belum tersedia
    await loadPdfLibrary();
    
    // Data CV
    const cvData = {
      nama: nama,
      address: address,
      pendidikan: pendidikan,
      pelatihan: pelatihan,
      skill: skill,
      pengalaman: pengalaman
    };
    
    // Generate PDF
    generateCVPDF(cvData);
    
    // Kembalikan tombol ke keadaan semula
    setTimeout(() => {
      document.querySelector('button[onclick="createCV()"]').innerHTML = originalText;
      alert('CV berhasil dibuat dalam format PDF!');
    }, 1000);
    
  } catch (err) {
    console.error('Gagal membuat CV:', err);
    alert('Gagal membuat CV. Silakan coba lagi.');
    
    // Reset tombol
    document.querySelector('button[onclick="createCV()"]').textContent = 'Export CV';
  }
};