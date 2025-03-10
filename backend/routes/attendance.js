const express = require('express');
const router = express.Router();
const attendanceController = require('../controller/attendance.controller');

router.get('/mark/:studentId/:courseId', attendanceController.markAttendance);

router.get('/student/:studentId/:courseId', attendanceController.getStudentAttendance);
router.get('/students', attendanceController.getAllStudents);

module.exports = router;
