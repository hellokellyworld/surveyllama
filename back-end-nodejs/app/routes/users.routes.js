const {
	ensureAuthenticated //sessionChecker,
} = require("./ensureAuthenticated");
const { httpStatusCodes } = require("../constants");
const { ErrorClass } = require("../helpers/error");

const { logger } = require("../loggers/logger");
const _debug = require("debug");
const RateLimiter = require("express-rate-limit");

const createAccountLimiter = RateLimiter({
	windowMs: 60 * 60 * 1000, // 1 hour window
	max: 5, // start blocking after 5 requests
	message: "Too many accounts created from this IP, please try again after an hour."
});

module.exports = (app) => {
	const usersCtrl = require("../controllers/users.controller");
	//Create
	app.post("/user/createUser", createAccountLimiter, usersCtrl.createUser); //need to check and  make sure user not logged in already

	//Read
	app.get("/user/getUser", sessionChecker, ensureAuthenticated, usersCtrl.grabUser);
	app.get("/user/confirmUserEmail/:token", usersCtrl.confirmUserEmail);
	app.get("/user/userTypes", usersCtrl.grabUserTypes);
	app.get("/user/getUserPublicDataById", usersCtrl.grabUserPublicDataById);

	//Update
	app.post("/user/updateUser", sessionChecker, ensureAuthenticated, usersCtrl.updateUser);

	app.post("/user/updateAvatar", sessionChecker, ensureAuthenticated, usersCtrl.updateUserAvatar);
	app.post("/user/logOut", sessionChecker, usersCtrl.logOut); //regardless of if logged in already, will simply log out

	app.get("/user/loginByEmail", sessionChecker); //, usersCtrl.loginGet); //same as usersCtrl.sessoinChecker

	app.post("/user/loginByEmail", sessionChecker, usersCtrl.loginByEmail);

	app.get("/user/loginByPhone", sessionChecker); //, usersCtrl.loginGet); //same as usersCtrl.sessoinChecker

	app.post("/user/loginByPhone", sessionChecker, usersCtrl.loginByPhone);

	app.get("/user/userMeIn", ensureAuthenticated, usersCtrl.userMeInGet); // check if the user is logged in, if yes

	//Update basic info
	app.post("/user/updateUserBasicInfo", ensureAuthenticated, usersCtrl.updateUserBasicInfo);

	//recover password by phone
	app.post("/user/userSubmitRequestPhoneCode", usersCtrl.userSubmitRequestPhoneCode);
	app.post("/user/userSubmitPhoneCode", usersCtrl.userSubmitPhoneCode);
	app.post("/user/userSubmitPhonePassword", usersCtrl.userSubmitPhonePassword);

	//recover password by email
	app.post("/user/userSubmitRequestEmailCode", usersCtrl.userSubmitRequestEmailCode);
	app.post("/user/userSubmitEmailCode", usersCtrl.userSubmitEmailCode);
	app.post("/user/userSubmitEmailPassword", usersCtrl.userSubmitEmailPassword);

	//check user registration phone and email availability
	app.post("/user/checkPhoneAvailability", usersCtrl.checkPhoneAvailability);
	app.post("/user/checkEmailAvailability", usersCtrl.checkEmailAvailability);
	app.post("/user/checkEmailConfirmation", usersCtrl.checkEmailConfirmation);

	//change user email if password is correct, already logged in, new email is available
	app.post(
		"/user/userSubmitRequestPhoneCodeById",
		sessionChecker,
		ensureAuthenticated,
		usersCtrl.userSubmitRequestPhoneCodeById
	);
	app.post("/user/userSubmitPhoneCodeById", sessionChecker, ensureAuthenticated, usersCtrl.userSubmitPhoneCodeById);
	app.post("/user/userSubmitChangeEmail", sessionChecker, ensureAuthenticated, usersCtrl.changeUserEmail);

	//Delete
	app.post("/user/deleteUser", sessionChecker, ensureAuthenticated, usersCtrl.deleteUser);
};

// middleware function to check for logged-in users, if logged in, simply pass to next() handler
// other wise proceed to login or redirect to login page
// when trying to get to protected resource, we can use this middleware

const sessionChecker = (req, res, next) => {
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
};
