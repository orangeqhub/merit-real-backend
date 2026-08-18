'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // 1. Delete removed categories: residential-plot, venture-plot, commercial-plot, commercial-land
    const deletedSlugs = ['residential-plot', 'venture-plot', 'commercial-plot', 'commercial-land'];

    const [cats] = await queryInterface.sequelize.query(
      `SELECT id FROM "PropertyCategories" WHERE slug IN (${deletedSlugs.map((s) => `'${s}'`).join(',')})`
    );

    if (cats.length > 0) {
      const ids = cats.map((c) => c.id);
      await queryInterface.bulkDelete('PropertyAttributes', { categoryId: ids });
      await queryInterface.bulkDelete('PropertyCategories', { id: ids });
    }

    // 2. Rename remaining 6 categories and set images
    const updates = [
      { slug: 'agricultural-land', nameEn: 'Lands', nameTe: 'భూములు', image: '/lands.jpg' },
      { slug: 'apartment', nameEn: 'Apartments', nameTe: 'అపార్ట్\u200Cమెంట్లు', image: '/apartments.jpg' },
      { slug: 'open-plot', nameEn: 'Approved Layouts', nameTe: 'ఆమోదించబడిన లేఅవుట్లు', image: '/approved-layouts.jpg' },
      { slug: 'farm-land', nameEn: 'Farm Lands', nameTe: 'ఫార్మ్ ల్యాండ్స్', image: '/farm-lands.jpg' },
      { slug: 'villa', nameEn: 'Villa Projects', nameTe: 'విల్లా ప్రాజెక్టులు', image: '/villa-projects.jpg' },
      { slug: 'independent-house', nameEn: 'Individual Houses', nameTe: 'ఇండివిడ్యుయల్ హౌస్\u200Cలు', image: '/independent-house.jpg' },
    ];

    for (const u of updates) {
      await queryInterface.sequelize.query(
        `UPDATE "PropertyCategories" SET "nameEn" = '${u.nameEn}', "nameTe" = '${u.nameTe}', image = '${u.image}' WHERE slug = '${u.slug}'`
      );
    }
  },

  async down(queryInterface) {
    const reverts = [
      { slug: 'agricultural-land', nameEn: 'Agricultural Land', nameTe: 'వ్యవసాయ భూమి' },
      { slug: 'apartment', nameEn: 'Apartment', nameTe: 'అపార్ట్\u200Cమెంట్' },
      { slug: 'open-plot', nameEn: 'Open Plot', nameTe: 'ఓపెన్ ప్లాట్' },
      { slug: 'farm-land', nameEn: 'Farm Land', nameTe: 'ఫార్మ్ ల్యాండ్' },
      { slug: 'villa', nameEn: 'Villa', nameTe: 'విల్లా' },
      { slug: 'independent-house', nameEn: 'Independent House', nameTe: 'స్వతంత్ర ఇల్లు' },
    ];

    for (const r of reverts) {
      await queryInterface.sequelize.query(
        `UPDATE "PropertyCategories" SET "nameEn" = '${r.nameEn}', "nameTe" = '${r.nameTe}', image = NULL WHERE slug = '${r.slug}'`
      );
    }

    // Re-insert deleted categories
    const now = new Date();
    const reinsert = [
      { slug: 'residential-plot', nameEn: 'Residential Plot', nameTe: 'నివాస ప్లాట్', ruleKey: 'residentialPlot', icon: 'Map' },
      { slug: 'venture-plot', nameEn: 'Venture Plot', nameTe: 'వెంచర్ ప్లాట్', ruleKey: 'venturePlot', icon: 'Landmark' },
      { slug: 'commercial-plot', nameEn: 'Commercial Plot', nameTe: 'వాణిజ్య ప్లాట్', ruleKey: 'commercialPlot', icon: 'Store' },
      { slug: 'commercial-land', nameEn: 'Commercial Land', nameTe: 'వాణిజ్య భూమి', ruleKey: 'commercialLand', icon: 'Briefcase' },
    ];

    for (const item of reinsert) {
      await queryInterface.bulkInsert('PropertyCategories', [{
        slug: item.slug,
        nameEn: item.nameEn,
        nameTe: item.nameTe,
        descriptionEn: null,
        descriptionTe: null,
        groupLabel: null,
        image: null,
        icon: item.icon,
        ruleKey: item.ruleKey,
        transactionTypes: `['sale']`,
        areaUnits: `['sqft']`,
        propertyFields: null,
        active: true,
        visible: true,
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      }]);
    }
  },
};
