const express = require('express');
const teacherRoutes = require('./teacher.route');
const studentRoutes = require('./student.route');
const attendanceRoutes  = require('./attendance');
const router = express.Router();
router.get('/', function(req, res){
  res.send({status:"api is running"});
});
router.use('/teacher',teacherRoutes);
router.use('/student',studentRoutes);
router.use('/attendance',attendanceRoutes);
module.exports = router;