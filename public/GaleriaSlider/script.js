const track = document.getElementById('slider-track');
const slides = Array.from(track.children);
const nextBtn = document.getElementById('next-btn');
const prevBtn = document.getElementById('prev-btn');
const dotsContainer = document.getElementById('indicators');
const dots = Array.from(dotsContainer.children);

let currentIndex = 0;
let autoSlideInterval;

// Update Slider Position
function updateSlider() {
    const slideWidth = slides[0].getBoundingClientRect().width;
    track.style.transform = `translateX(-${currentIndex * 33.333}%)`;
    
    // Update active classes
    slides.forEach((slide, index) => {
        if (index === currentIndex) {
            slide.classList.add('active');
        } else {
            slide.classList.remove('active');
        }
    });

    // Update dots
    dots.forEach((dot, index) => {
        if (index === currentIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
}

// Next Slide
function nextSlide() {
    currentIndex = (currentIndex + 1) % slides.length;
    updateSlider();
}

// Prev Slide
function prevSlide() {
    currentIndex = (currentIndex - 1 + slides.length) % slides.length;
    updateSlider();
}

// Go to specific slide
function goToSlide(index) {
    currentIndex = index;
    updateSlider();
}

// Auto Slide
function startAutoSlide() {
    autoSlideInterval = setInterval(nextSlide, 5000);
}

function stopAutoSlide() {
    clearInterval(autoSlideInterval);
}

// Event Listeners
nextBtn.addEventListener('click', () => {
    nextSlide();
    stopAutoSlide();
    startAutoSlide();
});

prevBtn.addEventListener('click', () => {
    prevSlide();
    stopAutoSlide();
    startAutoSlide();
});

dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        goToSlide(index);
        stopAutoSlide();
        startAutoSlide();
    });
});

// Initialize
updateSlider();
startAutoSlide();

// Pause on Hover
const wrapper = document.querySelector('.slider-wrapper');
wrapper.addEventListener('mouseenter', stopAutoSlide);
wrapper.addEventListener('mouseleave', startAutoSlide);

// Touch support (simple)
let touchStartX = 0;
let touchEndX = 0;

wrapper.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

wrapper.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleGesture();
}, { passive: true });

function handleGesture() {
    if (touchStartX - touchEndX > 50) {
        nextSlide();
    } else if (touchEndX - touchStartX > 50) {
        prevSlide();
    }
}
