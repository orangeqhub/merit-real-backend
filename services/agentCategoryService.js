'use strict';

const { Op } = require('sequelize');
const { AgentCategory } = require('../models');

function slugifyCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

class AgentCategoryService {
  format(category) {
    return {
      id: category.id,
      code: category.code,
      name: category.name,
      description: category.description,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  async listActive() {
    const rows = await AgentCategory.findAll({
      where: { isActive: true },
      order: [['sortOrder', 'ASC'], ['id', 'ASC']],
    });
    return rows.map((row) => this.format(row));
  }

  async listAll() {
    const rows = await AgentCategory.findAll({
      order: [['sortOrder', 'ASC'], ['id', 'ASC']],
    });
    return rows.map((row) => this.format(row));
  }

  async findActiveById(id) {
    return AgentCategory.findOne({
      where: { id, isActive: true },
    });
  }

  async create({ code, name, description, sortOrder, isActive }) {
    const resolvedCode = slugifyCode(code || name);
    if (!resolvedCode) {
      const err = new Error('Category code is required.');
      err.status = 400;
      err.code = 'INVALID_CATEGORY_CODE';
      throw err;
    }
    if (!name || !String(name).trim()) {
      const err = new Error('Category name is required.');
      err.status = 400;
      err.code = 'INVALID_CATEGORY_NAME';
      throw err;
    }

    const existing = await AgentCategory.findOne({ where: { code: resolvedCode } });
    if (existing) {
      const err = new Error(`Category code "${resolvedCode}" already exists.`);
      err.status = 409;
      err.code = 'DUPLICATE_CATEGORY';
      throw err;
    }

    const category = await AgentCategory.create({
      code: resolvedCode,
      name: String(name).trim(),
      description: description ? String(description).trim() : null,
      sortOrder: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
      isActive: isActive !== false,
    });

    return this.format(category);
  }

  async update(id, payload) {
    const category = await AgentCategory.findByPk(id);
    if (!category) {
      const err = new Error('Agent category not found.');
      err.status = 404;
      err.code = 'CATEGORY_NOT_FOUND';
      throw err;
    }

    const updates = {};
    if (payload.name != null) updates.name = String(payload.name).trim();
    if (payload.description !== undefined) {
      updates.description = payload.description ? String(payload.description).trim() : null;
    }
    if (payload.sortOrder !== undefined) {
      updates.sortOrder = Number(payload.sortOrder) || 0;
    }
    if (payload.isActive !== undefined) {
      updates.isActive = Boolean(payload.isActive);
    }
    if (payload.code != null) {
      const resolvedCode = slugifyCode(payload.code);
      if (!resolvedCode) {
        const err = new Error('Category code is required.');
        err.status = 400;
        err.code = 'INVALID_CATEGORY_CODE';
        throw err;
      }
      const clash = await AgentCategory.findOne({
        where: { code: resolvedCode, id: { [Op.ne]: id } },
      });
      if (clash) {
        const err = new Error(`Category code "${resolvedCode}" already exists.`);
        err.status = 409;
        err.code = 'DUPLICATE_CATEGORY';
        throw err;
      }
      updates.code = resolvedCode;
    }

    await category.update(updates);
    return this.format(category);
  }
}

module.exports = new AgentCategoryService();
