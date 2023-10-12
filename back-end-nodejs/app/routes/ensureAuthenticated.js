const { ErrorClass } = require("../helpers/error");
const { httpStatusCodes } = require("../constants");

const { logger } = require("../loggers/logger");
const _debug = require("debug");

function ensureAuthenticated(req, res, next) {
	const debug = _debug("sl:ensureAuthenticated.js:ensureAuthenticated");
	debug("checking to make sure user is authenticated...");
	req.isAuthenticated = function () {
		if (req.session && req.session.userId) {
			req.session.touch(); //renew the session
			return true;
		} else {
			return false;
		}
	};
	try {
		const userLoginStatus = req.isAuthenticated();
		if (!userLoginStatus) {
			var err = new Error("Error checking session.");
			err.status = 403;
			return next(
				new ErrorClass(
					httpStatusCodes.httpCode403.code,
					false,
					"ensureAuthenticated: user login is required. " + httpStatusCodes.httpCode403.message
				)
			);
		}
	} catch (err) {
		logger.info("ensureAuthenticated: user login is required.");
		logger.info(req);
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode403.code,
				false,
				"ensureAuthenticated: user login is required. " + httpStatusCodes.httpCode403.message
			)
		);
	}
	next();
}

function sessionChecker(req, res, next) {
	const debug = _debug("sl:users.routes.js:sessionChecker");
	debug("checking login session status...");

	//Add the isAuchenticated() to the request object
	req.isAuthenticated = function () {
		if (req.session && req.session.userId) {
			// logger.info('user already logged in')
			req.session.touch(); //renew the session
			return true;
		} else {
			return false;
		}
	};

	try {
		req.isAuthenticated();
	} catch (err) {
		logger.error("sl:users.routes.js: Error checking session.");
		logger.error(err);
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode500.code,
				false,
				"Error checking session. " + httpStatusCodes.httpCode100.message
			)
		);
	}
	next();
}

function ensureAuthenticatedAndRedirectIfNotAuthenicated(req, res, next) {
	const debug = _debug("sl:ensureAuthenticated.js:ensureAuthenticatedAndRedirectIfNotAuthenicated");
	debug("checking to make sure user is authenticated...");
	req.isAuthenticated = function () {
		if (req.session && req.session.userId) {
			req.session.touch(); //renew the session
			return true;
		} else {
			return false;
		}
	};
	try {
		const userLoginStatus = req.isAuthenticated();
		if (!userLoginStatus) {
			//SHOULD REDIRECT HERE
			//provide where to direct to here,if not front-end AxiosGlobalResponseInterceptors will decide
			//const redirectUri = `http://localhost:8080/user/userLoginByEmail`;
			return res.status(httpStatusCodes.httpCode401.code).json({
				success: false,
				result: null,
				error: null,
				redirectURL: null, //  redirectUri,
				statusCode: httpStatusCodes.httpCode401.code
			});
		}
	} catch (err) {
		logger.info("ensureAuthenticatedAndRedirectIfNotAuthenicated: unable to redirect to login page. ");
		logger.info(req);
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode307.code,
				false,
				"ensureAuthenticatedAndRedirectIfNotAuthenicated: unable to redirect to login page. " +
					httpStatusCodes.httpCode307.message
			)
		);
	}
	next();
}

module.exports = { ensureAuthenticated, sessionChecker, ensureAuthenticatedAndRedirectIfNotAuthenicated };
