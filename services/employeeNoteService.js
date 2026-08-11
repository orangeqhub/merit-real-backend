'use strict';

const { CallNote, InternalNote, ExpressInterest, User } = require('../models');
const { ROLES } = require('../constants/roles');
const { EMPLOYEE_PERMISSIONS } = require('../constants/employeePermissions');

class EmployeeNoteService {
  employeePermissions(user) {
    return Array.isArray(user?.permissions) ? user.permissions : [];
  }

  canViewUnassigned(user) {
    return this.employeePermissions(user).includes(EMPLOYEE_PERMISSIONS.VIEW_UNASSIGNED_RECORDS);
  }

  assertEmployeeLeadAccess(interest, actor) {
    if (!actor) {
      const err = new Error('Unauthorized.');
      err.status = 401;
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    if (actor.role === ROLES.ADMIN || actor.role === ROLES.SALES_MEMBER) return;

    if (actor.role === ROLES.EMPLOYEE) {
      if (interest.assignedEmployeeId === actor.id) return;
      if (!interest.assignedEmployeeId && this.canViewUnassigned(actor)) return;
      const err = new Error('You do not have access to this lead.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const err = new Error('You do not have access to this lead.');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  formatCallNote(row) {
    if (!row) return null;
    const r = row.toJSON ? row.toJSON() : row;
    const employee = r.employee || null;
    return {
      id: r.id,
      enquiryId: r.interestId,
      interestId: r.interestId,
      direction: r.direction,
      result: r.result,
      summary: r.summary,
      interestLevel: r.interestLevel,
      nextAction: r.nextAction || '',
      nextFollowUpAt: r.nextFollowUpAt || null,
      callDateTime: r.callDateTime,
      employeeId: r.employeeId,
      employeeName: employee?.name || null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  formatInternalNote(row) {
    if (!row) return null;
    const r = row.toJSON ? row.toJSON() : row;
    const employee = r.employee || null;
    return {
      id: r.id,
      recordType: r.recordType,
      recordId: r.recordId,
      interestId: r.interestId || null,
      text: r.text,
      employeeId: r.employeeId,
      authorId: r.employeeId,
      authorName: employee?.name || null,
      employeeName: employee?.name || null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  async listCallNotes(interestId, actor) {
    const interest = await ExpressInterest.findByPk(Number(interestId));
    if (!interest) {
      const err = new Error('Express interest not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    this.assertEmployeeLeadAccess(interest, actor);

    const rows = await CallNote.findAll({
      where: { interestId: interest.id },
      include: [{ model: User, as: 'employee', attributes: ['id', 'name', 'memberId'] }],
      order: [['callDateTime', 'DESC']],
    });
    return rows.map((r) => this.formatCallNote(r));
  }

  async addCallNote(interestId, actor, body = {}) {
    const interest = await ExpressInterest.findByPk(Number(interestId));
    if (!interest) {
      const err = new Error('Express interest not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    this.assertEmployeeLeadAccess(interest, actor);

    const summary = String(body.summary || '').trim();
    if (!summary) {
      const err = new Error('Call summary is required.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const nextFollowUpAt = body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null;
    const callDateTime = body.callDateTime ? new Date(body.callDateTime) : new Date();

    const created = await CallNote.create({
      interestId: interest.id,
      employeeId: actor.id,
      direction: String(body.direction || 'outgoing').trim() || 'outgoing',
      result: String(body.result || 'connected').trim() || 'connected',
      summary,
      interestLevel: String(body.interestLevel || 'medium').trim() || 'medium',
      nextAction: body.nextAction ? String(body.nextAction).trim() : null,
      nextFollowUpAt: nextFollowUpAt && !Number.isNaN(nextFollowUpAt.getTime()) ? nextFollowUpAt : null,
      callDateTime: Number.isNaN(callDateTime.getTime()) ? new Date() : callDateTime,
      createdBy: actor.id,
      modifiedBy: actor.id,
    });

    const interestUpdates = {
      modifiedBy: actor.id,
      employeeWorkflowStatus: interest.employeeWorkflowStatus || 'contacted',
    };
    if (created.nextFollowUpAt) {
      interestUpdates.nextFollowUpAt = created.nextFollowUpAt;
      interestUpdates.employeeWorkflowStatus = 'followup_required';
    }
    await interest.update(interestUpdates);

    const row = await CallNote.findByPk(created.id, {
      include: [{ model: User, as: 'employee', attributes: ['id', 'name', 'memberId'] }],
    });
    return this.formatCallNote(row);
  }

  async listInternalNotes(recordType, recordId, actor) {
    const type = String(recordType || 'enquiry').trim() || 'enquiry';
    const id = String(recordId || '').trim();
    if (!id) {
      const err = new Error('Record id is required.');
      err.status = 400;
      throw err;
    }

    if (type === 'enquiry' && /^\d+$/.test(id)) {
      const interest = await ExpressInterest.findByPk(Number(id));
      if (!interest) {
        const err = new Error('Express interest not found.');
        err.status = 404;
        throw err;
      }
      this.assertEmployeeLeadAccess(interest, actor);
    } else if (![ROLES.ADMIN, ROLES.SALES_MEMBER].includes(actor?.role)) {
      const err = new Error('You do not have access to these notes.');
      err.status = 403;
      throw err;
    }

    const rows = await InternalNote.findAll({
      where: { recordType: type, recordId: id },
      include: [{ model: User, as: 'employee', attributes: ['id', 'name', 'memberId'] }],
      order: [['createdAt', 'DESC']],
    });
    return rows.map((r) => this.formatInternalNote(r));
  }

  async addInternalNote(actor, body = {}) {
    const recordType = String(body.recordType || 'enquiry').trim() || 'enquiry';
    const recordId = String(body.recordId || body.enquiryId || '').trim();
    const text = String(body.text || body.note || '').trim();

    if (!recordId) {
      const err = new Error('Record id is required.');
      err.status = 400;
      throw err;
    }
    if (!text) {
      const err = new Error('Note text is required.');
      err.status = 400;
      throw err;
    }

    let interestId = null;
    if (recordType === 'enquiry' && /^\d+$/.test(recordId)) {
      const interest = await ExpressInterest.findByPk(Number(recordId));
      if (!interest) {
        const err = new Error('Express interest not found.');
        err.status = 404;
        throw err;
      }
      this.assertEmployeeLeadAccess(interest, actor);
      interestId = interest.id;
      await interest.update({
        internalRemarks: text,
        modifiedBy: actor.id,
      });
    } else if (![ROLES.ADMIN, ROLES.SALES_MEMBER].includes(actor?.role)) {
      const err = new Error('You do not have access to add this note.');
      err.status = 403;
      throw err;
    }

    const created = await InternalNote.create({
      recordType,
      recordId,
      interestId,
      employeeId: actor.id,
      text,
      createdBy: actor.id,
      modifiedBy: actor.id,
    });

    const row = await InternalNote.findByPk(created.id, {
      include: [{ model: User, as: 'employee', attributes: ['id', 'name', 'memberId'] }],
    });
    return this.formatInternalNote(row);
  }
}

module.exports = new EmployeeNoteService();
