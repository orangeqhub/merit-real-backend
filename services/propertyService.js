'use strict';

const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const {
  Property,
  PropertyCategory,
  PropertyImage,
  PropertyAttribute,
  PropertyAttributeValue,
  sequelize,
} = require('../models');
const { resolveMediaUrl } = require('../utils/mediaUrl');

const PROPERTY_STATUSES = new Set(['ACTIVE', 'INACTIVE', 'DRAFT', 'BOOKED', 'SOLD']);
/** Legacy UI used "pending" for unpublished listings; map to DRAFT. OPEN maps to ACTIVE. */
const PROPERTY_STATUS_ALIASES = { PENDING: 'DRAFT', OPEN: 'ACTIVE', RESERVED: 'BOOKED' };

function parseBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return value === true || value === 'true' || value === '1' || value === 1;
}

function normalizePropertyStatus(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) return null;
  const status = PROPERTY_STATUS_ALIASES[raw] || raw;
  if (!PROPERTY_STATUSES.has(status)) {
    const err = new Error(`Invalid status "${value}". Allowed: ACTIVE, INACTIVE, DRAFT, BOOKED, SOLD.`);
    err.status = 400;
    throw err;
  }
  return status;
}

function parseJsonField(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function parseIdList(value) {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value.map(Number).filter((n) => Number.isFinite(n));
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(Number).filter((n) => Number.isFinite(n));
    } catch {
      // comma-separated
    }
    return value.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n));
  }
  return [];
}

function buildLocationEn(payload) {
  if (payload.locationEn) return String(payload.locationEn).trim();
  return [payload.locality, payload.city, payload.district, payload.state]
    .map((v) => (v ? String(v).trim() : ''))
    .filter(Boolean)
    .join(', ');
}

class PropertyService {
  detailIncludes() {
    return [
      { model: PropertyCategory, as: 'category' },
      { model: PropertyImage, as: 'images' },
      {
        model: PropertyAttribute,
        as: 'selectedAttributes',
        through: { attributes: [] },
      },
    ];
  }

  formatImage(image, req) {
    return {
      id: image.id,
      url: resolveMediaUrl(req, image.imagePath),
      imagePath: image.imagePath,
      caption: image.caption || '',
      isPrimary: Boolean(image.isPrimary),
      sortOrder: image.sortOrder || 0,
    };
  }

  format(property, req) {
    const category = property.category;
    const images = (property.images || [])
      .slice()
      .sort((a, b) => (a.sortOrder - b.sortOrder) || (a.id - b.id))
      .map((img) => this.formatImage(img, req));

    const selected = property.selectedAttributes || [];
    const specifications = selected
      .filter((a) => a.type === 'SPECIFICATION')
      .map((a) => ({ id: a.id, nameEn: a.nameEn, nameTe: a.nameTe || '' }));
    const amenities = selected
      .filter((a) => a.type === 'AMENITY')
      .map((a) => ({ id: a.id, nameEn: a.nameEn, nameTe: a.nameTe || '' }));

    const details = property.detailsJson || {};

    return {
      id: property.id,
      categoryId: property.categoryId,
      categorySlug: category?.slug || null,
      categoryNameEn: category?.nameEn || null,
      categoryNameTe: category?.nameTe || null,
      ruleKey: category?.ruleKey || null,
      titleEn: property.titleEn,
      titleTe: property.titleTe || '',
      descriptionEn: property.descriptionEn || '',
      descriptionTe: property.descriptionTe || '',
      ventureName: property.ventureName || '',
      transactionType: property.transactionType || 'sale',
      state: property.state || '',
      district: property.district || '',
      mandal: property.mandal || '',
      city: property.city || '',
      locality: property.locality || '',
      landmark: property.landmark || '',
      pincode: property.pincode || '',
      address: property.address || '',
      locationEn: property.locationEn || '',
      locationTe: property.locationTe || '',
      mapLocation: property.mapLocation || '',
      price: Number(property.price) || 0,
      priceNegotiable: Boolean(property.priceNegotiable),
      area: property.area != null && property.area !== '' ? String(property.area) : null,
      areaUnit: property.areaUnit || 'sqft',
      dimensions: property.dimensions || '',
      facing: property.facing || '',
      northMeasurement: property.northMeasurement || '',
      eastMeasurement: property.eastMeasurement || '',
      westMeasurement: property.westMeasurement || '',
      southMeasurement: property.southMeasurement || '',
      detailsJson: details,
      structure: details.structure || {},
      plotDetails: details.plotDetails || {},
      contactName: property.contactName || '',
      contactPhone: property.contactPhone || '',
      preferWhatsapp: Boolean(property.preferWhatsapp),
      preferCall: Boolean(property.preferCall),
      hidePhone: Boolean(property.hidePhone),
      featured: Boolean(property.isFeatured),
      isFeatured: Boolean(property.isFeatured),
      trending: Boolean(property.isTrending),
      isTrending: Boolean(property.isTrending),
      verified: Boolean(property.isVerified),
      isVerified: Boolean(property.isVerified),
      status: String(property.status || 'ACTIVE').toLowerCase(),
      isReserved: String(property.status || '').toUpperCase() === 'BOOKED',
      isSold: String(property.status || '').toUpperCase() === 'SOLD',
      isAvailable: String(property.status || '').toUpperCase() === 'ACTIVE',
      viewCount: property.viewCount || 0,
      images,
      specifications,
      amenities: amenities.map((a) => a.nameEn),
      amenityItems: amenities,
      attributeIds: selected.map((a) => a.id),
      postedByUserId: property.postedByUserId,
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
    };
  }

  async findFull(id) {
    return Property.findByPk(id, {
      include: this.detailIncludes(),
      order: [[{ model: PropertyImage, as: 'images' }, 'sortOrder', 'ASC']],
    });
  }

  async list(filters = {}, req = null) {
    const where = {};
    const includeAll = parseBool(filters.includeAllStatuses, false);
    const adminMode = parseBool(filters.admin, false) || includeAll;

    if (filters.status) {
      where.status = normalizePropertyStatus(filters.status);
    } else if (!adminMode) {
      // Show available + reserved (booked) properties publicly; sold stays admin/detail
      where.status = { [Op.in]: ['ACTIVE', 'BOOKED'] };
    }

    if (filters.categorySlug) {
      const category = await PropertyCategory.findOne({ where: { slug: filters.categorySlug } });
      if (!category) {
        return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 };
      }
      where.categoryId = category.id;
    }
    if (filters.categoryId) where.categoryId = Number(filters.categoryId);

    if (filters.city) {
      where.city = { [Op.iLike]: String(filters.city).trim() };
    }
    if (filters.district) {
      where.district = { [Op.iLike]: String(filters.district).trim() };
    }
    if (filters.transactionType) {
      where.transactionType = filters.transactionType;
    }
    if (filters.featured === true || filters.featured === 'true' || filters.section === 'featured') {
      where.isFeatured = true;
    }
    if (filters.trending === true || filters.trending === 'true' || filters.section === 'trending') {
      where.isTrending = true;
    }
    if (filters.verified === true || filters.verified === 'true') {
      where.isVerified = true;
    }

    if (filters.minPrice != null && filters.minPrice !== '') {
      where.price = { ...(where.price || {}), [Op.gte]: Number(filters.minPrice) };
    }
    if (filters.maxPrice != null && filters.maxPrice !== '') {
      where.price = { ...(where.price || {}), [Op.lte]: Number(filters.maxPrice) };
    }

    if (filters.search) {
      const q = `%${String(filters.search).trim()}%`;
      where[Op.or] = [
        { titleEn: { [Op.iLike]: q } },
        { titleTe: { [Op.iLike]: q } },
        { locationEn: { [Op.iLike]: q } },
        { city: { [Op.iLike]: q } },
        { locality: { [Op.iLike]: q } },
        { ventureName: { [Op.iLike]: q } },
      ];
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize) || 20));
    const offset = (page - 1) * pageSize;

    let order = [['createdAt', 'DESC']];
    const sort = String(filters.sort || filters.sortBy || 'newest').toLowerCase();
    if (sort === 'price_asc' || sort === 'price-asc') order = [['price', 'ASC']];
    else if (sort === 'price_desc' || sort === 'price-desc') order = [['price', 'DESC']];
    else if (sort === 'featured') order = [['isFeatured', 'DESC'], ['createdAt', 'DESC']];
    else if (sort === 'oldest') order = [['createdAt', 'ASC']];
    else if (filters.section === 'latest' || sort === 'newest') order = [['createdAt', 'DESC']];

    const { rows, count } = await Property.findAndCountAll({
      where,
      include: [
        { model: PropertyCategory, as: 'category' },
        { model: PropertyImage, as: 'images' },
        {
          model: PropertyAttribute,
          as: 'selectedAttributes',
          through: { attributes: [] },
        },
      ],
      order,
      limit: pageSize,
      offset,
      distinct: true,
    });

    return {
      items: rows.map((row) => this.format(row, req)),
      total: count,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(count / pageSize)),
    };
  }

  async getById(id, req = null, { allowInactive = false } = {}) {
    const property = await this.findFull(id);
    if (!property) {
      const err = new Error('Property not found.');
      err.status = 404;
      err.code = 'PROPERTY_NOT_FOUND';
      throw err;
    }
    if (!allowInactive && !['ACTIVE', 'BOOKED', 'SOLD'].includes(property.status)) {
      const err = new Error('Property not found.');
      err.status = 404;
      err.code = 'PROPERTY_NOT_FOUND';
      throw err;
    }
    return this.format(property, req);
  }

  async getFeatured(limit = 8, location, req = null) {
    return this.list({
      section: 'featured',
      pageSize: limit,
      city: location || undefined,
    }, req).then((r) => r.items);
  }

  async getLatest(limit = 8, location, req = null) {
    return this.list({
      section: 'latest',
      pageSize: limit,
      city: location || undefined,
    }, req).then((r) => r.items);
  }

  async getTrending(limit = 8, location, req = null) {
    return this.list({
      section: 'trending',
      pageSize: limit,
      city: location || undefined,
    }, req).then((r) => r.items);
  }

  async getRelated(propertyLike, limit = 4, req = null) {
    const categorySlug = propertyLike.categorySlug;
    const id = propertyLike.id;
    const result = await this.list({
      categorySlug,
      pageSize: limit + 5,
    }, req);
    return result.items.filter((p) => p.id !== id).slice(0, limit);
  }

  async recordView(id) {
    await Property.increment('viewCount', { where: { id } });
    return true;
  }

  async syncAttributes(propertyId, attributeIds, transaction) {
    await PropertyAttributeValue.destroy({ where: { propertyId }, transaction });
    const uniqueIds = [...new Set(attributeIds)];
    if (!uniqueIds.length) return;

    const valid = await PropertyAttribute.findAll({
      where: { id: uniqueIds, isActive: true },
      transaction,
    });
    if (valid.length) {
      await PropertyAttributeValue.bulkCreate(
        valid.map((attr) => ({
          propertyId,
          attributeId: attr.id,
        })),
        { transaction }
      );
    }
  }

  async attachImages(propertyId, files, { replace = false, primaryIndex = 0 } = {}, transaction) {
    if (replace) {
      const existing = await PropertyImage.findAll({ where: { propertyId }, transaction });
      for (const img of existing) {
        const full = path.resolve(__dirname, '..', String(img.imagePath).replace(/^\//, ''));
        if (fs.existsSync(full)) fs.unlinkSync(full);
      }
      await PropertyImage.destroy({ where: { propertyId }, transaction });
    }

    if (!files || !files.length) return;

    const rows = files.map((file, index) => ({
      propertyId,
      imagePath: `/uploads/properties/${file.filename}`,
      caption: '',
      isPrimary: index === Number(primaryIndex || 0),
      sortOrder: index,
    }));
    await PropertyImage.bulkCreate(rows, { transaction });
  }

  buildPayload(body, userId) {
    const detailsJson = {
      ...(parseJsonField(body.detailsJson, {})),
      structure: parseJsonField(body.structure, parseJsonField(body.detailsJson, {}).structure || {}),
      plotDetails: parseJsonField(body.plotDetails, parseJsonField(body.detailsJson, {}).plotDetails || {}),
    };

    return {
      categoryId: Number(body.categoryId),
      postedByUserId: userId || null,
      titleEn: String(body.titleEn || '').trim(),
      titleTe: body.titleTe ? String(body.titleTe).trim() : '',
      descriptionEn: body.descriptionEn || '',
      descriptionTe: body.descriptionTe || '',
      ventureName: body.ventureName || '',
      transactionType: body.transactionType || 'sale',
      state: body.state || '',
      district: body.district || '',
      mandal: body.mandal || '',
      city: body.city || body.cityVillage || '',
      locality: body.locality || '',
      landmark: body.landmark || '',
      pincode: body.pincode || '',
      address: body.address || '',
      locationEn: buildLocationEn({ ...body, city: body.city || body.cityVillage }),
      locationTe: body.locationTe || '',
      mapLocation: body.mapLocation || '',
      price: Number(body.price) || 0,
      priceNegotiable: parseBool(body.priceNegotiable, false),
      area: body.area !== undefined && body.area !== '' ? String(body.area).trim() : null,
      areaUnit: body.areaUnit || 'sqft',
      dimensions: body.dimensions || '',
      facing: body.facing !== undefined ? String(body.facing || '').trim() : '',
      northMeasurement: body.northMeasurement !== undefined ? String(body.northMeasurement || '').trim() : '',
      eastMeasurement: body.eastMeasurement !== undefined ? String(body.eastMeasurement || '').trim() : '',
      westMeasurement: body.westMeasurement !== undefined ? String(body.westMeasurement || '').trim() : '',
      southMeasurement: body.southMeasurement !== undefined ? String(body.southMeasurement || '').trim() : '',
      detailsJson,
      contactName: body.contactName || '',
      contactPhone: body.contactPhone || '',
      preferWhatsapp: parseBool(body.preferWhatsapp, true),
      preferCall: parseBool(body.preferCall, true),
      hidePhone: parseBool(body.hidePhone, false),
      isFeatured: parseBool(body.isFeatured ?? body.featured, false),
      isTrending: parseBool(body.isTrending ?? body.trending, false),
      isVerified: parseBool(body.isVerified ?? body.verified, true),
      status: String(body.status || 'ACTIVE').toUpperCase(),
    };
  }

  async create(body, files, userId, req = null) {
    if (!body.titleEn || !String(body.titleEn).trim()) {
      const err = new Error('Property title is required.');
      err.status = 400;
      throw err;
    }
    if (!body.categoryId) {
      const err = new Error('Category is required.');
      err.status = 400;
      throw err;
    }

    const category = await PropertyCategory.findByPk(Number(body.categoryId));
    if (!category || !category.active) {
      const err = new Error('Invalid or inactive category.');
      err.status = 400;
      throw err;
    }

    const attributeIds = parseIdList(body.attributeIds || body.amenityIds);
    const payload = this.buildPayload(body, userId);
    if (!['ACTIVE', 'INACTIVE', 'DRAFT'].includes(payload.status)) {
      payload.status = 'ACTIVE';
    }

    const result = await sequelize.transaction(async (transaction) => {
      const property = await Property.create(payload, { transaction });
      await this.syncAttributes(property.id, attributeIds, transaction);
      await this.attachImages(property.id, files || [], {
        primaryIndex: body.primaryImageIndex || 0,
      }, transaction);
      return property.id;
    });

    return this.getById(result, req, { allowInactive: true });
  }

  async update(id, body, files, req = null) {
    const property = await Property.findByPk(id);
    if (!property) {
      const err = new Error('Property not found.');
      err.status = 404;
      throw err;
    }

    if (body.categoryId) {
      const category = await PropertyCategory.findByPk(Number(body.categoryId));
      if (!category) {
        const err = new Error('Invalid category.');
        err.status = 400;
        throw err;
      }
    }

    const attributeIds = body.attributeIds !== undefined || body.amenityIds !== undefined
      ? parseIdList(body.attributeIds || body.amenityIds)
      : null;

    const payload = this.buildPayload({ ...property.toJSON(), ...body }, property.postedByUserId);
    // Don't overwrite title with empty on partial updates if somehow missing
    if (!body.titleEn) payload.titleEn = property.titleEn;
    if (body.categoryId) payload.categoryId = Number(body.categoryId);
    else payload.categoryId = property.categoryId;

    // Preserve flags if not sent
    if (body.isFeatured === undefined && body.featured === undefined) payload.isFeatured = property.isFeatured;
    if (body.isTrending === undefined && body.trending === undefined) payload.isTrending = property.isTrending;
    if (body.isVerified === undefined && body.verified === undefined) payload.isVerified = property.isVerified;
    if (body.status === undefined) payload.status = property.status;

    delete payload.postedByUserId;

    await sequelize.transaction(async (transaction) => {
      await property.update(payload, { transaction });
      if (attributeIds) {
        await this.syncAttributes(property.id, attributeIds, transaction);
      }
      if (files && files.length) {
        const replaceImages = parseBool(body.replaceImages, true);
        await this.attachImages(property.id, files, {
          replace: replaceImages,
          primaryIndex: body.primaryImageIndex || 0,
        }, transaction);
      }
    });

    return this.getById(id, req, { allowInactive: true });
  }

  async remove(id) {
    const property = await this.findFull(id);
    if (!property) {
      const err = new Error('Property not found.');
      err.status = 404;
      throw err;
    }

    for (const img of property.images || []) {
      const full = path.resolve(__dirname, '..', String(img.imagePath).replace(/^\//, ''));
      if (fs.existsSync(full)) fs.unlinkSync(full);
    }

    await property.destroy();
    return true;
  }
}

module.exports = new PropertyService();
