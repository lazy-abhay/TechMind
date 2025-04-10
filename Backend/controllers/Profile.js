const Profile = require("../models/Profile");
const User = require("../models/User");
const Course = require("../models/Course");
const { uploadImageToCloudinary } = require("../utils/imageUploader");

// Update Profile
exports.updateProfile = async (req, res) => {
  try {
    const {
      dateOfBirth = "",
      about = "",
      contactNumber = "",
      firstName,
      lastName,
      gender = "",
    } = req.body;

    const id = req.user.id;

    const userDetails = await User.findById(id);
    const profile = await Profile.findById(userDetails.additionalDetails);

    userDetails.firstName = firstName || userDetails.firstName;
    userDetails.lastName = lastName || userDetails.lastName;
    profile.dateOfBirth = dateOfBirth || profile.dateOfBirth;
    profile.about = about || profile.about;
    profile.gender = gender || profile.gender;
    profile.contactNumber = contactNumber || profile.contactNumber;

    await profile.save();
    await userDetails.save();

    return res.json({
      success: true,
      message: "Profile updated successfully",
      profile,
      userDetails,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Delete Account
exports.deleteAccount = async (req, res) => {
  try {
    const id = req.user.id;

    const user = await User.findById({ _id: id });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Delete associated profile
    await Profile.findByIdAndDelete({ _id: user.additionalDetails });

    // TODO: Unenroll User From All the Enrolled Courses

    // Delete user
    await User.findByIdAndDelete({ _id: id });

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "User cannot be deleted successfully",
      error: error.message,
    });
  }
};

// Get All User Details
exports.getAllUserDetails = async (req, res) => {
  try {
    const id = req.user.id;

    const userDetails = await User.findById(id)
      .populate("additionalDetails")
      .exec();

    console.log(userDetails);

    return res.status(200).json({
      success: true,
      message: "User data fetched successfully",
      data: userDetails,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get Enrolled Courses
exports.getEnrolledCourses = async (req, res) => {
  try {
    const id = req.user.id;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const enrolledCourses = await User.findById(id)
      .populate({
        path: "courses",
        populate: {
          path: "courseContent",
        },
      })
      .populate("courseProgress") // You had this in your code
      .exec();

    return res.status(200).json({
      success: true,
      message: "User data fetched successfully",
      data: enrolledCourses,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update Display Picture
exports.updateDisplayPicture = async (req, res) => {
  try {
    const id = req.user.id;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const image = req.files?.pfp;
    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Image not found",
      });
    }

    const uploadDetails = await uploadImageToCloudinary(
      image,
      process.env.FOLDER_NAME
    );

    const updatedImage = await User.findByIdAndUpdate(
      { _id: id },
      { image: uploadDetails.secure_url },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Image updated successfully",
      data: updatedImage,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Instructor Dashboard
exports.instructorDashboard = async (req, res) => {
  try {
    const id = req.user.id;

    const courseData = await Course.find({ instructor: id });

    const courseDetails = courseData.map((course) => {
      const totalStudents = course?.studentsEnrolled?.length;
      const totalRevenue = course?.price * totalStudents;

      return {
        _id: course._id,
        courseName: course.courseName,
        courseDescription: course.courseDescription,
        totalStudents,
        totalRevenue,
      };
    });

    return res.status(200).json({
      success: true,
      message: "User data fetched successfully",
      data: courseDetails,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
