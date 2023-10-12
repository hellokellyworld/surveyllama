const env = process.env.NODE_ENV || "development"; //take the NODE_ENV value or "development"
const config = require("./sms.json")[env]; //read the mongo.json file in current directory and take the env entry

module.exports = () => {
	const envSMSService = process.env[config.smsServiceName];

	const localSMSService = config.smsServiceName;

	const smsService = envSMSService ? envSMSService : localSMSService;

	return smsService;
};
