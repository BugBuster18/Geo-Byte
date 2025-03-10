// Temporary in-memory storage for attendance records
class AttendanceInstance {
  records = [];
  
  async findOne(query) {
    return this.records.find(record => 
      record.studentId === query.studentId && 
      record.courseId === query.courseId &&
      record.date >= query.date.$gte &&
      record.date <= query.date.$lt
    );
  };

  async create(data) {
    const attendance = {
      id: Date.now(),
      Name: data.Name,
      Email: data.Email,
      isPresent: true,
      Created_At: new Date().toISOString(),
      Course_Code: data.Course_Code
    };

    this.records.push(attendance);
    return attendance;
  };

  async find(query) {
    return this.records
      .filter(record => 
        record.studentId === query.studentId &&
        record.courseId === query.courseId
      )
      .sort((a, b) => b.date - a.date);
  }

  allRecords() {
    return this.records;
  }
};
const Attendance = new AttendanceInstance();

const markAttendance = async (req, res) => {
  try {
    const { studentId, courseId } = req.params;
    const today = new Date();
    
    // Check if attendance already marked for today
    const existingAttendance = await Attendance.findOne({
      studentId,
      courseId,
      date: {
        $gte: new Date(today.setHours(0,0,0,0)),
        $lt: new Date(today.setHours(23,59,59,999))
      }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: "Attendance already marked for today"
      });
    }

    // Create new attendance record
    const attendance = await Attendance.create({
      studentId,
      courseId,
      date: new Date(),
      status: 'present'
    });

    res.status(201).json({
      success: true,
      message: `Attendance marked successfully for ${courseId}`,
      data: attendance
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error marking attendance",
      error: error.message
    });
  }
};

const getStudentAttendance = async (req, res) => {
  try {
    const {courseId ,studentId } = req.params;
    
    const attendance = await Attendance.find({ studentId, courseId });

    res.status(200).json({
      success: true,
      data: attendance
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching attendance records",
      error: error.message
    });
  }
};

const getAllStudents = async(req,res) =>{
  const data = await Attendance.allRecords()
  res.send(data);
}

module.exports = {
  markAttendance,
  getStudentAttendance,
  getAllStudents
};