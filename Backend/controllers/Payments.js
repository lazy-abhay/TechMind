const { instance } = require("../config/razorpay");
const Course = require("../models/Course");
const User = require("../models/User");
const CourseProgress = require("../models/CourseProgress");
const mailSender = require("../utils/mailSender");
const { courseEnrollmentEmail } = require("../mail/templates/courseEnrollmentEmail");
const { paymentSuccess } = require("../mail/templates/paymentSuccess");
const mongoose = require("mongoose");
const crypto = require("crypto");


// ========== 1. Capture Payment ==========
exports.capturePayment = async (req, res) => {
  const { courses } = req.body;
  const userId = req.user.id;

  if (!courses || courses.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Please provide valid course IDs",
    });
  }

  try {
    let totalAmount = 0;

    for (const courseId of courses) {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: `Course not found: ${courseId}`,
        });
      }

      const uid = new mongoose.Types.ObjectId(userId);
      if (course.studentsEnrolled.includes(uid)) {
        return res.status(400).json({
          success: false,
          message: `Already enrolled in course: ${course.courseName}`,
        });
      }

      totalAmount += course.price;
    }

    const options = {
      amount: totalAmount * 100, // Amount in paisa
      currency: "INR",
      receipt: `receipt_${Math.floor(Math.random() * 1000000)}`,
    };

    const paymentResponse = await instance.orders.create(options);

    return res.status(200).json({
      success: true,
      orderId: paymentResponse.id,
      currency: paymentResponse.currency,
      amount: paymentResponse.amount,
    });
  } catch (error) {
    console.error("Error in capturePayment:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to initiate payment",
    });
  }
};


// ========== 2. Verify Payment Signature & Enroll Student ==========
exports.verifySignature = async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, courses } = req.body;
  const userId = req.user.id;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
    return res.status(400).json({
      success: false,
      message: "Incomplete payment details",
    });
  }

  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (generatedSignature !== razorpay_signature) {
    return res.status(400).json({
      success: false,
      message: "Invalid signature. Payment verification failed.",
    });
  }

  try {
    for (const courseId of courses) {
      const course = await Course.findByIdAndUpdate(
        courseId,
        { $push: { studentsEnrolled: userId } },
        { new: true }
      );

      await User.findByIdAndUpdate(
        userId,
        { $push: { courses: courseId } },
        { new: true }
      );

      const newCourseProgress = await CourseProgress.create({
        userID: userId,
        courseID: courseId,
      });

      await User.findByIdAndUpdate(userId, {
        $push: { courseProgress: newCourseProgress._id },
      });

      const recipient = await User.findById(userId);
      const emailContent = courseEnrollmentEmail(
        course.courseName,
        `${recipient.firstName} ${recipient.lastName}`,
        course.courseDescription,
        course.thumbnail
      );

      await mailSender(
        recipient.email,
        `You have successfully enrolled for ${course.courseName}`,
        emailContent
      );
    }

    return res.status(200).json({
      success: true,
      message: "Payment verified and enrollment successful",
    });
  } catch (error) {
    console.error("Enrollment Error:", error);
    return res.status(500).json({
      success: false,
      message: "Enrollment failed",
    });
  }
};


// ========== 3. Send Payment Success Email ==========
exports.sendPaymentSuccessEmail = async (req, res) => {
  const { amount, paymentId, orderId } = req.body;
  const userId = req.user.id;

  if (!amount || !paymentId) {
    return res.status(400).json({
      success: false,
      message: "Payment details missing",
    });
  }

  try {
    const user = await User.findById(userId);
    const emailBody = paymentSuccess(
      amount / 100,
      paymentId,
      orderId,
      user.firstName,
      user.lastName
    );

    await mailSender(user.email, "Study Notion Payment Successful", emailBody);

    return res.status(200).json({
      success: true,
      message: "Payment confirmation email sent",
    });
  } catch (error) {
    console.error("Email Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send email",
    });
  }
};
