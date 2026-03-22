import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

/**
 * emailService.js
 * Centralized service for sending emails via Nodemailer.
 */

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Sends a welcome email to a newly created user with their credentials.
 * @param {Object} userData - { email, firstName, password, role }
 */
export const sendWelcomeEmail = async (userData) => {
    const { email, firstName, password, role } = userData;

    const mailOptions = {
        from: `"Maruti Furniture" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Welcome to Maruti Furniture - Your Account Credentials',
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">Welcome to the Team, ${firstName}!</h2>
                <p>Hello ${firstName},</p>
                <p>Your account at <strong>Maruti Furniture</strong> has been successfully created. You can now log in to the management system using the following credentials:</p>
                
                <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px left solid #4f46e5;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280;">Email Address:</p>
                    <p style="margin: 5px 0 15px 0; font-weight: bold; font-size: 16px;">${email}</p>
                    
                    <p style="margin: 0; font-size: 14px; color: #6b7280;">Temporary Password:</p>
                    <p style="margin: 5px 0 0 0; font-weight: bold; font-size: 16px; color: #4f46e5;">${password}</p>
                </div>

                <p style="font-size: 14px; color: #ef4444;"><strong>Important:</strong> Please log in and change your password as soon as possible for security purposes.</p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #9ca3af; text-align: center;">
                    <p>This is an automated message, please do not reply.</p>
                    <p>&copy; ${new Date().getFullYear()} Maruti Furniture. All rights reserved.</p>
                </div>
            </div>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('[EmailService] Welcome email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('[EmailService] Failed to send welcome email:', error);
        return { success: false, error: error.message };
    }
};
