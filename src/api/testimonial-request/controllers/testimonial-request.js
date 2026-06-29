"use strict";

/**
 * testimonial-request controller
 *
 * Public form flow:
 *   - validate(GET /testimonial-requests/validate/:token): is the link still usable?
 *   - submit  (POST /testimonial-requests/submit): create a DRAFT testimonial, burn the
 *     token (single-use), and best-effort register the customer as a user account.
 */

const { createCoreController } = require("@strapi/strapi").factories;
const { ensureUserAccount } = require("../../../utils/customer-user");

const UID = "api::testimonial-request.testimonial-request";
const TESTIMONIAL_UID = "api::testimonial.testimonial";

// Convert submitted plaintext -> Strapi "blocks" (paragraphs). No `code` marks and no raw
// HTML, so RichTextBlock will never v-html it — this is the XSS containment for what is now
// user-submitted content.
const toBlocks = (text) =>
    String(text)
        .trim()
        .split(/\n{2,}/)
        .map((p) => ({
            type: "paragraph",
            children: [{ type: "text", text: p.replace(/\n/g, " ").trim() }],
        }));

const isUsable = (req) =>
    !!req && req.requestStatus === "pending" && new Date(req.expiresAt) > new Date();

const verifyTurnstile = async (token) => {
    if (process.env.NODE_ENV === "development" || !process.env.TURNSTILE_SECRET_KEY) {
        return true;
    }
    if (!token) return false;

    const res = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                secret: process.env.TURNSTILE_SECRET_KEY,
                response: token,
            }),
        }
    );
    const result = await res.json();
    return result.success === true;
};

module.exports = createCoreController(UID, ({ strapi }) => ({
    // GET /api/testimonial-requests/validate/:token  ->  { valid, name }
    async validate(ctx) {
        const req = await strapi
            .documents(UID)
            .findFirst({ filters: { token: ctx.params.token } });

        if (!isUsable(req)) {
            ctx.status = 410; // Gone
            return { valid: false };
        }
        return { valid: true, name: req.recipientName };
    },

    // POST /api/testimonial-requests/submit
    // body.data: { token, name, location, title, quote, website, turnstileToken }
    async submit(ctx) {
        const { token, name, location, title, quote, website, turnstileToken } =
            ctx.request.body.data || {};

        // Honeypot — pretend success without doing anything.
        if (website) return { data: { ok: true } };

        if (!quote || String(quote).trim().length === 0 || String(quote).length > 5000) {
            ctx.status = 400;
            return { error: { message: "Please share a few words." } };
        }

        if (!(await verifyTurnstile(turnstileToken))) {
            ctx.status = 400;
            return { error: { message: "Verification failed. Please try again." } };
        }

        const req = await strapi.documents(UID).findFirst({ filters: { token } });
        if (!isUsable(req)) {
            ctx.status = 410;
            return { error: { message: "This link is no longer valid." } };
        }

        // Create a DRAFT testimonial. In Strapi 5, documents().create() without .publish()
        // leaves publishedAt null -> unpublished -> excluded from the public /testimonials API.
        const testimonial = await strapi.documents(TESTIMONIAL_UID).create({
            data: {
                Name: String(name || req.recipientName).slice(0, 120),
                Location: String(location || "").slice(0, 120),
                Title: String(title || "").slice(0, 160),
                Quote: toBlocks(quote),
            },
        });

        // Single-use: flip to completed + link the testimonial. The isUsable() check above
        // guards against replay / double-submit.
        // NOTE: relation set via the explicit `connect` form. If the request↔testimonial
        // link shows empty in admin, the documents-API shorthand differs by version — try
        // `testimonial: testimonial.documentId` or `{ set: [testimonial.documentId] }`.
        await strapi.documents(UID).update({
            documentId: req.documentId,
            data: {
                requestStatus: "completed",
                usedAt: new Date().toISOString(),
                testimonial: { connect: [testimonial.documentId] },
            },
        });

        // Best-effort: register the customer as a user account (customer list). Uses the
        // trusted invite address from the token record — never the form — and must never
        // fail the submission.
        try {
            await ensureUserAccount(strapi, req.recipientEmail, req.recipientName);
        } catch (err) {
            strapi.log.error("Failed to auto-create user for testimonial submitter:", err);
        }

        return { data: { ok: true } };
    },
}));
