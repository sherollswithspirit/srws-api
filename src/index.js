'use strict';

module.exports = {
  /**
   * Register phase (runs before the app is initialized).
   *
   * Declares the `copyable-link` custom field: a plain string whose admin input
   * renders the value plus a one-click copy-to-clipboard button. Used by
   * `testimonial-request.shareUrl`. The matching admin component lives in
   * src/admin/app.js; schemas reference it as `global::copyable-link`.
   */
  register({ strapi }) {
    strapi.customFields.register({
      name: 'copyable-link',
      type: 'string',
    });
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap(/*{ strapi }*/) {},
};
