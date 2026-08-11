'use strict';

const seed = require('../data/propertyTypeSeed');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PropertyCategories', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      slug: {
        type: Sequelize.STRING(120),
        allowNull: false,
        unique: true,
      },
      nameEn: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      nameTe: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      descriptionEn: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      descriptionTe: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      groupLabel: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      image: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      icon: {
        type: Sequelize.STRING(80),
        allowNull: false,
        defaultValue: 'Home',
      },
      ruleKey: {
        type: Sequelize.STRING(80),
        allowNull: false,
      },
      transactionTypes: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: ['sale'],
      },
      areaUnits: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: ['sqft'],
      },
      propertyFields: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      visible: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.createTable('PropertyAttributes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      categoryId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'PropertyCategories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('SPECIFICATION', 'AMENITY'),
        allowNull: false,
      },
      nameEn: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      nameTe: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('PropertyAttributes', ['categoryId', 'type']);

    await queryInterface.createTable('Properties', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      categoryId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'PropertyCategories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      postedByUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      titleEn: {
        type: Sequelize.STRING(300),
        allowNull: false,
      },
      titleTe: {
        type: Sequelize.STRING(300),
        allowNull: true,
      },
      descriptionEn: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      descriptionTe: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      ventureName: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      transactionType: {
        type: Sequelize.STRING(40),
        allowNull: false,
        defaultValue: 'sale',
      },
      state: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      district: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      mandal: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      city: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      locality: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      landmark: {
        type: Sequelize.STRING(200),
        allowNull: true,
      },
      pincode: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      locationEn: {
        type: Sequelize.STRING(400),
        allowNull: true,
      },
      locationTe: {
        type: Sequelize.STRING(400),
        allowNull: true,
      },
      mapLocation: {
        type: Sequelize.STRING(400),
        allowNull: true,
      },
      price: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      priceNegotiable: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      area: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: true,
      },
      areaUnit: {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: 'sqft',
      },
      dimensions: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      detailsJson: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      contactName: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      contactPhone: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      preferWhatsapp: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      preferCall: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      hidePhone: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isFeatured: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isTrending: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isVerified: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE', 'DRAFT'),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
      viewCount: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('Properties', ['categoryId']);
    await queryInterface.addIndex('Properties', ['status']);
    await queryInterface.addIndex('Properties', ['isFeatured']);
    await queryInterface.addIndex('Properties', ['isTrending']);
    await queryInterface.addIndex('Properties', ['createdAt']);

    await queryInterface.createTable('PropertyImages', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      propertyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Properties', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      imagePath: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      caption: {
        type: Sequelize.STRING(300),
        allowNull: true,
      },
      isPrimary: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('PropertyImages', ['propertyId']);

    await queryInterface.createTable('PropertyAttributeValues', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      propertyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Properties', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      attributeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'PropertyAttributes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('PropertyAttributeValues', ['propertyId', 'attributeId'], {
      unique: true,
      name: 'property_attribute_unique',
    });

    const now = new Date();
    for (let i = 0; i < seed.length; i += 1) {
      const item = seed[i];
      const [categoryId] = await queryInterface.bulkInsert(
        'PropertyCategories',
        [
          {
            slug: item.slug,
            nameEn: item.nameEn,
            nameTe: item.nameTe,
            descriptionEn: item.descriptionEn,
            descriptionTe: item.descriptionTe,
            groupLabel: item.groupLabel,
            image: null,
            icon: item.icon,
            ruleKey: item.ruleKey,
            transactionTypes: Sequelize.literal(`'${JSON.stringify(['sale'])}'::jsonb`),
            areaUnits: Sequelize.literal(`'${JSON.stringify(item.areaUnits || ['sqft'])}'::jsonb`),
            propertyFields: item.propertyFields || null,
            active: true,
            visible: true,
            sortOrder: i,
            createdAt: now,
            updatedAt: now,
          },
        ],
        { returning: ['id'] }
      );

      // PostgreSQL returning via bulkInsert may return objects or numbers depending on dialect/version
      let resolvedId = categoryId;
      if (categoryId && typeof categoryId === 'object') {
        resolvedId = categoryId.id;
      }
      if (!resolvedId) {
        const [rows] = await queryInterface.sequelize.query(
          `SELECT id FROM "PropertyCategories" WHERE slug = :slug LIMIT 1`,
          { replacements: { slug: item.slug } }
        );
        resolvedId = rows[0].id;
      }

      const attributeRows = [];
      (item.specifications || []).forEach((nameEn, idx) => {
        attributeRows.push({
          categoryId: resolvedId,
          type: 'SPECIFICATION',
          nameEn,
          nameTe: null,
          sortOrder: idx,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      });
      (item.amenities || []).forEach((nameEn, idx) => {
        attributeRows.push({
          categoryId: resolvedId,
          type: 'AMENITY',
          nameEn,
          nameTe: null,
          sortOrder: idx,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      });
      if (attributeRows.length) {
        await queryInterface.bulkInsert('PropertyAttributes', attributeRows);
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('PropertyAttributeValues');
    await queryInterface.dropTable('PropertyImages');
    await queryInterface.dropTable('Properties');
    await queryInterface.dropTable('PropertyAttributes');
    await queryInterface.dropTable('PropertyCategories');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_PropertyAttributes_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Properties_status";');
  },
};
