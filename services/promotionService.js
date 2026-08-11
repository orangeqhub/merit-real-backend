'use strict';

const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const {
  Promotion,
  PromotionProperty,
  PromotionDismissal,
  Property,
  PropertyImage,
  sequelize,
} = require('../models');
const { resolveMediaUrl } = require('../utils/mediaUrl');
const notificationService = require('./notificationService');

const TYPE_LABELS = {
  TRENDING_PROPERTY: 'Trending Property',
  FEATURED_PROPERTY: 'Featured Property',
  HOT_PROPERTY: 'Hot Property',
  LIMITED_TIME_OFFER: 'Limited Time Offer',
  NEW_LAUNCH: 'New Launch',
  PREMIUM_LISTING: 'Premium Listing',
  FESTIVAL_OFFER: 'Festival Offer',
};

function parsePropertyIds(raw, primaryPropertyId) {
  let ids = [];
  if (Array.isArray(raw)) {
    ids = raw.map(Number).filter((n) => Number.isFinite(n) && n > 0);
  } else if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        ids = parsed.map(Number).filter((n) => Number.isFinite(n) && n > 0);
      } else {
        ids = raw.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
      }
    } catch {
      ids = raw.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
    }
  }
  const primary = Number(primaryPropertyId);
  if (Number.isFinite(primary) && primary > 0 && !ids.includes(primary)) {
    ids.unshift(primary);
  }
  return [...new Set(ids)];
}

function parseDate(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Start of calendar day (local) for schedule windows. */
function startOfDay(value) {
  const d = parseDate(value);
  if (!d) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

/** End of calendar day (local) so endDate is inclusive for the whole day. */
function endOfDay(value) {
  const d = parseDate(value);
  if (!d) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}

class PromotionService {
  typeLabel(type) {
    return TYPE_LABELS[type] || type || 'Promotion';
  }

  propertySummary(property, req) {
    if (!property) return null;
    const images = (property.images || [])
      .slice()
      .sort((a, b) => {
        if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
        return (a.sortOrder || 0) - (b.sortOrder || 0);
      })
      .map((img) => ({
        id: img.id,
        url: resolveMediaUrl(req, img.imagePath),
        isPrimary: Boolean(img.isPrimary),
      }));
    return {
      id: property.id,
      titleEn: property.titleEn || '',
      titleTe: property.titleTe || property.titleEn || '',
      price: property.price != null ? Number(property.price) : null,
      city: property.city || '',
      locality: property.locality || '',
      image: images[0]?.url || null,
      images,
    };
  }

  format(row, req, { dismissed = false } = {}) {
    const data = row.toJSON ? row.toJSON() : row;
    const primary = data.primaryProperty || null;
    const linked = data.properties || [];
    const now = new Date();
    const start = data.startDate ? startOfDay(data.startDate) : null;
    const end = data.endDate ? endOfDay(data.endDate) : null;
    let scheduleStatus = 'ACTIVE';
    if (data.status !== 'ACTIVE') scheduleStatus = 'INACTIVE';
    else if (end && end < now) scheduleStatus = 'EXPIRED';
    else if (start && start > now) scheduleStatus = 'SCHEDULED';

    return {
      id: data.id,
      promotionId: data.id,
      primaryPropertyId: data.primaryPropertyId,
      propertyIds: linked.length
        ? linked.map((p) => p.id)
        : (data.primaryPropertyId ? [data.primaryPropertyId] : []),
      promotionType: data.promotionType,
      promotionTypeLabel: this.typeLabel(data.promotionType),
      title: data.title,
      description: data.description || '',
      bannerImage: data.bannerImage ? resolveMediaUrl(req, data.bannerImage) : null,
      bannerImagePath: data.bannerImage || null,
      ctaButtonText: data.ctaButtonText || 'View Property',
      ctaAction: data.ctaAction || 'PROPERTY_DETAILS',
      priority: data.priority || 0,
      offerPrice: data.offerPrice != null ? Number(data.offerPrice) : null,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status,
      scheduleStatus,
      dismissed: Boolean(dismissed),
      property: this.propertySummary(primary, req),
      properties: linked.map((p) => this.propertySummary(p, req)),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  includeOptions() {
    return [
      {
        model: Property,
        as: 'primaryProperty',
        include: [{ model: PropertyImage, as: 'images' }],
      },
      {
        model: Property,
        as: 'properties',
        include: [{ model: PropertyImage, as: 'images' }],
        through: { attributes: [] },
      },
    ];
  }

  activeWhere(now = new Date()) {
    const dayStart = startOfDay(now);
    const dayEnd = endOfDay(now);
    return {
      status: 'ACTIVE',
      [Op.and]: [
        // Started on or before today (null = always started)
        { [Op.or]: [{ startDate: null }, { startDate: { [Op.lte]: dayEnd } }] },
        // Ends on or after today — end date is inclusive for the whole calendar day
        { [Op.or]: [{ endDate: null }, { endDate: { [Op.gte]: dayStart } }] },
      ],
    };
  }

  async syncProperties(promotionId, propertyIds, transaction) {
    await PromotionProperty.destroy({ where: { promotionId }, transaction });
    if (!propertyIds.length) return;
    await PromotionProperty.bulkCreate(
      propertyIds.map((propertyId) => ({ promotionId, propertyId })),
      { transaction }
    );
  }

  async findById(id) {
    return Promotion.findByPk(id, { include: this.includeOptions() });
  }

  async listAll(req) {
    const rows = await Promotion.findAll({
      include: this.includeOptions(),
      order: [['priority', 'DESC'], ['id', 'DESC']],
    });
    return rows.map((row) => this.format(row, req));
  }

  async getById(id, req) {
    const row = await this.findById(id);
    if (!row) {
      const err = new Error('Promotion not found.');
      err.status = 404;
      err.code = 'PROMOTION_NOT_FOUND';
      throw err;
    }
    return this.format(row, req);
  }

  async listActive(req, { excludeDismissed = false, customerId = null } = {}) {
    const now = new Date();
    const rows = await Promotion.findAll({
      where: this.activeWhere(now),
      include: this.includeOptions(),
      order: [['priority', 'DESC'], ['id', 'DESC']],
    });

    let dismissedIds = new Set();
    if (excludeDismissed && customerId) {
      const dismissals = await PromotionDismissal.findAll({
        where: { customerId: Number(customerId) },
        attributes: ['promotionId'],
      });
      dismissedIds = new Set(dismissals.map((d) => d.promotionId));
    }

    return rows
      .filter((row) => !dismissedIds.has(row.id))
      .map((row) => this.format(row, req, { dismissed: false }));
  }

  async listMine(customerId, req, { status = 'all', search = '', type = '', sort = 'newest' } = {}) {
    const where = {};
    if (type) where.promotionType = type;

    const dismissals = await PromotionDismissal.findAll({
      where: { customerId: Number(customerId) },
      attributes: ['promotionId'],
    });
    const dismissedIds = new Set(dismissals.map((d) => d.promotionId));

    const rows = await Promotion.findAll({
      where,
      include: this.includeOptions(),
      order: sort === 'type'
        ? [['promotionType', 'ASC'], ['priority', 'DESC']]
        : [['createdAt', 'DESC'], ['priority', 'DESC']],
    });

    const q = String(search || '').trim().toLowerCase();

    return rows
      .map((row) => {
        const formatted = this.format(row, req, { dismissed: dismissedIds.has(row.id) });
        return formatted;
      })
      .filter((item) => {
        if (status === 'active') {
          return item.scheduleStatus === 'ACTIVE' && !item.dismissed;
        }
        if (status === 'dismissed') return item.dismissed;
        if (status === 'expired') return item.scheduleStatus === 'EXPIRED';
        return true;
      })
      .filter((item) => {
        if (!q) return true;
        const hay = `${item.title} ${item.description} ${item.promotionTypeLabel} ${item.property?.titleEn || ''}`.toLowerCase();
        return hay.includes(q);
      });
  }

  async dismiss(promotionId, customerId) {
    const promotion = await Promotion.findByPk(promotionId);
    if (!promotion) {
      const err = new Error('Promotion not found.');
      err.status = 404;
      err.code = 'PROMOTION_NOT_FOUND';
      throw err;
    }
    await PromotionDismissal.findOrCreate({
      where: { promotionId: Number(promotionId), customerId: Number(customerId) },
      defaults: { promotionId: Number(promotionId), customerId: Number(customerId) },
    });
    return { dismissed: true };
  }

  async restore(promotionId, customerId) {
    await PromotionDismissal.destroy({
      where: { promotionId: Number(promotionId), customerId: Number(customerId) },
    });
    return { restored: true };
  }

  async notifyPublished(promotion, req) {
    const propertyTitle = promotion.primaryProperty?.titleEn || 'Property';
    const typeLabel = this.typeLabel(promotion.promotionType);
    const banner = promotion.bannerImage
      ? resolveMediaUrl(req, promotion.bannerImage)
      : (promotion.primaryProperty?.images?.[0]
        ? resolveMediaUrl(req, promotion.primaryProperty.images[0].imagePath)
        : null);

    await notificationService.notifyCustomers({
      titleEn: promotion.title,
      titleTe: promotion.title,
      messageEn: `${typeLabel} · ${propertyTitle}${promotion.description ? ` — ${promotion.description}` : ''}`,
      messageTe: `${typeLabel} · ${propertyTitle}${promotion.description ? ` — ${promotion.description}` : ''}`,
      notificationType: 'PROMOTION',
      referenceType: 'promotion',
      referenceId: promotion.id,
      linkPath: `/properties/${promotion.primaryPropertyId}`,
      imageUrl: banner,
      createdBy: promotion.createdBy || null,
    });
  }

  async create(payload, file, req, actorId) {
    const propertyIds = parsePropertyIds(payload.propertyIds, payload.primaryPropertyId || payload.propertyId);
    if (!propertyIds.length) {
      const err = new Error('Select at least one property.');
      err.status = 400;
      err.code = 'PROPERTY_REQUIRED';
      throw err;
    }

    const promotionType = String(payload.promotionType || '').toUpperCase();
    if (!Promotion.PROMOTION_TYPES.includes(promotionType)) {
      const err = new Error('Invalid promotion type.');
      err.status = 400;
      err.code = 'INVALID_TYPE';
      throw err;
    }

    const title = String(payload.title || '').trim();
    if (!title) {
      const err = new Error('Promotion title is required.');
      err.status = 400;
      err.code = 'TITLE_REQUIRED';
      throw err;
    }

    const bannerImage = file ? `/uploads/promotions/${file.filename}` : (payload.bannerImage || null);
    const status = String(payload.status || 'ACTIVE').toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const primaryPropertyId = Number(payload.primaryPropertyId || propertyIds[0]);

    const created = await sequelize.transaction(async (transaction) => {
      const promotion = await Promotion.create({
        primaryPropertyId,
        promotionType,
        title,
        description: payload.description || null,
        bannerImage,
        ctaButtonText: payload.ctaButtonText || 'View Property',
        ctaAction: payload.ctaAction || 'PROPERTY_DETAILS',
        priority: Number.isFinite(Number(payload.priority)) ? Number(payload.priority) : 0,
        offerPrice: payload.offerPrice !== undefined && payload.offerPrice !== ''
          ? Number(payload.offerPrice)
          : null,
        startDate: payload.startDate !== undefined && payload.startDate !== ''
          ? startOfDay(payload.startDate)
          : null,
        endDate: payload.endDate !== undefined && payload.endDate !== ''
          ? endOfDay(payload.endDate)
          : null,
        status,
        createdBy: actorId || null,
        modifiedBy: actorId || null,
      }, { transaction });

      await this.syncProperties(promotion.id, propertyIds, transaction);
      return promotion.id;
    });

    const row = await this.findById(created);
    if (row.status === 'ACTIVE') {
      try {
        await this.notifyPublished(row, req);
      } catch {
        // non-blocking
      }
    }
    return this.format(row, req);
  }

  async update(id, payload, file, req, actorId) {
    const promotion = await Promotion.findByPk(id);
    if (!promotion) {
      const err = new Error('Promotion not found.');
      err.status = 404;
      err.code = 'PROMOTION_NOT_FOUND';
      throw err;
    }

    const wasActive = promotion.status === 'ACTIVE';
    const updates = { modifiedBy: actorId || null };

    if (payload.title !== undefined) updates.title = String(payload.title || '').trim();
    if (payload.description !== undefined) updates.description = payload.description || null;
    if (payload.ctaButtonText !== undefined) updates.ctaButtonText = payload.ctaButtonText || 'View Property';
    if (payload.ctaAction !== undefined) updates.ctaAction = payload.ctaAction || 'PROPERTY_DETAILS';
    if (payload.priority !== undefined) updates.priority = Number(payload.priority) || 0;
    if (payload.offerPrice !== undefined) {
      updates.offerPrice = payload.offerPrice === '' || payload.offerPrice == null
        ? null
        : Number(payload.offerPrice);
    }
    if (payload.startDate !== undefined) {
      updates.startDate = payload.startDate === '' || payload.startDate == null
        ? null
        : startOfDay(payload.startDate);
    }
    if (payload.endDate !== undefined) {
      updates.endDate = payload.endDate === '' || payload.endDate == null
        ? null
        : endOfDay(payload.endDate);
    }
    if (payload.status !== undefined) {
      updates.status = String(payload.status).toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
    }
    if (payload.promotionType !== undefined) {
      const promotionType = String(payload.promotionType).toUpperCase();
      if (!Promotion.PROMOTION_TYPES.includes(promotionType)) {
        const err = new Error('Invalid promotion type.');
        err.status = 400;
        err.code = 'INVALID_TYPE';
        throw err;
      }
      updates.promotionType = promotionType;
    }

    let propertyIds = null;
    if (payload.propertyIds !== undefined || payload.primaryPropertyId !== undefined || payload.propertyId !== undefined) {
      propertyIds = parsePropertyIds(
        payload.propertyIds,
        payload.primaryPropertyId || payload.propertyId || promotion.primaryPropertyId
      );
      if (!propertyIds.length) {
        const err = new Error('Select at least one property.');
        err.status = 400;
        err.code = 'PROPERTY_REQUIRED';
        throw err;
      }
      updates.primaryPropertyId = Number(payload.primaryPropertyId || propertyIds[0]);
    }

    if (file) {
      const oldPath = promotion.bannerImage
        ? path.resolve(__dirname, '..', String(promotion.bannerImage).replace(/^\//, ''))
        : null;
      updates.bannerImage = `/uploads/promotions/${file.filename}`;
      if (oldPath && fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch { /* ignore */ }
      }
    }

    await sequelize.transaction(async (transaction) => {
      await promotion.update(updates, { transaction });
      if (propertyIds) {
        await this.syncProperties(promotion.id, propertyIds, transaction);
      }
    });

    const row = await this.findById(id);
    const becameActive = !wasActive && row.status === 'ACTIVE';
    if (becameActive) {
      try {
        await this.notifyPublished(row, req);
      } catch {
        // non-blocking
      }
    }
    return this.format(row, req);
  }

  async setStatus(id, status, req, actorId) {
    return this.update(id, { status }, null, req, actorId);
  }

  async remove(id) {
    const promotion = await Promotion.findByPk(id);
    if (!promotion) {
      const err = new Error('Promotion not found.');
      err.status = 404;
      err.code = 'PROMOTION_NOT_FOUND';
      throw err;
    }
    if (promotion.bannerImage) {
      const oldPath = path.resolve(__dirname, '..', String(promotion.bannerImage).replace(/^\//, ''));
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch { /* ignore */ }
      }
    }
    await promotion.destroy();
    return true;
  }
}

module.exports = new PromotionService();
module.exports.TYPE_LABELS = TYPE_LABELS;
