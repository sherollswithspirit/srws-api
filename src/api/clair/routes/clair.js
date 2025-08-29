'use strict';

/**
 * clair router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::clair.clair');
