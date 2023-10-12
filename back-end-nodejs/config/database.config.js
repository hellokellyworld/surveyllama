//url: "mongodb://localhost/surveyllama-mongodb-development"
const mongoose = require("mongoose");
const env = process.env.NODE_ENV || "development"; //take the NODE_ENV value or "development"
const config = require("./mongo")[env]; //read the mongo.json file in current directory and take the env entry
const mongodbOptions = require("./mongo")["mongodbOptions"]; //read options of mongodb (mongoose)
module.exports = () => {
	//set the production mongoDB URL if we are using the production config
	const envUrl = process.env[config.use_env_variable];

	//Define a local URL variable if we're not in production
	const localUrl = `mongodb://${config.host}/${config.database}`;

	//set the connection URL
	const mongoUrl = envUrl ? envUrl : localUrl;

	//connect
	return mongoose.connect(
		mongoUrl,
		mongodbOptions
		//,	async(error) => {
		// 		if (error) {
		// 		  console.error(error);
		// 		  return;
		// 		}
		// 		console.log("MongoDB connected");
		//
	);
};
