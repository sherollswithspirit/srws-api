"use strict";

const { createCoreController } = require("@strapi/strapi").factories;
const nodemailer = require("nodemailer");

// Email provider configurations (for SMTP-based providers)
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

// Send email via Resend HTTP API (more reliable than SMTP in cloud environments)
const sendViaResend = async (emailData, strapi) => {
    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: process.env.RESEND_EMAIL_FROM,
            to: [process.env.CONTACT_EMAIL],
            reply_to: emailData.replyTo,
            subject: emailData.subject,
            html: emailData.html,
            text: emailData.text,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Resend API error: ${JSON.stringify(errorData)}`);
    }

    return response.json();
};

// Send email via SMTP (for Gmail, SendGrid, Mailgun)
const sendViaSMTP = async (emailData, strapi) => {
    const transporter = nodemailer.createTransport(getProviderConfig());
    const provider = (process.env.EMAIL_PROVIDER || "gmail").toLowerCase();
    const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER;

    return transporter.sendMail({
        from: fromEmail,
        to: process.env.CONTACT_EMAIL,
        replyTo: emailData.replyTo,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
    });
};

module.exports = createCoreController(
    "api::contact-submission.contact-submission",
    ({ strapi }) => ({
        async create(ctx) {
            // Honeypot check - if 'website' field is filled, silently reject
            // Bots often fill hidden fields; legitimate users won't see them
            const { website, turnstileToken, ...formData } = ctx.request.body.data || {};
            if (website) {
                strapi.log.warn("Honeypot triggered - spam submission blocked");
                // Return fake success to not alert the bot
                return { data: { id: 0 } };
            }

            // Turnstile verification
            if (process.env.TURNSTILE_SECRET_KEY) {
                if (!turnstileToken) {
                    ctx.status = 400;
                    return { error: { message: "Turnstile verification required" } };
                }

                const turnstileResponse = await fetch(
                    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        body: new URLSearchParams({
                            secret: process.env.TURNSTILE_SECRET_KEY,
                            response: turnstileToken,
                        }),
                    }
                );

                const turnstileResult = await turnstileResponse.json();
                if (!turnstileResult.success) {
                    strapi.log.warn("Turnstile verification failed:", turnstileResult);
                    ctx.status = 400;
                    return { error: { message: "Verification failed. Please try again." } };
                }
            }

            // Update request body without turnstile token
            ctx.request.body.data = formData;

            // Create the contact submission entry
            const response = await super.create(ctx);

            // Get the submitted data
            const { firstName, lastName, email, phone, preferredReading, referral, message } = formData;
            const fullName = `${firstName} ${lastName}`;

            // Prepare email data
            const emailData = {
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
            };

            // Send email notification (fire-and-forget, don't block response)
            const provider = (process.env.EMAIL_PROVIDER || "gmail").toLowerCase();

            if (provider === "resend") {
                // Use Resend HTTP API (avoids SMTP port blocking on cloud platforms)
                sendViaResend(emailData, strapi)
                    .then(() => {
                        strapi.log.info(`Contact form email sent via Resend API for submission from ${email}`);
                    })
                    .catch((err) => {
                        strapi.log.error("Failed to send contact form email via Resend:", err);
                    });
            } else {
                // Use SMTP for other providers
                sendViaSMTP(emailData, strapi)
                    .then(() => {
                        strapi.log.info(`Contact form email sent via ${provider} SMTP for submission from ${email}`);
                    })
                    .catch((err) => {
                        strapi.log.error("Failed to send contact form email via SMTP:", err);
                    });
            }

            return response;
        },
    })
);
