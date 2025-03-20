const {Router} = require('express');
const router = Router();
const teacherController = require('../controller/teacher.controller');

// Add CORS headers middleware for this route
router.get('/classStatus/:courseId', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    next();
}, teacherController.classStatus);

module.exports = router;