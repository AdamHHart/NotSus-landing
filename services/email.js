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
            <p>Thank you for protecting your kid from online garbage!</p>
            <p>They will now have to actively decide what to do with their computer.</p>
            <p>Click the link below to verify your email and get your download:</p>
            <p><a href="${verificationLink}" style="color: #008080; font-weight: bold;">${verificationLink}</a></p>
            <p>This link expires in 24 hours.</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 24px 0;" />
            <p>We're fighting to rescue kids from the attention economy. If you have any questions, requests, or want to help, reach us directly at <a href="mailto:contact@NotSus.net" style="color: #6A0DAD;">contact@NotSus.net</a></p>
            <p>We wish you and your family a life of curiosity, creativity, and control of your own mind.</p>
            <p><strong>Let's go!</strong><br/>The 🧐NotSus Team</p>
            <p style="font-size: 12px; color: #999;">If you didn't request this, you can safely ignore this email.</p>
        `
    });

    if (error) {
        console.error('Resend error:', error);
        throw new Error(error.message || 'Failed to send verification email');
    }
    return data;
}

module.exports = { sendVerificationEmail };
