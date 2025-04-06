const mongoose = require("mongoose");

const courseProgress = new mongoose.Schema(
	{
		courseID: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Course",
			required: true,
		},
		userID: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		completedVideos: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "SubSection",
			},
		],
	},
	{ timestamps: true }
);

module.exports = mongoose.model("CourseProgress", courseProgress);
