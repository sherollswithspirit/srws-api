'use strict';

/**
 * session-single service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::session-single.session-single');
