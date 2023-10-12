const { ErrorClass } = require("../helpers/error");
const { httpStatusCodes } = require("../constants");
const { logger } = require("../loggers/logger");
const _debug = require("debug");

exports.grabCSRF = (req, res, next) => {
	const debug = _debug("csrf.controller.js:grabCSRF"); //this "csrf.controller.js:grabCSRF" namespace is registerred in app/loggers/logger.js first
	debug("calculating csrfToken...");
	const csrfToken = req.csrfToken(); //reads the csrfToken. Note this csrfToken() function
	//is injected to req by csurf package automatically. It computes a uniqe csrf token
	//can we customize the way of making the token?
	if (!req.query) {
		//handle error early
		logger.error("sl:csrf.controller.js: failed providing CSRF token.");
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.code,
				false,
				"failed providing CSRF token. " + httpStatusCodes.httpCode400.message
			)
		); //will be caught by handleError later
	}
	debug("csrfToken is " + csrfToken);
	return res.status(httpStatusCodes.httpCode200.code).json({
		success: true,
		message: "got csrfToken. " + httpStatusCodes.httpCode200.message,
		result: {
			csrfToken: csrfToken
		},
		error: null,
		statusCode: httpStatusCodes.httpCode200.code
	});
};

exports.calculateCSRFToken = (req) => {
	//function used to check CSRF token from incoming request and be checked with the cookie
	//here the value name is by default _csrf
	const csrfToken =
		req.body._csrf ||
		req.query._csrf ||
		req.headers["csrf-token"] ||
		req.headers["xsrf-token"] ||
		req.headers["x-csrf-token"] ||
		req.headers["x-xsrf-token"];
	return csrfToken;
};
