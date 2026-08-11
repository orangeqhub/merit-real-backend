'use strict';

const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { HeroSlide } = require('../models');
const { resolveMediaUrl } = require('../utils/mediaUrl');

class HeroSlideService {
  format(slide, req) {
    return {
      id: slide.id,
      image: resolveMediaUrl(req, slide.imagePath),
      imagePath: slide.imagePath,
      headingEn: slide.headingEn || '',
      headingTe: slide.headingTe || '',
      subtitleEn: slide.subtitleEn || '',
      subtitleTe: slide.subtitleTe || '',
      status: slide.status,
      sortOrder: slide.sortOrder,
      startsAt: slide.startsAt,
      endsAt: slide.endsAt,
      createdAt: slide.createdAt,
      updatedAt: slide.updatedAt,
    };
  }

  async listActive(req) {
    const now = new Date();
    const rows = await HeroSlide.findAll({
      where: {
        status: 'active',
        [Op.and]: [
          { [Op.or]: [{ startsAt: null }, { startsAt: { [Op.lte]: now } }] },
          { [Op.or]: [{ endsAt: null }, { endsAt: { [Op.gte]: now } }] },
        ],
      },
      order: [['sortOrder', 'ASC'], ['id', 'ASC']],
    });
    return rows.map((row) => this.format(row, req));
  }

  async listAll(req) {
    const rows = await HeroSlide.findAll({
      order: [['sortOrder', 'ASC'], ['id', 'ASC']],
    });
    return rows.map((row) => this.format(row, req));
  }

  async create(payload, file, req) {
    if (!file) {
      const err = new Error('Hero image is required.');
      err.status = 400;
      err.code = 'IMAGE_REQUIRED';
      throw err;
    }

    const imagePath = `/uploads/hero/${file.filename}`;
    const maxOrder = await HeroSlide.max('sortOrder');
    const sortOrder = Number.isFinite(Number(payload.sortOrder))
      ? Number(payload.sortOrder)
      : (Number.isFinite(maxOrder) ? maxOrder + 1 : 0);

    const slide = await HeroSlide.create({
      imagePath,
      headingEn: payload.headingEn || '',
      headingTe: payload.headingTe || '',
      subtitleEn: payload.subtitleEn || '',
      subtitleTe: payload.subtitleTe || '',
      status: payload.status === 'inactive' ? 'inactive' : 'active',
      sortOrder,
      startsAt: payload.startsAt || null,
      endsAt: payload.endsAt || null,
    });

    return this.format(slide, req);
  }

  async update(id, payload, file, req) {
    const slide = await HeroSlide.findByPk(id);
    if (!slide) {
      const err = new Error('Hero slide not found.');
      err.status = 404;
      err.code = 'HERO_SLIDE_NOT_FOUND';
      throw err;
    }

    const updates = {};
    if (payload.headingEn !== undefined) updates.headingEn = payload.headingEn;
    if (payload.headingTe !== undefined) updates.headingTe = payload.headingTe;
    if (payload.subtitleEn !== undefined) updates.subtitleEn = payload.subtitleEn;
    if (payload.subtitleTe !== undefined) updates.subtitleTe = payload.subtitleTe;
    if (payload.status !== undefined) {
      updates.status = payload.status === 'inactive' ? 'inactive' : 'active';
    }
    if (payload.sortOrder !== undefined) {
      updates.sortOrder = Number(payload.sortOrder) || 0;
    }
    if (payload.startsAt !== undefined) {
      updates.startsAt = payload.startsAt || null;
    }
    if (payload.endsAt !== undefined) {
      updates.endsAt = payload.endsAt || null;
    }

    if (file) {
      const oldPath = slide.imagePath
        ? path.resolve(__dirname, '..', String(slide.imagePath).replace(/^\//, ''))
        : null;
      updates.imagePath = `/uploads/hero/${file.filename}`;
      if (oldPath && fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    await slide.update(updates);
    return this.format(slide, req);
  }

  async remove(id) {
    const slide = await HeroSlide.findByPk(id);
    if (!slide) {
      const err = new Error('Hero slide not found.');
      err.status = 404;
      err.code = 'HERO_SLIDE_NOT_FOUND';
      throw err;
    }

    const oldPath = slide.imagePath
      ? path.resolve(__dirname, '..', String(slide.imagePath).replace(/^\//, ''))
      : null;

    await slide.destroy();

    if (oldPath && fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }

    return true;
  }
}

module.exports = new HeroSlideService();
