const env = process.env.NODE_ENV || "development"; //take the NODE_ENV value or "development"
const config = require("../sendemail/mailredirect.json")[env]; //read the mongo.json file in current directory and take the env entry

module.exports = () => {
	const envMailService = process.env[config.mailService];

	const localMailService = config.mailService;

	const mailService = envMailService ? envMailService : localMailService;

	return mailService;
};
