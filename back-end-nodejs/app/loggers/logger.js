const pino = require("pino");
const pinoDebug = require("pino-debug");
const expressPino = require("express-pino-logger");

//pino logger setup
const logger = pino({
	//prettyPrint: true,
	prettyPrint: {
		//  colorize: chalk.supportsColor, // --colorize
		//crlf: false, // --crlf
		errorLikeObjectKeys: ["err", "error"], // --errorLikeObjectKeys
		//errorProps: '', // --errorProps
		//levelFirst: false, // --levelFirst
		//messageKey: 'msg', // --messageKey
		//messageFormat: false, // --messageFormat
		timestampKey: "time", // --timestampKey
		translateTime: true // --translateTime
		//search: 'foo == `bar`', // --search
		//ignore: 'pid,hostname' // --ignore,
		//customPrettifiers: {}
	},
	level: process.env.LOG_LEVEL || "debug" //can be 'trace','debug','info','warn','error','fatal'
	//fatal: 60,
	//error: 50,
	//warn: 40,
	//info: 30,
	//debug: 20,
	//trace: 10
});

//wire pino tool with debug tool so that namespace can be used for debugging
if (!pinoDebug.called) {
	//call it only once
	pinoDebug(logger, {
		auto: true, // default
		safe: true,
		map: {
			//specify namespace: debuglevel like below
			"sl:server.js": "debug", //map namespace "ssl:server" of debug to 'debug' level of the pino logger
			"sl:csrf.controller.js:grabCSRF": "debug",
			"sl:sms.controller.js:sendSMS": "debug",
			"sl:sms.controller.js:sendSMSByPost": "debug",
			"sl:users.controller.js:grabAvatar": "debug",
			"sl:users.controller.js:grabUserTypes": "debug",
			"sl:users.controller.js:grabUser": "debug",
			"sl:users.controller.js:grabUsers": "debug",
			"sl:users.controller.js:createUser": "debug",
			"sl:users.controller.js:updateUser": "debug",
			"sl:users.controller.js:deleteUser": "debug",
			"sl:users.controller.js:logOut": "debug",
			"sl:users.controller.js:loginByEmail": "debug",
			"sl:users.controller.js:validateLoginByEmailForm": "debug",
			"sl:users.controller.js:loginByPhone": "debug",
			"sl:users.controller.js:updateUserAvatar": "debug",
			"sl:users.controller.js:loginGet": "debug",
			"sl:users.controller.js:sessoinChecker": "debug",
			"sl:users.controller.js:userMeInGet": "debug",
			"sl:users.controller.js:updateUserBasicInfo": "debug",
			"sl:users.controller.js:userSubmitRequestPhoneCode": "debug",
			"sl:users.controller.js:userSubmitPhoneCode": "debug",
			"sl:users.controller.js:userSubmitPhonePassword": "debug",
			"sl:ensureAuthenticated.js:ensureAuthenticated": "debug",
			"sl:session.config.js:sessionConfig": "debug",
			"sl:users.routes.js:sessionChecker": "debug"
			//   '*': 'trace' // everything else - trace
		}
	});
}

//use pino and pino-pretty for express HTTP traffic logging
const expressLogger = expressPino({
	//to be activated by app.use(expressLogger) in server.js
	logger: logger
});

module.exports = {
	logger,
	expressLogger
};
