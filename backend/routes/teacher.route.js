const express = require('express');
const router = express.Router();
const teacherController = require('../controller/teacher.controller');

router.get('/on/:id/:courseId', teacherController.turnOnClass);
router.get('/off/:courseId', teacherController.turnOffClass);
router.post('/create-course', teacherController.createCourse);
// Add classStatus route
router.get('/classStatus/:courseId', teacherController.classStatus);

// Add cors middleware for this specific route
router.post('/enableAttendance/:courseId', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
}, teacherController.enableAttendance);

router.post('/disableAttendance/:courseId', teacherController.disableAttendance);

module.exports = router;
