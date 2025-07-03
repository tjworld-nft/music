// Simple incremental loader with water splash effect
const bar = document.querySelector('.progress-bar');
const numEl = document.getElementById('progress-num');
const pre = document.getElementById('preloader');
let prog = 0;

// Preload critical images first
const imagesToPreload = [
    'image/tj-hero.png',
    'image/ddc-cover.jpg.jpg',
    'image/Certification Symphony-cover.jpg',
    'image/kuragejyoshi-toka.png'
];

let loadedImages = 0;
const totalImages = imagesToPreload.length;

// Preload images
imagesToPreload.forEach(src => {
    const img = new Image();
    img.onload = () => {
        loadedImages++;
    };
    img.onerror = () => {
        loadedImages++;
    };
    img.src = src;
});

const timer = setInterval(() => {
    // Combine image loading progress with artificial progress
    const imageProgress = (loadedImages / totalImages) * 50; // Up to 50%
    const artificialProgress = prog + Math.random() * 1.5 + 0.8; // Slower increment
    
    prog = Math.max(imageProgress, artificialProgress);
    
    if (prog > 100) prog = 100;
    
    bar.style.width = prog + '%';
    numEl.textContent = Math.floor(prog) + '%';

    if (prog >= 100) {
        clearInterval(timer);
        
        // Water splash effect → Fade out
        pre.classList.add('splash-start');
        
        // Start fade out after splash begins
        setTimeout(() => { 
            pre.style.opacity = '0'; 
        }, 800);
        
        // Remove preloader completely
        setTimeout(() => { 
            pre.remove();
            // Trigger any initial animations
            if (window.initAnimations) {
                window.initAnimations();
            }
        }, 1700);
    }
}, 90); // Slower interval: 60ms → 90ms

// Fallback: ensure preloader doesn't stay forever
setTimeout(() => {
    if (pre && pre.parentNode) {
        clearInterval(timer);
        pre.style.opacity = '0';
        setTimeout(() => pre.remove(), 800);
    }
}, 12000); // Max 12 seconds