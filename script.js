document.addEventListener('DOMContentLoaded', () => {

    /* ==========================================
       CONSTANTS & UTILITY MAPS
       ========================================== */
    const CATEGORY_LABELS = {
        reception: 'Reception',
        wedding: 'Wedding',
        engagement: 'Engagement',
        outdoor: 'Outdoor',
        birthday: 'Birthday',
        maternity: 'Maternity',
        profile: 'Profile'
    };


    /* ==========================================
       TOAST NOTIFICATION SYSTEM
       ========================================== */
    function showToast(message, type = 'success', duration = 4000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const iconMap = {
            success: 'fa-circle-check',
            error: 'fa-circle-xmark',
            info: 'fa-circle-info'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fa-solid ${iconMap[type] || iconMap.info} toast-icon" aria-hidden="true"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        // Auto-dismiss
        setTimeout(() => {
            toast.classList.add('toast-exit');
            toast.addEventListener('animationend', () => toast.remove());
        }, duration);
    }

    /* ==========================================
       0. DYNAMIC GALLERY LOADING (from JSON)
       ========================================== */
    let galleryData = [];
    let galleryItems = []; // Will be re-queried after loading
    let activeFilter = 'all';
    let visibleCount = 6;

    async function fetchGalleryData() {
        const galleryGrid = document.getElementById('gallery-grid');

        try {
            const response = await fetch('gallery-data.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            galleryData = await response.json();
            renderGallery(true);
            
            // Initialize lightbox event delegation once
            initGalleryClickDelegation();
        } catch (error) {
            console.error('Failed to load gallery data:', error);
            // Fallback: show error message
            if (galleryGrid) {
                galleryGrid.innerHTML = `
                    <div class="gallery-error" style="text-align: center; padding: 3rem; color: #888888; display: flex; flex-direction: column; align-items: center; gap: 1rem; width: 100%; grid-column: 1 / -1;">
                        <i class="fa-solid fa-exclamation-triangle" aria-hidden="true" style="color: #E11D2E; font-size: 2.5rem;"></i>
                        <span>Gallery couldn't be loaded. Please refresh the page.</span>
                    </div>
                `;
            }
        }
    }

    function renderGallery(reset = false) {
        const galleryGrid = document.getElementById('gallery-grid');
        if (!galleryGrid) return;

        if (reset) {
            galleryGrid.innerHTML = '';
            visibleCount = 6;
        }

        // Filter the galleryData based on the active filter
        let filteredData = galleryData;
        if (activeFilter !== 'all') {
            filteredData = galleryData.filter(item => item.category === activeFilter);
        }

        // Get currently rendered count to only append new items
        const renderedItems = galleryGrid.querySelectorAll('.gallery-item');
        const start = reset ? 0 : renderedItems.length;
        const end = Math.min(filteredData.length, visibleCount);
        const itemsToRender = filteredData.slice(start, end);

        itemsToRender.forEach(item => {
            const extraClass = item.featured ? ' featured' : '';
            const featuredBadge = item.featured
                ? '<div class="featured-badge"><i class="fa-solid fa-star" aria-hidden="true"></i> Featured</div>'
                : '';
            const categoryLabel = CATEGORY_LABELS[item.category] || 'Other';
            const altText = item.alt || item.title;

            const div = document.createElement('div');
            div.className = `gallery-item loading ${item.category}${extraClass}`;
            div.setAttribute('data-category', item.category);
            div.setAttribute('data-full-src', item.image); // Save original high-res image for lightbox
            div.innerHTML = `
                <div class="gallery-img-wrapper loading-shimmer">
                    <img 
                      src="${item.image}" 
                      alt="${altText}" 
                      loading="lazy" 
                      decoding="async" 
                      fetchpriority="low">
                    <div class="gallery-overlay">${featuredBadge}
                        <h3>${item.title}</h3>
                        <span class="category-tag">${categoryLabel}</span>
                        <button class="view-btn" aria-label="View ${item.title} full size"><i class="fa-solid fa-expand" aria-hidden="true"></i></button>
                    </div>
                </div>
            `;

            const img = div.querySelector('img');
            const wrapper = div.querySelector('.gallery-img-wrapper');

            const handleImageLoad = () => {
                // Step 1: fade shimmer
                wrapper.style.opacity = "0";

                setTimeout(() => {
                    // Step 2: remove shimmer
                    wrapper.classList.remove('loading-shimmer');
                    div.classList.remove('loading');

                    // Step 3: show image
                    img.classList.add('loaded');

                    // reset wrapper
                    wrapper.style.opacity = "";
                }, 300); // delay creates smooth effect
            };

            if (img.complete) {
                handleImageLoad();
            } else {
                img.addEventListener('load', handleImageLoad);
                img.addEventListener('error', handleImageLoad);
            }

            galleryGrid.appendChild(div);
        });

        // Show/hide the "Load More" button based on whether there are more items to show
        if (loadMoreBtn) {
            if (filteredData.length > visibleCount) {
                loadMoreBtn.style.display = 'inline-block';
            } else {
                loadMoreBtn.style.display = 'none';
            }
        }

        // Re-query gallery items after DOM is populated (fixes stale NodeList)
        galleryItems = document.querySelectorAll('.gallery-item');

        // Apply initial filter animations (since they are already rendered, we just make them visible)
        galleryItems.forEach(item => {
            item.classList.remove('hide');
            item.style.display = 'block';
            item.style.opacity = '1';
            item.style.transform = 'scale(1)';
        });
    }

    fetchGalleryData();

    /* ==========================================
       1. FORCE DARK MODE (No theme toggle)
       ========================================== */
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', 'dark');

    /* ==========================================
       2. MERGED SCROLL HANDLER (debounced)
       ========================================== */
    const header = document.getElementById('header');
    const sections = document.querySelectorAll('main > section[id]');
    const navLinksList = document.querySelectorAll('.nav-links a:not(.nav-book-btn)');
    const backToTopBtn = document.getElementById('back-to-top');
    const whatsappBtn = document.querySelector('.whatsapp-btn');

    let scrollTicking = false;

    function onScroll() {
        const scrollY = window.scrollY;

        // Sticky Header
        header.classList.toggle('scrolled', scrollY > 50);

        // Back to top visibility
        if (backToTopBtn) {
            backToTopBtn.classList.toggle('visible', scrollY > 500);
        }

        // WhatsApp button visibility
        if (whatsappBtn) {
            whatsappBtn.classList.toggle('visible', scrollY > 200);
        }

        // Active link highlighting
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (scrollY >= (sectionTop - sectionHeight / 3)) {
                current = section.getAttribute('id');
            }
        });

        navLinksList.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href && current && href.includes(current)) {
                link.classList.add('active');
            }
        });

        scrollTicking = false;
    }

    window.addEventListener('scroll', () => {
        if (!scrollTicking) {
            requestAnimationFrame(onScroll);
            scrollTicking = true;
        }
    }, { passive: true });

    // Show WhatsApp button on load after a short delay
    if (whatsappBtn) {
        setTimeout(() => whatsappBtn.classList.add('visible'), 1500);
    }

    // Page Title Dynamic Updates
    const titleObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.getAttribute('id');
                if (sectionId) {
                    const sectionName = sectionId === 'home'
                        ? 'Cinematic Moments, Timeless Art'
                        : sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
                    document.title = `Flawless Photography | ${sectionName}`;
                }
            }
        });
    }, { root: null, rootMargin: '0px', threshold: 0.5 });

    sections.forEach(section => titleObserver.observe(section));

    /* ==========================================
       3. MOBILE MENU TOGGLE
       ========================================== */
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    const menuIcon = mobileMenuBtn ? mobileMenuBtn.querySelector('i') : null;

    if (mobileMenuBtn && navLinks && menuIcon) {
        mobileMenuBtn.addEventListener('click', () => {
            const isOpen = navLinks.classList.toggle('active');
            menuIcon.classList.toggle('fa-bars', !isOpen);
            menuIcon.classList.toggle('fa-xmark', isOpen);
            mobileMenuBtn.setAttribute('aria-expanded', isOpen);
            // Prevent body scroll when menu is open
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });

        // Close mobile menu when a link is clicked
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                menuIcon.classList.remove('fa-xmark');
                menuIcon.classList.add('fa-bars');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            });
        });
    }

    /* ==========================================
       4. SCROLL REVEAL ANIMATIONS
       ========================================== */
    const revealElements = document.querySelectorAll('.reveal');
    const revealOnScroll = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    revealElements.forEach(el => revealOnScroll.observe(el));

    /* ==========================================
       4b. STAT COUNTER ANIMATION
       ========================================== */
    const statNumbers = document.querySelectorAll('.stat-number[data-target]');

    function animateCounter(el) {
        const target = parseInt(el.getAttribute('data-target'));
        const duration = 2000;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.floor(easedProgress * target) + '+';
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                el.textContent = target + '+';
            }
        }
        requestAnimationFrame(update);
    }

    const statObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    statNumbers.forEach(el => statObserver.observe(el));

    /* ==========================================
       5. GALLERY FILTERING & LOAD MORE
       ========================================== */
    const filterBtns = document.querySelectorAll('.filter-btn');
    const loadMoreBtn = document.getElementById('load-more-gallery');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');

            activeFilter = btn.getAttribute('data-filter');
            renderGallery(true);
        });
    });

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', (e) => {
            e.preventDefault();
            let filteredData = galleryData;
            if (activeFilter !== 'all') {
                filteredData = galleryData.filter(item => item.category === activeFilter);
            }
            visibleCount = Math.min(filteredData.length, visibleCount + 6);
            renderGallery(false);
        });
    }

    /* ==========================================
       6. LIGHTBOX — Event Delegation + Counter
       ========================================== */
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const lightboxCounter = document.getElementById('lightbox-counter');
    const closeBtn = document.querySelector('.lightbox-close');
    const nextBtn = document.querySelector('.lightbox-next');
    const prevBtn = document.querySelector('.lightbox-prev');

    let currentIndex = 0;
    let currentGalleryItems = [];
    let touchStartX = 0;
    let touchEndX = 0;

    function getVisibleGalleryItems() {
        return Array.from(document.querySelectorAll('.gallery-item')).filter(item => item.style.display !== 'none');
    }

    function initGalleryClickDelegation() {
        const galleryGrid = document.getElementById('gallery-grid');
        if (!galleryGrid) return;

        // Use event delegation — single listener on the grid container
        galleryGrid.addEventListener('click', (e) => {
            const viewBtn = e.target.closest('.view-btn');
            if (!viewBtn) return;

            e.stopPropagation();
            currentGalleryItems = getVisibleGalleryItems();

            const parentItem = viewBtn.closest('.gallery-item');
            currentIndex = currentGalleryItems.indexOf(parentItem);
            if (currentIndex === -1) currentIndex = 0;

            openLightbox(parentItem);
        });
    }

    let triggerElement = null;

    function openLightbox(item) {
        triggerElement = document.activeElement; // Remember what had focus
        const fullSrc = item.getAttribute('data-full-src');
        const img = item.querySelector('img');
        const title = item.querySelector('h3');

        lightboxImg.src = fullSrc || img.src;
        lightboxImg.alt = img.alt || '';
        lightboxCaption.innerText = title ? title.innerText : '';
        updateCounter();
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Programmatically focus on close button for keyboard accessibility
        if (closeBtn) {
            closeBtn.focus();
        }
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        if (triggerElement) {
            triggerElement.focus(); // Restore focus to the trigger button
        }
    }

    function updateCounter() {
        if (lightboxCounter && currentGalleryItems.length > 0) {
            lightboxCounter.textContent = `${currentIndex + 1} / ${currentGalleryItems.length}`;
        }
    }

    function navigateLightbox(direction) {
        currentGalleryItems = getVisibleGalleryItems();
        if (currentGalleryItems.length === 0) return;

        currentIndex += direction;
        if (currentIndex >= currentGalleryItems.length) currentIndex = 0;
        else if (currentIndex < 0) currentIndex = currentGalleryItems.length - 1;

        openLightbox(currentGalleryItems[currentIndex]);
    }

    // Lightbox controls
    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (nextBtn) nextBtn.addEventListener('click', () => navigateLightbox(1));
    if (prevBtn) prevBtn.addEventListener('click', () => navigateLightbox(-1));

    // Close on outside click
    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!lightbox || !lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') navigateLightbox(1);
        if (e.key === 'ArrowLeft') navigateLightbox(-1);
    });

    // Touch swipe support for lightbox (mobile)
    if (lightbox) {
        lightbox.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        lightbox.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            const swipeThreshold = 50;
            const diff = touchStartX - touchEndX;

            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) navigateLightbox(1);  // Swipe left → next
                else navigateLightbox(-1);           // Swipe right → prev
            }
        }, { passive: true });
    }

    /* ==========================================
       7. CONTACT FORM (Firebase + WhatsApp + Toast)
       ========================================== */
    const contactForm = document.getElementById('contact-form');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Form Validation
            let isValid = contactForm.checkValidity();
            const fields = contactForm.querySelectorAll('input, textarea, select');
            fields.forEach(field => {
                if (!field.validity.valid) {
                    field.parentElement.classList.add('invalid');
                } else {
                    field.parentElement.classList.remove('invalid');
                }
            });

            if (!isValid) {
                showToast('Please fill in all required fields correctly.', 'error');
                return;
            }

            const btn = document.getElementById('submit-btn');
            if (!btn || btn.disabled) return; // Prevent double submit

            // Get form values
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone_number').value.trim();
            const service = document.getElementById('service').value;
            const message = document.getElementById('message').value.trim();

            // Show loading state
            btn.classList.add('is-loading');
            btn.disabled = true;

            try {
                // 1. Save to Firebase Firestore (if available)
                if (window.firebaseDB && window.firebaseCollection && window.firebaseAddDoc) {
                    await window.firebaseAddDoc(window.firebaseCollection(window.firebaseDB, "inquiries"), {
                        name,
                        email,
                        phone,
                        service,
                        message,
                        timestamp: new Date(),
                        source: 'website'
                    });
                    console.log('Inquiry saved to Firebase Firestore.');
                } else {
                    console.warn('Firebase not fully loaded, proceeding to WhatsApp.');
                }

                // 2. Redirect to WhatsApp
                const whatsappNumber = '919080482374';
                const waMessage = `Hi Flawless Photography! ✨\n\nI am interested in your services.\n\n*Name:* ${name}\n*Email:* ${email}\n*Phone:* ${phone}\n*Service:* ${service}\n\n*Message:*\n${message}`;
                const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(waMessage)}`;

                window.open(whatsappUrl, '_blank');

                // 3. Success feedback
                showToast('Message sent! Redirecting to WhatsApp...', 'success');
                contactForm.reset();

                // Clear validation states
                fields.forEach(field => field.parentElement.classList.remove('invalid'));

            } catch (error) {
                console.error('Error processing form:', error);
                showToast('Something went wrong. Please try again or contact via WhatsApp directly.', 'error');
            } finally {
                // Always reset button state
                btn.classList.remove('is-loading');
                btn.disabled = false;
            }
        });

        // Clear validation on input
        contactForm.querySelectorAll('input, textarea').forEach(field => {
            field.addEventListener('input', () => {
                if (field.validity.valid) {
                    field.parentElement.classList.remove('invalid');
                }
            });
        });
    }

    /* ==========================================
       8. BACK TO TOP
       ========================================== */
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    /* ==========================================
       9. PRICING TABS & TOGGLE (preserved)
       ========================================== */
    const pricingTabs = document.querySelectorAll('.pricing-tab');
    const pricingCards = document.querySelectorAll('#pricing-grid-list .pricing-card');
    const startingPriceDisplay = document.getElementById('starting-price-display');
    const pricingToggleSwitch = document.getElementById('pricing-toggle-switch');

    const startingPrices = {
        birthday: '₹8,000',
        wedding: '₹25,000',
        'pre-wedding': '₹12,000',
        portfolio: '₹4,900'
    };

    function updatePricingCategory(category) {
        if (startingPriceDisplay) {
            startingPriceDisplay.style.opacity = '0';
            setTimeout(() => {
                startingPriceDisplay.innerText = startingPrices[category] || '₹0';
                startingPriceDisplay.style.opacity = '1';
            }, 300);
        }

        pricingCards.forEach(card => {
            const cardCat = card.getAttribute('data-category');
            if (cardCat === category) {
                card.style.display = 'block';
                card.classList.remove('fade-in');
                void card.offsetWidth;
                card.classList.add('fade-in');
            } else {
                card.style.display = 'none';
                card.classList.remove('fade-in');
            }
        });
    }

    if (pricingTabs.length > 0) {
        pricingTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                pricingTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                updatePricingCategory(tab.getAttribute('data-category'));
            });
        });
        updatePricingCategory('birthday');
    }

    if (pricingToggleSwitch) {
        pricingToggleSwitch.addEventListener('change', (e) => {
            const isPremium = e.target.checked;
            pricingCards.forEach(card => {
                const priceEl = card.querySelector('.price');
                if (priceEl) {
                    priceEl.style.opacity = '0';
                    setTimeout(() => {
                        priceEl.innerText = isPremium ? priceEl.getAttribute('data-premium') : priceEl.getAttribute('data-standard');
                        priceEl.style.opacity = '1';
                    }, 300);
                }

                card.querySelectorAll('.pricing-features span[data-standard]').forEach(span => {
                    span.style.opacity = '0';
                    setTimeout(() => {
                        span.innerText = isPremium ? span.getAttribute('data-premium') : span.getAttribute('data-standard');
                        span.style.opacity = '1';
                    }, 300);
                });

                card.querySelectorAll('.premium-feature').forEach(li => {
                    if (isPremium) {
                        li.style.display = 'flex';
                        li.style.opacity = '0';
                        setTimeout(() => (li.style.opacity = '1'), 10);
                    } else {
                        li.style.display = 'none';
                    }
                });
            });
        });
    }

    /* ==========================================
       10. SERVICE CARD 3D TILT
       ========================================== */
    const serviceCards = document.querySelectorAll('.service-card');
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    if (!isTouchDevice) {
        serviceCards.forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = ((y - centerY) / centerY) * -10;
                const rotateY = ((x - centerX) / centerX) * 10;
                card.style.transform = `perspective(800px) translateY(-8px) scale(1.02) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    }

    /* ==========================================
       11. HERO FLOATING CARDS PARALLAX (Mousemove)
       ========================================== */
    const floatCards = document.querySelectorAll('.float-card');
    if (floatCards.length > 0 && !isTouchDevice) {
        document.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 20;
            const y = (e.clientY / window.innerHeight - 0.5) * 20;

            floatCards.forEach((card, i) => {
                const factor = (i + 1) / 5;
                card.style.setProperty('--mx', `${x * factor}px`);
                card.style.setProperty('--my', `${y * factor}px`);
            });
        });
    }

});
