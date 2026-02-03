import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = 'SSVPL Franchise <onboarding@resend.dev>'; // Using resend.dev for testing, should be updated to verified domain

/**
 * Generate Welcome Email HTML
 */
const welcomeTemplate = (data) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
        .header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; }
        .credentials { background-color: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #777; }
        .button { background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to SSVPL Franchise Network</h1>
        </div>
        <div class="content">
            <p>Dear <strong>${data.name}</strong>,</p>
            <p>We are thrilled to welcome you as an official franchise partner!</p>
            <p>Your shop, <strong>${data.shopName}</strong>, has been successfully registered in our system.</p>
            
            <div class="credentials">
                <h3>🔐 Your Login Credentials</h3>
                <p><strong>Vendor ID:</strong> ${data.vendorId}</p>
                <p><strong>Email:</strong> ${data.email}</p>
                <p><strong>Password:</strong> ${data.password}</p>
            </div>

            <p><em>Please login immediately and change your password for security.</em></p>

            <p style="text-align: center;">
                <a href="${process.env.FRANCHISE_LOGIN_URL || '#'}" class="button">Login to Dashboard</a>
            </p>

            <p><strong>Shop Details:</strong><br>
            ${data.shopAddress.street}, ${data.city}, ${data.shopAddress.state} - ${data.shopAddress.pincode}</p>
        </div>
        <div class="footer">
            <p>For support, contact: ${process.env.SUPPORT_EMAIL || 'support@ssvpl.com'}</p>
            <p>&copy; ${new Date().getFullYear()} SSVPL. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

/**
 * Generate Block/Unblock HTML
 */
const statusTemplate = (data, type) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; }
        .alert { padding: 15px; margin: 20px 0; border-radius: 5px; color: white; }
        .blocked { background-color: #dc3545; }
        .active { background-color: #28a745; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Your Account Status Update</h2>
        <p>Dear ${data.name} (${data.vendorId}),</p>
        
        ${type === 'blocked' ? `
            <div class="alert blocked">
                <strong>⚠️ Account Suspended</strong><br>
                Your franchise account has been temporarily blocked.
            </div>
            <p><strong>Reason:</strong> ${data.reason}</p>
            <p>Please contact support immediately.</p>
        ` : `
            <div class="alert active">
                <strong>✅ Account Restored</strong><br>
                Your franchise account has been unblocked and is fully active.
            </div>
            <p>You can now resume your operations.</p>
        `}
        
        <p>Best Regards,<br>SSVPL Admin Team</p>
    </div>
</body>
</html>
`;

export const sendWelcomeEmail = async (franchiseData) => {
    if (!process.env.RESEND_API_KEY) {
        console.warn('⚠️ RESEND_API_KEY missing. Skipping email.');
        return false;
    }
    try {
        const { error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [franchiseData.email],
            subject: 'Welcome to SSVPL Franchise Network - Your Credentials',
            html: welcomeTemplate(franchiseData)
        });
        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Email Send Error:', err.message);
        return false;
    }
};

export const sendStatusEmail = async (franchiseData, type, reason = '') => {
    if (!process.env.RESEND_API_KEY) return false;
    try {
        const { error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: [franchiseData.email],
            subject: `Important: Account ${type === 'blocked' ? 'Suspended' : 'Restored'}`,
            html: statusTemplate({ ...franchiseData, reason }, type)
        });
        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Status Email Error:', err.message);
        return false;
    }
};
