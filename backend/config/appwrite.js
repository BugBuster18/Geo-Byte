const { Client, Databases } = require('node-appwrite');

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('6796680b0018a3b9d8eb');

const databases = new Databases(client);

const DATABASE_ID = '67c7336a0038d811eec6';
const COURSES_COLLECTION_ID = '67cc850800136002bd84';
const ATTENDANCE_COLLECTION_ID = '67c89861000dfa747718';

// Add attribute constants for course collection
const COURSE_ATTRIBUTES = {
  IS_CLASS_ON: 'isClassOn',
  STARTED_AT: 'startedAt',
  ENDED_AT: 'endedAt',
  ATTENDANCE_ENABLED: 'isAttendanceEnabled',
  LAST_CHECK: 'lastCheck',
  ATTENDANCE_STARTED_AT: 'attendanceStartedAt'
};

// New attributes to add:
const NEW_COURSE_ATTRIBUTES = {
  ATTENDANCE_ENABLED: 'isAttendanceEnabled',     // Boolean - controls if students can mark attendance
  LAST_CHECK: 'lastCheck',                       // DateTime - timestamp of last status check
  ATTENDANCE_STARTED_AT: 'attendanceStartedAt'   // DateTime - when attendance taking started
};

module.exports = {
    databases,
    DATABASE_ID,
    COURSES_COLLECTION_ID,
    ATTENDANCE_COLLECTION_ID,
    COURSE_ATTRIBUTES
};
