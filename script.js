// Album Data - Add new albums here
const albumData = [
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

        albumCard.innerHTML = `
            <div class="album-cover">
                <img src="${album.coverImage}" alt="${album.title}" loading="lazy" decoding="async" onerror="this.src='assets/placeholder-album.png'">
            </div>
            <h3 class="album-title">${album.title}</h3>
            <p class="album-date">Released: ${album.releaseDate}</p>
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

// Ambient hero video — desktop only, skipped when reduced motion is preferred
function initHeroVideo() {
    const video = document.getElementById('hero-video');
    if (!video) return;

    const wantsMotion = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
    const isDesktop = window.matchMedia('(min-width: 769px)').matches;
    if (!wantsMotion || !isDesktop) return;

    video.src = 'image/tj-hero-loop.mp4?v=20260716';
    video.addEventListener('playing', () => video.classList.add('playing'), { once: true });
    const playPromise = video.play();
    if (playPromise) {
        playPromise.catch(() => { /* autoplay blocked — static hero stays */ });
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    generateAlbumCards();
    initAnimations();
    initHeroVideo();

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
