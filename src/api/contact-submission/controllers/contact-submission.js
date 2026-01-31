"use strict";

const { createCoreController } = require("@strapi/strapi").factories;
const nodemailer = require("nodemailer");

// Email provider configurations
const getProviderConfig = () => {
    const provider = (process.env.EMAIL_PROVIDER || "gmail").toLowerCase();

    switch (provider) {
        case "resend":
            return {
                host: process.env.RESEND_HOST || "smtp.resend.com",
                port: 465,
                secure: true,
                auth: {
                    user: "resend",
                    pass: process.env.RESEND_API_KEY,
                },
            };

        case "sendgrid":
            return {
                host: process.env.SENDGRID_HOST || "smtp.sendgrid.net",
                port: 587,
                secure: false,
                auth: {
                    user: "apikey",
                    pass: process.env.SENDGRID_API_KEY,
                },
            };

        case "mailgun":
            return {
                host: process.env.MAILGUN_SMTP_HOST || "smtp.mailgun.org",
                port: 587,
                secure: false,
                auth: {
                    user: process.env.MAILGUN_SMTP_USER,
                    pass: process.env.MAILGUN_SMTP_PASS,
                },
            };

        case "gmail":
        default:
            return {
                host: process.env.SMTP_HOST || "smtp.gmail.com",
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_SECURE === "true",
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            };
    }
};

// Create reusable transporter
const createTransporter = () => {
    return nodemailer.createTransport(getProviderConfig());
};

module.exports = createCoreController(
    "api::contact-submission.contact-submission",
    ({ strapi }) => ({
        async create(ctx) {
            // Honeypot check - if 'website' field is filled, silently reject
            // Bots often fill hidden fields; legitimate users won't see them
            const { website } = ctx.request.body.data || {};
            if (website) {
                strapi.log.warn("Honeypot triggered - spam submission blocked");
                // Return fake success to not alert the bot
                return { data: { id: 0 } };
            }

            // Create the contact submission entry
            const response = await super.create(ctx);

            // Get the submitted data
            const { firstName, lastName, email, phone, preferredReading, referral, message } = ctx.request.body.data;
            const fullName = `${firstName} ${lastName}`;

            // Send email notification (fire-and-forget, don't block response)
            const transporter = createTransporter();
            const provider = (process.env.EMAIL_PROVIDER || "gmail").toLowerCase();

            const fromEmail = provider === "resend" ? process.env.RESEND_EMAIL_FROM : process.env.EMAIL_FROM || process.env.SMTP_USER;

            transporter.sendMail({
                from: fromEmail,
                to: process.env.CONTACT_EMAIL,
                replyTo: email,
                subject: `New Contact Form Submission from ${fullName}`,
                html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${fullName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
          <p><strong>Preferred Reading:</strong> ${preferredReading}</p>
          <p><strong>Referral:</strong> ${referral || "Not provided"}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        `,
                text: `
New Contact Form Submission

Name: ${fullName}
Email: ${email}
Phone: ${phone || "Not provided"}
Preferred Reading: ${preferredReading}
Referral: ${referral || "Not provided"}
Message: ${message}
        `.trim(),
            }).then(() => {
                strapi.log.info(`Contact form email sent via ${process.env.EMAIL_PROVIDER || "gmail"} for submission from ${email}`);
            }).catch((err) => {
                strapi.log.error("Failed to send contact form email:", err);
            });

            return response;
        },
    })
);
