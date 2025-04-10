const mongoose = require("mongoose");

const coursesSchema = new mongoose.Schema(
	{
		courseName: {
			type: String,
			required: true,
			trim: true,
		},
		courseDescription: {
			type: String,
			required: true,
		},
		instructor: {
			type: mongoose.Schema.Types.ObjectId,
			required: true,
			ref: "user",
		},
		whatYouWillLearn: {
			type: String,
		},
		courseContent: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Section",
			},
		],
		ratingAndReviews: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "RatingAndReview",
			},
		],
		price: {
			type: Number,
			required: true,
		},
		thumbnail: {
			type: String,
		},
		tag: {
			type: [String],
			required: true,
		},
		category: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Category",
			// required: true,
		},
		studentsEnrolled: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "user",
			},
		],
		instructions: {
			type: [String],
		},
		status: {
			type: String,
			enum: ["Draft", "Published"],
			default: "Draft",
		},
	},
	{ timestamps: true }
);

module.exports = mongoose.model("Course", coursesSchema);