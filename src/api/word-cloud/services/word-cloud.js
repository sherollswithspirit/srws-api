'use strict';

/**
 * word-cloud service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::word-cloud.word-cloud');
