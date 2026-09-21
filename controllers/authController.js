'use strict';

const authService = require('../services/authService');
const { ROLES } = require('../constants/roles');

class AuthController {
  async register(req, res, next) {
    try {
      const files = req.files || {};
      const profilePhotoFile = files.profilePhoto?.[0];
      const aadhaarProofFile = files.aadhaarProof?.[0] || files.identityProof?.[0];
      const panProofFile = files.panProof?.[0] || files.addressProof?.[0];

      const result = await authService.register({
        ...req.body,
        profilePhoto: profilePhotoFile ? `/uploads/registrations/${profilePhotoFile.filename}` : null,
        aadhaarProofPath: aadhaarProofFile ? `/uploads/registrations/${aadhaarProofFile.filename}` : null,
        panProofPath: panProofFile ? `/uploads/registrations/${panProofFile.filename}` : null,
        identityProof: aadhaarProofFile ? `/uploads/registrations/${aadhaarProofFile.filename}` : null,
        addressProof: panProofFile ? `/uploads/registrations/${panProofFile.filename}` : null,
      }, req);

      return res.status(201).json({
        success: true,
        message: result.message,
        data: result.user,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { identifier, email, mobile, password } = req.body;
      const loginId = identifier || email || mobile;
      const result = await authService.login(loginId, password, undefined, req);
      return res.json({
        success: true,
        message: 'Login successful.',
        data: result,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async adminLogin(req, res, next) {
    try {
      const { identifier, email, password } = req.body;
      const loginId = identifier || email;
      const result = await authService.login(loginId, password, [ROLES.ADMIN], req);
      return res.json({
        success: true,
        message: 'Admin login successful.',
        data: result,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async me(req, res, next) {
    try {
      const profile = await authService.getProfile(req.user.id, req);
      return res.json({
        success: true,
        message: 'Profile fetched.',
        data: profile,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async updateMe(req, res, next) {
    try {
      const profile = await authService.updateProfile(req.user.id, req.body, req);
      return res.json({
        success: true,
        message: 'Profile updated.',
        data: profile,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async applicationStatus(req, res, next) {
    try {
      const { mobile } = req.query;
      const status = await authService.getApplicationStatus(mobile);
      return res.json({
        success: true,
        message: 'Application status fetched.',
        data: status,
        errors: [],
      });
    } catch (error) {
      return next(error);
    }
  }

  async logout(_req, res) {
    return res.json({
      success: true,
      message: 'Logged out successfully.',
      data: null,
      errors: [],
    });
  }

  async searchReferralAgents(req, res, next) {
    try {
      const expressInterestService = require('../services/expressInterestService');
      const data = await expressInterestService.searchAgents(req.query.q || req.query.search || '', {
        limit: req.query.limit,
      });
      return res.json({ success: true, message: 'Agents fetched.', data, errors: [] });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new AuthController();
