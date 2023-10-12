const mongoose = require("mongoose");
// https://stackoverflow.com/questions/1764435/database-design-for-a-survey  Check here on how to design survey DB and use it
//
const ChatDataSchema = mongoose.Schema({
	products: [
		{
			type: String
		}
	],
	prices: [
		{
			type: String,
			required: true
		}
	],
	location: {
		type: String,
		required: true
	},
	createdAt: {
		type: Date,
		default: Date.now
	}
});

module.exports = mongoose.model("ChatData", ChatDataSchema);
