'use strict';

/**
 * toolbox service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::toolbox.toolbox');
