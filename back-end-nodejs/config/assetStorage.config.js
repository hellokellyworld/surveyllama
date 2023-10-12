const env = process.env.NODE_ENV || "development"; //take the NODE_ENV value or "development"
const config = require("../config/storage.json")[env]; //read the mongo.json file in current directory and take the env entry

module.exports = () => {
	const envStorageService = process.env[config.serviceName];

	const localStorageService = config.serviceName;

	const assetStorageService = envStorageService ? envStorageService : localStorageService;

	return assetStorageService;
};
