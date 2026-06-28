"use strict";

/**
 * Shared email sender.
 *
 * Extracted so features beyond the contact form can send mail through the same
 * provider-pluggable path. Unlike the original contact-submission code, the
 * recipient (`to`) is a parameter — the contact form always mails the owner, but
 * the testimonial-request flow mails the customer.
 *
 * Provider is selected by EMAIL_PROVIDER:
 *   - "resend"  -> Resend HTTP API (port 443; the working path on Railway).
 *   - otherwise -> nodemailer SMTP (gmail / sendgrid / mailgun).
 */

const nodemailer = require("nodemailer");

// SMTP provider configurations (mirrors contact-submission.js)
const getProviderConfig = () => {
    const provider = (process.env.EMAIL_PROVIDER || "gmail").toLowerCase();

    switch (provider) {
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

const sendViaResend = async ({ to, from, replyTo, subject, html, text }) => {
    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from,
            to: Array.isArray(to) ? to : [to],
            reply_to: replyTo,
            subject,
            html,
            text,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    return response.json();
};

const sendViaSMTP = async ({ to, from, replyTo, subject, html, text }) => {
    const transporter = nodemailer.createTransport(getProviderConfig());
    return transporter.sendMail({ from, to, replyTo, subject, html, text });
};

/**
 * Send an email through the configured provider.
 *
 * @param {Object} opts
 * @param {string|string[]} opts.to       Recipient(s).
 * @param {string} [opts.from]            Sender; defaults to RESEND_EMAIL_FROM / SMTP_USER.
 * @param {string} [opts.replyTo]         Reply-To address.
 * @param {string} opts.subject
 * @param {string} opts.html
 * @param {string} opts.text
 */
const sendEmail = async ({ to, from, replyTo, subject, html, text }) => {
    const provider = (process.env.EMAIL_PROVIDER || "gmail").toLowerCase();
    const fromAddr =
        from ||
        (provider === "resend"
            ? process.env.RESEND_EMAIL_FROM
            : process.env.EMAIL_FROM || process.env.SMTP_USER);

    const payload = { to, from: fromAddr, replyTo, subject, html, text };
    return provider === "resend" ? sendViaResend(payload) : sendViaSMTP(payload);
};

module.exports = { sendEmail };
