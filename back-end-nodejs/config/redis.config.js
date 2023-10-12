//const bluebird = require('bluebird');
const { promisify } = require("es6-promisify");

const redis = require("redis").createClient({
	host: process.env.REDIS_HOST || "localhost",
	port: process.env.REDIS_PORT || 6379
	//   password: process.env.REDIS_PASS || "password",
});

const redisclient = promisify(redis.send_command.bind(redis));

module.exports = redisclient;
