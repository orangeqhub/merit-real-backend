'use strict';

const { SiteSetting } = require('../models');

class SiteSettingService {
  format(row) {
    if (!row) {
      return { id: null, address: '', phone: '', email: '', updatedAt: null };
    }
    const r = row.toJSON ? row.toJSON() : row;
    return {
      id: r.id,
      address: r.address || '',
      phone: r.phone || '',
      email: r.email || '',
      updatedAt: r.updatedAt || null,
    };
  }

  async getOrCreate() {
    let row = await SiteSetting.findOne({ order: [['id', 'ASC']] });
    if (!row) {
      row = await SiteSetting.create({ address: '', phone: '', email: '' });
    }
    return row;
  }

  async getPublic() {
    const row = await this.getOrCreate();
    return this.format(row);
  }

  async update(body, adminUser) {
    const row = await this.getOrCreate();
    row.address = String(body.address ?? row.address ?? '').trim();
    row.phone = String(body.phone ?? row.phone ?? '').trim();
    row.email = String(body.email ?? row.email ?? '').trim();
    row.updatedBy = adminUser?.id || null;
    await row.save();
    return this.format(row);
  }
}

module.exports = new SiteSettingService();
