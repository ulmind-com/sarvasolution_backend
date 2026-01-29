/**
 * Modern, Professional HTML Email Templates
 */

const baseStyle = `
    background-color: #f4f7f9;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    padding: 40px 0;
    margin: 0;
`;

const containerStyle = `
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 15px rgba(0,0,0,0.05);
`;

const headerStyle = `
    background: linear-gradient(135deg, #1a237e 0%, #0d47a1 100%);
    color: #ffffff;
    padding: 30px;
    text-align: center;
`;

const bodyStyle = `
    padding: 40px 30px;
    color: #455a64;
    line-height: 1.6;
`;

const footerStyle = `
    padding: 20px;
    text-align: center;
    background-color: #f8f9fa;
    color: #90a4ae;
    font-size: 13px;
`;

const buttonStyle = `
    display: inline-block;
    padding: 12px 30px;
    background-color: #1a237e;
    color: #ffffff;
    text-decoration: none;
    border-radius: 6px;
    font-weight: bold;
    margin-top: 20px;
`;

const layout = (title, content) => `
    <div style="${baseStyle}">
        <div style="${containerStyle}">
            <div style="${headerStyle}">
                <h1 style="margin: 0; font-size: 24px;">SarvaSolution</h1>
                <p style="margin: 5px 0 0; opacity: 0.8;">${title}</p>
            </div>
            <div style="${bodyStyle}">
                ${content}
            </div>
            <div style="${footerStyle}">
                <p>Digital Financial Services Reinvented</p>
                <p style="margin: 5px 0 0;">&copy; 2026 SarvaSolution. All rights reserved.</p>
            </div>
        </div>
    </div>
`;

export const templates = {
    welcome: (name, memberId) => layout('Welcome to the Family!', `
        <h2 style="color: #1a237e; margin-top: 0;">Hello, ${name}!</h2>
        <p>Congratulations on joining SarvaSolution! We are thrilled to have you as part of our growing network of digital entrepreneurs.</p>
        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <p style="margin: 0; font-weight: bold; color: #0d47a1;">Your Member ID:</p>
            <p style="margin: 5px 0 0; font-size: 20px; color: #1a237e;">${memberId}</p>
        </div>
        <p>Attached to this email, you will find your official Welcome Letter and Membership Certificate. Please keep these for your records.</p>
        <p>Log in now to complete your profile and start your journey:</p>
        <a href="https://sarvasolution.com/login" style="${buttonStyle}">Access Your Dashboard</a>
    `),

    profileUpdate: (name, updatedFields) => layout('Profile Updated', `
        <h2 style="color: #1a237e; margin-top: 0;">Hello, ${name}</h2>
        <p>This is to inform you that your profile has been successfully updated. Security and transparency are our priorities.</p>
        <p>The following fields were modified:</p>
        <ul style="padding-left: 20px;">
            ${updatedFields.map(field => `<li style="margin-bottom: 5px; font-weight: bold;">${field}</li>`).join('')}
        </ul>
        <p>If you did not authorize these changes, please contact our support team immediately.</p>
    `),

    kycSubmitted: (name) => layout('KYC Documents Received', `
        <h2 style="color: #1a237e; margin-top: 0;">KYC Submission Successful</h2>
        <p>Dear ${name}, we have received your KYC documents (Aadhaar, PAN, and Bank Details).</p>
        <p>Our team is currently reviewing your application. This process typically takes **24-48 hours**.</p>
        <p>You will receive another email once the verification is complete.</p>
    `),

    kycStatus: (name, status, reason = '') => {
        const isVerified = status === 'verified';
        const color = isVerified ? '#2e7d32' : '#c62828';
        const title = isVerified ? 'KYC Verified Successfully' : 'KYC Document Rejected';

        return layout('KYC Verification Update', `
            <h2 style="color: ${color}; margin-top: 0;">${title}</h2>
            <p>Dear ${name},</p>
            <p>The verification process for your submitted documents has been completed.</p>
            <div style="border-left: 4px solid ${color}; padding: 15px 20px; background-color: ${isVerified ? '#f1f8e9' : '#ffebee'}; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold;">Status: <span style="text-transform: uppercase;">${status}</span></p>
                ${!isVerified && reason ? `<p style="margin: 10px 0 0; font-size: 14px;">Reason: ${reason}</p>` : ''}
            </div>
            ${isVerified
                ? '<p>Your account is now fully active. You can now enjoy all premium features and payouts.</p>'
                : '<p>Please log in to your dashboard, review the rejection reason, and resubmit correct documents.</p>'}
            <a href="https://sarvasolution.com/dashboard" style="${buttonStyle}">Go to Dashboard</a>
        `);
    }
};
