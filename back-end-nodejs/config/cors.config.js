const cors = require("cors");
const env = process.env.NODE_ENV || "development"; //take the NODE_ENV value or "development"
const config = require("./cors")[env]; //read the cors.json file in current directory and take the env entry
//either cors.production or cors.development

//get the whitelist ready based on the config file with the environmental variables
const cors_whitelist_from_env = process.env[config.use_env_variable]; //read the environmental variable "SL_CORS_WHITELIST"
//define a local whitelist in case not in production environment
const cors_whitelist_default = `${config.cors_whitelist}`; //essentialy [development].cors_whitelist in cors.json file
//get the final whitelist to use
let corsWhiteList = cors_whitelist_from_env ? cors_whitelist_from_env : cors_whitelist_default;

//Tom Long Note: we could also have put the allowedMethodList below in the cors.json or the environental variables.
//Also the following options can be put in the cors.json file or the environmental variables
// maxAge: 3600, //1hour //used to set Access-Control-Max-Age in the header
// preflightContinue: false,
// optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204

const corsOptionsDelegate = function (req, callback) {
	let corsOptions;
	if (corsWhiteList.indexOf(req.header("Origin")) !== -1) {
		//
		//'Origin provides the current address bar value of the user's browser. If the user is NOT using a browser
		// say he is using  curl, or REST calls or a shell script or in an IOS/Android app, it is NOT a browser,
		// then the Origin does not exist in the HTTP header.
		// If the user is using an old browser or a compromised browser, the Origin may not be provided either.
		//

		//look for the value of the 'Origin' in the request header and
		//check if it in the whitelist, if yes, allow. If no, deny.

		//in the good whitelist, do all methods //   methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
		//not in the whitelist, simply deny or allow except with GET

		const allowedMethodList = ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"];
		const method = req.method && req.method.toUpperCase && req.method.toUpperCase();
		if (allowedMethodList.indexOf(method) !== -1) {
			//found it
			corsOptions = {
				// reflect (enable) the requested origin in the CORS response
				origin: true,
				credentials: true, //HTTP Sessions for CORS
				methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
				maxAge: 86400, //1day
				preflightContinue: false,
				optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
			};
		} else {
			corsOptions = {
				// deny (disable) any CORS request
				origin: false,
				methods: ["GET"],
				credentials: true, //HTTP Sessions for CORS
				maxAge: 3600, //1hour //used to set Access-Control-Max-Age in the header
				preflightContinue: false,
				optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
			};
		}
	} else {
		const allowedMethodList = ["GET"]; //Not in the whitelist, only GET is allowed
		const method = req.method && req.method.toUpperCase && req.method.toUpperCase();
		if (allowedMethodList.indexOf(method) !== -1) {
			//found it
			corsOptions = {
				// reflect (enable) the requested origin in the CORS response
				origin: true,
				credentials: true, //HTTP Sessions for CORS
				methods: ["GET"],
				maxAge: 3600, //1hour //used to set Access-Control-Max-Age in the header
				preflightContinue: false,
				optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
			};
		} else {
			corsOptions = {
				//deny (disable)
				origin: false,
				methods: ["GET"],
				credentials: true, //HTTP Sessions for CORS
				maxAge: 60, //1min //used to set Access-Control-Max-Age in the header
				preflightContinue: false,
				optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
			};
		}
	}
	callback(null, corsOptions); // callback expects two parameters: error and options
};

module.exports = {
	corsOptionsDelegate
};
