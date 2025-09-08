const express = require('express');
const router = express.Router();
// --- FIX: Changed variable name to PascalCase to match usage ---
const DashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

// Main dashboard route - gets all data (files, samples, QC pass rate, graph data)
router.get('/dashboard', DashboardController.getDashboard);

// This route seems to be a duplicate or for a different purpose.
// If it's intended to be protected, it should be associated with a specific controller method.
// For now, I've commented it out to prevent potential conflicts. If you need it, please clarify its purpose.
// router.get('/data', authMiddleware.isAuthenticated, dashboardController.getData);

// Individual metric routes
router.get('/dashboard/files', DashboardController.getTotalFiles);
router.get('/dashboard/samples', DashboardController.getTotalSamples);
router.get('/dashboard/qc-pass-rate', DashboardController.getQCPassRate);

// QC graph data route
router.get('/dashboard/qc-graph', DashboardController.getQCGraphData);

// Health check route
router.get('/dashboard/health', DashboardController.getHealth);

// Alternative routes for backward compatibility (if needed)
router.get('/stats', DashboardController.getDashboard); // Maps to main dashboard
router.get('/qc-graph', DashboardController.getQCGraphData); // Alternative QC graph route
router.get('/health', DashboardController.getHealth); // Alternative health route

module.exports = router;
