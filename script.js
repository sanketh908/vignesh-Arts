document.addEventListener('DOMContentLoaded', () => {
    // ---- Slider Functionality ----
    const sliderWrapper = document.getElementById('sliderWrapper');

    if (sliderWrapper) {
        const slides = document.querySelectorAll('.slide');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const indicatorsContainer = document.getElementById('indicators');

        let currentIndex = 0;
        const totalSlides = slides.length;

        // Dynamically set the width of the slider wrapper 
        // to accomodate any number of slides seamlessly
        sliderWrapper.style.width = `${totalSlides * 100}%`;

        // Size each slide appropriately based on the new wrapper width
        slides.forEach(slide => {
            slide.style.width = `${100 / totalSlides}%`;
            // Remove flex: 0 0 100% which was set in CSS
            slide.style.flex = "none";
        });

        // Create Indicator Dots
        for (let i = 0; i < totalSlides; i++) {
            const dot = document.createElement('div');
            dot.classList.add('dot');
            if (i === 0) dot.classList.add('active');
            dot.dataset.index = i;
            dot.addEventListener('click', () => {
                goToSlide(i);
                resetInterval();
            });
            indicatorsContainer.appendChild(dot);
        }

        const dots = document.querySelectorAll('.dot');

        function updateSlider() {
            // Apply smooth transition - carefully calculating the exact percentage
            sliderWrapper.style.transform = `translateX(-${currentIndex * (100 / totalSlides)}%)`;

            // Update active dot
            dots.forEach(dot => dot.classList.remove('active'));
            dots[currentIndex].classList.add('active');
        }

        function goToSlide(index) {
            currentIndex = index;
            updateSlider();
        }

        function nextSlide() {
            currentIndex = (currentIndex + 1) % totalSlides;
            updateSlider();
        }

        function prevSlide() {
            currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
            updateSlider();
        }

        function resetInterval() {
            clearInterval(slideInterval);
            slideInterval = setInterval(nextSlide, 3000);
        }

        nextBtn.addEventListener('click', () => {
            nextSlide();
            resetInterval();
        });

        prevBtn.addEventListener('click', () => {
            prevSlide();
            resetInterval();
        });

        // Auto slide functionality
        let slideInterval = setInterval(nextSlide, 3000);

        // Pause auto-sliding when hovering over the slider container
        const sliderContainer = document.querySelector('.slider-container');
        sliderContainer.addEventListener('mouseenter', () => {
            clearInterval(slideInterval);
        });

        sliderContainer.addEventListener('mouseleave', () => {
            resetInterval();
        });

        // Keyboard navigation for slider
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                prevSlide();
            } else if (e.key === 'ArrowRight') {
                nextSlide();
            }
        });
    }

    // ---- Intersection Observer for fade-in animations ----
    const fadeElements = document.querySelectorAll('.fade-in');
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Unobserve after fading in to maintain state
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    fadeElements.forEach(el => observer.observe(el));
});
