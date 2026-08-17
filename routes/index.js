'use strict';

const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const customerRoutes = require('./customer');
const agentRoutes = require('./agent');
const agentCategoryRoutes = require('./agentCategories');
const heroSlideRoutes = require('./heroSlides');
const registrationRoutes = require('./registrations');
const propertyCategoryRoutes = require('./propertyCategories');
const propertyRoutes = require('./properties');
const { customersRouter, agentsRouter, salesMembersRouter, employeesRouter } = require('./adminUsers');

router.use('/auth', authRoutes);
router.use('/agent-categories', agentCategoryRoutes);
router.use('/hero-slides', heroSlideRoutes);
router.use('/site-settings', require('./siteSettings'));
router.use('/cms', require('./cms'));
router.use('/contact-enquiries', require('./contactEnquiries'));
router.use('/promotions', require('./promotions'));
router.use('/registrations', registrationRoutes);
router.use('/property-categories', propertyCategoryRoutes);
router.use('/properties', propertyRoutes);
router.use('/customers', customersRouter);
router.use('/agents', agentsRouter);
router.use('/sales-members', salesMembersRouter);
router.use('/employees', employeesRouter);
router.use('/sales', require('./sales'));
router.use('/express-interests', require('./expressInterests'));
router.use('/site-visits', require('./siteVisits'));
router.use('/notifications', require('./notifications'));
router.use('/wallet', require('./wallet'));
router.use('/map', require('./mapBookings'));
router.use('/customer', customerRoutes);
router.use('/agent', agentRoutes);

module.exports = router;
