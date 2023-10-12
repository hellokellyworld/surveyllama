const mongoose = require("mongoose");
//mongoose.connect("mongodb://localhost:27017/surveyllama-mongodb-development");
const RecentSearchSchema = mongoose.Schema({
	searchString: {
		type: String,
		index: true
	},
	searchUserId: String,
	createdAt: {
		type: Date,
		default: Date.now
	}
});

RecentSearchSchema.index({
	searchString: "text"
}); //CREATE INDEX FOR DB THROUGH CODE

module.exports = mongoose.model("RecentSearch", RecentSearchSchema);
