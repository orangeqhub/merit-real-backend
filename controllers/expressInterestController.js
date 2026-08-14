'use strict';

const expressInterestService = require('../services/expressInterestService');
const interestDecisionService = require('../services/interestDecisionService');

class ExpressInterestController {
  async validateAgent(req, res, next) {
    try {
      const data = await expressInterestService.validateAgent(req.query.code || req.params.code || req.body.code);
      return res.json({ success: true, message: 'Agent validated.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async searchAgents(req, res, next) {
    try {
      const data = await expressInterestService.searchAgents(req.query.q || req.query.search || '', {
        limit: req.query.limit,
      });
      return res.json({ success: true, message: 'Agents fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async submit(req, res, next) {
    try {
      const data = await expressInterestService.submit(req.body, req.user, req);
      return res.status(201).json({ success: true, message: 'Express interest submitted.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async listMine(req, res, next) {
    try {
      const data = await expressInterestService.list(req.query, { actor: req.user });
      return res.json({ success: true, message: 'Interests fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async listAdmin(req, res, next) {
    try {
      const data = await expressInterestService.list(req.query, { actor: req.user });
      return res.json({ success: true, message: 'Interests fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async listAgent(req, res, next) {
    try {
      const data = await expressInterestService.list(req.query, { actor: req.user });
      return res.json({ success: true, message: 'Leads fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async listEmployee(req, res, next) {
    try {
      const data = await expressInterestService.list(req.query, { actor: req.user });
      return res.json({ success: true, message: 'Employee leads fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const data = await expressInterestService.getById(req.params.id, { actor: req.user });
      return res.json({ success: true, message: 'Interest details fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async approve(req, res, next) {
    try {
      const data = await expressInterestService.approve(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Interest approved.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async reject(req, res, next) {
    try {
      const data = await expressInterestService.reject(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Interest rejected.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async assign(req, res, next) {
    try {
      const data = await expressInterestService.assignAgent(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Agent assigned.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async assignEmployee(req, res, next) {
    try {
      const data = await expressInterestService.assignEmployee(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Employee assigned.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async updateEmployeeWorkflow(req, res, next) {
    try {
      const data = await expressInterestService.updateEmployeeWorkflow(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Employee workflow updated.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async listCallNotes(req, res, next) {
    try {
      const employeeNoteService = require('../services/employeeNoteService');
      const data = await employeeNoteService.listCallNotes(req.params.id, req.user);
      return res.json({ success: true, message: 'Call notes fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async addCallNote(req, res, next) {
    try {
      const employeeNoteService = require('../services/employeeNoteService');
      const data = await employeeNoteService.addCallNote(req.params.id, req.user, req.body);
      return res.status(201).json({ success: true, message: 'Call note added.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async listInternalNotes(req, res, next) {
    try {
      const employeeNoteService = require('../services/employeeNoteService');
      const data = await employeeNoteService.listInternalNotes('enquiry', req.params.id, req.user);
      return res.json({ success: true, message: 'Internal notes fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async addInternalNote(req, res, next) {
    try {
      const employeeNoteService = require('../services/employeeNoteService');
      const data = await employeeNoteService.addInternalNote(req.user, {
        ...req.body,
        recordType: 'enquiry',
        recordId: req.params.id,
      });
      return res.status(201).json({ success: true, message: 'Internal note added.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async internalRemarks(req, res, next) {
    try {
      const data = await expressInterestService.addInternalRemarks(
        req.params.id,
        req.user,
        req.body.remarks || req.body.internalRemarks
      );
      return res.json({ success: true, message: 'Internal remarks saved.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async addFollowUp(req, res, next) {
    try {
      const data = await expressInterestService.addFollowUp(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Follow-up added.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async close(req, res, next) {
    try {
      const data = await expressInterestService.close(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Interest closed.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async submitPurchase(req, res, next) {
    try {
      const data = await interestDecisionService.submitPurchase(req.params.id, req.user, req.body);
      return res.status(201).json({ success: true, message: 'Purchase request submitted.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async submitBooking(req, res, next) {
    try {
      const data = await interestDecisionService.submitBooking(req.params.id, req.user, req.body);
      return res.status(201).json({ success: true, message: 'Booking request submitted.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async listPurchasesMine(req, res, next) {
    try {
      const data = await interestDecisionService.listPurchases(req.query, { actor: req.user });
      return res.json({ success: true, message: 'Purchase requests fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async listPurchasesAdmin(req, res, next) {
    try {
      const data = await interestDecisionService.listPurchases(req.query, { actor: req.user });
      return res.json({ success: true, message: 'Purchase requests fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async listPurchasesAgent(req, res, next) {
    try {
      const data = await interestDecisionService.listPurchases(req.query, { actor: req.user });
      return res.json({ success: true, message: 'Purchase requests fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async getPurchaseById(req, res, next) {
    try {
      const data = await interestDecisionService.getPurchaseById(req.params.id, { actor: req.user });
      return res.json({ success: true, message: 'Purchase request fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async updatePurchaseStatus(req, res, next) {
    try {
      const data = await interestDecisionService.updatePurchaseStatus(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Purchase status updated.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async purchaseRemarks(req, res, next) {
    try {
      const data = await interestDecisionService.addPurchaseRemarks(
        req.params.id,
        req.user,
        req.body.remarks || req.body.internalRemarks
      );
      return res.json({ success: true, message: 'Remarks saved.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async listBookingsMine(req, res, next) {
    try {
      const data = await interestDecisionService.listBookings(req.query, { actor: req.user });
      return res.json({ success: true, message: 'Booking requests fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async listBookingsAdmin(req, res, next) {
    try {
      const data = await interestDecisionService.listBookings(req.query, { actor: req.user });
      return res.json({ success: true, message: 'Booking requests fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async listBookingsAgent(req, res, next) {
    try {
      const data = await interestDecisionService.listBookings(req.query, { actor: req.user });
      return res.json({ success: true, message: 'Booking requests fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async getBookingById(req, res, next) {
    try {
      const data = await interestDecisionService.getBookingById(req.params.id, { actor: req.user });
      return res.json({ success: true, message: 'Booking request fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async updateBookingStatus(req, res, next) {
    try {
      const data = await interestDecisionService.updateBookingStatus(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Booking status updated.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async bookingRemarks(req, res, next) {
    try {
      const data = await interestDecisionService.addBookingRemarks(
        req.params.id,
        req.user,
        req.body.remarks || req.body.internalRemarks
      );
      return res.json({ success: true, message: 'Remarks saved.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async recordBookingPayment(req, res, next) {
    try {
      const bookingManagementService = require('../services/bookingManagementService');
      const data = await bookingManagementService.recordPayment(
        req.params.id,
        req.user,
        req.body,
        req.file,
        req
      );
      return res.json({ success: true, message: 'Payment recorded.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async addBookingFollowUp(req, res, next) {
    try {
      const bookingManagementService = require('../services/bookingManagementService');
      const data = await bookingManagementService.addFollowUp(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Follow-up saved.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async convertBookingToPurchase(req, res, next) {
    try {
      const bookingManagementService = require('../services/bookingManagementService');
      const data = await bookingManagementService.convertToPurchase(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Booking converted to purchase.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async cancelBooking(req, res, next) {
    try {
      const bookingManagementService = require('../services/bookingManagementService');
      const data = await bookingManagementService.cancelBooking(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Booking cancelled.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async extendBooking(req, res, next) {
    try {
      const bookingManagementService = require('../services/bookingManagementService');
      const data = await bookingManagementService.extendBooking(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Booking extended.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async releaseBooking(req, res, next) {
    try {
      const bookingManagementService = require('../services/bookingManagementService');
      const data = await bookingManagementService.releaseBooking(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Booking released.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async keepBookingUnderReview(req, res, next) {
    try {
      const bookingManagementService = require('../services/bookingManagementService');
      const data = await bookingManagementService.keepUnderReview(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Booking kept under review.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async listBookingsRequiringDecision(req, res, next) {
    try {
      const bookingManagementService = require('../services/bookingManagementService');
      const data = await bookingManagementService.listRequiringDecision(req.query);
      return res.json({ success: true, message: 'Bookings requiring decision fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async bookingStats(req, res, next) {
    try {
      const bookingManagementService = require('../services/bookingManagementService');
      const data = await bookingManagementService.getStats();
      return res.json({ success: true, message: 'Booking statistics fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async runBookingExpiryJob(req, res, next) {
    try {
      const bookingManagementService = require('../services/bookingManagementService');
      const data = await bookingManagementService.processExpiriesAndReminders();
      return res.json({ success: true, message: 'Booking expiry job completed.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async completePurchase(req, res, next) {
    try {
      const purchaseCompletionService = require('../services/purchaseCompletionService');
      const data = await purchaseCompletionService.completePurchase(req.params.id, req.user, req.body);
      return res.json({ success: true, message: 'Purchase completed. Property marked as sold.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async recordPurchasePayment(req, res, next) {
    try {
      const purchaseCompletionService = require('../services/purchaseCompletionService');
      const data = await purchaseCompletionService.recordPayment(req.params.id, req.user, req.body, req.file);
      return res.json({ success: true, message: 'Purchase payment recorded.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async getPurchaseReceipt(req, res, next) {
    try {
      const purchaseCompletionService = require('../services/purchaseCompletionService');
      const data = await purchaseCompletionService.getReceipt(req.params.id, {
        actor: req.user,
        receiptType: req.query.type || null,
      });
      return res.json({ success: true, message: 'Receipt fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async listPurchaseReceipts(req, res, next) {
    try {
      const purchaseCompletionService = require('../services/purchaseCompletionService');
      const data = await purchaseCompletionService.listReceipts(req.params.id, { actor: req.user });
      return res.json({ success: true, message: 'Receipts fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async listClosedDeals(req, res, next) {
    try {
      const purchaseCompletionService = require('../services/purchaseCompletionService');
      const data = await purchaseCompletionService.listClosedDeals(req.query, { actor: req.user });
      return res.json({ success: true, message: 'Closed deals fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async agentClosedDealStats(req, res, next) {
    try {
      const purchaseCompletionService = require('../services/purchaseCompletionService');
      const data = await purchaseCompletionService.getAgentDashboardStats(req.user.id);
      return res.json({ success: true, message: 'Agent deal statistics fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async salesReports(req, res, next) {
    try {
      const purchaseCompletionService = require('../services/purchaseCompletionService');
      const data = await purchaseCompletionService.getSalesReports({ actor: req.user });
      return res.json({ success: true, message: 'Sales reports fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async listDocuments(req, res, next) {
    try {
      const documentGenerationService = require('../services/documentGenerationService');
      const data = await documentGenerationService.listDocuments({
        actor: req.user,
        purchaseRequestId: req.query.purchaseId || null,
        bookingRequestId: req.query.bookingId || null,
      });
      return res.json({ success: true, message: 'Documents fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async getPaymentReceiptById(req, res, next) {
    try {
      const documentGenerationService = require('../services/documentGenerationService');
      const action = String(req.query.action || 'VIEW').toUpperCase();
      const data = await documentGenerationService.getPaymentReceipt(req.params.id, {
        actor: req.user,
        action: ['VIEW', 'DOWNLOAD', 'PRINT'].includes(action) ? action : 'VIEW',
      });
      return res.json({ success: true, message: 'Payment receipt fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async getSaleCertificateById(req, res, next) {
    try {
      const documentGenerationService = require('../services/documentGenerationService');
      const action = String(req.query.action || 'VIEW').toUpperCase();
      const data = await documentGenerationService.getSaleCertificate(req.params.id, {
        actor: req.user,
        action: ['VIEW', 'DOWNLOAD', 'PRINT'].includes(action) ? action : 'VIEW',
      });
      return res.json({ success: true, message: 'Sale certificate fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }

  async getSaleCertificateByPurchase(req, res, next) {
    try {
      const documentGenerationService = require('../services/documentGenerationService');
      const data = await documentGenerationService.getSaleCertificateByPurchase(req.params.id, {
        actor: req.user,
      });
      return res.json({ success: true, message: 'Sale certificate fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new ExpressInterestController();
