const mongoose = require("mongoose");
const UserConnectionsSchema = mongoose.Schema({
	userId: {
		type: String
	},
	socketId: {
		type: String,
		index: true
	},
	createdAt: {
		type: Date,
		default: Date.now
	}
});
UserConnectionsSchema.index({
	socketId: "text"
});

module.exports = mongoose.model("UserConnections", UserConnectionsSchema);
