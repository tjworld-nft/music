// Album Data - Add new albums here
const albumData = [
    {
        id: 3,
        title: "魚歌 - UO-UTA -",
        releaseDate: "2026年 近日配信",
        coverImage: "image/uo-uta-cover.jpg",
        badge: "Coming Soon",
        trackCount: 19,
        streamingLinks: {
            presave: "https://distrokid.com/hyperfollow/5a42201/---uo-uta--"
        }
    },
    {
        id: 2,
        title: "Certification Symphony",
        releaseDate: "2025年6月25日",
        coverImage: "image/Certification Symphony-cover.jpg",
        streamingLinks: {
            spotify: "https://open.spotify.com/intl-ja/album/2sdUIAIK77Ssz9KQdXlGLN",
            appleMusic: "https://music.apple.com/jp/album/certification-symphony/1822452513",
            amazonMusic: "https://music.amazon.co.jp/albums/B0FF4LTJ9Y",
            sunoAI: "https://suno.com/playlist/888888c4-2fab-47dd-ad43-11410c0ea1eb"
        }
    },
    {
        id: 1,
        title: "Dive Drive Collection",
        releaseDate: "2025年6月19日",
        coverImage: "image/ddc-cover.jpg.jpg",
        streamingLinks: {
            spotify: "https://open.spotify.com/intl-ja/album/7e4515POUooa6qcELXusMr",
            appleMusic: "https://music.apple.com/us/album/dive-drive-collection/1821436814",
            amazonMusic: "https://music.amazon.co.jp/albums/B0FDKRHDN8",
            sunoAI: "https://suno.com/playlist/f2ee1531-71ed-41c0-9c1d-5eba31e7fb75"
        }
    }
    // Future albums can be added here
];

// DOM Elements
const mobileMenu = document.getElementById('mobile-menu');
const navMenu = document.getElementById('nav-menu');
const albumsContainer = document.getElementById('albums-container');

// Mobile Navigation Toggle
mobileMenu.addEventListener('click', () => {
    mobileMenu.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on nav links
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        mobileMenu.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// Generate Album Cards
function generateAlbumCards() {
    albumsContainer.innerHTML = '';

    albumData.forEach(album => {
        const albumCard = document.createElement('div');
        albumCard.className = 'album-card';

        const links = album.streamingLinks;
        const serviceButtons = [
            links.presave && links.presave !== '#' ?
                `<a href="${links.presave}" target="_blank" rel="noopener noreferrer" class="streaming-link presave-link">
                    <i class="fas fa-bell"></i><span>プリセーブ</span>
                </a>` : '',
            links.spotify && links.spotify !== '#' ?
                `<a href="${links.spotify}" target="_blank" rel="noopener noreferrer" class="streaming-link">
                    <i class="fab fa-spotify"></i><span>Spotify</span>
                </a>` : '',
            links.appleMusic && links.appleMusic !== '#' ?
                `<a href="${links.appleMusic}" target="_blank" rel="noopener noreferrer" class="streaming-link">
                    <i class="fab fa-apple"></i><span>Apple Music</span>
                </a>` : '',
            links.amazonMusic && links.amazonMusic !== '#' ?
                `<a href="${links.amazonMusic}" target="_blank" rel="noopener noreferrer" class="streaming-link amazon">
                    <i class="fab fa-amazon"></i><span>Amazon Music</span>
                </a>` : '',
            links.sunoAI && links.sunoAI !== '#' ?
                `<a href="${links.sunoAI}" target="_blank" rel="noopener noreferrer" class="streaming-link">
                    <i class="fas fa-music"></i><span>SUNO</span>
                </a>` : ''
        ].join('');

        const badge = album.badge ? `<span class="album-badge">${album.badge}</span>` : '';
        const tracks = album.trackCount ? `<span class="album-tracks">全${album.trackCount}曲</span>` : '';
        const datePrefix = album.badge ? '' : 'Released: ';

        albumCard.innerHTML = `
            <div class="album-cover">
                ${badge}
                <img src="${album.coverImage}" alt="${album.title}" loading="lazy" decoding="async" onerror="this.src='assets/placeholder-album.png'">
            </div>
            <h3 class="album-title">${album.title}</h3>
            <p class="album-date">${datePrefix}${album.releaseDate}${tracks ? ' ｜ ' : ''}${tracks}</p>
            <div class="streaming-links">
                ${serviceButtons}
            </div>
        `;

        albumsContainer.appendChild(albumCard);
    });
}

// Intersection Observer for Fade-in Animation
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
        }
    });
}, observerOptions);

// Observe all fade-in elements
function initAnimations() {
    const fadeElements = document.querySelectorAll('.fade-in');
    fadeElements.forEach(element => {
        observer.observe(element);
    });
}

// Smooth Scroll for Navigation Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offsetTop = target.offsetTop - 70; // Account for fixed navbar
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// Navbar Background on Scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    navbar.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

// Motion budget: reduced-motion and data-saver users get the still hero only
function wantsMotion() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const savesData = navigator.connection && navigator.connection.saveData;
    const slowLink = navigator.connection && /(^|-)2g$/.test(navigator.connection.effectiveType || '');
    return !reduced && !savesData && !slowLink;
}

// WebGPU hero — loaded lazily, falls back to the ambient video if it can't run
function initHeroVisual() {
    if (!wantsMotion()) return;
    if (new URLSearchParams(location.search).get('gpuhero') === 'off') {
        initHeroVideo();
        return;
    }

    const load = () => {
        import('./hero-gpu.js?v=20260730')
            .then(module => module.initHeroGPU({
                host: document.getElementById('hero'),
                onGiveUp: initHeroVideo
            }))
            .then(handle => {
                window.TJHero = handle;
            })
            .catch(error => {
                console.warn('[TJ] GPU hero unavailable, using video fallback:', error && error.message);
                initHeroVideo();
            });
    };

    if ('requestIdleCallback' in window) {
        requestIdleCallback(load, { timeout: 1800 });
    } else {
        setTimeout(load, 600);
    }
}

// Ambient hero video — skipped when reduced motion or data saver is on
function initHeroVideo() {
    const video = document.getElementById('hero-video');
    if (!video || !wantsMotion() || video.src) return;

    video.src = 'image/tj-hero-loop.mp4?v=20260716';
    video.addEventListener('playing', () => video.classList.add('playing'), { once: true });
    const playPromise = video.play();
    if (playPromise) {
        playPromise.catch(() => { /* autoplay blocked — static hero stays */ });
    }
}

// Thin progress line across the top of the viewport
function initScrollProgress() {
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    document.body.appendChild(bar);

    let queued = false;
    const paint = () => {
        queued = false;
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        bar.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
    };
    window.addEventListener('scroll', () => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(paint);
    }, { passive: true });
    paint();
}

// Highlight the nav link for the section currently in view
function initNavHighlight() {
    const sections = [...document.querySelectorAll('section[id], footer[id]')];
    const links = new Map(
        [...document.querySelectorAll('.nav-link')].map(link => [link.getAttribute('href').slice(1), link])
    );
    if (!sections.length || !links.size) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            links.forEach(link => link.classList.remove('active'));
            const link = links.get(entry.target.id);
            if (link) link.classList.add('active');
        });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach(section => observer.observe(section));
}

// Pointer-follow tilt on album and partner cards (pointer devices only)
function initCardTilt() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (!wantsMotion()) return;

    document.querySelectorAll('.album-card, .partner-card, .promo-jacket-wrap').forEach(card => {
        card.classList.add('tiltable');
        card.addEventListener('pointermove', (event) => {
            const rect = card.getBoundingClientRect();
            const px = (event.clientX - rect.left) / rect.width - 0.5;
            const py = (event.clientY - rect.top) / rect.height - 0.5;
            card.style.setProperty('--tilt-x', `${(-py * 9).toFixed(2)}deg`);
            card.style.setProperty('--tilt-y', `${(px * 11).toFixed(2)}deg`);
            card.style.setProperty('--shine-x', `${((px + 0.5) * 100).toFixed(1)}%`);
            card.style.setProperty('--shine-y', `${((py + 0.5) * 100).toFixed(1)}%`);
        }, { passive: true });
        card.addEventListener('pointerleave', () => {
            card.style.setProperty('--tilt-x', '0deg');
            card.style.setProperty('--tilt-y', '0deg');
        }, { passive: true });
    });
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    generateAlbumCards();
    initAnimations();
    initHeroVisual();
    initScrollProgress();
    initNavHighlight();
    initCardTilt();

    // Show hero content with delay
    setTimeout(() => {
        document.querySelector('.hero-content').classList.add('show');
    }, 500);
});

// Add new album function (for easy future additions)
function addNewAlbum(albumObject) {
    albumData.push(albumObject);
    generateAlbumCards();

    // Re-observe new elements for animations
    const newCard = albumsContainer.lastElementChild;
    if (newCard) {
        observer.observe(newCard);
    }
}

// Export for potential future use
window.TJSite = {
    addNewAlbum,
    albumData
};
