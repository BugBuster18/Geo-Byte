const { Client, Databases } = require('node-appwrite');

const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('6796680b0018a3b9d8eb');

const databases = new Databases(client);

const DATABASE_ID = '67c7336a0038d811eec6';
const COURSES_COLLECTION_ID = '67cc850800136002bd84';
const ATTENDANCE_COLLECTION_ID = '67c89861000dfa747718';  // Add this line

module.exports = {
    databases,
    DATABASE_ID,
    COURSES_COLLECTION_ID,
    ATTENDANCE_COLLECTION_ID  // Add this line
};
