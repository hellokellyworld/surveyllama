const { isEmail } = require("validator");
const Users = require("../models/users.model.js");
const Sessions = require("../models/sessions.model.js");
const UserConnections = require("../models/userConnections.model.js");
const uploadCtrl = require("./upload.controller");
const constants = require("../constants");
const millisOfMonth = 2628000000;
const mongoSanitize = require("mongo-sanitize");
const { httpStatusCodes } = require("../constants");
const { ErrorClass } = require("../helpers/error");
const { logger } = require("../loggers/logger");
const _debug = require("debug");
const jwt = require("jsonwebtoken");
const mailcredentials = require("../utils/sendemail/mailcrendentials");
const serverEmailSender = require("../utils/sendemail/serveremailsender")(); //(mailcredentials);
const mailredirect = require("../utils/sendemail/mailredirect.config");

// const {
//     regexchecker
// } = require('../utils/regexchecker/regexchecker');

/**
 * General functions here here
 */

function grabAvatar(user) {
	const debug = _debug("sl:users.controller.js:grabAvatar");
	debug("grabing user avatar image...");
	return Promise.all(user.avatar.map(uploadCtrl.retrieveImg)).then((avatar) => {
		user.avatar = avatar;
		return user;
	});
}

//note here we should pass in user._doc
async function grabAvatarLinksForUser(userDoc) {
	//return a new user doc with avatar image URL using full URL
	return Promise.resolve({
		...userDoc,
		avatar: await uploadCtrl.retrieveImg(userDoc.avatar)
	});
}

exports.grabUserTypes = (req, res, next) => {
	const debug = _debug("sl:users.controller.js:grabUserTypes");
	debug("grabing user types...");

	return res.status(httpStatusCodes.httpCode200.code).json({
		success: true,
		message: "got user types." + httpStatusCodes.httpCode200.message,
		result: {
			userTypes: constants.userTypes
		},
		error: null,
		statusCode: httpStatusCodes.httpCode200.code
	});
};

var picturePath = []; //a variable used to restore picture path for dropbox
/**
 * Functions that relate to Users
 */

exports.grabUser = (req, res, next) => {
	const debug = _debug("sl:users.controller.js:grabUser");
	debug("grabing user data...");

	Object.keys(req.query).forEach((param) => {
		req.query[param] = mongoSanitize(req.query[param]);
	});

	if (req.query && req.query.id) {
		Users.findById(req.query.id)
			.then((user) => {
				picturePath = user.avatar;
				return grabAvatar(user);
			})
			.then((user) => {
				//calculate last login time and save data if needed.
				return res.status(httpStatusCodes.httpCode200.code).json({
					success: true,
					message: "grabUser: success retrieving user. " + httpStatusCodes.httpCode200.message,
					result: {
						user: user._doc
					},
					error: null,
					statusCode: httpStatusCodes.httpCode200.code
				});
				// user.avatar = picturePath; //restore picture relative path
				// return user.save(); //save will change password
			})
			.catch((err) => {
				logger.warn("grabUser: failure finding user or getting user avatar.");
				logger.warn(err);
				return next(
					new ErrorClass(
						httpStatusCodes.httpCode404.code,
						false,
						"grabUser: failure finding user or getting user avatar. " + httpStatusCodes.httpCode404.message
					)
				);
			});
	} else {
		logger.warn("grabUser: oops, you did not specify a user id in the request.");
		logger.warn(req);
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.code,
				false,
				"grabUser: oops, you did not specify a user id in the request. " + httpStatusCodes.httpCode400.message
			)
		);
	}
};

exports.grabUsers = (req, res, next) => {
	const debug = _debug("sl:users.controller.js:grabUsers");
	debug("grabing users data...");

	Object.keys(req.query).forEach((param) => {
		req.query[param] = mongoSanitize(req.query[param]);
	});

	const { page } = req.query;

	const now = Date.now();
	const searchRange = page
		? {
				createdAt: {
					$gt: now - page * millisOfMonth,
					$lt: now - (page - 1) * millisOfMonth + 1
				}
		  }
		: {
				createdAt: {
					$gt: now - 3 * millisOfMonth,
					$lt: now + 1
				}
		  };
	Users.find(searchRange)
		.then((users) => {
			users = users.map((user) => {
				return user._doc;
			});
			return Promise.all(users.map(grabAvatar));
		})
		.then((users) => {
			//calculate laast retrieval time
			users.map((user) => {
				//user.lastAccessTime= ***
			});
			return res.status(httpStatusCodes.httpCode200.code).json({
				success: true,
				message: "grabUsers: success retrieving users. " + httpStatusCodes.httpCode200.message,
				result: {
					users: users
				},
				error: null,
				statusCode: httpStatusCodes.httpCode200.code
			});
		})
		.catch((err) => {
			logger.warn("grabUsers: failure finding users. ");
			logger.warn(err);
			return next(
				new ErrorClass(
					httpStatusCodes.httpCode404.code,
					false,
					"grabUsers: failure finding users. " + httpStatusCodes.httpCode404.message
				)
			);
		});
};

function isAlphaNumeric(ch) {
	return ch.match(/^[a-z0-9]+$/i) !== null; //i means seach case insensitive
}

function checkPasswordComplexity(password) {
	if (password.length > 128 || password.length < 10) return false;
	if (isAlphaNumeric(String(password))) return false;
	let upper = false;
	let lower = false;
	let digit = false;
	//let special = false;
	String(password)
		.split("")
		.map((ch) => {
			if (!upper && ch >= "A" && ch <= "Z") upper = true;
			if (!lower && ch >= "a" && ch <= "z") lower = true;
			if (!digit && ch >= "0" && ch <= "9") digit = true;
			if ((upper && lower && digit) === true) {
				return true;
			} else {
				return false;
			}
		});
	return upper && lower && digit;
}

exports.createUser = async (req, res, next) => {
	const debug = _debug("sl:users.controller.js:createUser");
	debug("creating user...");

	Object.keys(req.body).forEach((param) => {
		req.body[param] = mongoSanitize(req.body[param]);
	});

	const form = req.body;
	if (!form.password) {
		//must validate the password here
		const err = new Error("Password must not be empty!");
		logger.error("createUser: Password must not be empty!");
		logger.error(err);
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.code,
				false,
				"createUser: Password must not be empty! " + httpStatusCodes.httpCode400.message
			)
		);
	} else {
		//check if form.password satisfies rules, if not, return error and success false
		if (checkPasswordComplexity(form.password) == false) {
			const err = new Error(
				"Password Requirement:At least one capital letter (A-Z); at least one lower case letter (a-z); at least one number(0-9); at least one special character; minimum length of 10."
			);
			err.status = 406;
			return next(
				new ErrorClass(
					httpStatusCodes.httpCode406.code,
					false,
					"createUser:" +
						"Password Requirement: At least one capital letter (A-Z); at least one lower case letter (a-z); at least one number(0-9); at least one special character; minimum length of 10." +
						httpStatusCodes.httpCode406.message
				)
			);
		}

		if (form.avatar) {
			//registration with avatar
			uploadCtrl
				.storeImg(form.avatar)
				.then((imagePaths) => {
					if (!imagePaths) throw new Error("error uploading user avatar");
					form.avatar = imagePaths[0];
					form.hasCompletedUserBasicInfo = false;
					return new Users(form).save();
				})
				.then((user) => {
					if (!user._id) {
						logger.error("createUser: failure creating user in DB. ");
						throw new Error("failure creating user in DB");
					}
					req.session.userId = user._id; //here we may not needed?
					//Not sure,how do we know if the front end will get the session?
					return res.status(httpStatusCodes.httpCode200.code).json({
						success: true,
						message: "createUser: success creating user. " + httpStatusCodes.httpCode200.message,
						result: {
							user_id: user._id,
							user: user._doc //we may not want to give everything out aobut the user here
						},
						error: null,
						statusCode: httpStatusCodes.httpCode200.code
					});
				})
				.catch((err) => {
					logger.error("createUser: failure creating user in DB. ");
					logger.error(err);
					return next(
						new ErrorClass(
							httpStatusCodes.httpCode404.code,
							false,
							"createUser: failed creating user in DB. " + httpStatusCodes.httpCode404.message
						)
					);
				});
		} else {
			//registration without avatar
			//create new user and return it
			const form2 = {
				avatar: "",
				//Address
				hasCompletedUserBasicInfo: false,
				addressLines: {
					line1: "",
					line2: "",
					line3: "",
					line4: ""
				},
				country: "",
				county: "",
				stateProvince: "",
				townCity: "",
				postcodeZip: "",
				//Names
				firstName: "",
				lastName: "",
				fullName: form.name || "",
				middleInitial: "",
				organizationName: "", //will later move to organization model
				organizationAddress: "",
				aliaseNickname: "",
				//userType
				userType: "",
				//paymentType
				paymentMethod: "",
				//referral from other users
				referees: [],
				//title or rank
				title: "",
				//BirthDay, gender
				DOB: new Date(0),
				gender: "",
				//phone and Email
				workPhone: {
					countryCode: "",
					phoneNumber: "",
					extNumber: ""
				},
				fax: {
					countryCode: "",
					faxNumber: "",
					extNumber: ""
				},
				//login data
				cellPhone: {
					countryCode: form.countryCode || "",
					phoneNumber: form.cellPhone
				},
				email: form.email,
				loginName: "", //reserved for future use
				password: form.password,
				recentCityies: [],
				//other
				otherDetails: ""
				//createdAt: null
			};
			const user = new Users(form2);
			user
				.save()
				.then(async (user) => {
					if (!user._id) {
						logger.error("createUser: failure creating user in DB.");
						throw new Error("failure creating user in DB.");
					}
					req.session.userId = user._id; //here we may not needed?
					//Not sure,how do we know if the front end will get the session?
					//req.sessiion.user = user.dataValues; //add the user data to the session. Not sure if this is needed
					//most likely we use it for sessionCheck later

					//send confirmation email to user
					const emailToken = jwt.sign(
						{
							id: user._id.toString()
						},
						mailcredentials.EMAIL_SECRET,
						{
							expiresIn: "30 days" //expires in 30 days
						}
					);
					const frontEndUri = mailredirect.frontEndUri;
					const emailUrl = `${frontEndUri}/api/user/confirmUserEmail/${emailToken}`;

					const htmlBody =
						"<h1>Welcome to SurveyLLama。</h1>\n<p>Thank you for registering an account with us!" +
						"<b> Please click this link to confirm your email:" +
						`<a href="${emailUrl}">${emailUrl}</a></b></p>\n<p>Converse, Do not Conform.</p>\n` +
						"<p>Thank you for joining SurveyLLama</p>";

					const textBody =
						"Welcome to SurveyLLama。</h1>\n<p>Thank you for registering an account with us!" +
						"\n Please click this link to confirm your email:" +
						`\n ${emailUrl} \n Converse, Do not Conform.\n Thank you for joining SurveyLLama`;
					const fromEmail = "surveyllama@gmail.com";
					const replyTo = "surveyllama@gmail.com";
					const name = "SurveyLLama Info";
					try {
						await serverEmailSender.send(
							fromEmail,
							user.email,
							replyTo,
							name,
							htmlBody,
							textBody,
							`You Received a New message from SurveyLLama.`
						);
					} catch (err) {
						logger.error("createUser: oops, not able to send email to user:" + user.email);
						logger.error(err);
						return next(
							new ErrorClass(
								httpStatusCodes.httpCode500.code,
								false,
								"createUser: failed creating user." + httpStatusCodes.httpCode500.message
							)
						);
					}
					return res.status(httpStatusCodes.httpCode200.code).json({
						success: true,
						message: "createUser: success creating user. " + httpStatusCodes.httpCode200.message,
						result: {
							user_id: user._id,
							user: user._doc //we may not want to give everything out aobut the user here
						},
						error: null,
						statusCode: httpStatusCodes.httpCode200.code
					});
				})
				.catch((error) => {
					logger.error("createUser: failure creating user in DB.");
					logger.error(error);
					return next(
						new ErrorClass(
							httpStatusCodes.httpCode500.code,
							false,
							"createUser: failed creating user in DB. " + httpStatusCodes.httpCode500.message
						)
					);
					//here on false, we need to re-direct the user to Homepage or signup page again
					//but this must be done through front-end
				});
		}
	}
};

//
//update user according to userId and action in the data object {data.action:string, data.userId:string}
//

exports.updateUser = (data, res) => {
	//need to make this into a middleware function

	const debug = _debug("sl:users.controller.js:updateUser");
	debug("updating user...");

	if (data.action && data.userId) {
		Users.findById(data.userId)
			.then((user) => {
				picturePath = user.avatar;
				return grabAvatar(user);
			})
			.then((user) => {
				//deal with  action ("Like" or "UnLike")
				//
				// if (data.action === "****") {
				//     //user.likesCount = parseInt(likesCount) + 1;
				// }
				//deal with other actions if any
				user.avatar = picturePath; //restore avatar relative path
				user
					.save()
					.then(() => {
						// return res.status(200).json({
						//     success: true,
						//     message: 'success in updating user',
						//     error: '',
						// });
						logger.info("updateUser: success in updating user.");
					})
					.catch((err) => {
						logger.error("updateUser: error in updating user to DB.");
						logger.error(err);
						return next(
							new Error(
								httpStatusCodes.httpCode500.code,
								false,
								"updateUser: error in updating user to DB. " + httpStatusCodes.httpCode500.message
							)
						);
					});
			})
			.catch((err) => {
				logger.warn("updateUser: error finding user in DB.");
				logger.warn(err);
				return next(
					new Error(
						httpStatusCodes.httpCode404.code,
						false,
						"updateUser: error finding user in DB. " + httpStatusCodes.httpCode404.message
					)
				);
			});
	} else {
		logger.warn("updateUser:wrong data for updating user.");
		logger.warn(data);
		return next(
			new Error(
				httpStatusCodes.httpCode400.code,
				false,
				"updateUser: error updating user. " + httpStatusCodes.httpCode400.message
			)
		);
	}
};

exports.deleteUser = (req, res, next) => {
	const debug = _debug("sl:users.controller.js:deleteUser");
	debug("deleting user...");

	Object.keys(req.body).forEach((param) => {
		req.body[param] = mongoSanitize(req.body[param]);
	});

	const form = req.body;
	if (form && form.id) {
		const myId = form.id;
		Users.findById(myId)
			.then((user) => {
				Users.remove(user)
					.then(() => {
						return res.status(httpStatusCodes.httpCode200.code).json({
							success: true,
							message: "success deleting user. " + httpStatusCodes.httpCode200.message,
							result: null,
							error: null,
							statusCode: httpStatusCodes.httpCode200.code
						});
					})
					.catch((err) => {
						logger.error("deleteUser: error deleting user.");
						logger.error(err);
						return next(
							new ErrorClass(
								httpStatusCodes.httpCode500.code,
								false,
								"deleteUser: error deleting user. " + httpStatusCodes.httpCode500.message
							)
						);
					});
			})
			.catch((err) => {
				logger.warn("deleteUser: error finding user.");
				logger.warn(err);
				return next(
					new ErrorClass(
						httpStatusCodes.httpCode404.code,
						false,
						"deleteUser: error finding user. " + httpStatusCodes.httpCode404.message
					)
				);
			});
	} else {
		logger.warn("deleteUser: error in request data.");
		logger.warn(req);
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.code,
				false,
				"deleteUser: error in request data. " + httpStatusCodes.httpCode400.message
			)
		);
	}
};

exports.logOut = (req, res, next) => {
	const debug = _debug("sl:users.controller.js:logOut");
	debug("logging out user...");

	Object.keys(req.body).forEach((param) => {
		req.body[param] = mongoSanitize(req.body[param]);
	});

	const form = req.body;
	if (req.session) {
		// delete session
		if (!req.session.userId) {
			//warning
			logger.warn("logOut: session user id does not exist during logout");
		} else {
			//log or save user's time of last logout in DB
			const timenow = new Date().toISOString().replace("T", " ").substr(0, 19);
			logger.info("User with id " + req.session.userId + " last logged out at " + timenow);
		}

		if (form && form.userId) {
			if (req.session.userId && req.session.userId != form.userId) {
				//warning
				logger.warn("logOut:logout user id different than session user id");
			}
		} else {
			//still go ahead and destroy the session
			//do nothing here
		}

		return req.session.destroy(function (err) {
			if (err) {
				res.clearCookie("msid"); //name of session, by default it was connect.sid, or the key of the SessionOptions
				logger.error("logOut: error, not able to destroy session, incident logged.");
				logger.error(err);
				return next(
					new ErrorClass(
						httpStatusCodes.httpCode500.code,
						false,
						"logout: error, not able to destroy session, incident logged. " + httpStatusCodes.httpCode500.message
					)
				);
				//can we throw error here? YES
			} else {
				res.clearCookie("msid"); //name of session, by default it was connect.sid, or the key of the SessionOptions
				//generate new csrfToken
				const csrfToken = req.csrfToken();
				logger.info("After logout, csrf Token is updated to: " + csrfToken);
				return res.status(httpStatusCodes.httpCode200.code).json({
					success: true,
					message: "success logging out. " + httpStatusCodes.httpCode200.message,
					result: null,
					error: null,
					statusCode: httpStatusCodes.httpCode200.code
				});
			}
		});
	} else {
		//clear cookie no matter what
		res.clearCookie("msid"); //name of session, by default it was connect.sid, or the key of the SessionOptions
		logger.error("logOut: bad request query, session does not exist, aborted.");
		logger.error(req);
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.codde,
				false,
				"logout: bad request query, session does not exist, aborted. " + httpStatusCodes.httpCode400.message
			)
		);
	}
};

exports.loginByEmail = (req, res, next) => {
	const debug = _debug("sl:users.controller.js:loginByEmail");
	debug("handling user login by email...");

	Object.keys(req.body).forEach((param) => {
		req.body[param] = mongoSanitize(req.body[param]);
	});

	////check of the form is good, other
	// const validationResult = validateLoginByEmailForm(req.body);
	// if (!validationResult.success) {
	//     return res.status(400).json({
	//         success: false,
	//         message: validationResult.message,
	//         error: validationResult.errors
	//     });
	// }

	if (req.body.email && req.body.password) {
		Users.authenticateByEmail(req.body.email, req.body.password, function (error, user) {
			if (error || !user) {
				logger.info("loginByEmail: Wrong email or password.");
				logger.info("user email is:" + req.body.email);
				if (error) {
					const timenow = new Date().toISOString().replace("T", " ").substr(0, 19);
					const userLoginFailureLogData = {
						eventType: "LOGIN_FAILURE",
						userId: user ? user._id : "undefined",
						loginTime: timenow,
						loginInputdata: {
							email: req.body.email
							//password: req.body.password //do NOT log password to prevent user data leak
						},
						loginMethod: "email",
						loginError: error
					};
					logger.info("LOGIN_FAILURE", userLoginFailureLogData);
				}
				return next(
					new ErrorClass(
						httpStatusCodes.httpCode401.code,
						false,
						"loginByEmail: error, Wrong email or password. " + httpStatusCodes.httpCode401.message
					)
				);
			} else {
				const userId = user._id.toString();
				const pattern = '"userId":"' + userId + '"';
				const filter = {
					session: {
						$regex: pattern
					}
				};
				Sessions.find(filter)
					.then((userSessions) => {
						//this is thenable
						if (userSessions) {
							logger.warn("users.controller.js:loginByEmail: the following user sessions are forced to logout:");
							logger.warn("users.controller.js:loginByEmail: ", userSessions);
							userSessions.map((userSess, index) => {
								//find the session in the DB and delete it (force logout)
								Sessions.remove(userSess)
									.then(() => {
										//find the useId,socketId, sessionId and all the sockets if any
										//and inform the client that it is force logged out by server
										UserConnections.find({
											userId: userId
										})
											.then((userLoginConnections) => {
												userLoginConnections.map((userConn, index) => {
													//find the socket id and send the socket
													const socketId = userConn.socketId;
													logger.info("userConn is: ", userConn);
													//req.io.sockets.socket(socketId).emit('force_logout', {
													if (req.io.sockets.connected[socketId] != null) {
														//function to create an action for the front-end to use
														//with redux-socket.io-middleware
														const forceLogoutAction = () => {
															return {
																type: "@@users/RECEIVE_FORCE_LOGOUT_FROM_SERVER",
																meta: {
																	//empty meta here so that the client will not emit the same message
																	//back to server
																},
																userId: user._id.toString(),
																sessionId: userSess._id
															};
														};
														const action = forceLogoutAction();
														logger.info("action is: ", action);
														//emit the action to the front-end, so that the front-end redux will
														//redirect to login page again or alert
														req.io.sockets.connected[socketId].emit("user-login-report", forceLogoutAction());
														logger.info("force loging out socket:" + socketId);
														//remove connection from the DB as well
														UserConnections.findOneAndDelete(userConn);
														logger.info("userConn is removed");
														// //disconnect the socket in 5 seconds
														// setTimeout(() => {
														//     req.io.sockets.sockets[socketId].disconnect();
														// // io.sockets.sockets[socketId] sometimes does NOT work
														// // we may have to use app/helpers/findClientSocket.js
														// }, 3000);
													} else {
														logger.error("not able to find user connections");
													}
												});
											})
											.catch((err) => {
												logger.warn(
													"users.controller.js:loginByEmail: not able to perform login sockets lookup in userconnections db, userId is:" +
														userId
												);
												logger.error("users.controller.js:loginByEmail: error is", err);
												return next(
													new ErrorClass(
														httpStatusCodes.httpCode500.code,
														false,
														"something wrong with user connections db"
													)
												);
											});
									})
									.catch((err) => {
										logger.warn(
											"users.controller.js:loginByEmail: not able to delete previous sessoin from db, userId is:" +
												userId
										);
										logger.warn("users.controller.js:loginByEmail: session is :", userSess);
										logger.error("users.controller.js:loginByEmail: error is:", err);
										return next(
											new ErrorClass(
												httpStatusCodes.httpCode500.code,
												false,
												"error deleting user session from session DB"
											)
										);
									});
							});
						}
					})
					.catch((err) => {
						logger.warn(
							"users.controller.js:loginByEmail: not able to perform session lookup in session db, userId is:" + userId
						);
						logger.error(err);
						return next(new ErrorClass(httpStatusCodes.httpCode500.code, false, "something wrong with session db"));
					});

				req.session.regenerate(function (err) {
					const timenow = new Date().toISOString().replace("T", " ").substr(0, 19);
					if (err) {
						const userLoginFailureLogData = {
							eventType: "LOGIN_FAILURE",
							userId: user ? user._id : "undefined",
							loginTime: timenow,
							loginInputdata: {
								email: req.body.email
								//password: req.body.password //do NOT log password to prevent user data leak
							},
							loginMethod: "email",
							loginError: err
						};
						logger.info("LOGIN_FAILURE", userLoginFailureLogData);
						return next(
							new ErrorClass(
								httpStatusCodes.httpCode500.code,
								false,
								"loginByEmail: error, unable to regenerate session. " + httpStatusCodes.httpCode500.message
							)
						);
					}
					//put user id into session object
					req.session.userId = user._id; //we may need to hash the id here
					if (req.body.stayLoggedInChecked) {
						const fourteendays = 1 * 60 * 60 * 24 * 14 * 1000;
						const maxAge = fourteendays;
						req.session.cookie.maxAge = maxAge;
						req.session.cookie.expires = new Date(Date.now() + fourteendays);
					} else {
						// req.body.stayLoggedInChecked is false or it's null
						const fiveMinutes = 5 * 60 * 1000; //5min
						const maxAge = fiveMinutes;
						req.session.cookie.maxAge = maxAge;
						req.session.cookie.expires = new Date(Date.now() + fiveMinutes);
					}
					//in the future may want to record this login time in DB for user activity analysis
					// const userLoginSuccessLogData = {
					//     eventType: 'LOGIN_SUCCESS',
					//     userId: user._id,
					//     loginTime: timenow,
					//     loginInPutdata: {
					//         email: req.body.email,
					//         //password: req.body.password //do NOT log password to prevent user data leak
					//     },
					//     loginMethod: 'email', //phone, email,other
					//     loginError: ''
					// }
					// logger.info('LOGIN_SUCCESS', userLoginSuccessLogData);
					//generate new csrfToken
					const csrfToken = req.csrfToken();
					logger.info("after login by Email, csrf Token is updated to: " + csrfToken);
					return res.status(httpStatusCodes.httpCode200.code).json({
						success: true,
						message: "login successful. " + httpStatusCodes.httpCode200.message,
						result: {
							user: user._doc
						}, //also return the user data
						error: null,
						statusCode: httpStatusCodes.httpCode200.code
					});
					//return res.redirect('/profile');  /here we to redirect user to his profile?
					//how does the backend redirect the user to a different location?
					//if it does not do that, how does the front end get to know the
					//cookie set by the backend in the session?
				});
			}
		});
	} else {
		logger.error("loginByEmail: both email and password are required");
		logger.error(req.body);
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.code,
				false,
				"loginByEmail: bad request query, aborted. " + httpStatusCodes.httpCode400.message
			)
		);
	}
};

/**
 * Validate the form with email login
 *
 * @param {object} payload - the HTTP body message
 * @returns {object} The result of validation. Object contains a boolean validation result,
 *                   errors tips, and a global message for the whole form.
 */
function validateLoginByEmailForm(payload) {
	const debug = _debug("sl:users.controller.js:validateLoginByEmailForm");
	debug("validating login by email form...");

	const errors = {};
	let isFormValid = true;
	let message = "";
	if (!payload || typeof payload.email !== "string" || payload.email.trim().length === 0) {
		isFormValid = false;
		errors.email = "Please provide your email address.";
	}
	if (!payload || typeof payload.password !== "string" || payload.password.trim().length === 0) {
		isFormValid = false;
		errors.password = "Please provide your password.";
	}
	if (!isFormValid) {
		message = "Check the form for errors.";
	}
	return {
		success: isFormValid,
		message,
		errors
	};
}

exports.loginByPhone = (req, res, next) => {
	const debug = _debug("sl:users.controller.js:loginByPhone");
	debug("handling user login by phone...");

	Object.keys(req.body).forEach((param) => {
		req.body[param] = mongoSanitize(req.body[param]);
	});

	// //check of the form is good, other
	// const validationResult = validateLoginByPhoneForm(req.body);
	// if (!validationResult.success) {
	//     return res.status(400).json({
	//         success: false,
	//         message: validationResult.message,
	//         error: validationResult.errors
	//     });
	// }

	if (req.body.countryCode && req.body.phoneNumber && req.body.password) {
		Users.authenticateByPhone(req.body.countryCode, req.body.phoneNumber, req.body.password, function (error, user) {
			if (error || !user) {
				if (error) {
					const timenow = new Date().toISOString().replace("T", " ").substr(0, 19);
					const userLoginFailureLogData = {
						eventType: "LOGIN_FAILURE",
						userId: user ? user._id : "undefined",
						loginTime: timenow,
						loginInutdata: {
							countryCode: req.body.countryCode,
							phoneNumber: req.body.phoneNumber
							//password: req.body.password //do NOT log password to prevent user data leak
						},
						loginMethod: "phone",
						loginError: error
					};
					logger.info("LOGIN_FAILURE", userLoginFailureLogData);
				}
				return next(
					new ErrorClass(
						httpStatusCodes.httpCode401.code,
						false,
						"loginByPhone: error, Wrong phone number or password. " + httpStatusCodes.httpCode401.message
					)
				);
			} else {
				const userId = user._id.toString();
				const pattern = '"userId":"' + userId + '"';
				const filter = {
					session: {
						$regex: pattern
					}
				};
				Sessions.find(filter)
					.then((userSessions) => {
						//this is thenable
						if (userSessions) {
							logger.warn("users.controller.js:loginByPhone: the following user sessions are forced to logout:");
							logger.warn("users.controller.js:loginByPhone: ", userSessions);
							userSessions.map((userSess, index) => {
								//find the session in the DB and delete it (force logout)
								Sessions.remove(userSess)
									.then(() => {
										//find the useId,socketId, sessionId and all the sockets if any
										//and inform the client that it is force logged out by server
										UserConnections.find({
											userId: userId
										})
											.then((userLoginConnections) => {
												userLoginConnections.map((userConn, index) => {
													//find the socket id and send the socket
													const socketId = userConn.socketId;
													logger.info("users.controller.js:loginByPhone: userConn is: ", userConn);
													//req.io.sockets.socket(socketId).emit('force_logout', {
													if (req.io.sockets.connected[socketId] != null) {
														//function to create an action for the front-end to use
														//with redux-socket.io-middleware
														const forceLogoutAction = () => {
															return {
																type: "@@users/RECEIVE_FORCE_LOGOUT_FROM_SERVER",
																meta: {
																	//empty meta here so that the client will not emit the same message
																	//back to server
																},
																userId: user._id.toString(),
																sessionId: userSess._id
															};
														};
														const action = forceLogoutAction();
														logger.info("action is: ", action);
														//emit the action to the front-end, so that the front-end redux will
														//redirect to login page again or alert
														req.io.sockets.connected[socketId].emit("user-login-report", forceLogoutAction());
														logger.info("users.controller.js:loginByPhone: force loging out socket:" + socketId);
														//remove connection from the DB as well
														UserConnections.findOneAndDelete(userConn);
														logger.info("users.controller.js:loginByPhone: userConn is removed");
														//disconnect the socket in 5 seconds
														// setTimeout(() => {
														//     req.io.sockets.sockets[socketId].disconnect();
														// }, 3000);
													} else {
														logger.error("not able to find user connections");
													}
												});
											})
											.catch((err) => {
												logger.warn(
													"users.controller.js:loginByPhone: not able to perform login sockets lookup in userconnections db, userId is:" +
														userId
												);
												logger.error("users.controller.js:loginByPhone: error is", err);
												return next(
													new ErrorClass(
														httpStatusCodes.httpCode500.code,
														false,
														"something wrong with user connections db"
													)
												);
											});
									})
									.catch((err) => {
										logger.warn(
											"users.controller.js:loginByPhone: not able to delete previous sessoin from db, userId is:" +
												userId
										);
										logger.warn("users.controller.js:loginByPhone: session is :", userSess);
										logger.error("users.controller.js:loginByPhone: error is:", err);
										return next(
											new ErrorClass(
												httpStatusCodes.httpCode500.code,
												false,
												"error deleting user session from session DB"
											)
										);
									});
							});
						}
					})
					.catch((err) => {
						logger.warn(
							"users.controller.js:loginByPhone: not able to perform session lookup in session db, userId is:" + userId
						);
						logger.error(err);
						return next(new ErrorClass(httpStatusCodes.httpCode500.code, false, "something wrong with session db"));
					});
				//regenerate new session
				req.session.regenerate(function (err) {
					const timenow = new Date().toISOString().replace("T", " ").substr(0, 19);
					if (err) {
						const userLoginFailureLogData = {
							eventType: "LOGIN_FAILURE",
							userId: user ? user._id : "undefined",
							loginTime: timenow,
							loginInutdata: {
								countryCode: req.body.countryCode,
								phoneNumber: req.body.phoneNumber
								//password: req.body.password //do NOT log password to prevent user data leak
							},
							loginMethod: "phone",
							loginError: err
						};
						logger.info("LOGIN_FAILURE", userLoginFailureLogData);
						return next(
							new ErrorClass(
								httpStatusCodes.httpCode500.code,
								false,
								"loginByPhone: error, unable to regenerate session. " + httpStatusCodes.httpCode500.message
							)
						);
					}
					//put user id into session object
					req.session.userId = user._id;
					if (req.body.stayLoggedInChecked) {
						logger.warn("tryin gto set the 14 day login");
						const fourteendays = 1 * 60 * 60 * 24 * 14 * 1000;
						const maxAge = fourteendays;
						req.session.cookie.maxAge = maxAge;
						req.session.cookie.expires = new Date(Date.now() + fourteendays);
					} else {
						// req.body.stayLoggedInChecked is false or it's null
						const fiveMinutes = 5 * 60 * 1000; //5min
						const maxAge = fiveMinutes;
						req.session.cookie.maxAge = maxAge;
						req.session.cookie.expires = new Date(Date.now() + fiveMinutes);
					}
					//we may need to hash the id here
					//in the future may want to record this login time in DB for user activity analysis
					// const userLoginSuccessLogData = {
					//     eventType: 'LOGIN_SUCCESS',
					//     userId: user._id,
					//     loginTime: timenow,
					//     loginInutdata: {
					//         countryCode: req.body.countryCode,
					//         phoneNumber: req.body.phoneNumber,
					//         //password: req.body.password //do NOT log password to prevent user data leak
					//     },
					//     loginMethod: 'phone', //phone, email,other
					//     loginError: ''
					// }
					// logger.info('LOGIN_SUCCESS', userLoginSuccessLogData);
					//generate new csrfToken
					const csrfToken = req.csrfToken();
					logger.info("csrf Token is updated to: " + csrfToken);
					return res.status(httpStatusCodes.httpCode200.code).json({
						success: true,
						message: "login successful. " + httpStatusCodes.httpCode200.message,
						result: {
							user: user._doc
						}, //also return the user data
						error: null,
						statusCode: httpStatusCodes.httpCode200.code
					});
				});
			}
		});
	} else {
		logger.error("loginByPhone: bad request, country code, phone number and password are required");
		logger.error(req.body);
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.code,
				false,
				"loginByPhone: bady request, country code, phone number, password required. " +
					httpStatusCodes.httpCode400.message
			)
		);
	}
};

exports.updateUserAvatar = (req, res, next) => {
	const debug = _debug("sl:users.controller.js:updateUserAvatar");
	debug("updating user avatar...");

	Object.keys(req.body).forEach((param) => {
		req.body[param] = mongoSanitize(req.body[param]);
	});

	const { picture } = req.body;
	const files = [
		{
			name: "profilePic.png",
			result: picture
		}
	];

	if (picture && req.session && req.session.userId) {
		// user logged in
		uploadCtrl
			.storeImg(files)
			.then((imagePaths) => {
				Users.findById(req.session.userId)
					.then(async (user) => {
						user.avatar = imagePaths[0];
						const filter = {
							_id: user._id
						};
						const dataToUpdate = {
							avatar: user.avatar
						};
						Users.findOneAndUpdate(
							//save data into DB
							filter,
							dataToUpdate,
							{ new: true } //return the new document after the update
						)
							.then(async (newUser) => {
								return await grabAvatarLinksForUser(newUser._doc);
							})
							.then((newNewUser) => {
								//the Avatar URL is relative here, we need to get the dropbox version of the the full URL to the picture
								return res.status(httpStatusCodes.httpCode200.code).json({
									success: true,
									message: "success updating user avatar. " + httpStatusCodes.httpCode200.message,
									result: {
										user: newNewUser
									}, //also return the user data
									error: null,
									statusCode: httpStatusCodes.httpCode200.code
								});
							})
							.catch((err) => {
								logger.error("updateUserAvatar: failed finding user in DB.");
								logger.error(err);
								return next(
									new ErrorClass(
										httpStatusCodes.httpCode404.code,
										false,
										"updateUserAvatar: failed finding user in DB." + httpStatusCodes.httpCode404.message
									)
								);
							});
					})
					.catch((err) => {
						logger.error("updateUserAvatar: failed finding user in DB.");
						logger.error(err);
						return next(
							new ErrorClass(
								httpStatusCodes.httpCode404.code,
								false,
								"updateUserAvatar: failed finding user in DB." + httpStatusCodes.httpCode404.message
							)
						);
					});
			})
			.catch((err) => {
				logger.error("updateUserAvatar: failed uploading avatar.");
				logger.error(err);
				return next(
					new ErrorClass(
						httpStatusCodes.httpCode500.code,
						false,
						"updateUserAvatar: failed uploading avatar" + httpStatusCodes.httpCode500.message
					)
				);
			});
	} else {
		//user still not logged in
		logger.error("updateUserAvatar:  Wrong data or not logged in yet.");
		logger.error(err);
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.code,
				false,
				"updateUserAvatar: Wrong data or not logged in yet. " + httpStatusCodes.httpCode400.message
			)
		);
	}
};

function validateLoginByPhoneForm(payload) {
	const errors = {};
	let isFormValid = true;
	let message = "";
	if (!payload || typeof payload.phoneNumber !== "string" || payload.phoneNumber.trim().length === 0) {
		isFormValid = false;
		errors.phoneNumber = "Please provide your phoneNumber.";
	}
	if (!payload || typeof payload.password !== "string" || payload.password.trim().length === 0) {
		isFormValid = false;
		errors.password = "Please provide your password.";
	}
	if (!isFormValid) {
		message = "Check the form for errors.";
	}
	return {
		success: isFormValid,
		message,
		errors
	};
}

//handle GET to the login page
exports.loginGet = (req, res, next) => {
	const debug = _debug("sl:users.controller.js:loginGet");
	debug("checking login status...");

	Object.keys(req.body).forEach((param) => {
		req.body[param] = mongoSanitize(req.body[param]);
	});

	if (req.isAuthenticated()) {
		//here we need to judge if user is logged in already
		//by checking the req and see if if session id exists in cookie
		//if yes, retrieve the user info, and respond with user info
		//front-end can use that user info to re-direct to user dashboard pages
		return res.status(httpStatusCodes.httpCode200.code).json({
			success: true,
			message: "already logged in. " + httpStatusCodes.httpCode200.message,
			result: null,
			error: null,
			statusCode: httpStatusCodes.httpCode200.code
		});
	} else {
		logger.info("loginGet: user needs to login with credentials.");
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode403.code,
				false,
				"user needs to login with credentials. " + httpStatusCodes.httpCode403.message
			)
		);
		//if not logged in, front-end should continue present the login UI for the user
	}
};

exports.sessoinChecker = (req, res, next) => {
	const debug = _debug("sl:users.controller.js:sessoinChecker");
	debug("checking login status...");

	if (req.isAuthenticated()) {
		//here we need to judge if user is logged in already
		//by checking the req and see if if session id exists in cookie
		//if yes, retrieve the user info, and respond with user info
		//front-end can use that user info to re-direct to user dashboard pages
		return res.status(httpStatusCodes.httpCode200.code).json({
			success: true,
			message: "already logged in. " + httpStatusCodes.httpCode200.message,
			result: null,
			error: null,
			statusCode: httpStatusCodes.httpCode200.code
		});
	} else {
		logger.info("loginGet: user needs to login with credentials.");
		//if not logged in, front-end should continue present the login UI for the user
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode403.code,
				false,
				"user needs to login with credentials. " + httpStatusCodes.httpCode403.message
			)
		);
	}
};

//handle GET for users trying to access his own dashboard
exports.userMeInGet = (req, res, next) => {
	const debug = _debug("sl:users.controller.js:userMeInGet");
	debug("checking login status...");

	if (req.isAuthenticated()) {
		//here we need to judge if user is logged in already
		//by checking the req and see if if session id exists in cookie
		//if yes, retrieve the user info, and respond with user info
		//front-end can use that user info to re-direct to user dashboard pages
		Users.findById(mongoSanitize(req.session.userId))
			.then(async (user) => {
				//here we need to get the correct full URL for the avatar
				if (user._doc.avatar != "") {
					return await grabAvatarLinksForUser(user._doc);
				}
				return user;
			})
			.then((user) => {
				//may want to remove user's password info here
				return res.status(httpStatusCodes.httpCode200.code).json({
					success: true,
					message: "already logged in. " + httpStatusCodes.httpCode200.message,
					result: {
						user: user
					},
					error: null,
					statusCode: httpStatusCodes.httpCode200.code
				});
			})
			.catch((err) => {
				logger.info("userMeInGet: error finding user.");
				logger.error(err);
				return next(
					new ErrorClass(
						httpStatusCodes.httpCode500.code,
						false,
						"userMeInGet: error finding user. " + httpStatusCodes.httpCode500.message
					)
				);
			});
	} else {
		//if not logged in, front-end should continue present the login UI for the user
		logger.info("userMeInGet: user needs to login with credentials.");
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode403.code,
				false,
				"userMeInGet: user needs to login with credentials. " + httpStatusCodes.httpCode403.message
			)
		);
	}
};

exports.updateUserBasicInfo = async (req, res, next) => {
	const debug = _debug("sl:users.controller.js:updateUserBasicInfo");
	debug("updating user basic info...");

	Object.keys(req.body).forEach((param) => {
		req.body[param] = mongoSanitize(req.body[param]);
	});

	const form = req.body;
	if (req.session && req.session.userId && form) {
		Users.findById(mongoSanitize(req.session.userId))
			.then((user) => {
				//need to record the old password here
				user.fullName = form.fullName;
				user.contactAddress = form.contactAddress;
				user.organizationName = form.organizationName;
				user.organizationAddress = form.organizationAddress;
				user.title = form.title;
				if (!(user.fullName || user.contactAddress || user.organizationName || user.title)) {
					logger.error("updateUserBasicInfo: basin info can't be empty.");
					return next(
						new ErrorClass(
							httpStatusCodes.httpCode400.code,
							false,
							"updateUserBasicInfo: basin info can't be empty. " + httpStatusCodes.httpCode400.message
						)
					);
				}
				user.hasCompletedUserBasicInfo = true;
				Users.updateOne(user)
					//set the user passsord to be the same as the user.passowrd=//old password
					// Users.updateOne() //make sure this save does not change the password in the user data
					.then((user) => {
						return res.status(httpStatusCodes.httpCode200.code).json({
							success: true,
							message:
								"updateUserBasicInfo: Successfully update user basic info. " + httpStatusCodes.httpCode200.message,
							error: null,
							result: {
								user: user
							},
							statusCode: httpStatusCodes.httpCode200.code
						});
					})
					.catch((err) => {
						logger.error("updateUserBasicInfo: failed updating user basic info in DB.");
						logger.error(err);
						return next(
							new ErrorClass(
								httpStatusCodes.httpCode500.code,
								false,
								"updateUserBasicInfo: failed updating user basic info in DB. " + httpStatusCodes.httpCode500.message
							)
						);
					});
			})
			.catch((err) => {
				logger.error("updateUserBasicInfo: failed updating user basic info. ");
				logger.error(err);
				return next(
					new ErrorClass(
						httpStatusCodes.httpCode500.code,
						false,
						"updateUserBasicInfo: failed updating user basic info. " + httpStatusCodes.httpCode500.message
					)
				);
			});
	} else {
		logger.error("updateUserBasicInfo: incorrect input data or not logged in. ");
		logger(req);
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.code,
				false,
				"updateUserBasicInfo: incorrect input data or not logged in. " + httpStatusCodes.httpCode400.message
			)
		);
	}
};

exports.userSubmitRequestPhoneCode = async (req, res, next) => {
	const debug = _debug("sl:users.controller.js:userSubmitRequestPhoneCode");
	debug("updating user basic info...");

	Object.keys(req.body).forEach((param) => {
		req.body[param] = mongoSanitize(req.body[param]);
	});

	const { userCellPhone } = req.body;
	if (userCellPhone) {
		return res.status(httpStatusCodes.httpCode200.code).json({
			success: true,
			message: "SMS message sent successfully." + httpStatusCodes.httpCode200.message,
			result: null, // "123456",
			error: null,
			statusCode: httpStatusCodes.httpCode200.code
		});
	} else {
		logger.error("userSubmitRequestPhoneCode: user cell phone number can't be empty");
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode500.code,
				false,
				"userSubmitRequestPhoneCode:SMS message sendiing failed" + httpStatusCodes.httpCode500.message
			)
		);
	}
};

exports.userSubmitRequestPhoneCodeById = async (req, res, next) => {
	const debug = _debug("sl:users.controller.js:userSubmitRequestPhoneCodeById");
	debug("updating user basic info...");

	Object.keys(req.body).forEach((param) => {
		req.body[param] = mongoSanitize(req.body[param]);
	});

	const { userId } = req.body;
	const id_from_post = userId.toString();
	const id_from_LOGIN = req.session.userId.toString();
	if (id_from_post === id_from_LOGIN) {
		return res.status(httpStatusCodes.httpCode200.code).json({
			success: true,
			message: "SMS verification code sent successfully. " + httpStatusCodes.httpCode200.message,
			result: null, // "123456",
			error: null,
			statusCode: httpStatusCodes.httpCode200.code
		});
	} else {
		logger.error("userSubmitRequestPhoneCodeById: wrong user ID");
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode500.code,
				false,
				"userSubmitRequestPhoneCodeById:SMS verification code sending failed. " + httpStatusCodes.httpCode500.message
			)
		);
	}
};

exports.userSubmitPhoneCode = async (req, res, next) => {
	Object.keys(req.body).forEach((param) => {
		req.body[param] = mongoSanitize(req.body[param]);
	});

	const debug = _debug("sl:users.controller.js:userSubmitPhoneCode");
	debug("checking user phone code...");
	const {
		userSubmitPhoneCode,
		userSubmitCellPhone
		//userSubmitCountryCode
	} = req.body;

	//need to check if user exists. Respond with account etc
	//to be done later

	if (userSubmitPhoneCode == "123456") {
		return res.status(httpStatusCodes.httpCode200.code).json({
			success: true,
			message: "SMS code verification successful" + httpStatusCodes.httpCode200.message,
			result: null,
			error: null,
			statusCode: httpStatusCodes.httpCode200.code
		});
	} else {
		logger.error(
			"userSubmitPhoneCode: SMS code verification failed. Cellphone:" +
				userSubmitCellPhone +
				" phonecode:" +
				userSubmitPhoneCode
		);
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode500.code,
				false,
				"userSubmitPhoneCode: SMS code verification failed." + httpStatusCodes.httpCode500.message
			)
		);
	}
};

exports.userSubmitPhoneCodeById = async (req, res, next) => {
	Object.keys(req.body).forEach((param) => {
		req.body[param] = mongoSanitize(req.body[param]);
	});
	const debug = _debug("sl:users.controller.js:userSubmitPhoneCodeById");
	debug("checking user phone code...");
	const {
		userId,
		phoneCode
		//userSubmitCountryCode
	} = req.body;

	const id_from_LOGIN = req.session.userId.toString();
	const id_from_post = userId.toString();
	//need to check if user exists. Respond with account etc
	//to be done later
	if (phoneCode == "123456" && id_from_LOGIN === id_from_post) {
		return res.status(httpStatusCodes.httpCode200.code).json({
			success: true,
			message: "code correct, success." + httpStatusCodes.httpCode200.message,
			result: null,
			error: null,
			statusCode: httpStatusCodes.httpCode200.code
		});
	} else {
		logger.error("userSubmitPhoneCodeById: code wrong, failed. userId:" + id_from_post + " phonecode:" + phoneCode);
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode500.code,
				false,
				"userSubmitPhoneCodeById: code wrong, fialed." + httpStatusCodes.httpCode500.message
			)
		);
	}
};

//async
function checkCellPhoneFormat(value) {
	const phoneRegex =
		/^(?:\+?86)?1(?:3\d{3}|5[^4\D]\d{2}|8\d{3}|7(?:[35678]\d{2}|4(?:0\d|1[0-2]|9\d))|9[189]\d{2}|66\d{2})\d{6}$/;

	//make sure the phoneRegex is safe first
	// const isPhoneRegexSafe = await regexchecker(phoneRegex).then(result => {
	//     return true;
	// }).catch(() => {
	//     return false;
	// })
	// if (isPhoneRegexSafe) {
	return phoneRegex.test(String(value));
	// } else {
	// logger.error('checkCellPhoneFormat: oops, there is an error, the regular expression is not safe.')
	//     return false;
	// }
}

exports.userSubmitPhonePassword = async (req, res, next) => {
	const debug = _debug("sl:users.controller.js:userSubmitPhonePassword");
	debug("handling user password change...");

	Object.keys(req.body).forEach((param) => {
		req.body[param] = mongoSanitize(req.body[param]);
	});

	const form = req.body;
	if (!form.password || !form.cellPhone || !form.phoneCode || !form.countryCode) {
		//must validate the password here
		logger.error("userSubmitPhonePassword: Password and Phone and country code must not be empty.");
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.code,
				false,
				"userSubmitPhonePassword: Password and Phone must not be empty! " + httpStatusCodes.httpCode400.message
			)
		);
		//return next(err); //we may need this for next to actually log the error
		//or maybe we should simply throw the error to the caller
	} else {
		//check if form.password satisfies rules, if not, return error and success false
		if (checkPasswordComplexity(form.password) == false) {
			logger.warn(
				"userSubmitPhonePassword: Password Requirements:at least one capital (A-Z); at least one lower case (a-z);at least one number (0-9);at least one special character;length>=10"
			);
			return next(
				new ErrorClass(
					httpStatusCodes.httpCode406.code,
					false,
					"userSubmitPhonePassword: Password Requirements:at least one capital (A-Z); at least one lower case (a-z);at least one number (0-9);at least one special character;length>=10" +
						httpStatusCodes.httpCode406.message
				)
			);
		}
		//if () check phone here too for valid format
		if (checkCellPhoneFormat(form.cellPhone) == false) {
			logger.error("userSubmitPhonePassword: Wrong phone nuumber format, cell phone: " + form.cellPhone);
			return next(
				new ErrorClass(
					httpStatusCodes.httpCode406.code,
					false,
					"userSubmitPhonePassword: Wrong phone nuumber format " + httpStatusCodes.httpCode406.message
				)
			);
		}
		Users.findOne({
			cellPhone: {
				countryCode: mongoSanitize(form.countryCode),
				phoneNumber: mongoSanitize(form.cellPhone)
			}
		})
			.then((user) => {
				user.password = form.password; //reset password
				// check phone code first
				user
					.save()
					.then(() => {
						const timenow = new Date().toISOString().replace("T", " ").substr(0, 19);
						const userLogData = {
							eventType: "CHANGE_PASSWORD_SUCCESS",
							userId: user._id,
							time: timenow,
							inutData: {
								cellPhone: form.cellPhone,
								countryCode: form.countryCode
							},
							method: "userSubmitPhonePassword",
							error: ""
						};
						logger.info("CHANGE_PASSWORD_SUCCESS", userLogData);
						//generate new csrfToken
						const csrfToken = req.csrfToken();
						logger.info("after changing password, csrf Token is updated to: " + csrfToken);
						return res.status(httpStatusCodes.httpCode200.code).json({
							success: true,
							message: "success in updating user. " + httpStatusCodes.httpCode200.message,
							result: null,
							error: null,
							statusCode: httpStatusCodes.httpCode200.code
						});
					})
					.catch((err) => {
						const timenow = new Date().toISOString().replace("T", " ").substr(0, 19);
						const userLogData = {
							eventType: "CHANGE_PASSWORD_FAILURE",
							userId: user._id,
							time: timenow,
							inputData: {
								cellPhone: form.cellPhone,
								countryCode: form.countryCode
							},
							method: "userSubmitPhonePassword", //phone, email,other
							error: "error in updating user to DB."
						};
						logger.info("CHANGE_PASSWORD_FAILURE", userLogData);
						return next(
							new ErrorClass(
								httpStatusCodes.httpCode500.code,
								false,
								"userSubmitPhonePassword: error in updating user to DB. " + httpStatusCodes.httpCode500.message
							)
						);
					});
			})
			.catch((err) => {
				const timenow = new Date().toISOString().replace("T", " ").substr(0, 19);
				const userLogData = {
					eventType: "CHANGE_PASSWORD_FAILURE",
					userId: "undefined",
					time: timenow,
					inputData: {
						cellPhone: form.cellPhone,
						countryCode: form.countryCode
					},
					method: "userSubmitPhonePassword", //phone, email,other
					error: "error in finding user in DB."
				};
				logger.info("CHANGE_PASSWORD_FAILURE", userLogData);

				logger.error("userSubmitPhonePassword: error in finding user in DB.");
				logger.error(err);
				return next(
					new ErrorClass(
						httpStatusCodes.httpCode500.code,
						false,
						"userSubmitPhonePassword: error finding user in DB. " + httpStatusCodes.httpCode500.message
					)
				);
			});
	}
};

function checkEmailFormat(value) {
	return isEmail(String(value).toLowerCase());
}

exports.userSubmitRequestEmailCode = async (req, res, next) => {
	const debug = _debug("sl:users.controller.js:userSubmitRequestEmailCode");
	debug("updating user basic info...");

	Object.keys(req.body).forEach((param) => {
		req.body[param] = mongoSanitize(req.body[param]);
	});

	const { userEmail } = req.body;

	if (userEmail) {
		return res.status(httpStatusCodes.httpCode200.code).json({
			success: true,
			message: "Email verification code sent successfully. " + httpStatusCodes.httpCode200.message,
			result: null, // "123456",
			error: null,
			statusCode: httpStatusCodes.httpCode200.code
		});
	} else {
		logger.error("userSubmitRequestEmailCode: user email can't be empty");
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode500.code,
				false,
				"userSubmitRequestEmailCode:Email verification code sending failed. " + httpStatusCodes.httpCode500.message
			)
		);
	}
};

exports.userSubmitEmailCode = async (req, res, next) => {
	const debug = _debug("sl:users.controller.js:userSubmitEmailCode");
	debug("checking user email...");

	Object.keys(req.body).forEach((param) => {
		req.body[param] = mongoSanitize(req.body[param]);
	});

	const { userSubmitEmailCode, userSubmitEmail } = req.body;

	if (userSubmitEmailCode == "123456") {
		return res.status(httpStatusCodes.httpCode200.code).json({
			success: true,
			message: "Email verification code sent successfully. " + httpStatusCodes.httpCode200.message,
			result: null,
			error: null,
			statusCode: httpStatusCodes.httpCode200.code
		});
	} else {
		logger.error(
			"userSubmitEmailCode: Email Verification code sending failed: " + userSubmitEmail + " code:" + userSubmitEmailCode
		);
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode500.code,
				false,
				"userSubmitEmailCode: Email Verification code sending failed. " + httpStatusCodes.httpCode500.message
			)
		);
	}
};

exports.userSubmitEmailPassword = async (req, res, next) => {
	const debug = _debug("sl:users.controller.js:userSubmitEmailPassword");
	debug("handling user password change...");
	Object.keys(req.body).forEach((param) => {
		req.body[param] = mongoSanitize(req.body[param]);
	});

	const form = req.body;
	if (!form.password || !form.email || !form.emailCode) {
		//must validate the password here
		logger.error("userSubmitEmailPassword: Password and email must not be empty.");
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.code,
				false,
				"userSubmitEmailPassword: Password and email must not be empty! " + httpStatusCodes.httpCode400.message
			)
		);
		//return next(err); //we may need this for next to actually log the error
		//or maybe we should simply throw the error to the caller
	} else {
		//check if form.password satisfies rules, if not, return error and success false
		if (checkPasswordComplexity(form.password) == false) {
			logger.warn(
				"userSubmitEmailPassword: Password Requirements:at least one capital (A-Z); at least one lower case (a-z);at least one number (0-9);at least one special character;length>=10"
			);
			return next(
				new ErrorClass(
					httpStatusCodes.httpCode406.code,
					false,
					"userSubmitPhonePassword: Password Requirements:at least one capital (A-Z); at least one lower case (a-z);at least one number (0-9);at least one special character;length>=10" +
						httpStatusCodes.httpCode406.message
				)
			);
		}
		//if () check phone here too for valid format
		if (checkEmailFormat(form.email) == false) {
			logger.error("userSubmitEmailPassword: Wrong Email format, email: " + form.email);
			return next(
				new ErrorClass(
					httpStatusCodes.httpCode406.code,
					false,
					"userSubmitEmailPassword: Wrong Email format " + httpStatusCodes.httpCode406.message
				)
			);
		}

		Users.findOne({
			email: mongoSanitize(form.email)
		})
			.then((user) => {
				user.password = form.password; //reset password
				// check phone code first
				user
					.save()
					.then(() => {
						//generate new csrfToken
						const csrfToken = req.csrfToken();
						logger.info("after changing password, csrf Token is updated to: " + csrfToken);
						return res.status(httpStatusCodes.httpCode200.code).json({
							success: true,
							message: "success in updating user. " + httpStatusCodes.httpCode200.message,
							result: null,
							error: null,
							statusCode: httpStatusCodes.httpCode200.code
						});
					})
					.catch((err) => {
						logger.error("userSubmitEmailPassword: error in updating user to DB.");
						logger.error(err);
						return next(
							new ErrorClass(
								httpStatusCodes.httpCode500.code,
								false,
								"userSubmitEmailPassword: error in updating user to DB. " + httpStatusCodes.httpCode500.message
							)
						);
					});
			})
			.catch((err) => {
				logger.error("userSubmitEmailPassword: error in finding user in DB.");
				logger.error(err);
				return next(
					new ErrorClass(
						httpStatusCodes.httpCode500.code,
						false,
						"userSubmitEmailPassword: error finding user in DB. " + httpStatusCodes.httpCode500.message
					)
				);
			});
	}
};

exports.logoutFromPreviousDevices = function (req, res, next) {
	Object.keys(req.body).forEach((param) => {
		req.body[param] = mongoSanitize(req.body[param]);
	});

	var userId = req.query.userid;
	if (!userId)
		return res.status(400).send({
			message: "No user found in input request"
		});
	var store = req.sessionStore;
	var sessionsColl = store.db.collection("sessions");
	sessionsColl.find(
		{
			// 'session.passport.user': userId,
			// we are tryin to remove all sessions, you can leave current
			// '_id': { '$ne': req.sessionID }
		},
		function (err, userSessions) {
			if (userSessions !== null) {
				userSessions.toArray(function (a, sessionsData) {
					sessionsData.forEach(function (element, index) {
						var data = JSON.parse(element.session);
						if (element._id !== req.sessionID && req.query.userid === data.passport.user) {
							store.destroy(element._id, function (destroyerr, dat) {
								if (destroyerr)
									return res.status(400).send({
										message: destroyerr.toString()
									});
								res.jsonp({
									status: "Previous session deleted"
								});
							});
						}
					});
				});
			} else {
				res.jsonp({
					status: "No session found"
				});
			}
		}
	);
};

exports.checkPhoneAvailability = async (req, res, next) => {
	const debug = _debug("sl:users.controller.js:checkPhoneAvailability");
	debug("checking user registration cellphone number availability...");
	Object.keys(req.body).forEach((param) => {
		req.body[param] = mongoSanitize(req.body[param]);
	});
	const { countryCode, cellPhone } = req.body;

	if (countryCode && cellPhone) {
		try {
			const user = await Users.findOne({
				cellPhone: {
					countryCode: mongoSanitize(countryCode),
					phoneNumber: mongoSanitize(cellPhone)
				}
			});
			if (user) {
				logger.warn("CheckPhoneAvailability: The phone number is already registered, please login.");
				return next(
					new ErrorClass(
						httpStatusCodes.httpCode405.code,
						false,
						"CheckPhoneAvailability: The phone number is already registered, please login." +
							httpStatusCodes.httpCode405.message
					)
				);
			} else {
				return res.status(httpStatusCodes.httpCode200.code).json({
					success: true,
					message: "CheckPhoneAvailability: The phone number is not registered" + httpStatusCodes.httpCode200.message,
					result: null,
					error: null,
					statusCode: httpStatusCodes.httpCode200.code
				});
			}
		} catch (err) {
			logger.warn("CheckPhoneAvailability: failure finding user in db.");
			logger.warn(err);
			return next(
				new ErrorClass(
					httpStatusCodes.httpCode500.code,
					false,
					"CheckPhoneAvailability: failure finding user in db." + httpStatusCodes.httpCode500.message
				)
			);
		}
	} else {
		logger.warn("CheckPhoneAvailability: oops, you have to have both phone number and country code.");
		logger.warn(req);
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.code,
				false,
				"CheckPhoneAvailability: oops, you have to have both phone number and country code. " +
					httpStatusCodes.httpCode400.message
			)
		);
	}
};

exports.checkEmailAvailability = async (req, res, next) => {
	const debug = _debug("sl:users.controller.js:checkEmailAvailability");
	debug("checking user registration email availability...");

	Object.keys(req.body).forEach((param) => {
		req.body[param] = mongoSanitize(req.body[param]);
	});

	const email = req.body.email.toLowerCase();

	if (email) {
		try {
			const user = await Users.findOne({
				email: mongoSanitize(email)
			});
			if (user) {
				logger.warn("CheckEmailAvailability: 该");
				return next(
					new ErrorClass(
						httpStatusCodes.httpCode405.code,
						false,
						"CheckEmailAvailability: The phone number is already registered, please login." +
							httpStatusCodes.httpCode405.message
					)
				);
			} else {
				return res.status(httpStatusCodes.httpCode200.code).json({
					success: true,
					message:
						"CheckEmailAvailability: The phone number is not registered, can register" +
						httpStatusCodes.httpCode200.message,
					result: null,
					error: null,
					statusCode: httpStatusCodes.httpCode200.code
				});
			}
		} catch (err) {
			logger.warn("CheckEmailAvailability: failure finding user in db.");
			logger.warn(err);
			return next(
				new ErrorClass(
					httpStatusCodes.httpCode500.code,
					false,
					"CheckEmailAvailability: failure finding user in db." + httpStatusCodes.httpCode500.message
				)
			);
		}
	} else {
		logger.warn("CheckEmailAvailability: oops, you have to have an email.");
		logger.warn(req);
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.code,
				false,
				"CheckPhoneAvailability: oops, you have to have an email. " + httpStatusCodes.httpCode400.message
			)
		);
	}
};

exports.confirmUserEmail = async (req, res, next) => {
	const debug = _debug("sl:users.controller.js:confirmUserEmail");
	debug("confirming user email...");
	try {
		//decode the data and get the user id
		const userData = jwt.verify(req.params.token, mailcredentials.EMAIL_SECRET, {
			ignoreExpiration: false
		});
		const id = userData.id;
		const filter = {
			_id: id
		};
		const dataToUpdate = {
			confirmedEmail: true
		};
		Users.findOne(filter)
			.then((user) => {
				const frontEndUri = mailredirect.frontEndUri;

				//1. if not yet confirmed: update confirmedEmail data to true
				// show the confirmation content
				if (!user.confirmedEmail) {
					Users.findOneAndUpdate(
						filter,
						dataToUpdate,
						{ new: true } //return the new doc after the udpate
					)
						.then(() => {
							const redirectUri = `${frontEndUri}/user/userLoginByPhone`;
							const jsText = `setTimeout(function(){ window.location.href="http://${redirectUri}"},3000)`;
							// const htmlBody = `<!DOCTYPE html>
							// <html><header><title>Thanks for confirming your email.</title></header>
							// <body onload=${jsText}><h1>Thanks for confirming your email.</h1>
							// <p> Your email has been successfully confirmed.You can asseess your account now. </p>
							// <p>Will redirect to login shortly </p>
							// </body></html>`;
							const htmlBody = `<!DOCTYPE html>
            <html><header><title>Email confirmation succeeded. </title></header>
            <body onload=${jsText}><h1>thanks,</h1>
            <p> Your email has been confirmed, now you can login.</p>
            <p> Will redirect to login page shortly </p>
            </body></html>`;
							res.send(htmlBody);
						})
						.catch((e) => {
							logger.error("confirmUserEmail: not able to update", e);
							throw e;
						});
				}

				//2. if already confirmed: show already confirmed content
				else if (user.confirmedEmail) {
					const redirectUri = `"${frontEndUri}"/user/userLoginByPhone`;
					const jsText = `setTimeout(function(){ window.location.href="http://${redirectUri}"},3000)`;
					// 		const htmlBody = `<!DOCTYPE html>
					// <html><header><title>Email is Already Confirmed.</title></header>
					// <body onload=${jsText}><h1>Email is Already Confirmed</h1>
					// <p>Your email has already been confirmed. Please login to your account.</p>
					// <p>Will redirect to login shortly </p>
					// </body></html>`;
					const htmlBody = `<!DOCTYPE html>
            <html><header><title>This email address is already confirmed</title></header>
            <body onload=${jsText}><h1>Hi，</h1>
            <p> Your email has been confirmed.</p>
            <p> Will redirect to login page shortly</p>
            </body></html>`;
					res.send(htmlBody);
				}
			})
			.catch((e) => {
				logger.error("confirmUserEmail: not able to find the user", e);
				const frontEndUri = mailredirect.frontEndUri;
				const redirectUri = `${frontEndUri}/user/userLoginByPhone`;
				const jsText = `setTimeout(function(){ window.location.href="http://${redirectUri}"},3000)`;
				const htmlBody = `<!DOCTYPE html>
				<html><header><title> Not Able to Verify Your Email.</title></header>
				<body ><script>${jsText}</script><h1>  Not Able to Verify Your Email. </h1>
				<p> We currenly are not able to verify your email becasue we can't find a user account associated with this email. </p>
				<p>Will redirect to login shortly </p>
				    </body></html>`;
				res.send(htmlBody);
			});
	} catch (e) {
		//3. if token expired: show can't confirm content
		//4. if confirmation failed: show can't confirm content
		//5. if findOneAndUpdate failed
		logger.error("confirmUserEmail: oops, not able to verify user email", e);
		const frontEndUri = mailredirect.frontEndUri;
		const redirectUri = `${frontEndUri}/user/userLoginByPhone`;
		const jsText = `setTimeout(function(){ window.location.href="http://${redirectUri}"},3000)`;
		const htmlBody = `<!DOCTYPE html>
		    <html><header><title> Not Able to Verify Your Email.</title></header>
		    <body onload=${jsText}><h1>  Not Able to Verify Your Email. </h1>
		    <p> We currenly are not able to verify your email. Your confirmation link may be expired. </p>
		    <p>Will redirect to login shortly </p>
		    </body></html>`;
		res.send(htmlBody);
	}
};

//check if a user's email has already being confirmed
exports.checkEmailConfirmation = async (req, res, next) => {
	const debug = _debug("sl:users.controller.js:checkEmailConfirmation");
	debug("checking if user email is confirmed...");
	Object.keys(req.body).forEach((param) => {
		req.body[param] = mongoSanitize(req.body[param]);
	});

	const { email, countryCode, cellPhone } = req.body;

	if (email || (countryCode && cellPhone)) {
		if (email) {
			try {
				const user = await Users.findOne({
					email: mongoSanitize(email)
				});
				return res
					.status(user.confirmedEmail ? httpStatusCodes.httpCode200.code : httpStatusCodes.httpCode401.code)
					.json({
						success: user.confirmedEmail,
						message:
							(user.confirmedEmail
								? "This user's email has already been confirmed, can login now"
								: "This user's email has not been confirmed, please check email and confirm, then try to login again") +
							(user.confirmedEmail ? httpStatusCodes.httpCode200.message : httpStatusCodes.httpCode401.message),
						result: null,
						error: null,
						statusCode: user.confirmedEmail ? httpStatusCodes.httpCode200.code : httpStatusCodes.httpCode401.code
					});
			} catch (error) {
				return next(
					new ErrorClass(
						httpStatusCodes.httpCode500.code,
						false,
						"checkEmailConfirmation: unable to check if user has confirmed email address"
					)
				);
			}
		}
		if (countryCode && cellPhone) {
			try {
				const user = await Users.findOne({
					cellPhone: {
						countryCode: mongoSanitize(countryCode),
						phoneNumber: mongoSanitize(cellPhone)
					}
				});
				return res
					.status(user.confirmedEmail ? httpStatusCodes.httpCode200.code : httpStatusCodes.httpCode401.code)
					.json({
						success: user.confirmedEmail,
						message:
							(user.confirmedEmail
								? "This user's email has already been confirmed, can login now"
								: "This user's email has not been confirmed, please check email and confirm, then try to login again") +
							(user.confirmedEmail ? httpStatusCodes.httpCode200.message : httpStatusCodes.httpCode401.message),
						result: null,
						error: null,
						statusCode: user.confirmedEmail ? httpStatusCodes.httpCode200.code : httpStatusCodes.httpCode401.code
					});
			} catch (error) {
				return next(
					new ErrorClass(
						httpStatusCodes.httpCode500.code,
						false,
						"checkEmailConfirmation: unable to check if user has confirmed email address"
					)
				);
			}
		}
	} else {
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.codde,
				false,
				"checkEmailConfirmation: bad request query, email or cell phone number and country code must be provided, aborted. " +
					httpStatusCodes.httpCode400.message
			)
		);
	}
};

exports.changeUserEmail = async (req, res, next) => {
	const debug = _debug("sl:users.controller.js:changeUserEmail");
	debug("handling user email change...");
	Object.keys(req.body).forEach((param) => {
		req.body[param] = mongoSanitize(req.body[param]);
	});
	const form = req.body;
	if (!form.password || !form.email || !form.phoneCode || !form.userId) {
		//must validate the password here
		logger.error("changeUserEmail: Password,new email, phoneCode and userId must not be empty.");
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.code,
				false,
				"changeUserEmail:  Password,new email, phoneCode and userId must not be empty! " +
					httpStatusCodes.httpCode400.message
			)
		);
		//return next(err); //we may need this for next to actually log the error
		//or maybe we should simply throw the error to the caller
	} else {
		//if check email here to validate format
		if (checkEmailFormat(form.email) == false) {
			logger.error("changeUserEmail: Wrong email format, email: " + form.email);
			return next(
				new ErrorClass(
					httpStatusCodes.httpCode406.code,
					false,
					"changeUserEmail: Wrong email format " + httpStatusCodes.httpCode406.message
				)
			);
		}
		//------
		//check phoneCode here to validate phoneCode
		//-----------------------
		try {
			const id_from_LOGIN = req.session.userId.toString();
			const id_from_post = form.userId.toString();
			if (id_from_LOGIN !== id_from_post) {
				logger.error(
					"changeUserEmail: User ID inconsistent, ID from Post: " + id_from_post + ", ID from session:" + id_from_LOGIN
				);
				throw new Error(
					"changeUserEmail: User ID inconsistent, ID from Post: " + id_from_post + ", ID from session:" + id_from_LOGIN
				);
			}
			const filter = {
				_id: id_from_LOGIN
			};

			//make sure user can authenticate with password before proceed to change email
			Users.findOne(filter)
				.then((user1) => {
					Users.authenticateByEmail(user1.email, form.password, function (error, user) {
						if (error || !user) {
							logger.info("changeUserEmail: Wrong password.");
							logger.info("user email is:" + user1.email);
							if (error) {
								const timenow = new Date().toISOString().replace("T", " ").substr(0, 19);
								const userLoginFailureLogData = {
									eventType: "LOGIN_FAILURE",
									userId: id_from_post,
									loginTime: timenow,
									loginInputdata: {
										email: user1.email
									},
									loginMethod: "change email",
									loginError: error
								};
								logger.info("LOGIN_FAILURE", userLoginFailureLogData);
							}
							return next(
								new ErrorClass(
									httpStatusCodes.httpCode401.code,
									false,
									"changeUserEmail: error, Wrong password. " + httpStatusCodes.httpCode401.message
								)
							);
						}
						//then proceed to actually change the email for the user
						const dataToUpdate = {
							email: form.email,
							confirmedEmail: false,
							otherDetails: user1.otherDetails + "; old email address is " + user1.email
						};
						Users.findOneAndUpdate(
							filter,
							dataToUpdate,
							{ new: true } //return the new doc after the udpate
						)
							.then(async (newUser) => {
								//should send new email link for verifying the new email
								const emailToken = jwt.sign(
									{
										id: newUser._id.toString()
									},
									mailcredentials.EMAIL_SECRET,
									{
										expiresIn: "30" //expires in 30 days
									}
								);
								const frontEndUri = mailredirect.frontEndUri;
								const emailUrl = `${frontEndUri}/api/user/confirmUserEmail/${emailToken}`;

								const htmlBody =
									"<h1>Welcome to SurveyLLama</h1>\n<p>Thanks for registering with us!" +
									"<b> Please click this link to confirm your email address" +
									`<a href="${emailUrl}">${emailUrl}</a></b></p>\n<p>Converse, Do not Conform.</p>\n` +
									"<p>Thank you for joining SurveyLLama</p>";

								const textBody =
									"Welcome to SurveyLLama</h1>\n<p>Thanks for registering with us!" +
									"\n Please click this link to confirm your email address" +
									`:\n ${emailUrl} \n Converse, Do not Conform.\n Thank you for joining SurveyLLama`;

								const fromEmail = "surveyllama@gmail.com";
								const replyTo = "surveyllama@gmail.com";
								const name = "SurveyLLama Info";
								try {
									await serverEmailSender.send(
										fromEmail,
										user.email,
										replyTo,
										name,
										htmlBody,
										textBody,
										"Welcome to SurveyLLama, please confirm your email in 30 days"
									);
								} catch (err) {
									logger.error("changeUserEmail: oops, not able to send email to user:" + user.email);
									logger.error(err);
									return next(
										new ErrorClass(
											httpStatusCodes.httpCode500.code,
											false,
											"changeUserEmail: failed sending email to user." + httpStatusCodes.httpCode500.message
										)
									);
								}
								//should return new user here to front-end
								const newNewUser = await grabAvatarLinksForUser(newUser._doc);
								//the Avatar URL is relative here, we need to get the dropbox version of the the full URL to the picture
								return res.status(httpStatusCodes.httpCode200.code).json({
									success: true,
									message: "success updating user email. " + httpStatusCodes.httpCode200.message,
									result: {
										user: newNewUser //._doc
									}, //also return the suer data
									error: null,
									statusCode: httpStatusCodes.httpCode200.code
								});
							})
							.catch((err) => {
								throw err;
							});
					});
				})
				.catch((err) => {
					throw err;
				});
		} catch (err) {
			logger.error("changeUserEmail: Oops, not able to change user email.", err);
			return next(
				new ErrorClass(
					httpStatusCodes.httpCode406.code,
					false,
					"changeUserEmail: Error changing user email, " + httpStatusCodes.httpCode406.message
				)
			);
		}
	}
};

exports.removeFakeUsers = (checkInterval, expireTime) => {
	//note this is NOT a middleware function for express
	//expireTime is in milliSeconds e.g.
	//millisOfMonth
	const debug = _debug("sl:users.controller.js:removeFakeUsers");
	debug("removing fake users...");
	//find all users that are created expireTime before now and not yet verified email

	//find all users that are going to expire in expireTime+7 days
	//
	//                                    |---------now-------------------->
	//      A                             B  B+1/2  C-1 C
	//------|-----------------------------|---|------|--|
	//      createdAt                                   createdAt+30days
	//                                    createdAt+30days-7days
	//
	//if now is within createdAt+30days-7days to createdAt+30days, we should remind
	//if now is between B and infinity we should find the users
	//   if now is between B and B+1/2 we should send reminder
	//   if now is between C-1 and C-1+1/2 we should send reminder
	//   if now is between C and infinity, we should remove the user
	//where 1/2 is the interval of running this removeFakeUsers() function in days
	//
	//C=createdAt+expireTime
	//B=C-7days
	//We need to find all users that have been registered and past point B.
	//hence now-B =>0
	//==> B<=now
	//==> createdAt+expireTime - 7days <= now
	//==> createdAt <= now - expireTime+7days
	//==> createdAt <= now - (expireTime-7days)
	// for B<now<=B+1/2      send reminder
	//      i.e. createdAt+expireTime - 7days < now <= createdAt+expireTime - 7days+checkInterval
	// for C-1<now<=C-1+1/2  send reminder
	//      i.e. createdAt+expireTime-1day <=now<createdA+expireTime-1day+checkInterval
	// for C<now             remove user
	//      i.e. createdAt+expireTime <= now
	//

	const millisOfOneWeeK = 7 * 24 * 3600 * 1000;
	const timeNow = new Date().getTime(); //in milliseconds
	const timeB = new Date(timeNow - (expireTime - millisOfOneWeeK));
	//const expireDate = new Date(new Date() - (expireTime-millisOfOneWeeK));

	const searchRange = {
		createdAt: {
			$lt: timeB
		},
		confirmedEmail: false
	};

	//warn if checkInterval is greater than one day
	if (checkInterval >= 1 * 3600 * 24 * 1000) {
		logger.warn("removeFakeUsers: checkInterval is greater than one day: ", checkInterval);
	}

	Users.find(searchRange)
		.then((users) => {
			users.map(async (user) => {
				//Here we should decide when to send email for reminding the user
				//a) will expire in one week
				//b) will expire in one day
				//c) will expire now
				//because we do this check every 12 hours, we should capture just one
				//case in exactly 12 hours window
				const createdAt = new Date(user.createdAt).getTime(); //time in milliseconds
				const { toSendReminder, toRemove } = calculateRemoveOrEmailReminder(
					timeNow,
					createdAt,
					expireTime,
					checkInterval
				);
				//true to remove, false to send email reminder
				if (toSendReminder) {
					//here before removal, we should send email to the user for the last time.
					//simply report this incident to the user, and asking the user to re-register
					//if he wants to
					const emailToken = jwt.sign(
						{
							id: user._id.toString()
						},
						mailcredentials.EMAIL_SECRET,
						{
							expiresIn: "30" //expires in 30 days
						}
					);
					const frontEndUri = mailredirect.frontEndUri;
					const emailUrl = `${frontEndUri}/api/user/confirmUserEmail/${emailToken}`;

					const htmlBody =
						"<h1>Reminder:Please confirm your email address.</h1>\n " +
						"<p>Thank you for registering with SurveyLLama" +
						"Because you have not confirmed your email within 30days of registration, your account will be removed within 3 days from now." +
						"<b>Please click this link to confirm your email address " +
						`<a href="${emailUrl}">${emailUrl}</a></b></p>\n ` +
						"<p>Thanks!</p>\n" +
						"<p> -by Team SurveyLLama</p>";

					const textBody =
						"Reminder:Please confirm your email address." +
						"Because you have not confirmed your email within 30days of registration, your account will be removed within 3 days from now." +
						"\n Please click this link to confirm your email address" +
						`:\n ${emailUrl} \n Thanks! - by Team SurveyLLama`;
					const fromEmail = "surveyllama@gmail.com";
					const replyTo = "surveyllama@gmail.com";
					const name = "SurveyLLama Info";
					try {
						await serverEmailSender.send(
							fromEmail,
							user.email,
							replyTo,
							name,
							htmlBody,
							textBody,
							"Reminder: Please confirm email of your account at SurveyLLama"
						);
					} catch (err) {
						logger.error("removeFakeUsers: oops, not able to send email to user:" + user.email);
						logger.error(err);
						return next(
							new ErrorClass(
								httpStatusCodes.httpCode500.code,
								false,
								"removeFakeUsers: oops, not able to send email to user." + httpStatusCodes.httpCode500.message
							)
						);
					}
				}
				if (toRemove) {
					Users.remove(user)
						.then(() => {
							logger.info("removeFakeUsers: Successfully removed fake user with email:", user.email);
						})
						.catch((err) => {
							logger.error("removeFakeUsers: Error removing fake user from DB..., user email is:", user.email, err);
						});
				}
			});
		})
		.catch((err) => {
			logger.error(
				"removeFakeUsers: Error finding users that have not confirmed their email in " +
					expireTime / (3600 * 24 * 1000) +
					" days",
				err
			);
		});
};

function calculateRemoveOrEmailReminder(
	timeNow, //timeNow in milliseconds
	createdTime, //time of creation in milliseconds
	expireTime, //expire time in milliseconds
	checkInterval //check interval in milliseconds
) {
	//requires: checkInterval be less than 1day, where 1day is the SurveyLLama time gap between
	//          the reminder and the expiration date.
	//
	//find all users that are going to expire in expireTime+7 days
	//
	//                                    |---------now-------------------->
	//      A                             B  B+1/2  C-1 C
	//------|-----------------------------|---|------|--|
	//      createdAt                                   createdAt+30days
	//                                    createdAt+30days-7days
	//
	//if now is within createdAt+30days-7days to createdAt+30days, we should remind
	//if now is between B and infinity we should find the users
	//   if now is between B and B+1/2 we should send reminder
	//   if now is between C-1 and C-1+1/2 we should send reminder
	//   if now is between C and infinity, we should remove the user
	//where 1/2 is the interval of running this removeFakeUsers() function in days
	//
	//C=createdAt+expireTime
	//B=C-7days
	//We need to find all users that have been registered and past point B.
	//hence now-B =>0
	//==> B<=now
	//==> createdAt+expireTime - 7days <= now
	//==> createdAt <= now - expireTime+7days
	//==> createdAt <= now - (expireTime-7days)
	//
	//Condition 1)
	// for B<now<=B+1/2      send reminder
	//      i.e. createdAt+expireTime - 7days < now <= createdAt+expireTime - 7days + checkInterval
	//Condition 2)
	// for C-1<now<=C-1+1/2  send reminder
	//      i.e. createdAt+expireTime - 1day <= now< createdAt+expireTime - 1day + checkInterval
	//Condition 3)
	// for C<=now            remove user
	//      i.e. createdAt+expireTime <= now
	//
	var toRemove = false;
	var toSendReminder = false;

	const millisOfOneDay = 1 * 3600 * 24 * 1000;
	const millisOfOneWeeK = 7 * 3600 * 24 * 1000;
	const timeB = createdTime - millisOfOneWeeK;
	const timeC = createdTime + expireTime;

	//condition 3) C <= now
	if (timeC <= timeNow) {
		toRemove = true;
	}

	//condition 2) C-1 < now <= C-1+1/2, Send reminder within last day of expiration
	if (timeC - millisOfOneDay < timeNow && timeNow <= timeC - millisOfOneDay + checkInterval) {
		toSendReminder = true;
	}

	//condition 1) B < now <= B+1/2,     Send reminder within last 7 days of expiration
	if (timeB < timeNow && timeNow <= timeB + checkInterval) {
		toSendReminder = true;
	}

	return {
		toSendReminder,
		toRemove
	};
}

exports.grabUserPublicDataById = (req, res, next) => {
	const debug = _debug("sl:users.controller.js:grabUserPublicDataById");
	debug("grabing user public data...");

	Object.keys(req.query).forEach((param) => {
		req.query[param] = mongoSanitize(req.query[param]);
	});

	if (req.query && req.query.id) {
		Users.findById(req.query.id)
			.then(async (user) => {
				return await grabAvatarLinksForUser(user._doc);
			})
			.then((user) => {
				//calculate user public data
				const userData = user;
				const phoneNumber = userData.cellPhone.phoneNumber;
				const userPublicData = {
					firstName:
						userData.firstName ||
						phoneNumber.substring(0, 3) + "***" + phoneNumber.substring(phoneNumber.length - 4, phoneNumber.length),
					lastName: userData.lastName || "",
					fullName: userData.fullName || "",
					organizationName: userData.organizationName || "",
					avatar: user.avatar || ""
				};
				return res.status(httpStatusCodes.httpCode200.code).json({
					success: true,
					message:
						"grabUserPublicDataById: success retrieving user public data. " + httpStatusCodes.httpCode200.message,
					result: {
						userPublicData: userPublicData
					},
					error: null,
					statusCode: httpStatusCodes.httpCode200.code
				});
			})
			.catch((err) => {
				logger.warn("grabUserPublicDataById: failure finding user or getting user avatar.");
				logger.warn(err);
				return next(
					new ErrorClass(
						httpStatusCodes.httpCode404.code,
						false,
						"grabUserPublicDataById: failure finding user or getting user avatar. " +
							httpStatusCodes.httpCode404.message
					)
				);
			});
	} else {
		logger.warn("grabUserPublicDataById: oops, you did not specify a user id in the request.");
		logger.warn(req);
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.code,
				false,
				"grabUserPublicDataById: oops, you did not specify a user id in the request. " +
					httpStatusCodes.httpCode400.message
			)
		);
	}
};
