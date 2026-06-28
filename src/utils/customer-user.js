"use strict";

/**
 * Auto-create a customer "user" account (users-permissions plugin).
 *
 * Used when a customer submits a testimonial, so the owner accumulates a roster of
 * past customers in Strapi's Users collection. This is a customer-list record only:
 * no password email is sent and the site has no login UI. The account is created with
 * a random, unknowable password (so it can't be logged into until a real account flow
 * exists) and is only ever called from a flow gated by an owner-issued single-use
 * token — never an open registration path.
 */

const crypto = require("crypto");

const USER_UID = "plugin::users-permissions.user";
const ROLE_UID = "plugin::users-permissions.role";

/**
 * Idempotent: returns the existing user if the email is already registered, else
 * creates one. Best-effort — callers must wrap this in try/catch and never let it
 * fail the testimonial submission.
 *
 * @param {object} strapi  The Strapi instance.
 * @param {string} email   The trusted invite email (from the token record).
 * @param {string} [name]  The recipient's name (reserved for future profile use).
 * @returns {Promise<object|null>} The existing or newly created user, or null.
 */
async function ensureUserAccount(strapi, email /* , name */) {
    const normalized = String(email || "").toLowerCase().trim();
    if (!normalized) return null;

    // Skip duplicates (e.g. a repeat customer with a second testimonial).
    const existing = await strapi.db
        .query(USER_UID)
        .findOne({ where: { email: normalized } });
    if (existing) return existing;

    const role = await strapi.db
        .query(ROLE_UID)
        .findOne({ where: { type: "authenticated" } });

    // username is required + unique; derive from the email, add a short suffix on collision.
    const base = (normalized.split("@")[0] || "customer").slice(0, 40);
    let username = base;
    const clash = await strapi.db
        .query(USER_UID)
        .findOne({ where: { username } });
    if (clash) username = `${base}-${crypto.randomBytes(3).toString("hex")}`;

    // The plugin's user service hashes the password automatically (bcrypt) — pass plaintext.
    return strapi.plugin("users-permissions").service("user").add({
        username,
        email: normalized,
        password: crypto.randomBytes(24).toString("hex"), // random & unknowable; no login flow
        provider: "local",
        role: role ? role.id : undefined, // default "Authenticated" role
        confirmed: true, // trusted: created off an owner-issued, single-use token
        blocked: false,
    });
}

module.exports = { ensureUserAccount };
