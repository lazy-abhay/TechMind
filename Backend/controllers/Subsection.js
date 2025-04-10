const Section = require("../models/Section");
const SubSection = require("../models/SubSection");
const Course = require("../models/Course");
const { uploadImageToCloudinary } = require("../utils/imageUploader");

// CREATE SubSection
exports.createSubSection = async (req, res) => {
	try {
		const { sectionId, title, description, courseId } = req.body;
		const video = req.files?.videoFile;

		if (!sectionId || !title || !description || !video || !courseId) {
			return res.status(400).json({
				success: false,
				message: "All fields are required",
			});
		}

		const section = await Section.findById(sectionId);
		if (!section) {
			return res.status(404).json({
				success: false,
				message: "Section not found",
			});
		}

		const uploadDetails = await uploadImageToCloudinary(
			video,
			process.env.FOLDER_VIDEO
		);

		const subSection = await SubSection.create({
			title,
			description,
			videoUrl: uploadDetails.secure_url,
		});

		await Section.findByIdAndUpdate(
			sectionId,
			{ $push: { subSection: subSection._id } },
			{ new: true }
		);

		const updatedCourse = await Course.findById(courseId)
			.populate({
				path: "courseContent",
				populate: { path: "subSection" },
			})
			.exec();

		return res.status(200).json({
			success: true,
			message: "Sub-section created successfully",
			data: updatedCourse,
		});
	} catch (error) {
		console.error("Error creating sub-section:", error);
		return res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

// UPDATE SubSection
exports.updateSubSection = async (req, res) => {
	try {
		const { SubsectionId, title, description, courseId } = req.body;
		const video = req.files?.videoFile;

		let updatedData = {};
		if (title) updatedData.title = title;
		if (description) updatedData.description = description;

		if (video) {
			const uploadDetails = await uploadImageToCloudinary(
				video,
				process.env.FOLDER_VIDEO
			);
			updatedData.videoUrl = uploadDetails.secure_url;
		}

		const updatedSubSection = await SubSection.findByIdAndUpdate(
			SubsectionId,
			updatedData,
			{ new: true }
		);

		if (!updatedSubSection) {
			return res.status(404).json({
				success: false,
				message: "Sub-section not found",
			});
		}

		const updatedCourse = await Course.findById(courseId)
			.populate({
				path: "courseContent",
				populate: { path: "subSection" },
			})
			.exec();

		return res.status(200).json({
			success: true,
			message: "Sub-section updated successfully",
			data: updatedCourse,
		});
	} catch (error) {
		console.error("Error updating sub-section:", error);
		return res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

// DELETE SubSection
exports.deleteSubSection = async (req, res) => {
	try {
		const { subSectionId, sectionId, courseId } = req.body;

		if (!subSectionId || !sectionId) {
			return res.status(400).json({
				success: false,
				message: "subSectionId and sectionId are required",
			});
		}

		const subSection = await SubSection.findById(subSectionId);
		const section = await Section.findById(sectionId);

		if (!subSection || !section) {
			return res.status(404).json({
				success: false,
				message: "Sub-section or Section not found",
			});
		}

		await SubSection.findByIdAndDelete(subSectionId);
		await Section.findByIdAndUpdate(
			sectionId,
			{ $pull: { subSection: subSectionId } },
			{ new: true }
		);

		const updatedCourse = await Course.findById(courseId)
			.populate({
				path: "courseContent",
				populate: { path: "subSection" },
			})
			.exec();

		return res.status(200).json({
			success: true,
			message: "Sub-section deleted successfully",
			data: updatedCourse,
		});
	} catch (error) {
		console.error("Error deleting sub-section:", error);
		return res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};
