document.addEventListener('DOMContentLoaded', () => {
    const transitionEl = document.querySelector('.page-transition');
    
    // Animasi masuk (Fade In Halaman / Hilangkan layar putih)
    if (transitionEl) {
        setTimeout(() => {
            transitionEl.classList.add('loaded');
        }, 100);
    }

    // Tangkap event klik pada setiap anchor (link) HTML
    document.querySelectorAll('a').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // Hanya intercept jika link adalah halaman internal yang valid
            if (href && href !== '#' && !href.startsWith('http') && !this.getAttribute('target')) {
                e.preventDefault(); // Tahan dulu transisinya
                if (transitionEl) {
                    transitionEl.classList.remove('loaded'); // Munculkan layar putih
                    
                    // Pindah halaman sesudah durasi animasi layar putih selesai
                    setTimeout(() => {
                        window.location.href = href;
                    }, 400);
                } else {
                    window.location.href = href;
                }
            }
        });
    });

    // ── SIDEBAR MENU TOGGLE FOR MOBILE ──
    const menuToggle = document.getElementById('menuToggle');
    const closeSidebar = document.getElementById('closeSidebar');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (menuToggle && closeSidebar && sidebar && sidebarOverlay) {
        const openMenu = () => {
            sidebar.classList.add('active');
            sidebarOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        };

        const closeMenu = () => {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
        };

        menuToggle.addEventListener('click', openMenu);
        closeSidebar.addEventListener('click', closeMenu);
        sidebarOverlay.addEventListener('click', closeMenu);

        sidebar.querySelectorAll('.sidebar-menu a').forEach(link => {
            link.addEventListener('click', closeMenu);
        });
    }
});

// Menghindari bug layar tetap putih ketika user menekan navigasi 'Back' browser
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        const transitionEl = document.querySelector('.page-transition');
        if (transitionEl) document.querySelector('.page-transition').classList.add('loaded');
    }
});
