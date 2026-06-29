"use strict";

const { createCoreController } = require("@strapi/strapi").factories;
const { sendEmail } = require("../../../utils/email");

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

            // Turnstile verification (skip in development mode)
            if (process.env.NODE_ENV === 'development') {
                strapi.log.info("Turnstile verification skipped in development mode");
            } else if (process.env.TURNSTILE_SECRET_KEY) {
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
            };

            // Send email notification (fire-and-forget, don't block response).
            // Provider selection (resend / gmail / sendgrid / mailgun) lives in src/utils/email.js.
            const provider = (process.env.EMAIL_PROVIDER || "gmail").toLowerCase();
            sendEmail(emailData)
                .then(() => {
                    strapi.log.info(`Contact form email sent via ${provider} for submission from ${email}`);
                })
                .catch((err) => {
                    strapi.log.error(`Failed to send contact form email via ${provider}:`, err);
                });

            return response;
        },
    })
);
