"use strict";

/**
 * testimonial-request router (core)
 *
 * NOTE: the core find/findOne/create/update/delete routes must NOT be granted to the
 * Public role — they would expose tokens and customer emails. Only the custom public
 * routes in custom-testimonial-request.js are meant for the Public role.
 */

const { createCoreRouter } = require("@strapi/strapi").factories;

module.exports = createCoreRouter("api::testimonial-request.testimonial-request");
