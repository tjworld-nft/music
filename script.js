// Album Data - Add new albums here
const albumData = [
    {
        id: 1,
        title: "Dive Drive Collection",
        releaseDate: "2025年6月19日",
        coverImage: "image/ddc-cover.jpg.jpg",
        streamingLinks: {
            spotify: "https://open.spotify.com/intl-ja/album/7e4515POUooa6qcELXusMr",
            appleMusic: "https://music.apple.com/us/album/dive-drive-collection/1821436814",
            amazonMusic: "https://music.amazon.co.jp/albums/B0FDKRHDN8",
            sunoAI: "https://suno.ai/playlist/tj-dive-drive-collection"
        }
    },
    {
        id: 2,
        title: "Certification Symphony",
        releaseDate: "2025年6月25日",
        coverImage: "image/Certification Symphony-cover.jpg",
        streamingLinks: {
            spotify: "https://open.spotify.com/intl-ja/album/2sdUIAIK77Ssz9KQdXlGLN?utm_campaign=website&utm_medium=Email+&utm_source=SendGrid",
            appleMusic: "#",
            amazonMusic: "https://music.amazon.co.jp/albums/B0FF4LTJ9Y",
            sunoAI: "https://suno.com/playlist/888888c4-2fab-47dd-ad43-11410c0ea1eb"
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
        
        const presaveButton = album.presave ? 
            `<a href="${album.presave}" class="streaming-link btn presave" target="_blank" rel="noopener">
                <i class="fas fa-save"></i>
                <span>Pre-Save</span>
            </a>` : '';

        albumCard.innerHTML = `
            <div class="album-cover">
                <img src="${album.coverImage}" alt="${album.title}" onerror="this.src='assets/placeholder-album.png'">
            </div>
            <h3 class="album-title">${album.title}</h3>
            <p class="album-date">Released: ${album.releaseDate}</p>
            <div class="streaming-links">
                <a href="${album.streamingLinks.spotify}" target="_blank" class="streaming-link">
                    <i class="fab fa-spotify"></i>
                    <span>Spotify</span>
                </a>
                <a href="${album.streamingLinks.appleMusic}" target="_blank" class="streaming-link">
                    <i class="fab fa-apple"></i>
                    <span>Apple Music</span>
                </a>
                <a href="${album.streamingLinks.amazonMusic}" target="_blank" class="streaming-link">
                    <i class="fab fa-amazon"></i>
                    <span>Amazon Music</span>
                </a>
                <a href="${album.streamingLinks.sunoAI}" target="_blank" class="streaming-link">
                    <i class="fas fa-music"></i>
                    <span>Suno AI</span>
                </a>
                ${presaveButton}
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
    if (window.scrollY > 50) {
        navbar.style.backgroundColor = 'rgba(6, 23, 47, 0.95)';
    } else {
        navbar.style.backgroundColor = 'rgba(6, 23, 47, 0.85)';
    }
});

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    generateAlbumCards();
    initAnimations();
    
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

// Handle image loading errors
document.addEventListener('error', (e) => {
    if (e.target.tagName === 'IMG') {
        console.warn('Image failed to load:', e.target.src);
        // You can set a default image here if needed
    }
}, true);

// Preload critical images
function preloadImages() {
    const imagesToPreload = [
        'image/tj-hero.png',
        'assets/og.jpg',
        'image/ddc-cover.jpg.jpg',
        'image/Certification Symphony-cover.jpg',
        'image/AquaBit LAB logo.png',
        'image/umigaku-logo.webp'
    ];
    
    imagesToPreload.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}

// Call preload on page load
window.addEventListener('load', preloadImages);