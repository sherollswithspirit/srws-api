'use strict';

/**
 * clair controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::clair.clair');
