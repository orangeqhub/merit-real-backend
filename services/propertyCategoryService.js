'use strict';

const { Op } = require('sequelize');
const {
  PropertyCategory,
  PropertyAttribute,
  Property,
} = require('../models');
const { resolveMediaUrl } = require('../utils/mediaUrl');

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

class PropertyCategoryService {
  formatAttribute(attr) {
    return {
      id: attr.id,
      categoryId: attr.categoryId,
      type: attr.type,
      nameEn: attr.nameEn,
      nameTe: attr.nameTe || '',
      sortOrder: attr.sortOrder,
      isActive: attr.isActive,
    };
  }

  format(category, req, { includeAttributes = false, propertyCount = null } = {}) {
    const attributes = includeAttributes && category.attributes
      ? category.attributes.map((a) => this.formatAttribute(a))
      : undefined;

    const specs = attributes
      ? attributes.filter((a) => a.type === 'SPECIFICATION')
      : undefined;
    const amenities = attributes
      ? attributes.filter((a) => a.type === 'AMENITY')
      : undefined;

    return {
      id: category.id,
      slug: category.slug,
      nameEn: category.nameEn,
      nameTe: category.nameTe || '',
      descriptionEn: category.descriptionEn || '',
      descriptionTe: category.descriptionTe || '',
      groupLabel: category.groupLabel || '',
      image: category.image ? resolveMediaUrl(req, category.image) : (category.image || ''),
      icon: category.icon || 'Home',
      ruleKey: category.ruleKey,
      transactionTypes: category.transactionTypes || ['sale'],
      areaUnits: category.areaUnits || ['sqft'],
      propertyFields: category.propertyFields || '',
      active: category.active !== false,
      visible: category.visible !== false,
      sortOrder: category.sortOrder || 0,
      propertyCount: propertyCount == null ? undefined : Number(propertyCount) || 0,
      specifications: specs,
      amenities,
      attributes,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  async getActivePropertyCounts({ includeInactiveProperties = false } = {}) {
    const where = includeInactiveProperties ? {} : { status: 'ACTIVE' };
    const rows = await Property.findAll({
      attributes: [
        'categoryId',
        [Property.sequelize.fn('COUNT', Property.sequelize.col('Property.id')), 'count'],
      ],
      where,
      group: ['categoryId'],
      raw: true,
    });
    const map = {};
    for (const row of rows) {
      map[row.categoryId] = Number(row.count) || 0;
    }
    return map;
  }

  async list({
    visibleOnly = false,
    activeOnly = false,
    includeAttributes = false,
    includeCounts = false,
    includeInactivePropertyCounts = false,
  } = {}, req = null) {
    const where = {};
    if (visibleOnly) where.visible = true;
    if (activeOnly) where.active = true;

    const rows = await PropertyCategory.findAll({
      where,
      include: includeAttributes
        ? [{
          model: PropertyAttribute,
          as: 'attributes',
          where: { isActive: true },
          required: false,
        }]
        : [],
      order: [
        ['sortOrder', 'ASC'],
        ['id', 'ASC'],
        ...(includeAttributes
          ? [[{ model: PropertyAttribute, as: 'attributes' }, 'sortOrder', 'ASC']]
          : []),
      ],
    });

    const counts = includeCounts
      ? await this.getActivePropertyCounts({ includeInactiveProperties: includeInactivePropertyCounts })
      : null;

    return rows.map((row) => this.format(row, req, {
      includeAttributes,
      propertyCount: counts ? (counts[row.id] || 0) : null,
    }));
  }

  async getBySlug(slug, req = null) {
    const category = await PropertyCategory.findOne({
      where: { slug },
      include: [{
        model: PropertyAttribute,
        as: 'attributes',
        where: { isActive: true },
        required: false,
      }],
      order: [[{ model: PropertyAttribute, as: 'attributes' }, 'sortOrder', 'ASC']],
    });
    if (!category) {
      const err = new Error('Category not found.');
      err.status = 404;
      err.code = 'CATEGORY_NOT_FOUND';
      throw err;
    }
    return this.format(category, req, { includeAttributes: true });
  }

  async getById(id, req = null) {
    const category = await PropertyCategory.findByPk(id, {
      include: [{ model: PropertyAttribute, as: 'attributes', required: false }],
      order: [[{ model: PropertyAttribute, as: 'attributes' }, 'sortOrder', 'ASC']],
    });
    if (!category) {
      const err = new Error('Category not found.');
      err.status = 404;
      err.code = 'CATEGORY_NOT_FOUND';
      throw err;
    }
    return this.format(category, req, { includeAttributes: true });
  }

  async create(payload, req = null) {
    const nameEn = String(payload.nameEn || '').trim();
    if (!nameEn) {
      const err = new Error('Category name (EN) is required.');
      err.status = 400;
      throw err;
    }

    let slug = slugify(payload.slug || nameEn);
    if (!slug) {
      const err = new Error('Valid slug is required.');
      err.status = 400;
      throw err;
    }

    const existing = await PropertyCategory.findOne({ where: { slug } });
    if (existing) {
      const err = new Error(`Category slug "${slug}" already exists.`);
      err.status = 409;
      err.code = 'DUPLICATE_CATEGORY';
      throw err;
    }

    const maxOrder = await PropertyCategory.max('sortOrder');
    const category = await PropertyCategory.create({
      slug,
      nameEn,
      nameTe: payload.nameTe || '',
      descriptionEn: payload.descriptionEn || '',
      descriptionTe: payload.descriptionTe || '',
      groupLabel: payload.groupLabel || '',
      image: payload.image || null,
      icon: payload.icon || 'Home',
      ruleKey: payload.ruleKey || slugify(nameEn).replace(/-/g, ''),
      transactionTypes: Array.isArray(payload.transactionTypes) && payload.transactionTypes.length
        ? payload.transactionTypes
        : ['sale'],
      areaUnits: Array.isArray(payload.areaUnits) && payload.areaUnits.length
        ? payload.areaUnits
        : ['sqft'],
      propertyFields: payload.propertyFields || '',
      active: payload.active !== false && payload.active !== 'false',
      visible: payload.visible !== false && payload.visible !== 'false',
      sortOrder: Number.isFinite(Number(payload.sortOrder))
        ? Number(payload.sortOrder)
        : (Number.isFinite(maxOrder) ? maxOrder + 1 : 0),
    });

    return this.format(category, req, { includeAttributes: true });
  }

  async update(slugOrId, payload, req = null) {
    const where = Number.isFinite(Number(slugOrId)) && String(Number(slugOrId)) === String(slugOrId)
      ? { id: Number(slugOrId) }
      : { slug: slugOrId };

    const category = await PropertyCategory.findOne({ where });
    if (!category) {
      const err = new Error('Category not found.');
      err.status = 404;
      err.code = 'CATEGORY_NOT_FOUND';
      throw err;
    }

    const updates = {};
    ['nameEn', 'nameTe', 'descriptionEn', 'descriptionTe', 'groupLabel', 'image', 'icon', 'ruleKey', 'propertyFields']
      .forEach((key) => {
        if (payload[key] !== undefined) updates[key] = payload[key];
      });

    if (payload.transactionTypes !== undefined) {
      updates.transactionTypes = Array.isArray(payload.transactionTypes)
        ? payload.transactionTypes
        : (typeof payload.transactionTypes === 'string'
          ? payload.transactionTypes.split(',').map((s) => s.trim()).filter(Boolean)
          : category.transactionTypes);
    }
    if (payload.areaUnits !== undefined) {
      updates.areaUnits = Array.isArray(payload.areaUnits)
        ? payload.areaUnits
        : (typeof payload.areaUnits === 'string'
          ? payload.areaUnits.split(',').map((s) => s.trim()).filter(Boolean)
          : category.areaUnits);
    }
    if (payload.active !== undefined) {
      updates.active = payload.active === true || payload.active === 'true';
    }
    if (payload.visible !== undefined) {
      updates.visible = payload.visible === true || payload.visible === 'true';
    }
    if (payload.sortOrder !== undefined) {
      updates.sortOrder = Number(payload.sortOrder) || 0;
    }
    if (payload.slug !== undefined && payload.slug !== category.slug) {
      const nextSlug = slugify(payload.slug);
      const clash = await PropertyCategory.findOne({
        where: { slug: nextSlug, id: { [Op.ne]: category.id } },
      });
      if (clash) {
        const err = new Error(`Category slug "${nextSlug}" already exists.`);
        err.status = 409;
        throw err;
      }
      updates.slug = nextSlug;
    }

    await category.update(updates);
    return this.getById(category.id, req);
  }

  async remove(slugOrId) {
    const where = Number.isFinite(Number(slugOrId)) && String(Number(slugOrId)) === String(slugOrId)
      ? { id: Number(slugOrId) }
      : { slug: slugOrId };

    const category = await PropertyCategory.findOne({ where });
    if (!category) {
      const err = new Error('Category not found.');
      err.status = 404;
      throw err;
    }

    const propertyCount = await Property.count({ where: { categoryId: category.id } });
    if (propertyCount > 0) {
      const err = new Error('Cannot delete category that has properties.');
      err.status = 409;
      err.code = 'CATEGORY_IN_USE';
      throw err;
    }

    await category.destroy();
    return true;
  }

  async reorder(slug, direction) {
    const category = await PropertyCategory.findOne({ where: { slug } });
    if (!category) {
      const err = new Error('Category not found.');
      err.status = 404;
      throw err;
    }

    const siblings = await PropertyCategory.findAll({
      order: [['sortOrder', 'ASC'], ['id', 'ASC']],
    });
    const index = siblings.findIndex((c) => c.id === category.id);
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= siblings.length) {
      return this.list({ includeAttributes: false });
    }

    const other = siblings[swapWith];
    const currentOrder = category.sortOrder;
    await category.update({ sortOrder: other.sortOrder });
    await other.update({ sortOrder: currentOrder });
    return this.list({ includeAttributes: false });
  }
}

module.exports = new PropertyCategoryService();
