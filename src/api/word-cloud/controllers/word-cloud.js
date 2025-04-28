'use strict';

/**
 * word-cloud controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::word-cloud.word-cloud');
