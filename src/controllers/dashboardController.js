const asyncHandler = require('../middleware/asyncHandler');
const dashboardService = require('../services/dashboardService');

/**
 * @desc    Get dashboard statistics (role-aware)
 * @route   GET /api/dashboard/stats
 * @access  Private
 */
const getStats = asyncHandler(async (req, res) => {
  let stats;
  const schoolId = req.user.schoolId || req.query.schoolId;

  if (req.user.role === 'super-admin') {
    stats = await dashboardService.getSuperAdminStats();
  } else if (req.user.role === 'teacher') {
    stats = await dashboardService.getTeacherStats(req.user._id, schoolId.toString());
  } else {
    // School-scoped stats for school-admin, principal, or any school user
    stats = await dashboardService.getSchoolAdminStats(schoolId.toString());
  }

  res.status(200).json({
    success: true,
    data: stats,
  });
});

module.exports = { getStats };
