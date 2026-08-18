'use strict';

const { Op } = require('sequelize');
const { Property, PropertyCategory } = require('../models');

const VENTURE_KEY = 'sky-line-infra-anne-enclave';
const TITLE = 'Sky line Infra Anne Enclave';
const VENTURE_NAME = 'Sky line Infra Anne Enclave';

/**
 * Shared ACTIVE Property that anchors all Anne Enclave map-plot interests/bookings.
 * Individual plots are reserved on MapPlot rows — this property stays ACTIVE.
 */
class LayoutPropertyService {
  async ensureAnneEnclaveProperty() {
    let property = await Property.findOne({
      where: {
        titleEn: TITLE,
        ventureName: VENTURE_NAME,
      },
    });

    if (!property) {
      property = await Property.findOne({
        where: {
          detailsJson: { [Op.contains]: { ventureKey: VENTURE_KEY } },
        },
      });
    }

    if (property) {
      const patch = {};
      if (property.status !== 'ACTIVE') patch.status = 'ACTIVE';
      const details = property.detailsJson && typeof property.detailsJson === 'object'
        ? { ...property.detailsJson }
        : {};
      if (details.ventureKey !== VENTURE_KEY || !details.isMapLayoutVenture) {
        patch.detailsJson = {
          ...details,
          ventureKey: VENTURE_KEY,
          isMapLayoutVenture: true,
        };
      }
      if (Object.keys(patch).length) {
        await property.update(patch);
      }
      return property;
    }

    let category = await PropertyCategory.findOne({ where: { slug: 'open-plot' } });
    if (!category) {
      category = await PropertyCategory.findOne({ where: { slug: 'agricultural-land' } });
    }
    if (!category) {
      category = await PropertyCategory.findOne({ order: [['id', 'ASC']] });
    }
    if (!category) {
      const err = new Error('No property category found to create layout venture property.');
      err.status = 500;
      throw err;
    }

    return Property.create({
      categoryId: category.id,
      titleEn: TITLE,
      titleTe: TITLE,
      descriptionEn:
        'Layout plots for Sky line Infra Anne Enclave (Phase 1 & Phase 2). Bookings reserve individual map plots.',
      ventureName: VENTURE_NAME,
      transactionType: 'sale',
      price: 0,
      status: 'ACTIVE',
      isVerified: true,
      detailsJson: {
        ventureKey: VENTURE_KEY,
        isMapLayoutVenture: true,
      },
    });
  }

  isLayoutVentureProperty(property) {
    if (!property) return false;
    const details = property.detailsJson || {};
    return Boolean(details.isMapLayoutVenture) || details.ventureKey === VENTURE_KEY;
  }
}

module.exports = new LayoutPropertyService();
