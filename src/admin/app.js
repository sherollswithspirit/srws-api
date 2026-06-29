export default {
  config: {
    locales: [],
  },

  /**
   * Register the `copyable-link` custom field (admin side). It renders a string
   * value with a one-click copy-to-clipboard button — used by
   * `testimonial-request.shareUrl` so the owner can grab the invite link and
   * text it to a customer. Server-side declaration is in src/index.js.
   */
  register(app) {
    app.customFields.register({
      name: 'copyable-link',
      type: 'string',
      intlLabel: {
        id: 'copyable-link.label',
        defaultMessage: 'Share link',
      },
      intlDescription: {
        id: 'copyable-link.description',
        defaultMessage: 'Single-use link to send to the customer',
      },
      components: {
        Input: async () => import('./components/CopyableLinkInput'),
      },
      options: {},
    });
  },

  bootstrap() {},
};
