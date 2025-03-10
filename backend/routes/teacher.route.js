const express = require('express');
const router = express.Router();
const teacherController = require('../controller/teacher.controller');

router.get('/on/:id/:courseId', teacherController.turnOnClass);
router.get('/off/:courseId', teacherController.turnOffClass);
router.post('/create-course', teacherController.createCourse);
// Add classStatus route
router.get('/classStatus/:courseId', teacherController.classStatus);

module.exports = router;
