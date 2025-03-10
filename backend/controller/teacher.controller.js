const { databases, DATABASE_ID, COURSES_COLLECTION_ID } = require('../config/appwrite');
const { Query } = require('node-appwrite');

exports.turnOnClass = async (req, res) => {
    try {
        // First check if any class is already active
        const activeClasses = await databases.listDocuments(
            DATABASE_ID,
            COURSES_COLLECTION_ID,
            [Query.equal('isClassOn', true)]
        );

        if (activeClasses.documents.length > 0) {
            const activeClass = activeClasses.documents[0];
            return res.status(400).json({
                success: false,
                message: `Another class "${activeClass.courseName}" is already in session.`,
                activeClass: activeClass
            });
        }

        const { id, courseId } = req.params;
        console.log('Turning on class:', { facultyId: id, courseId }); // Debug log

        const response = await databases.listDocuments(
            DATABASE_ID,
            COURSES_COLLECTION_ID,
            [Query.equal('courseId', courseId)]
        );

        if (response.documents.length === 0) {
            console.log('Course not found:', courseId); // Debug log
            return res.status(404).json({ 
                success: false, 
                message: "Course not found" 
            });
        }

        const course = response.documents[0];
        const currentTime = new Date().toLocaleTimeString();
        
        try {
            await databases.updateDocument(
                DATABASE_ID,
                COURSES_COLLECTION_ID,
                course.$id,
                {
                    isClassOn: true,
                    startedAt: currentTime
                }
            );

            res.status(200).json({
                success: true,
                course: {
                    ...course,
                    isClassOn: true,
                    startedAt: currentTime
                }
            });
        } catch (updateError) {
            console.error('Error updating course:', updateError);
            res.status(500).json({ 
                success: false, 
                message: "Failed to update course status",
                error: updateError.message 
            });
        }
    } catch (error) {
        console.error('Error in turnOnClass:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to start class",
            error: error.message 
        });
    }
};

exports.turnOffClass = async (req, res) => {
    try {
        const { courseId } = req.params;
        const response = await databases.listDocuments(
            DATABASE_ID,
            COURSES_COLLECTION_ID,
            [Query.equal('courseId', courseId)]
        );
        
        if (response.documents.length > 0) {
            const course = response.documents[0];
            const endTime = new Date().toISOString();
            
            // Use course.$id for updating
            await databases.updateDocument(
                DATABASE_ID,
                COURSES_COLLECTION_ID,
                course.$id,  // Using document's unique ID
                {
                    isClassOn: false,
                    endedAt: endTime
                }
            );

            // Calculate duration if startedAt exists
            let duration = null;
            if (course.startedAt) {
                duration = new Date(endTime).getTime() - new Date(course.startedAt).getTime();
                duration = Math.floor(duration / 1000); // Convert to seconds
            }

            res.status(200).json({
                success: true,
                course: {
                    ...course,
                    isClassOn: false,
                    endedAt: endTime
                },
                duration
            });
        } else {
            res.status(404).json({ success: false, message: "Course not found" });
        }
    } catch (error) {
        console.error('Error in turnOffClass:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to end class",
            error: error.message 
        });
    }
};

exports.classStatus = async (req, res) => {
    try {
        const { courseId } = req.params;
        
        const response = await databases.listDocuments(
            DATABASE_ID,
            COURSES_COLLECTION_ID,
            [Query.equal('Course_Code', courseId)] // Changed from courseId to Course_Code
        );

        if (response.documents.length > 0) {
            const course = response.documents[0];
            res.status(200).json({
                status: course.isClassOn,
                course: course.isClassOn ? {
                    ...course,
                    startedAt: course.startedAt,
                    endedAt: course.endedAt
                } : null
            });
        } else {
            res.status(404).json({ 
                success: false, 
                message: `Course not found with Course Code: ${courseId}` 
            });
        }
    } catch (error) {
        console.error('Error fetching class status:', error);
        res.status(500).json({ 
            success: false,
            message: "Failed to get class status",
            error: error.message 
        });
    }
};

exports.createCourse = async (req, res) => {
    try {
        const { courseId, courseName, className, facultyId } = req.body;
        
        // Check if course already exists
        const existing = await databases.listDocuments(
            DATABASE_ID,
            COURSES_COLLECTION_ID,
            [Query.equal('courseId', courseId)]
        );

        if (existing.documents.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Course ID already exists" 
            });
        }

        const course = await databases.createDocument(
            DATABASE_ID,
            COURSES_COLLECTION_ID,
            ID.unique(),
            {
                courseId,
                courseName,
                className,
                facultyId,
                isClassOn: false,
                startedAt: null,
                endedAt: null
            }
        );

        res.status(201).json({
            success: true,
            message: "Course created successfully",
            data: course
        });
    } catch (error) {
        console.error('Error creating course:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to create course",
            error: error.message 
        });
    }
};