"use strict";

/**
 * testimonial-request custom routes (public-facing form flow).
 *
 * Strapi merges every route file in this folder. `auth: false` makes these
 * public-eligible; they still must be enabled for the Public role in the admin.
 */

module.exports = {
    routes: [
        {
            method: "GET",
            path: "/testimonial-requests/validate/:token",
            handler: "testimonial-request.validate",
            config: { auth: false },
        },
        {
            method: "POST",
            path: "/testimonial-requests/submit",
            handler: "testimonial-request.submit",
            config: { auth: false },
        },
    ],
};
