// scripts.js

const config = {
    apiUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000/api/feedback'
        : 'https://www.notsus.net/api/feedback',
    downloadUrls: {
        windows: 'https://notsus.net/NotSus%20Browser.exe',
        mac: 'https://notsus.net/NotSus_Browser-1.0.0-arm64.dmg'
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.feedback-form');

    if (!form) {
        console.error('Form not found');
        return;
    }

    // Handle form transitions
    window.showNextStep = (step) => {
        document.querySelectorAll('[id^="form-step-"]').forEach(el => el.style.display = 'none');
        document.getElementById(`form-step-${step}`).style.display = 'block';
    };

    // Track successful form submission
    let formSubmitted = false;
    
    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = e.submitter;
        const originalButtonText = submitButton.textContent;
        submitButton.textContent = 'Submitting...';

        try {
            // Gather all form data properly
            const formData = {
                name: form.querySelector('input[name="name"]').value,
                email: form.querySelector('input[name="email"]').value,
                concerns: Array.from(form.querySelectorAll('input[name="concern"]:checked')).map(cb => cb.value),
                gains: Array.from(form.querySelectorAll('input[name="gains"]:checked')).map(cb => cb.value),
                otherDescription: form.querySelector('input[name="concernDescription"]').value,
                gainsDescription: form.querySelector('input[name="gainsDescription"]').value,
                timestamp: new Date().toISOString()
            };

            console.log('Submitting form data:', formData);

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
            
            // Mark form as successfully submitted
            formSubmitted = true;
            
            // Hide the form step and show download section
            document.getElementById('form-step-3').style.display = 'none';
            document.getElementById('download-section').style.display = 'block';
            
            // Setup download tracking
            setupDownloadTracking(formData.email);
            
        } catch (err) {
            console.error('Submission error:', err);
            submitButton.textContent = 'Error - Try Again';
            setTimeout(() => submitButton.textContent = originalButtonText, 2000);
        }
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
            browserVersion = ua.match(/Chrome\/(\d+\.\d+)/)[1];
        } else if (ua.indexOf("Safari") > -1) {
            browserName = "Safari";
            browserVersion = ua.match(/Version\/(\d+\.\d+)/)[1];
        } else if (ua.indexOf("Firefox") > -1) {
            browserName = "Firefox";
            browserVersion = ua.match(/Firefox\/(\d+\.\d+)/)[1];
        } else if (ua.indexOf("MSIE") > -1 || ua.indexOf("Trident") > -1) {
            browserName = "Internet Explorer";
            browserVersion = ua.match(/(?:MSIE |rv:)(\d+\.\d+)/)[1];
        } else if (ua.indexOf("Edge") > -1) {
            browserName = "Edge";
            browserVersion = ua.match(/Edge\/(\d+\.\d+)/)[1];
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
});