// url: "mongodb://localhost/surveyllama-mongodb-development"
const env = process.env.NODE_ENV || "development"; //take the NODE_ENV value or "development"
const config = require("./mongo")[env]; //read the mongo.json file in current directory and take the env entry

module.exports = () => {
	//set the production mongoDB URL if we are using the production config
	const envUrl = process.env[config.use_env_variable];
	//Define a local URL variable if we're not in production
	const localUrl = `mongodb://${config.host}/${config.database}`;
	//set the connection URL
	const mongoUrl = envUrl ? envUrl : localUrl;
	return mongoUrl;
};
