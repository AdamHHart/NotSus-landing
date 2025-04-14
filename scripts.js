// scripts.js

const config = {
    apiUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000/api/feedback'
        : 'https://www.notsus.net/api/feedback'
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

    // Handle form submission
    form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = e.submitter;
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = 'Submitting...';

    try {
        const formData = {
            name: form.querySelector('input[name="name"]').value,
            email: form.querySelector('input[name="email"]').value,
            concerns: Array.from(form.querySelectorAll('input[name="concern"]:checked')).map(cb => cb.value),
            gains: Array.from(form.querySelectorAll('input[name="gains"]:checked')).map(cb => cb.value),
            concernDescription: form.querySelector('input[name="concernDescription"]').value,
            gainsDescription: form.querySelector('input[name="gainsDescription"]').value,
            timestamp: new Date().toISOString()
        };

        const response = await fetch(config.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Submission failed');
        
        // Hide the form step and show download section
        document.getElementById('form-step-3').style.display = 'none';
        document.getElementById('download-section').style.display = 'block';
        
    } catch (err) {
        console.error('Submission error:', err);
        submitButton.textContent = 'Error - Try Again';
        setTimeout(() => submitButton.textContent = originalButtonText, 2000);
    }
});
});
