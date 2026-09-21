'use strict';

const { CmsContent } = require('../models');

const TEXT_FIELDS = [
  'aboutEn',
  'aboutTe',
  'disclaimerEn',
  'disclaimerTe',
  'contactPhone',
  'contactWhatsapp',
  'contactEmail',
  'contactAddressEn',
  'contactAddressTe',
  'contactLandmarkEn',
  'contactLandmarkTe',
  'contactMapUrl',
  'businessHoursWeekdayEn',
  'businessHoursWeekdayTe',
  'businessHoursSundayEn',
  'businessHoursSundayTe',
];

const EMPTY_CMS = Object.fromEntries(TEXT_FIELDS.map((field) => [field, '']));

class CmsContentService {
  format(row) {
    if (!row) {
      return { id: null, ...EMPTY_CMS, updatedAt: null };
    }
    const r = row.toJSON ? row.toJSON() : row;
    const data = { id: r.id, updatedAt: r.updatedAt || null };
    TEXT_FIELDS.forEach((field) => {
      data[field] = r[field] || '';
    });
    return data;
  }

  async getOrCreate() {
    let row = await CmsContent.findOne({ order: [['id', 'ASC']] });
    if (!row) {
      row = await CmsContent.create({ ...EMPTY_CMS });
    }
    return row;
  }

  async getPublic() {
    const row = await this.getOrCreate();
    return this.format(row);
  }

  async update(body, adminUser) {
    const row = await this.getOrCreate();
    TEXT_FIELDS.forEach((field) => {
      if (body[field] !== undefined) {
        row[field] = String(body[field] ?? '').trim();
      }
    });
    row.updatedBy = adminUser?.id || null;
    await row.save();
    return this.format(row);
  }
}

module.exports = new CmsContentService();
