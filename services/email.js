// services/email.js
// Sends transactional email via Resend (https://resend.com).
// Requires env: RESEND_API_KEY, and optionally FROM_EMAIL (e.g. onboarding@notsus.net).

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const BASE_URL = process.env.BASE_URL || 'https://www.notsus.net';

/**
 * Send the verification email with a link to verify and get the download.
 * @param {string} to - Recipient email
 * @param {string} verificationToken - Token to put in the verification URL
 */
async function sendVerificationEmail(to, verificationToken) {
    const verificationLink = `${BASE_URL}/verify-email?token=${encodeURIComponent(verificationToken)}`;

    const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject: 'Verify your email to download NotSus Browser',
        html: `
            <p>Thanks for your interest in NotSus Browser.</p>
            <p>Click the link below to verify your email and get your download:</p>
            <p><a href="${verificationLink}" style="color: #008080;">${verificationLink}</a></p>
            <p>This link expires in 24 hours.</p>
            <p>If you didn't request this, you can ignore this email.</p>
            <p>— The NotSus team</p>
        `
    });

    if (error) {
        console.error('Resend error:', error);
        throw new Error(error.message || 'Failed to send verification email');
    }
    return data;
}

module.exports = { sendVerificationEmail };
