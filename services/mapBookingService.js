'use strict';

const { Op } = require('sequelize');
const { MapPlot, Property, User, sequelize } = require('../models');

function formatPlot(row) {
  if (!row) return null;
  const r = row.toJSON ? row.toJSON() : row;
  return {
    id: r.id,
    externalId: r.externalId,
    plotNo: r.plotNo,
    propertyId: r.propertyId || null,
    customerName: r.customerName || null,
    customerId: r.customerId || null,
    plotArea: r.plotArea != null ? Number(r.plotArea) : null,
    facing: r.facing || null,
    status: r.status,
    remarks: r.remarks || null,
    plotCost: r.plotCost != null ? Number(r.plotCost) : null,
    sizeEast: r.sizeEast != null ? Number(r.sizeEast) : null,
    sizeWest: r.sizeWest != null ? Number(r.sizeWest) : null,
    sizeNorth: r.sizeNorth != null ? Number(r.sizeNorth) : null,
    sizeSouth: r.sizeSouth != null ? Number(r.sizeSouth) : null,
    bookingRequestId: r.bookingRequestId || null,
    bookedAt: r.bookedAt || null,
    property: r.property
      ? { id: r.property.id, titleEn: r.property.titleEn, status: r.property.status }
      : null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function plotNoKey(plotNo) {
  return String(plotNo || '').trim().toLowerCase();
}

function plotNoNumeric(plotNo) {
  const n = Number(String(plotNo || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

function statusRank(status) {
  const key = String(status || '').toLowerCase();
  if (key === 'sold') return 0;
  if (key === 'registered') return 1;
  if (key === 'booked') return 2;
  return 3;
}

/** Prefer booked/sold, priced, and smaller-area rows when collapsing duplicates. */
function preferPlot(a, b) {
  const byStatus = statusRank(a.status) - statusRank(b.status);
  if (byStatus !== 0) return byStatus < 0 ? a : b;

  const aPriced = a.plotCost != null && Number(a.plotCost) > 0 ? 0 : 1;
  const bPriced = b.plotCost != null && Number(b.plotCost) > 0 ? 0 : 1;
  if (aPriced !== bPriced) return aPriced < bPriced ? a : b;

  const aArea = a.plotArea != null ? Number(a.plotArea) : Number.POSITIVE_INFINITY;
  const bArea = b.plotArea != null ? Number(b.plotArea) : Number.POSITIVE_INFINITY;
  if (aArea !== bArea) return aArea < bArea ? a : b;

  return Number(a.id || 0) <= Number(b.id || 0) ? a : b;
}

function dedupeByPlotNo(items) {
  const map = new Map();
  for (const item of items) {
    const key = plotNoKey(item.plotNo);
    if (!key) continue;
    const existing = map.get(key);
    map.set(key, existing ? preferPlot(existing, item) : item);
  }
  return Array.from(map.values()).sort((a, b) => {
    const diff = plotNoNumeric(a.plotNo) - plotNoNumeric(b.plotNo);
    if (diff !== 0) return diff;
    return String(a.plotNo).localeCompare(String(b.plotNo));
  });
}

function numericPlotNoOrder() {
  return [
    [
      sequelize.literal(
        `CAST(NULLIF(regexp_replace("MapPlot"."plotNo", '[^0-9]', '', 'g'), '') AS INTEGER)`
      ),
      'ASC NULLS LAST',
    ],
    ['plotNo', 'ASC'],
    ['id', 'ASC'],
  ];
}

function truthyFlag(value) {
  return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true';
}

class MapBookingService {
  async list({ status, propertyId, search, page = 1, pageSize = 100, unique = false } = {}) {
    const where = {};
    if (status) where.status = String(status).toLowerCase();
    if (propertyId) where.propertyId = Number(propertyId);
    if (search) {
      where[Op.or] = [
        { plotNo: { [Op.iLike]: `%${search}%` } },
        { externalId: { [Op.iLike]: `%${search}%` } },
        { customerName: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const limit = Math.min(Math.max(Number(pageSize) || 100, 1), 500);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;
    const include = [{ model: Property, as: 'property', attributes: ['id', 'titleEn', 'status'] }];
    const order = numericPlotNoOrder();
    const uniqueOnly = truthyFlag(unique);

    const rows = await MapPlot.findAll({ where, include, order });
    let items = rows.map(formatPlot);
    if (uniqueOnly) items = dedupeByPlotNo(items);

    const total = items.length;
    return {
      items: items.slice(offset, offset + limit),
      total,
      page: Math.max(Number(page) || 1, 1),
      pageSize: limit,
      totalPages: Math.max(1, Math.ceil(total / limit) || 1),
    };
  }

  async getById(idOrExternal) {
    const where = /^\d+$/.test(String(idOrExternal))
      ? { id: Number(idOrExternal) }
      : { externalId: String(idOrExternal) };
    const row = await MapPlot.findOne({
      where,
      include: [{ model: Property, as: 'property', attributes: ['id', 'titleEn', 'status'] }],
    });
    if (!row) {
      const err = new Error('Plot not found.');
      err.status = 404;
      err.code = 'PLOT_NOT_FOUND';
      throw err;
    }
    return formatPlot(row);
  }

  async upsert(payload = {}) {
    const externalId = String(payload.externalId || payload.id || '').trim();
    if (!externalId) {
      const err = new Error('externalId is required.');
      err.status = 400;
      throw err;
    }
    const plotNo = String(payload.plotNo || externalId).trim();
    const [row] = await MapPlot.findOrCreate({
      where: { externalId },
      defaults: {
        plotNo,
        propertyId: payload.propertyId || null,
        customerName: payload.customerName || null,
        customerId: payload.customerId || null,
        plotArea: payload.plotArea ?? null,
        facing: payload.facing || null,
        status: payload.status || 'available',
        remarks: payload.remarks || null,
        plotCost: payload.plotCost ?? null,
        sizeEast: payload.sizeEast ?? null,
        sizeWest: payload.sizeWest ?? null,
        sizeNorth: payload.sizeNorth ?? null,
        sizeSouth: payload.sizeSouth ?? null,
      },
    });

    if (!row.isNewRecord) {
      await row.update({
        plotNo: payload.plotNo != null ? String(payload.plotNo).trim() : row.plotNo,
        propertyId: payload.propertyId !== undefined ? payload.propertyId : row.propertyId,
        customerName: payload.customerName !== undefined ? payload.customerName : row.customerName,
        customerId: payload.customerId !== undefined ? payload.customerId : row.customerId,
        plotArea: payload.plotArea !== undefined ? payload.plotArea : row.plotArea,
        facing: payload.facing !== undefined ? payload.facing : row.facing,
        status: payload.status !== undefined ? payload.status : row.status,
        remarks: payload.remarks !== undefined ? payload.remarks : row.remarks,
        plotCost: payload.plotCost !== undefined ? payload.plotCost : row.plotCost,
        sizeEast: payload.sizeEast !== undefined ? payload.sizeEast : row.sizeEast,
        sizeWest: payload.sizeWest !== undefined ? payload.sizeWest : row.sizeWest,
        sizeNorth: payload.sizeNorth !== undefined ? payload.sizeNorth : row.sizeNorth,
        sizeSouth: payload.sizeSouth !== undefined ? payload.sizeSouth : row.sizeSouth,
      });
    }

    return this.getById(row.id);
  }

  async book(idOrExternal, body = {}, actor = null) {
    return sequelize.transaction(async (transaction) => {
      const where = /^\d+$/.test(String(idOrExternal))
        ? { id: Number(idOrExternal) }
        : { externalId: String(idOrExternal) };
      const row = await MapPlot.findOne({ where, transaction, lock: transaction.LOCK.UPDATE });
      if (!row) {
        const err = new Error('Plot not found.');
        err.status = 404;
        throw err;
      }
      if (row.status !== 'available') {
        const err = new Error('Plot is not available for booking.');
        err.status = 409;
        err.code = 'PLOT_NOT_AVAILABLE';
        throw err;
      }

      let customerId = body.customerId ? Number(body.customerId) : actor?.id || null;
      let customerName = body.customerName || null;
      if (customerId && !customerName) {
        const customer = await User.findByPk(customerId, { attributes: ['id', 'name'], transaction });
        customerName = customer?.name || null;
      }

      await row.update({
        status: 'booked',
        customerId,
        customerName,
        remarks: body.remarks != null ? body.remarks : row.remarks,
        bookingRequestId: body.bookingRequestId || null,
        bookedAt: new Date(),
      }, { transaction });

      return formatPlot(row);
    });
  }

  async updateStatus(idOrExternal, body = {}) {
    const where = /^\d+$/.test(String(idOrExternal))
      ? { id: Number(idOrExternal) }
      : { externalId: String(idOrExternal) };
    const row = await MapPlot.findOne({ where });
    if (!row) {
      const err = new Error('Plot not found.');
      err.status = 404;
      throw err;
    }
    const nextStatus = String(body.status || '').toLowerCase();
    if (!['available', 'booked', 'registered', 'sold'].includes(nextStatus)) {
      const err = new Error('Invalid plot status.');
      err.status = 400;
      throw err;
    }
    await row.update({
      status: nextStatus,
      customerName: body.customerName !== undefined ? body.customerName : row.customerName,
      customerId: body.customerId !== undefined ? body.customerId : row.customerId,
      remarks: body.remarks !== undefined ? body.remarks : row.remarks,
      bookingRequestId: body.bookingRequestId !== undefined ? body.bookingRequestId : row.bookingRequestId,
      bookedAt: nextStatus === 'available' ? null : (row.bookedAt || new Date()),
    });
    return this.getById(row.id);
  }

  async seedPlots(items = []) {
    if (!Array.isArray(items) || !items.length) {
      const err = new Error('Plot seed items are required.');
      err.status = 400;
      throw err;
    }
    let created = 0;
    let updated = 0;
    for (const item of items) {
      const externalId = String(item.externalId || item.id || '').trim();
      if (!externalId) continue;
      const existing = await MapPlot.findOne({ where: { externalId } });
      await this.upsert({
        externalId,
        plotNo: item.plotNo || item.plotNumber || externalId,
        plotArea: item.plotArea ?? item.area ?? null,
        facing: item.facing || null,
        status: item.status || 'available',
        plotCost: item.plotCost ?? null,
        sizeEast: item.sizeEast ?? null,
        sizeWest: item.sizeWest ?? null,
        sizeNorth: item.sizeNorth ?? null,
        sizeSouth: item.sizeSouth ?? null,
        propertyId: item.propertyId || null,
      });
      if (existing) updated += 1;
      else created += 1;
    }
    return { created, updated, total: created + updated };
  }

  /**
   * Update pricing/details. Updates all rows sharing the same plotNo
   * so duplicate map geometries stay in sync.
   */
  async updatePricing(payload = {}) {
    const rawId = payload.id != null ? String(payload.id).trim() : '';
    const externalId = payload.externalId != null ? String(payload.externalId).trim() : '';
    const plotNoInput = payload.plotNo != null ? String(payload.plotNo).trim() : '';

    let seedRow = null;
    if (/^\d+$/.test(rawId)) {
      seedRow = await MapPlot.findByPk(Number(rawId));
    } else if (rawId) {
      seedRow = await MapPlot.findOne({ where: { externalId: rawId } });
      if (!seedRow) {
        const byPlotNo = await MapPlot.findAll({ where: { plotNo: rawId } });
        seedRow = byPlotNo[0] || null;
      }
    } else if (externalId) {
      seedRow = await MapPlot.findOne({ where: { externalId } });
    } else if (plotNoInput) {
      const byPlotNo = await MapPlot.findAll({ where: { plotNo: plotNoInput } });
      seedRow = byPlotNo[0] || null;
    } else {
      const err = new Error('id, externalId, or plotNo is required.');
      err.status = 400;
      throw err;
    }

    if (!seedRow) {
      const err = new Error('Plot not found.');
      err.status = 404;
      err.code = 'PLOT_NOT_FOUND';
      throw err;
    }

    const plotNo = plotNoInput || seedRow.plotNo;
    const rows = await MapPlot.findAll({ where: { plotNo } });

    const updates = {};
    if (payload.plotCost !== undefined) {
      updates.plotCost =
        payload.plotCost === null || payload.plotCost === ''
          ? null
          : Number(payload.plotCost);
    }
    if (payload.facing !== undefined) updates.facing = payload.facing || null;
    if (payload.remarks !== undefined) updates.remarks = payload.remarks || null;
    if (payload.plotArea !== undefined) {
      updates.plotArea =
        payload.plotArea === null || payload.plotArea === ''
          ? null
          : Number(payload.plotArea);
    }
    if (payload.status !== undefined) {
      const nextStatus = String(payload.status || '').toLowerCase();
      if (['available', 'booked', 'registered', 'sold'].includes(nextStatus)) {
        updates.status = nextStatus;
      }
    }

    for (const row of rows) {
      await row.update(updates);
    }

    return {
      updated: rows.length,
      plotNo,
      items: await Promise.all(rows.map((row) => this.getById(row.id))),
    };
  }

  /**
   * Bulk set prices. Supports:
   * - items: [{ plotNo|externalId|id, plotCost }, ...]
   * - ratePerSqYd: number (cost = area * rate), optional onlyEmpty
   * - plotCost + plotNos: apply same cost to many plot numbers
   */
  async bulkPricing(payload = {}) {
    let updated = 0;
    const results = [];

    if (Array.isArray(payload.items) && payload.items.length) {
      for (const item of payload.items) {
        const result = await this.updatePricing(item);
        updated += result.updated;
        results.push(result);
      }
      return { updated, results };
    }

    if (payload.plotCost !== undefined && Array.isArray(payload.plotNos) && payload.plotNos.length) {
      for (const plotNo of payload.plotNos) {
        const result = await this.updatePricing({ plotNo, plotCost: payload.plotCost });
        updated += result.updated;
        results.push(result);
      }
      return { updated, results };
    }

    const rate = Number(payload.ratePerSqYd);
    if (Number.isFinite(rate) && rate >= 0) {
      const onlyEmpty = truthyFlag(payload.onlyEmpty);
      const rows = await MapPlot.findAll();
      for (const row of rows) {
        if (onlyEmpty && row.plotCost != null && Number(row.plotCost) > 0) continue;
        const area = Number(row.plotArea) || 0;
        const plotCost = Math.round(area * rate * 100) / 100;
        await row.update({ plotCost });
        updated += 1;
      }
      return { updated, ratePerSqYd: rate, onlyEmpty };
    }

    const err = new Error('Provide items, plotNos+plotCost, or ratePerSqYd.');
    err.status = 400;
    throw err;
  }
}

module.exports = new MapBookingService();
