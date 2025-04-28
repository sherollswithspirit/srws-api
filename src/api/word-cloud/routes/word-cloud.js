'use strict';

/**
 * word-cloud router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::word-cloud.word-cloud');
