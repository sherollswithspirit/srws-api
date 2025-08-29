'use strict';

/**
 * clair service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::clair.clair');
