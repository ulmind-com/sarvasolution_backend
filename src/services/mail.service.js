import { Resend } from 'resend';
import PDFDocument from 'pdfkit';
import { templates } from './emailTemplates.js';
import chalk from 'chalk';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY || 're_cfPgNNhA_7LvcpjJGroaTn7NE2YKvarNX');

/**
 * Generate a Welcome PDF as a Buffer
 */
export const generateWelcomePDF = async (user) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // PDF Content
        doc.fillColor('#1a237e').fontSize(30).text('SarvaSolution', { align: 'center' });
        doc.moveDown();
        doc.fillColor('#333333').fontSize(20).text('Welcome Letter', { align: 'center', underline: true });
        doc.moveDown(2);

        doc.fontSize(14).text(`Date: ${new Date().toLocaleDateString()}`);
        doc.moveDown();
        doc.fontSize(16).text(`Dear ${user.fullName},`, { bold: true });
        doc.moveDown();
        doc.fontSize(12).text(
            'Welcome to SarvaSolution! We are delighted to officially welcome you into our community of digital entrepreneurs and networkers.'
        );
        doc.moveDown();
        doc.text(
            'At SarvaSolution, we believe in empowering individuals with the tools and network needed to achieve financial freedom and professional growth.'
        );
        doc.moveDown(2);

        // Membership Box
        doc.rect(50, doc.y, 500, 100).stroke();
        const startY = doc.y + 20;
        doc.fontSize(14).text('MEMBERSHIP DETAILS', 70, startY, { bold: true });
        doc.fontSize(12).text(`Member ID: ${user.memberId}`, 70, startY + 25);
        doc.text(`Joining Date: ${new Date().toLocaleDateString()}`, 70, startY + 45);
        doc.text(`Package Alpha: ${user.joiningPackage || 500} BV`, 70, startY + 65);

        doc.moveDown(6);
        doc.fontSize(12).text('Sincerely,', 50);
        doc.moveDown();
        doc.fontSize(14).text('Management Team', { bold: true });
        doc.text('SarvaSolution Digital Services');

        doc.end();
    });
};

/**
 * Core Send Email Function (Callback Wrapped in Promise)
 */
/**
 * Core Send Email Function (Using Resend)
 */
export const sendEmail = async ({ to, subject, html, attachments = [] }) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'SarvaSolution <onboarding@resend.dev>', // Use verified domain or default test domain
            to: [to],
            subject: subject,
            html: html,
            attachments: attachments.map(att => ({
                filename: att.filename,
                content: att.content // Resend accepts Buffer
            }))
        });

        if (error) {
            console.error(chalk.red('Resend Error:'), error);
            return null;
        }

        if (process.env.NODE_ENV === 'development') {
            console.log(chalk.green(`Email sent via Resend: ${subject} to ${to}`));
        }
        return data;
    } catch (err) {
        console.error(chalk.red('Unexpected Mail Error:'), err);
        return null;
    }
};

/**
 * Export specialized mailers
 */
export const mailer = {
    sendWelcome: async (user) => {
        try {
            const pdfBuffer = await generateWelcomePDF(user);
            return await sendEmail({
                to: user.email,
                subject: 'Welcome to SarvaSolution - Your Membership Details',
                html: templates.welcome(user.fullName, user.memberId),
                attachments: [
                    {
                        filename: `Welcome_Letter_${user.memberId}.pdf`,
                        content: pdfBuffer
                    }
                ]
            });
        } catch (e) {
            console.error('Welcome Mailer Error:', e);
        }
    },

    sendUpdateNotification: async (user, fields) => {
        return await sendEmail({
            to: user.email,
            subject: 'Security Alert: Your Profile Was Updated',
            html: templates.profileUpdate(user.fullName, fields)
        });
    },

    sendKYCSubmission: async (user) => {
        return await sendEmail({
            to: user.email,
            subject: 'KYC Documents Received',
            html: templates.kycSubmitted(user.fullName)
        });
    },

    sendKYCStatusUpdate: async (user, status, reason) => {
        return await sendEmail({
            to: user.email,
            subject: `KYC Verification Update: ${status.toUpperCase()}`,
            html: templates.kycStatus(user.fullName, status, reason)
        });
    }
};
