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

class MapBookingService {
  async list({ status, propertyId, search, page = 1, pageSize = 100 } = {}) {
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

    const { rows, count } = await MapPlot.findAndCountAll({
      where,
      include: [{ model: Property, as: 'property', attributes: ['id', 'titleEn', 'status'] }],
      order: [['plotNo', 'ASC']],
      limit,
      offset,
    });

    return {
      items: rows.map(formatPlot),
      total: count,
      page: Math.max(Number(page) || 1, 1),
      pageSize: limit,
      totalPages: Math.max(1, Math.ceil(count / limit)),
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
}

module.exports = new MapBookingService();
