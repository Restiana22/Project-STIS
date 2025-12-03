export function initPage() {
    if (user.role === 'kepsek'){
        document.getElementById("lap_2").classList.remove('hidden');
        document.getElementById("lap_3").classList.remove('hidden');
        document.getElementById("lap_4").classList.remove('hidden');
        document.getElementById("lap_5").classList.remove('hidden');
        document.getElementById("lap_6").classList.remove('hidden');
        document.getElementById("lap_7").classList.remove('hidden');
        // document.getElementById("lap_8").classList.remove('hidden');
    }else if (user.role === 'guru'){
        document.getElementById("lap_2").classList.remove('hidden');
        document.getElementById("lap_3").classList.remove('hidden');
        document.getElementById("lap_4").classList.remove('hidden');
        document.getElementById("lap_5").classList.remove('hidden');
    }else if (user.role === 'siswa'){
        document.getElementById("lap_2").classList.remove('hidden');
        document.getElementById("lap_3").classList.remove('hidden');
        document.getElementById("lap_5").classList.remove('hidden');
        document.getElementById("lap_6").classList.remove('hidden');
    }else if (user.role === 'wali'){
        document.getElementById("lap_2").classList.remove('hidden');
        document.getElementById("lap_3").classList.remove('hidden');
        document.getElementById("lap_5").classList.remove('hidden');
    }else if (user.role === 'kesiswaan'){
        document.getElementById("lap_3").classList.remove('hidden');
        document.getElementById("lap_6").classList.remove('hidden');
        document.getElementById("lap_7").classList.remove('hidden');
    }else if (user.role === 'kurikulum'){
        document.getElementById("lap_2").classList.remove('hidden');
        document.getElementById("lap_4").classList.remove('hidden');
        document.getElementById("lap_3").classList.remove('hidden');
        // document.getElementById("lap_8").classList.remove('hidden');
    }else if (user.role === 'keuangan'){
        document.getElementById("lap_3").classList.remove('hidden');
        document.getElementById("lap_5").classList.remove('hidden');
    }else if (user.role === 'karyawan'){
        document.getElementById("lap_5").classList.remove('hidden');
    }else{
        document.getElementById("lap_2").classList.remove('hidden');
        document.getElementById("lap_3").classList.remove('hidden');
        document.getElementById("lap_4").classList.remove('hidden');
        document.getElementById("lap_5").classList.remove('hidden');
        document.getElementById("lap_6").classList.remove('hidden');
        document.getElementById("lap_7").classList.remove('hidden');
        // document.getElementById("lap_8").classList.remove('hidden');
    }
}


// #/laporan_generate
// #/laporan_nilai
// #/laporan_kehadiran
// #/laporan_jadwal_mengajar
// #/laporan_keuangan
// #/laporan_pelanggaran
// #/laporan_kegiatan_siswa
// #/laporan_kegiatan_guru