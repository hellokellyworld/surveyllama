const mongoose = require("mongoose");
const SessionsSchema = mongoose.Schema({
	expires: {
		Type: Date
	},
	session: {
		Type: String
	}
});

module.exports = mongoose.model("Sessions", SessionsSchema);
