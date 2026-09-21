'use strict';

const { Op } = require('sequelize');
const { Property, PropertyCategory } = require('../models');

const LAYOUT_CONFIG = {
  'anne-enclave': {
    ventureKey: 'sky-line-infra-anne-enclave',
    title: 'Sky line Infra Anne Enclave',
    name: 'Sky line Infra Anne Enclave',
    description:
      'Layout plots for Sky line Infra Anne Enclave (Phase 1 & Phase 2). Bookings reserve individual map plots.',
  },
  'sri-lakshmi': {
    ventureKey: 'sri-lakshmi-residency',
    title: 'Map Sri Lakshmi Residency',
    name: 'Map Sri Lakshmi Residency',
    description:
      'Layout plots for Map Sri Lakshmi Residency. Bookings reserve individual map plots.',
  },
  'manjunadha-enclave': {
    ventureKey: 'manjunadha-enclave',
    title: 'Manjunadha Enclave',
    name: 'Manjunadha Enclave',
    description:
      'Layout plots for Manjunadha Enclave. Bookings reserve individual map plots.',
  },
  dokiparru: {
    ventureKey: 'elite-sky-city',
    title: 'Elite Sky City',
    name: 'Elite Sky City',
    description:
      'Layout plots for Elite Sky City. Bookings reserve individual map plots.',
  },
  'mandira-developers': {
    ventureKey: 'mandira-developers',
    title: 'Mandira Developers',
    name: 'Mandira Developers',
    description:
      'Layout plots for Mandira Developers Quantum City. Bookings reserve individual map plots.',
  },
  vinfra: {
    ventureKey: 'orr-nandana-vanam',
    title: 'V Infra ORR Nandana Vanam @ Saripudi',
    name: 'V Infra ORR Nandana Vanam @ Saripudi',
    description:
      'Layout plots for V Infra ORR Nandana Vanam @ Saripudi. Bookings reserve individual map plots.',
  },
};

const DEFAULT_LAYOUT_KEY = 'anne-enclave';

function layoutConfigFor(layoutKey) {
  const key = String(layoutKey || DEFAULT_LAYOUT_KEY);
  return LAYOUT_CONFIG[key] || LAYOUT_CONFIG[DEFAULT_LAYOUT_KEY];
}

/**
 * Shared ACTIVE Property that anchors map-plot interests/bookings for a layout.
 * Individual plots are reserved on MapPlot rows — this property stays ACTIVE.
 */
class LayoutPropertyService {
  getLayoutKeys() {
    return Object.keys(LAYOUT_CONFIG);
  }

  isKnownLayout(layoutKey) {
    return Object.prototype.hasOwnProperty.call(LAYOUT_CONFIG, String(layoutKey || ''));
  }

  isLayoutVentureProperty(property) {
    if (!property) return false;
    const details = property.detailsJson || {};
    if (Boolean(details.isMapLayoutVenture)) return true;
    return Object.values(LAYOUT_CONFIG).some(
      (config) => details.ventureKey === config.ventureKey
    );
  }

  async ensureProperty(layoutKey) {
    const config = layoutConfigFor(layoutKey);
    const { ventureKey, title, name, description } = config;
    let property = await Property.findOne({
      where: {
        titleEn: title,
        ventureName: name,
      },
    });

    if (!property) {
      property = await Property.findOne({
        where: {
          detailsJson: { [Op.contains]: { ventureKey } },
        },
      });
    }

    if (property) {
      const patch = {};
      if (property.status !== 'ACTIVE') patch.status = 'ACTIVE';
      const details = property.detailsJson && typeof property.detailsJson === 'object'
        ? { ...property.detailsJson }
        : {};
      if (details.ventureKey !== ventureKey || !details.isMapLayoutVenture) {
        patch.detailsJson = {
          ...details,
          ventureKey,
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
      titleEn: title,
      titleTe: title,
      descriptionEn: description,
      ventureName: name,
      transactionType: 'sale',
      price: 0,
      status: 'ACTIVE',
      isVerified: true,
      detailsJson: {
        ventureKey,
        isMapLayoutVenture: true,
      },
    });
  }

  async ensureAnneEnclaveProperty() {
    return this.ensureProperty(DEFAULT_LAYOUT_KEY);
  }
}

module.exports = new LayoutPropertyService();