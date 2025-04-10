const Course = require("../models/Course");
const Category = require("../models/Category");
const User = require("../models/User");
const { uploadImageToCloudinary } = require("../utils/imageUploader");
const { convertSecondsToDuration } = require("../utils/secToDuration");
const CourseProgress = require("../models/CourseProgress");
const Section = require("../models/Section");
const SubSection = require("../models/SubSection");

// Create a new course
exports.createCourse = async (req, res) => {
  try {
    const userId = req.user.id;
    let {
      courseName,
      courseDescription,
      whatYouWillLearn,
      price,
      tag,
      category,
      status = "Draft",
      instructions,
    } = req.body;

    const thumbnail = req.files?.thumbnailImage;
    if (!courseName || !courseDescription || !whatYouWillLearn || !price || !tag || !thumbnail || !category) {
      return res.status(400).json({ success: false, message: "All Fields are Mandatory" });
    }

    const instructorDetails = await User.findById(userId);
    if (!instructorDetails || instructorDetails.accountType !== "Instructor") {
      return res.status(404).json({ success: false, message: "Instructor Details Not Found" });
    }

    const categoryDetails = await Category.findById(category);
    if (!categoryDetails) {
      return res.status(404).json({ success: false, message: "Category Details Not Found" });
    }

    const thumbnailImage = await uploadImageToCloudinary(thumbnail, process.env.FOLDER_NAME);

    const newCourse = await Course.create({
      courseName,
      courseDescription,
      instructor: instructorDetails._id,
      whatYouWillLearn,
      price,
      tag,
      category: categoryDetails._id,
      thumbnail: thumbnailImage.secure_url,
      status,
      instructions,
    });

    await User.findByIdAndUpdate(instructorDetails._id, { $push: { courses: newCourse._id } }, { new: true });
    await Category.findByIdAndUpdate(category, { $push: { courses: newCourse._id } }, { new: true });

    res.status(201).json({ success: true, data: newCourse, message: "Course Created Successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to create course", error: error.message });
  }
};

// Get all courses
exports.getAllCourses = async (req, res) => {
  try {
    const allCourses = await Course.find({}, {
      courseName: true,
      price: true,
      thumbnail: true,
      instructor: true,
      ratingAndReviews: true,
      studentsEnroled: true,
    }).populate("instructor").exec();
    res.status(200).json({ success: true, data: allCourses });
  } catch (error) {
    console.error(error);
    res.status(404).json({ success: false, message: `Can't Fetch Course Data`, error: error.message });
  }
};

// Get course details
exports.getCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.body;
    const courseDetails = await Course.findById(courseId)
      .populate({ path: "instructor", populate: { path: "additionalDetails" } })
      .populate("category")
      .populate({ path: "ratingAndReviews", populate: { path: "user", select: "firstName lastName accountType image" } })
      .populate({ path: "courseContent", populate: { path: "subSection" } })
      .exec();

    if (!courseDetails) return res.status(404).json({ success: false, message: "Course Not Found" });
    res.status(200).json({ success: true, message: "Course fetched successfully", data: courseDetails });
  } catch (error) {
    console.error(error);
    res.status(404).json({ success: false, message: `Can't Fetch Course Data`, error: error.message });
  }
};

// Get instructor's courses
exports.getInstructorCourses = async (req, res) => {
  try {
    const userId = req.user.id;
    const allCourses = await Course.find({ instructor: userId });
    res.status(200).json({ success: true, data: allCourses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch courses", error: error.message });
  }
};

// Edit course
exports.editCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const updates = req.body;
    const course = await Course.findById(courseId);

    if (!course) return res.status(404).json({ error: "Course not found" });

    if (req.files?.thumbnailImage) {
      const thumbnailImage = await uploadImageToCloudinary(req.files.thumbnailImage, process.env.FOLDER_NAME);
      course.thumbnail = thumbnailImage.secure_url;
    }

    for (const key in updates) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        course[key] = ["tag", "instructions"].includes(key) ? JSON.parse(updates[key]) : updates[key];
      }
    }

    await course.save();

    const updatedCourse = await Course.findById(courseId)
      .populate({ path: "instructor", populate: { path: "additionalDetails" } })
      .populate("category")
      .populate("ratingAndReviews")
      .populate({ path: "courseContent", populate: { path: "subSection" } })
      .exec();

    res.json({ success: true, message: "Course updated successfully", data: updatedCourse });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

// Full course details
exports.getFullCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.user.id;
    const courseDetails = await Course.findById(courseId)
      .populate({ path: "instructor", populate: { path: "additionalDetails" } })
      .populate("category")
      .populate("ratingAndReviews")
      .populate({ path: "courseContent", populate: { path: "subSection" } })
      .exec();

    if (!courseDetails) return res.status(400).json({ success: false, message: `Could not find course with id: ${courseId}` });

    const courseProgressCount = await CourseProgress.findOne({ courseID: courseId, userID: userId });

    let totalDurationInSeconds = 0;
    courseDetails.courseContent.forEach(content => {
      content.subSection.forEach(subSection => {
        totalDurationInSeconds += parseInt(subSection.timeDuration);
      });
    });

    const totalDuration = convertSecondsToDuration(totalDurationInSeconds);
    res.status(200).json({
      success: true,
      data: {
        courseDetails,
        totalDuration,
        completedVideos: courseProgressCount?.completedVideos || [],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete course
exports.deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    for (const studentId of course.studentsEnrolled) {
      await User.findByIdAndUpdate(studentId, { $pull: { courses: courseId } });
    }

    for (const sectionId of course.courseContent) {
      const section = await Section.findById(sectionId);
      if (section) {
        for (const subSectionId of section.subSection) {
          await SubSection.findByIdAndDelete(subSectionId);
        }
      }
      await Section.findByIdAndDelete(sectionId);
    }

    await Course.findByIdAndDelete(courseId);
    await Category.findByIdAndUpdate(course.category, { $pull: { courses: courseId } });
    await User.findByIdAndUpdate(course.instructor, { $pull: { courses: courseId } });

    res.status(200).json({ success: true, message: "Course deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};

// Search course
exports.searchCourse = async (req, res) => {
  try {
    const { searchQuery } = req.body;
    const courses = await Course.find({
      $or: [
        { courseName: { $regex: searchQuery, $options: "i" } },
        { courseDescription: { $regex: searchQuery, $options: "i" } },
        { tag: { $regex: searchQuery, $options: "i" } },
      ],
    })
      .populate("instructor")
      .populate("category")
      .populate("ratingAndReviews")
      .exec();

    res.status(200).json({ success: true, data: courses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark lecture as complete
exports.markLectureAsComplete = async (req, res) => {
  const { courseId, subSectionId, userId } = req.body;
  if (!courseId || !subSectionId || !userId) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }
  try {
    const progress = await CourseProgress.findOneAndUpdate(
      {
        userID: userId,
        courseID: courseId,
        completedVideos: { $ne: subSectionId },
      },
      { $push: { completedVideos: subSectionId } },
      { new: true }
    );

    if (!progress) {
      return res.status(400).json({ success: false, message: "Lecture already marked as complete" });
    }

    res.status(200).json({ success: true, message: "Lecture marked as complete" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
