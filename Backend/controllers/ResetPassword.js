const User = require("../models/User");
const mailSender = require("../utils/mailSender");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

// Send reset password token to user's email
exports.resetPasswordToken = async (req, res) => {
	try {
		const { email } = req.body;

		const user = await User.findOne({ email });
		if (!user) {
			return res.json({
				success: false,
				message: `This email: ${email} is not registered with us. Please enter a valid email.`,
			});
		}

		const token = crypto.randomBytes(20).toString("hex");

		const updatedDetails = await User.findOneAndUpdate(
			{ email },
			{
				token,
				resetPasswordExpires: Date.now() + 3600000, // 1 hour
			},
			{ new: true }
		);

		console.log("Reset token details:", updatedDetails);

		const url = `https://studynotion.fun/update-password/${token}`;

		await mailSender(
			email,
			"Password Reset",
			`Your link to reset your password is: ${url}. This link will expire in 1 hour.`
		);

		return res.json({
			success: true,
			message: "Email sent successfully. Please check your inbox to continue.",
		});
	} catch (error) {
		console.error("Error in resetPasswordToken:", error);
		return res.json({
			success: false,
			message: "An error occurred while sending the reset email.",
			error: error.message,
		});
	}
};

// Handle password reset after user clicks the link
exports.resetPassword = async (req, res) => {
	try {
		const { password, confirmPassword, token } = req.body;

		if (password !== confirmPassword) {
			return res.json({
				success: false,
				message: "Password and confirm password do not match.",
			});
		}

		const userDetails = await User.findOne({ token });
		if (!userDetails) {
			return res.json({
				success: false,
				message: "Invalid token.",
			});
		}

		if (userDetails.resetPasswordExpires < Date.now()) {
			return res.status(403).json({
				success: false,
				message: "Token has expired. Please request a new one.",
			});
		}

		const encryptedPassword = await bcrypt.hash(password, 10);

		await User.findOneAndUpdate(
			{ token },
			{ password: encryptedPassword },
			{ new: true }
		);

		return res.json({
			success: true,
			message: "Password has been reset successfully.",
		});
	} catch (error) {
		console.error("Error in resetPassword:", error);
		return res.json({
			success: false,
			message: "An error occurred while resetting the password.",
			error: error.message,
		});
	}
};
