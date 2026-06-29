"use strict";

/**
 * testimonial-request lifecycles
 *
 * beforeCreate: generate the single-use token + expiry (so the owner only ever fills
 *               in recipientName + recipientEmail in the admin).
 * afterCreate:  email the customer their private link. Fire-and-forget — a mail failure
 *               must NOT throw, or the admin "Save" would error after the row is saved.
 */

const crypto = require("crypto");
const { sendEmail } = require("../../../../utils/email");

const EXPIRY_DAYS = Number(process.env.TESTIMONIAL_LINK_EXPIRY_DAYS) || 30;
const SITE_URL = process.env.SITE_URL || "https://sherollswithspirit.com";

const escapeHtml = (value) =>
    String(value || "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    }[c]));

module.exports = {
    async beforeCreate(event) {
        const { data } = event.params;
        if (!data.token) data.token = crypto.randomBytes(32).toString("hex"); // 256-bit, unguessable
        if (!data.requestStatus) data.requestStatus = "pending";
        if (!data.expiresAt) {
            data.expiresAt = new Date(Date.now() + EXPIRY_DAYS * 864e5).toISOString();
        }
        if (!data.sentAt) data.sentAt = new Date().toISOString();
    },

    async afterCreate(event) {
        const { recipientName, recipientEmail, token } = event.result;
        const link = `${SITE_URL}/share-your-story/${token}`;
        const safeName = escapeHtml(recipientName);

        const subject = "Would you share your experience with She Rolls with Spirit?";
        const html = `
            <p>Hi ${safeName},</p>
            <p>Thank you for trusting me on your journey. If you have a moment, I'd be
               honored if you'd share a few words about your experience.</p>
            <p><a href="${link}">Share your story here</a></p>
            <p>This is a private, single-use link just for you — it expires in
               ${EXPIRY_DAYS} days.</p>
            <p>With gratitude,<br/>She Rolls with Spirit</p>
        `;
        const text = `Hi ${recipientName},

Thank you for trusting me on your journey. If you have a moment, I'd be honored if
you'd share a few words about your experience.

Share your story here: ${link}

This is a private, single-use link just for you — it expires in ${EXPIRY_DAYS} days.

With gratitude,
She Rolls with Spirit`;

        sendEmail({
            to: recipientEmail,
            from: process.env.RESEND_EMAIL_FROM,
            replyTo: process.env.CONTACT_EMAIL,
            subject,
            html,
            text,
        })
            .then(() => {
                strapi.log.info(`Testimonial request emailed to ${recipientEmail}`);
            })
            .catch((err) => {
                strapi.log.error("Failed to send testimonial request email:", err);
            });
    },
};
