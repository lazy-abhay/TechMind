const Section = require("../models/Section");
const Course = require("../models/Course");

// CREATE a new section
exports.createSection = async (req, res) => {
	try {
		const { sectionName, courseId } = req.body;

		// Validation
		if (!sectionName || !courseId) {
			return res.status(400).json({
				success: false,
				message: "Missing required properties",
			});
		}

		const course = await Course.findById(courseId);
		if (!course) {
			return res.status(404).json({
				success: false,
				message: "Course not found",
			});
		}

		// Create new section
		const newSection = await Section.create({ sectionName });

		// Add section to course
		const updatedCourse = await Course.findByIdAndUpdate(
			courseId,
			{ $push: { courseContent: newSection._id } },
			{ new: true }
		)
			.populate({
				path: "courseContent",
				populate: { path: "subSection" },
			})
			.exec();

		return res.status(200).json({
			success: true,
			message: "Section created successfully",
			updatedCourse,
		});
	} catch (error) {
		console.error("Error creating section:", error);
		return res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

// UPDATE a section
exports.updateSection = async (req, res) => {
	try {
		const { sectionName, sectionId, courseId } = req.body;

		const section = await Section.findByIdAndUpdate(
			sectionId,
			{ sectionName },
			{ new: true }
		);

		if (!section) {
			return res.status(404).json({
				success: false,
				message: "Section not found",
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
			message: "Section updated successfully",
			updatedCourse,
		});
	} catch (error) {
		console.error("Error updating section:", error);
		return res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};

// DELETE a section
exports.deleteSection = async (req, res) => {
	try {
		const { sectionId, courseId } = req.body;

		await Section.findByIdAndDelete(sectionId);

		const updatedCourse = await Course.findById(courseId)
			.populate({
				path: "courseContent",
				populate: { path: "subSection" },
			})
			.exec();

		return res.status(200).json({
			success: true,
			message: "Section deleted successfully",
			updatedCourse,
		});
	} catch (error) {
		console.error("Error deleting section:", error);
		return res.status(500).json({
			success: false,
			message: "Internal server error",
			error: error.message,
		});
	}
};
