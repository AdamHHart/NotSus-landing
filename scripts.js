// File: scripts.js
const config = {
    apiUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000/api/feedback'
        : 'https://www.notsus.net/api/feedback'
};

document.addEventListener('DOMContentLoaded', () => {
    const showFormButton = document.getElementById('showFormButton');
    const form = document.querySelector('.feedback-form');
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const submitStep1Button = document.getElementById('submitStep1');
    let isScrolling = false;
    const pages = document.querySelectorAll('.page-first, .page, .video-page, .contact-page');
    let currentPageIndex = 0;
    let lastScrollTime = 0;
    let accumulatedDelta = 0;
    const scrollThreshold = 250; // Adjust this value to control scroll sensitivity

    if (!showFormButton || !form || !step1 || !step2 || !submitStep1Button) {
        console.error('Required elements not found');
        return;
    }

    function handleScroll(delta) {
        const now = Date.now();
        if (isScrolling) return;
        
        // Accumulate scroll delta
        accumulatedDelta += delta;

        // Check if enough scrolling has occurred
        if (Math.abs(accumulatedDelta) < scrollThreshold) return;

        // Reset accumulator and set direction
        const direction = accumulatedDelta > 0 ? 'down' : 'up';
        accumulatedDelta = 0;

        if (now - lastScrollTime < 400) return;
        isScrolling = true;
        lastScrollTime = now;

        const nextIndex = direction === 'down' 
            ? Math.min(currentPageIndex + 1, pages.length - 1)
            : Math.max(currentPageIndex - 1, 0);

        if (nextIndex !== currentPageIndex) {
            currentPageIndex = nextIndex;
            pages[currentPageIndex].scrollIntoView({ behavior: 'smooth' });
            updateActiveDot(currentPageIndex);
        }

        setTimeout(() => {
            isScrolling = false;
        }, 400);
    }

    // Wheel event handler
    document.addEventListener('wheel', (e) => {
        e.preventDefault();
        handleScroll(e.deltaY);
    }, { passive: false });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'PageDown') {
            e.preventDefault();
            handleScroll(scrollThreshold + 1); // Force scroll down
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
            e.preventDefault();
            handleScroll(-scrollThreshold - 1); // Force scroll up
        }
    });

    function updateActiveDot(index) {
        const dots = document.querySelectorAll('.scroll-nav__dot');
        dots.forEach(dot => dot.classList.remove('active'));
        dots[index].classList.add('active');
    }

    // Show initial form when "Join Waitlist" is clicked
    showFormButton.addEventListener('click', () => {
        showFormButton.style.display = 'none';
        form.style.display = 'block';
        setTimeout(() => form.classList.add('visible'), 10);
    });

    // Handle step 1 submission
    submitStep1Button.addEventListener('click', async (e) => {
        e.preventDefault();
        
        // Validate name and email
        const name = form.querySelector('input[name="name"]').value;
        const email = form.querySelector('input[name="email"]').value;
        
        if (!name || !email) {
            alert('Please fill in all fields');
            return;
        }
        
        if (!email.includes('@')) {
            alert('Please enter a valid email address');
            return;
        }

        try {
            // Save initial data
            const initialData = {
                name: name,
                email: email,
                concerns: [],
                otherDescription: '',
                step: 1,
                timestamp: new Date().toISOString()
            };

            const response = await fetch(config.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(initialData)
            });

            const data = await response.json();
            
            if (data.success) {
                // Show step 2
                step1.style.display = 'none';
                step2.style.display = 'block';
            } else {
                throw new Error(data.error || 'Failed to save initial data');
            }
        } catch (err) {
            console.error('Submission error details:', err);
            alert('There was an error: ' + err.message);
        }
    });

    // Handle final form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;

        // Add visual feedback
        form.classList.add('submitting');
        submitButton.textContent = 'Submitting...';

        try {
            const formData = {
                name: form.querySelector('input[name="name"]').value,
                email: form.querySelector('input[name="email"]').value,
                concerns: Array.from(form.querySelectorAll('input[type="checkbox"]:checked'))
                    .map(checkbox => checkbox.value),
                otherDescription: form.querySelector('input[name="otherDescription"]').value || '',
                step: 2,
                timestamp: new Date().toISOString()
            };

            const response = await fetch(config.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            
            if (data.success) {
                form.classList.remove('submitting');
                form.classList.add('success');
                submitButton.textContent = 'Submitted Successfully!';
                
                // Reset form after delay
                setTimeout(() => {
                    form.reset();
                    form.style.display = 'none';
                    showFormButton.style.display = 'block';
                    step1.style.display = 'block';
                    step2.style.display = 'none';
                    form.classList.remove('success');
                    submitButton.textContent = originalButtonText;
                }, 2000);
            } else {
                throw new Error(data.error || 'Submission failed');
            }
        } catch (err) {
            console.error('Submission error details:', err);
            form.classList.remove('submitting');
            form.classList.add('error');
            submitButton.textContent = 'Error - Try Again';
            alert('There was an error: ' + err.message);
            
            setTimeout(() => {
                form.classList.remove('error');
                submitButton.textContent = originalButtonText;
            }, 2000);
        }
    });

    // Add scroll navigation
    const nav = document.createElement('div');
    nav.className = 'scroll-nav';
    
    pages.forEach((_, index) => {
        const dot = document.createElement('span');
        dot.className = 'scroll-nav__dot';
        if (index === currentPageIndex) dot.classList.add('active');
        
        dot.addEventListener('click', () => {
            if (isScrolling) return;
            const now = Date.now();
            if (now - lastScrollTime < 250) return;
            
            isScrolling = true;
            lastScrollTime = now;
            currentPageIndex = index;
            pages[index].scrollIntoView({ behavior: 'smooth' });
            updateActiveDot(index);
            setTimeout(() => {
                isScrolling = false;
            }, 400);
        });
        
        nav.appendChild(dot);
    });
    
    document.body.appendChild(nav);
});