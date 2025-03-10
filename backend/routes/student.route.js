const {Router} = require('express');
const router = Router();
const teacherController = require('../controller/teacher.controller')
router.get('/classStatus/:courseId',teacherController.classStatus);
module.exports = router;