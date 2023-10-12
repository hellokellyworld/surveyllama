const mongoose = require("mongoose");
const ChatDataSchema = require("./chatData.model.js").schema;
// const constants = require("../constants");
// const { logger } = require("../loggers/logger.js");

const SurveySessionSchema = mongoose.Schema({
	//May want to change to SurveySessionSchema
	AISettingToken: String,
	offTopicCount: Number,
	isGoalAchieved: Boolean,
	chatData: ChatDataSchema,
	chatHistory: [
		{
			textInput: {
				type: String
			},
			isRobot: {
				type: Boolean
			},
			timestamp: {
				type: Date
			}
		}
	],
	createdAt: {
		type: Date,
		default: Date.now
	}
});

module.exports = mongoose.model("SurveySession", SurveySessionSchema);
