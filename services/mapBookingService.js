'use strict';

const { Op } = require('sequelize');
const { MapPlot, Property, User, sequelize } = require('../models');
const { toSeriesPlotNo, seriesPlotNoCandidates } = require('../utils/plotSeries');
const layoutPropertyService = require('./layoutPropertyService');

const DEFAULT_LAYOUT_KEY = 'anne-enclave';

function resolveLayoutKey(layout) {
  const key = String(layout || '').trim();
  if (!key) return null;
  if (!layoutPropertyService.isKnownLayout(key)) return null;
  return key;
}

function layoutWhere(layout) {
  const key = resolveLayoutKey(layout);
  return key ? { layoutKey: key } : {};
}

function layoutForCreate(layout, fallback = null) {
  const key = resolveLayoutKey(layout || fallback);
  return key || DEFAULT_LAYOUT_KEY;
}

/**
 * Reject calls where layout scoping is mandatory: it must be present AND a
 * known key. Used anywhere a lookup would otherwise be ambiguous across the
 * 6 layouts (list/search, and any externalId/plotNo lookup — externalId and
 * plotNo are only unique per layout, not globally).
 */
function requireLayout(layout) {
  const raw = layout != null ? String(layout).trim() : '';
  if (!raw) {
    const err = new Error('layout is required.');
    err.status = 400;
    err.code = 'LAYOUT_REQUIRED';
    throw err;
  }
  if (!layoutPropertyService.isKnownLayout(raw)) {
    const err = new Error(`Unknown layout '${raw}'.`);
    err.status = 400;
    err.code = 'UNKNOWN_LAYOUT';
    throw err;
  }
}

function formatPlot(row) {
  if (!row) return null;
  const r = row.toJSON ? row.toJSON() : row;
  return {
    id: r.id,
    externalId: r.externalId,
    layoutKey: r.layoutKey || DEFAULT_LAYOUT_KEY,
    plotNo: toSeriesPlotNo(r.phase, r.plotNo),
    phase: Number(r.phase) === 2 ? 2 : 1,
    propertyId: r.propertyId || null,
    customerName: r.customerName || null,
    customerId: r.customerId || null,
    plotArea: r.plotArea != null ? Number(r.plotArea) : null,
    facing: r.facing || null,
    status: r.status,
    remarks: r.remarks || null,
    plotCost: r.plotCost != null ? Number(r.plotCost) : null,
    ratePerSqYd: r.ratePerSqYd != null ? Number(r.ratePerSqYd) : null,
    plotType: r.plotType || 'residential',
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
  async list({ status, propertyId, search, page = 1, pageSize = 100, unique = false, phase, layout } = {}) {
    requireLayout(layout);
    const where = { ...layoutWhere(layout) };
    if (status) where.status = String(status).toLowerCase();
    if (propertyId) where.propertyId = Number(propertyId);
    if (phase === 1 || phase === 2 || phase === '1' || phase === '2') {
      where.phase = Number(phase);
    }
    if (search) {
      const term = String(search).trim();
      const or = [
        { plotNo: { [Op.iLike]: `%${term}%` } },
        { externalId: { [Op.iLike]: `%${term}%` } },
        { customerName: { [Op.iLike]: `%${term}%` } },
      ];
      if (phase === 2 || phase === '2') {
        for (const candidate of seriesPlotNoCandidates(2, term)) {
          or.push({ plotNo: candidate });
        }
      }
      where[Op.or] = or;
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

  async getById(idOrExternal, options = {}) {
    // plotNo and externalId are only unique per layout, not globally, so any
    // lookup that isn't a numeric primary key must be layout-scoped.
    const isNumericId = /^\d+$/.test(String(idOrExternal));
    const hasPlotNo = options.plotNo != null && String(options.plotNo).trim() !== '';
    if (hasPlotNo || !isNumericId) requireLayout(options.layout);
    const layoutScope = layoutWhere(options.layout);
    let where;
    if (hasPlotNo) {
      // layoutKey + plotNumber lookup (optionally phase-scoped).
      where = {
        ...layoutScope,
        plotNo: String(options.plotNo).trim(),
        ...(options.phase === 1 || options.phase === 2 || options.phase === '1' || options.phase === '2'
          ? { phase: Number(options.phase) }
          : {}),
      };
    } else {
      where = {
        ...layoutScope,
        ...(isNumericId
          ? { id: Number(idOrExternal) }
          : { externalId: String(idOrExternal) }),
      };
    }
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

  async upsert(payload = {}, options = {}) {
    const externalId = String(payload.externalId || payload.id || '').trim();
    if (!externalId) {
      const err = new Error('externalId is required.');
      err.status = 400;
      throw err;
    }
    const layoutKey = layoutForCreate(payload.layoutKey, options.layout);
    const plotNo = toSeriesPlotNo(payload.phase, payload.plotNo || externalId);
    const phase = Number(payload.phase) === 2 ? 2 : 1;
    const [row] = await MapPlot.findOrCreate({
      where: { externalId, layoutKey },
      defaults: {
        layoutKey,
        plotNo,
        phase,
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
        plotNo: payload.plotNo != null ? toSeriesPlotNo(payload.phase ?? row.phase, payload.plotNo) : row.plotNo,
        phase: payload.phase !== undefined ? (Number(payload.phase) === 2 ? 2 : 1) : row.phase,
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

  async book(idOrExternal, body = {}, actor = null, options = {}) {
    const isNumericId = /^\d+$/.test(String(idOrExternal));
    if (!isNumericId) requireLayout(options.layout);
    const run = async (transaction) => {
      const where = {
        ...layoutWhere(options.layout),
        ...(isNumericId
          ? { id: Number(idOrExternal) }
          : { externalId: String(idOrExternal) }),
      };
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
      const plotType = String(row.plotType || 'residential').toLowerCase();
      if (plotType !== 'residential') {
        const err = new Error('This plot is not available for booking (amenities/commercial).');
        err.status = 409;
        err.code = 'PLOT_NOT_SALEABLE';
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
    };

    if (options.transaction) return run(options.transaction);
    return sequelize.transaction(run);
  }

  async release(idOrExternal, options = {}) {
    const run = async (transaction) => {
      const where = {
        ...layoutWhere(options.layout),
        ...(/^\d+$/.test(String(idOrExternal))
          ? { id: Number(idOrExternal) }
          : { externalId: String(idOrExternal) }),
      };
      const row = await MapPlot.findOne({ where, transaction, lock: transaction.LOCK.UPDATE });
      if (!row) return null;
      if (row.status === 'sold' || row.status === 'registered') {
        return formatPlot(row);
      }
      await row.update({
        status: 'available',
        customerId: null,
        customerName: null,
        bookingRequestId: null,
        bookedAt: null,
      }, { transaction });
      return formatPlot(row);
    };

    if (options.transaction) return run(options.transaction);
    return sequelize.transaction(run);
  }

  async updateStatus(idOrExternal, body = {}, options = {}) {
    const isNumericId = /^\d+$/.test(String(idOrExternal));
    if (!isNumericId) requireLayout(options.layout);
    const where = {
      ...layoutWhere(options.layout),
      ...(isNumericId
        ? { id: Number(idOrExternal) }
        : { externalId: String(idOrExternal) }),
    };
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

  async seedPlots(items = [], options = {}) {
    if (!Array.isArray(items) || !items.length) {
      const err = new Error('Plot seed items are required.');
      err.status = 400;
      throw err;
    }
    const layoutKey = layoutForCreate(options.layout, items[0]?.layoutKey);
    let created = 0;
    let updated = 0;
    for (const item of items) {
      const externalId = String(item.externalId || item.id || '').trim();
      if (!externalId) continue;
      const existing = await MapPlot.findOne({ where: { externalId, layoutKey } });
      await this.upsert({
        externalId,
        layoutKey,
        plotNo: toSeriesPlotNo(item.phase, item.plotNo || item.plotNumber || externalId),
        phase: item.phase,
        plotArea: item.plotArea ?? item.area ?? null,
        facing: item.facing || null,
        status: item.status || 'available',
        plotCost: item.plotCost ?? null,
        sizeEast: item.sizeEast ?? null,
        sizeWest: item.sizeWest ?? null,
        sizeNorth: item.sizeNorth ?? null,
        sizeSouth: item.sizeSouth ?? null,
        propertyId: item.propertyId || null,
      }, { layout: layoutKey });
      if (existing) updated += 1;
      else created += 1;
    }
    return { created, updated, total: created + updated };
  }

  /**
   * Update pricing/details for one plot (and same plotNo within the same phase).
   */
  async updatePricing(payload = {}, options = {}) {
    requireLayout(options.layout);
    const rawId = payload.id != null ? String(payload.id).trim() : '';
    const externalId = payload.externalId != null ? String(payload.externalId).trim() : '';
    const plotNoInput = payload.plotNo != null ? String(payload.plotNo).trim() : '';
    const layoutScope = layoutWhere(options.layout);
    const phaseFilter =
      payload.phase === 1 || payload.phase === 2 || payload.phase === '1' || payload.phase === '2'
        ? Number(payload.phase)
        : null;

    let seedRow = null;
    if (/^\d+$/.test(rawId)) {
      seedRow = await MapPlot.findByPk(Number(rawId));
    } else if (rawId) {
      seedRow = await MapPlot.findOne({ where: { ...layoutScope, externalId: rawId } });
      if (!seedRow) {
        const where = { ...layoutScope, plotNo: rawId };
        if (phaseFilter) where.phase = phaseFilter;
        const byPlotNo = await MapPlot.findAll({ where });
        seedRow = byPlotNo[0] || null;
      }
    } else if (externalId) {
      seedRow = await MapPlot.findOne({ where: { ...layoutScope, externalId } });
    } else if (plotNoInput) {
      const where = { ...layoutScope, plotNo: plotNoInput };
      if (phaseFilter) where.phase = phaseFilter;
      const byPlotNo = await MapPlot.findAll({ where });
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
    const phase = phaseFilter || (Number(seedRow.phase) === 2 ? 2 : 1);
    const rows = await MapPlot.findAll({ where: { ...layoutScope, plotNo, phase } });

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
    if (payload.ratePerSqYd !== undefined) {
      updates.ratePerSqYd =
        payload.ratePerSqYd === null || payload.ratePerSqYd === ''
          ? null
          : Number(payload.ratePerSqYd);
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
      phase,
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
    requireLayout(payload.layout);
    let updated = 0;
    const results = [];
    const layoutScope = layoutWhere(payload.layout);

    if (Array.isArray(payload.items) && payload.items.length) {
      for (const item of payload.items) {
        const result = await this.updatePricing(item, { layout: payload.layout });
        updated += result.updated;
        results.push(result);
      }
      return { updated, results, layout: payload.layout || null };
    }

    if (payload.plotCost !== undefined && Array.isArray(payload.plotNos) && payload.plotNos.length) {
      for (const plotNo of payload.plotNos) {
        const result = await this.updatePricing({ plotNo, plotCost: payload.plotCost }, { layout: payload.layout });
        updated += result.updated;
        results.push(result);
      }
      return { updated, results, layout: payload.layout || null };
    }

    const rate = Number(payload.ratePerSqYd);
    if (Number.isFinite(rate) && rate >= 0) {
      const onlyEmpty = truthyFlag(payload.onlyEmpty);
      const where = { ...layoutScope };
      if (payload.phase === 1 || payload.phase === 2 || payload.phase === '1' || payload.phase === '2') {
        where.phase = Number(payload.phase);
      }
      const rows = await MapPlot.findAll({ where });
      for (const row of rows) {
        if (String(row.plotType || 'residential').toLowerCase() !== 'residential') continue;
        if (onlyEmpty && row.plotCost != null && Number(row.plotCost) > 0) continue;
        const area = Number(row.plotArea) || 0;
        if (area <= 0) continue;
        const plotCost = Math.round(area * rate * 100) / 100;
        await row.update({ plotCost, ratePerSqYd: rate });
        updated += 1;
      }
      return { updated, ratePerSqYd: rate, onlyEmpty, phase: where.phase || null, layout: payload.layout || null };
    }

    const err = new Error('Provide items, plotNos+plotCost, or ratePerSqYd.');
    err.status = 400;
    throw err;
  }

  /**
   * Import pricing sheet rows for a phase.
   * Matches existing MapPlots by (phase, plotNo). Does not create new geometries.
   */
  async importSheet({ phase, rows = [], layout } = {}) {
    requireLayout(layout);
    const phaseNum = Number(phase) === 2 ? 2 : 1;
    if (!Array.isArray(rows) || !rows.length) {
      const err = new Error('Sheet rows are required.');
      err.status = 400;
      throw err;
    }
    return this._importPhaseRows(phaseNum, rows, null, layout);
  }

  /**
   * Import Phase 1 + Phase 2 rows from one workbook in a single transaction.
   */
  async importWorkbook({ phase1 = [], phase2 = [], layout } = {}) {
    requireLayout(layout);
    if (!Array.isArray(phase1) || !phase1.length || !Array.isArray(phase2) || !phase2.length) {
      const err = new Error('Both Phase 1 and Phase 2 row sets are required.');
      err.status = 400;
      throw err;
    }

    return sequelize.transaction(async (transaction) => {
      const phase1Result = await this._importPhaseRows(1, phase1, transaction, layout);
      const phase2Result = await this._importPhaseRows(2, phase2, transaction, layout);
      return {
        phase1: phase1Result,
        phase2: phase2Result,
        updated: phase1Result.updated + phase2Result.updated,
        skipped: phase1Result.skipped + phase2Result.skipped,
        totalRows: phase1Result.totalRows + phase2Result.totalRows,
        errors: [...phase1Result.errors, ...phase2Result.errors].slice(0, 50),
        layout: layout || null,
      };
    });
  }

  async _importPhaseRows(phaseNum, rows, transaction, layout) {
    let updated = 0;
    let skipped = 0;
    const errors = [];
    const items = [];
    const tx = transaction ? { transaction } : {};
    const layoutScope = layoutWhere(layout);

    for (const raw of rows) {
      const plotNo = String(raw.plotNo ?? raw.plotNumber ?? raw['plot.no'] ?? '').trim();
      if (!plotNo) {
        skipped += 1;
        errors.push({ plotNo: null, reason: 'Missing plot number', phase: phaseNum });
        continue;
      }

      const seriesPlotNo = toSeriesPlotNo(phaseNum, plotNo);
      const candidates = seriesPlotNoCandidates(phaseNum, plotNo);
      const row = await MapPlot.findOne({
        where: {
          ...layoutScope,
          phase: phaseNum,
          plotNo: { [Op.in]: candidates },
        },
        ...tx,
      });
      if (!row) {
        skipped += 1;
        errors.push({ plotNo: seriesPlotNo, reason: `Plot not found in phase ${phaseNum}`, phase: phaseNum });
        continue;
      }

      const plotType = normalizePlotType(raw.plotType ?? raw.rateRaw ?? raw.costPerSqYd);
      const area = parseLooseNumber(raw.plotArea ?? raw.area ?? raw['plot sq.yds']);
      const rate = plotType === 'residential'
        ? parseLooseNumber(raw.ratePerSqYd ?? raw.costPerSqYd ?? raw['cost per sq.yds'])
        : null;
      let total = parseLooseNumber(raw.plotCost ?? raw.totalCost ?? raw['total cost']);
      if (total == null && area != null && rate != null) {
        total = Math.round(area * rate * 100) / 100;
      }
      const facing = raw.facing != null ? String(raw.facing).trim() : null;

      // Optional business-data columns: when the sheet carries a Status and/or
      // Customer column, apply them to THIS layout's row only. Pricing-only
      // workbooks (no such columns) leave status/customer untouched.
      const rawStatus = String(raw.status ?? '').trim().toLowerCase();
      const statusMap = {
        available: 'available',
        avail: 'available',
        open: 'available',
        '1': 'available',
        booked: 'booked',
        book: 'booked',
        reserved: 'booked',
        registered: 'registered',
        reg: 'registered',
        sold: 'sold',
      };
      const nextStatus = rawStatus ? (statusMap[rawStatus] || null) : null;
      const rawCustomer =
        raw.customerName != null
          ? String(raw.customerName).trim()
          : raw.customer != null
            ? String(raw.customer).trim()
            : '';

      const patch = {
        plotType,
        plotNo: seriesPlotNo,
      };
      if (area != null) patch.plotArea = area;
      if (facing) patch.facing = facing;
      if (rate != null) patch.ratePerSqYd = rate;
      if (total != null) patch.plotCost = total;
      if (nextStatus) patch.status = nextStatus;
      if (rawCustomer) patch.customerName = rawCustomer;
      if (plotType !== 'residential') {
        patch.ratePerSqYd = null;
        if (total == null) patch.plotCost = null;
      }

      await row.update(patch, tx);
      updated += 1;
      items.push(formatPlot(await row.reload(tx)));
    }

    return {
      phase: phaseNum,
      updated,
      skipped,
      totalRows: rows.length,
      errors: errors.slice(0, 50),
      items: items.slice(0, 20),
    };
  }
}

function parseLooseNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = String(value).replace(/,/g, '').trim();
  if (!text || /[a-zA-Z]/.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function normalizePlotType(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return 'residential';
  if (/immunit|amenit|open\s*space/.test(text)) return 'amenities';
  if (/commer/.test(text)) return 'commercial';
  if (/mortgage/.test(text)) return 'mortgage';
  return 'residential';
}

module.exports = new MapBookingService();
