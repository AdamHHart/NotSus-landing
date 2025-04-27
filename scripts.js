// Configure API URL based on environment
const config = {
    apiUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000/api/feedback'
        : 'https://www.notsus.net/api/feedback',
    downloadUrls: {
        // windows: 'https://notsus.net/download/windows',
        windows: 'https://notsus.net/NotSus_Browser_1.0.5.exe',
        // mac: 'https://notsus.net/download/mac'
        mac: 'https://notsus.net/NotSus_Browser-1.0.5-arm64.dmg'
    }
};

// Function to handle multi-step form transitions
window.showNextStep = (step) => {
    document.querySelectorAll('[id^="form-step-"]').forEach(el => el.style.display = 'none');
    document.getElementById(`form-step-${step}`).style.display = 'block';
};

// TinkerCad 3D Car Model
let tinkercadScene, tinkercadCamera, tinkercadRenderer, tinkercadCar;
let isInitialized = false;

function initTinkercadModel() {
    if (isInitialized) return;
    
    const canvas = document.getElementById('tinkercad-canvas');
    if (!canvas) return;

    // Check if we're in the visible tab
    const createTab = document.querySelector('.category-tab[data-category="create"]');
    const isCreateActive = createTab.classList.contains('active');
    
    // Create scene
    tinkercadScene = new THREE.Scene();
    tinkercadScene.background = new THREE.Color(0x433d85);
    
    // Create camera
    tinkercadCamera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    tinkercadCamera.position.z = 5;
    
    // Create renderer
    tinkercadRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    tinkercadRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    tinkercadRenderer.setPixelRatio(window.devicePixelRatio);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    tinkercadScene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    tinkercadScene.add(directionalLight);
    
    // Create car body
    const carGroup = new THREE.Group();
    
    // Car body - main block
    const bodyGeometry = new THREE.BoxGeometry(2, 0.5, 1);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x3f88c5 });
    const carBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    carGroup.add(carBody);
    
    // Car top - cabin
    const cabinGeometry = new THREE.BoxGeometry(1, 0.4, 0.8);
    const cabinMaterial = new THREE.MeshPhongMaterial({ color: 0x3f88c5 });
    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabin.position.set(-0.1, 0.45, 0);
    carGroup.add(cabin);
    
    // Create wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16);
    const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    
    // Front left wheel
    const frontLeftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    frontLeftWheel.rotation.z = Math.PI / 2;
    frontLeftWheel.position.set(0.7, -0.25, 0.4);
    carGroup.add(frontLeftWheel);
    
    // Front right wheel
    const frontRightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    frontRightWheel.rotation.z = Math.PI / 2;
    frontRightWheel.position.set(0.7, -0.25, -0.4);
    carGroup.add(frontRightWheel);
    
    // Rear left wheel
    const rearLeftWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    rearLeftWheel.rotation.z = Math.PI / 2;
    rearLeftWheel.position.set(-0.7, -0.25, 0.4);
    carGroup.add(rearLeftWheel);
    
    // Rear right wheel
    const rearRightWheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    rearRightWheel.rotation.z = Math.PI / 2;
    rearRightWheel.position.set(-0.7, -0.25, -0.4);
    carGroup.add(rearRightWheel);
    
    // Add details - headlights
    const headlightGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.2);
    const headlightMaterial = new THREE.MeshPhongMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 0.5 });
    
    // Left headlight
    const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    leftHeadlight.position.set(1.05, 0, 0.3);
    carGroup.add(leftHeadlight);
    
    // Right headlight
    const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    rightHeadlight.position.set(1.05, 0, -0.3);
    carGroup.add(rightHeadlight);
    
    // Add the car to the scene
    tinkercadScene.add(carGroup);
    tinkercadCar = carGroup;
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        // Only render when tab is visible
        const createCategory = document.getElementById('create-category');
        if (createCategory && createCategory.classList.contains('active')) {
            // Gentle rotation for idle animation
            if (!isDragging) {
                tinkercadCar.rotation.y += 0.005;
            }
            
            tinkercadRenderer.render(tinkercadScene, tinkercadCamera);
        }
    }
    
    // Mouse controls
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    
    const containerElement = document.getElementById('tinkercad-canvas-container');
    
    containerElement.addEventListener('mousedown', (e) => {
        isDragging = true;
    });
    
    containerElement.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaMove = {
                x: e.offsetX - previousMousePosition.x,
                y: e.offsetY - previousMousePosition.y
            };
            
            tinkercadCar.rotation.y += deltaMove.x * 0.01;
            tinkercadCar.rotation.x += deltaMove.y * 0.01;
        }
        
        previousMousePosition = {
            x: e.offsetX,
            y: e.offsetY
        };
    });
    
    containerElement.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    containerElement.addEventListener('mouseleave', () => {
        isDragging = false;
    });
    
    // Wheel scroll to zoom
    containerElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        
        if (tinkercadCamera.position.z > 2 && e.deltaY > 0) {
            tinkercadCamera.position.z -= 0.2;  // Zoom in
        } else if (tinkercadCamera.position.z < 8 && e.deltaY < 0) {
            tinkercadCamera.position.z += 0.2;  // Zoom out
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
        // Only update if renderer exists
        if (tinkercadRenderer) {
            tinkercadCamera.aspect = canvas.clientWidth / canvas.clientHeight;
            tinkercadCamera.updateProjectionMatrix();
            tinkercadRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
        }
    });
    
    // Start animation loop
    animate();
    isInitialized = true;
}

// Set up form submission handlers
document.addEventListener('DOMContentLoaded', function() {
    // Load Three.js library dynamically
    const threejsScript = document.createElement('script');
    threejsScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    threejsScript.onload = function() {
        console.log('Three.js loaded successfully');
        
        // Initialize the 3D model if we're on the create tab
        const createTab = document.querySelector('.category-tab[data-category="create"]');
        if (createTab && createTab.classList.contains('active')) {
            initTinkercadModel();
        }
    };
    document.head.appendChild(threejsScript);

    // Handle category tab toggling in tools section
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            document.querySelectorAll('.category-tab').forEach(t => {
                t.classList.remove('active');
            });
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Hide all categories
            document.querySelectorAll('.tools-category').forEach(cat => {
                cat.classList.remove('active');
            });
            
            // Show selected category
            const category = this.getAttribute('data-category');
            document.getElementById(`${category}-category`).classList.add('active');
            
            // Initialize 3D model when create tab is selected
            if (category === 'create') {
                setTimeout(initTinkercadModel, 100); // Slight delay to ensure DOM is updated
            }
        });
    });

    // Hero form submission
    const heroForm = document.getElementById('heroForm');
    if (heroForm) {
        heroForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // Capture hero form data
            const heroName = heroForm.querySelector('input[name="name"]').value;
            const heroEmail = heroForm.querySelector('input[name="email"]').value;
            
            // Prefill the waitlist form
            const feedbackForm = document.getElementById('feedbackForm');
            if (feedbackForm) {
                feedbackForm.querySelector('input[name="name"]').value = heroName;
                feedbackForm.querySelector('input[name="email"]').value = heroEmail;
            }
            
            // Scroll to waitlist section
            document.getElementById('waitlist-section').scrollIntoView({ behavior: 'smooth' });
            
            // Immediately show step 2 since we already have name and email
            showNextStep(2);
        });
    }

    // Main feedback form submission
    const feedbackForm = document.getElementById('feedbackForm');
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitButton = e.submitter;
            const originalButtonText = submitButton.textContent;
            submitButton.textContent = 'Submitting...';
            submitButton.disabled = true;

            try {
                // Gather all form data
                const formData = {
                    name: feedbackForm.querySelector('input[name="name"]').value,
                    email: feedbackForm.querySelector('input[name="email"]').value,
                    concerns: Array.from(feedbackForm.querySelectorAll('input[name="concern"]:checked')).map(cb => cb.value),
                    gains: Array.from(feedbackForm.querySelectorAll('input[name="gains"]:checked')).map(cb => cb.value),
                    otherDescription: feedbackForm.querySelector('input[name="concernDescription"]').value,
                    gainsDescription: feedbackForm.querySelector('input[name="gainsDescription"]').value,
                    timestamp: new Date().toISOString()
                };

                console.log('Submitting form data:', formData);

                // Submit the data to the API
                const response = await fetch(config.apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Submission failed');
                }
                
                const responseData = await response.json();
                console.log('Form submission successful:', responseData);
                
                // Show download section
                document.getElementById('form-step-3').style.display = 'none';
                document.getElementById('download-section').style.display = 'block';
                
                // Setup download tracking
                setupDownloadTracking(formData.email);
                
            } catch (err) {
                console.error('Submission error:', err);
                submitButton.textContent = 'Error - Try Again';
                submitButton.disabled = false;
                setTimeout(() => submitButton.textContent = originalButtonText, 2000);
            }
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId !== '#') {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
});

// Function to set up download tracking
function setupDownloadTracking(email) {
    const downloadButtons = document.querySelectorAll('.download-button');
    
    downloadButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Get platform from href
            const platform = this.getAttribute('href').includes('windows') ? 'windows' : 'mac';
            
            // Track the download attempt
            trackDownload(email, platform, 'click');
            
            // Update download URL to include email for server-side tracking
            const downloadUrl = `/download/${platform}?email=${encodeURIComponent(email)}`;
            this.setAttribute('href', downloadUrl);
        });
    });
}

// Function to track downloads
async function trackDownload(email, platform, action) {
    try {
        // Get browser and OS info
        const userAgent = navigator.userAgent;
        const browserInfo = {
            userAgent,
            browser: getBrowserInfo(),
            os: getOSInfo(),
            timestamp: new Date().toISOString()
        };
        
        // Track the download event
        await fetch('/api/track-download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                platform,
                action,
                browserInfo
            })
        });
        
        console.log(`Download ${action} tracked for ${platform}`);
        
    } catch (err) {
        console.error('Error tracking download:', err);
        // Continue with download even if tracking fails
    }
}

// Helper function to get browser info
function getBrowserInfo() {
    const ua = navigator.userAgent;
    let browserName;
    let browserVersion;
    
    if (ua.indexOf("Chrome") > -1) {
        browserName = "Chrome";
        browserVersion = ua.match(/Chrome\/(\d+\.\d+)/)?.[1] || '';
    } else if (ua.indexOf("Safari") > -1) {
        browserName = "Safari";
        browserVersion = ua.match(/Version\/(\d+\.\d+)/)?.[1] || '';
    } else if (ua.indexOf("Firefox") > -1) {
        browserName = "Firefox";
        browserVersion = ua.match(/Firefox\/(\d+\.\d+)/)?.[1] || '';
    } else if (ua.indexOf("MSIE") > -1 || ua.indexOf("Trident") > -1) {
        browserName = "Internet Explorer";
        browserVersion = ua.match(/(?:MSIE |rv:)(\d+\.\d+)/)?.[1] || '';
    } else if (ua.indexOf("Edge") > -1) {
        browserName = "Edge";
        browserVersion = ua.match(/Edge\/(\d+\.\d+)/)?.[1] || '';
    } else {
        browserName = "Unknown";
        browserVersion = "Unknown";
    }
    
    return { name: browserName, version: browserVersion };
}

// Helper function to get OS info
function getOSInfo() {
    const ua = navigator.userAgent;
    let os;
    let version = "Unknown";
    
    if (ua.indexOf("Win") !== -1) {
        os = "Windows";
        if (ua.indexOf("Windows NT 10") !== -1) version = "10";
        else if (ua.indexOf("Windows NT 6.3") !== -1) version = "8.1";
        else if (ua.indexOf("Windows NT 6.2") !== -1) version = "8";
        else if (ua.indexOf("Windows NT 6.1") !== -1) version = "7";
    } else if (ua.indexOf("Mac") !== -1) {
        os = "macOS";
        const match = ua.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
        if (match) version = match[1].replace(/_/g, '.');
    } else if (ua.indexOf("Linux") !== -1) {
        os = "Linux";
    } else if (ua.indexOf("Android") !== -1) {
        os = "Android";
        const match = ua.match(/Android (\d+\.\d+)/);
        if (match) version = match[1];
    } else if (ua.indexOf("like Mac") !== -1) {
        os = "iOS";
        const match = ua.match(/OS (\d+[._]\d+[._]?\d*)/);
        if (match) version = match[1].replace(/_/g, '.');
    } else {
        os = "Unknown";
    }
    
    return { name: os, version: version };
}