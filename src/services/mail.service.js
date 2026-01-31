import nodemailer from 'nodemailer';
import { templates } from './emailTemplates.js';
import chalk from 'chalk';

// Transport configuration
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use STARTTLS
    auth: {
        user: process.env.MAIL_ADDRESS,
        pass: process.env.MAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false
    }
});

/**
 * Core Send Email Function
 */
export const sendEmail = async ({ to, subject, html, attachments = [] }) => {
    return new Promise((resolve, reject) => {
        const mailOptions = {
            from: process.env.MAIL_ADDRESS,
            to,
            subject,
            html,
            attachments
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error(chalk.red('Error sending email:'), error);
                resolve(null);
            } else {
                if (process.env.NODE_ENV === 'development') {
                    console.log(chalk.green(`Email sent: ${subject} to ${to}`));
                }
                resolve(info.response);
            }
        });
    });
};

/**
 * Export specialized mailers
 */
export const mailer = {
    sendWelcome: async (user) => {
        try {
            // PDF Generation Removed as per requirement
            return await sendEmail({
                to: user.email,
                subject: 'Welcome to SarvaSolution - Your Membership Details',
                html: templates.welcome(user.fullName, user.memberId)
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
    },

    payoutProcessed: async (user, amount, type) => {
        return await sendEmail({
            to: user.email,
            subject: 'Payout Processed Successfully',
            html: templates.payoutProcessed(user.fullName, amount, type)
        });
    }
};
