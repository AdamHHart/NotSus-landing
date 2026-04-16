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
    const logoUrl = `${BASE_URL}/public/logo.png`;

    const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: [to],
        subject: 'You are one click away from NotSus',
        html: `
            <div style="margin:0;padding:0;background:#f2f6fb;">
                <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
                    Verify your email to unlock your NotSus download and start a safer, more empowering internet experience.
                </div>
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f2f6fb;padding:24px 0;">
                    <tr>
                        <td align="center">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="max-width:640px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6edf5;font-family:Arial,sans-serif;">
                                <tr>
                                    <td style="background:linear-gradient(135deg,#008080 0%,#6A0DAD 100%);padding:28px 28px 24px 28px;color:#ffffff;">
                                        <p style="margin:0 0 8px 0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;opacity:0.9;">NotSus Browser</p>
                                        <h1 style="margin:0;font-size:30px;line-height:1.2;font-weight:800;">Your safer browser is ready.</h1>
                                        <p style="margin:12px 0 0 0;font-size:17px;line-height:1.5;opacity:0.95;">You are one click away from giving your child a more focused, creative internet experience.</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:28px;">
                                        <p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;color:#1c2a39;">
                                            We are excited to have you with us. Verify your email, unlock your download, and start building healthier digital habits at home.
                                        </p>

                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 22px 0;">
                                            <tr>
                                                <td align="center" style="border-radius:10px;background:#FFD700;">
                                                    <a href="${verificationLink}" style="display:inline-block;padding:14px 26px;font-size:16px;font-weight:700;color:#1a1a1a;text-decoration:none;">
                                                        Verify Email & Download
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>

                                        <div style="margin:0 0 20px 0;padding:14px 16px;background:#f7fbff;border:1px solid #d8e9fb;border-radius:10px;">
                                            <p style="margin:0;font-size:14px;line-height:1.5;color:#35516d;">
                                                This secure link expires in <strong>24 hours</strong>.
                                            </p>
                                        </div>

                                        <p style="margin:0 0 8px 0;font-size:14px;line-height:1.6;color:#5b6b7d;">
                                            Button not working? Copy and paste this link:
                                        </p>
                                        <p style="margin:0 0 22px 0;word-break:break-all;">
                                            <a href="${verificationLink}" style="font-size:14px;line-height:1.6;color:#008080;text-decoration:underline;">${verificationLink}</a>
                                        </p>

                                        <hr style="border:none;border-top:1px solid #ebf0f6;margin:0 0 20px 0;" />

                                        <p style="margin:0 0 10px 0;font-size:15px;line-height:1.6;color:#1c2a39;">
                                            We are building NotSus to help families move from passive scrolling to active learning and creativity.
                                        </p>
                                        <p style="margin:0 0 10px 0;font-size:15px;line-height:1.6;color:#1c2a39;">
                                            Questions, ideas, or feedback? Reach us anytime at
                                            <a href="mailto:contact@NotSus.net" style="color:#6A0DAD;font-weight:700;text-decoration:none;">contact@NotSus.net</a>.
                                        </p>
                                        <p style="margin:0;font-size:16px;line-height:1.6;color:#1c2a39;">
                                            <strong>Let's go,</strong>
                                        </p>
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;">
                                            <tr>
                                                <td style="vertical-align:middle;padding-right:10px;">
                                                    <img src="${logoUrl}" alt="NotSus logo" width="18" height="18" style="display:block;border:0;outline:none;text-decoration:none;border-radius:4px;" />
                                                </td>
                                                <td style="vertical-align:middle;font-size:16px;line-height:1.4;color:#1c2a39;font-weight:700;">
                                                    The NotSus Team
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:16px 28px 24px 28px;background:#fafcff;border-top:1px solid #edf2f8;">
                                        <p style="margin:0;font-size:12px;line-height:1.5;color:#7a8794;">
                                            If you did not request this email, you can safely ignore it.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </div>
        `
    });

    if (error) {
        console.error('Resend error:', error);
        throw new Error(error.message || 'Failed to send verification email');
    }
    return data;
}

module.exports = { sendVerificationEmail };
