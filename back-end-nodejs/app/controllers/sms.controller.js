const axios = require("axios");
const { ErrorClass } = require("../helpers/error");
const { httpStatusCodes } = require("../constants");
const { logger } = require("../loggers/logger");
const _debug = require("debug");
const smsService = require("../../config/smsService.config.js")();
const { confirmUrl, verifyUrl, apiKey } = require("../../config/authy.config.js");
const crypto = require("crypto");
const base32Decode = require("base32-decode");

function sendSMSByTwilio(phone, message) {
	const debug = _debug("sl:sms.controller.js:sendSMSByTwilio");
	debug("sending text message...");
	const finalMsg = "【Twilio】" + message;
	logger.debug("final message is: " + finalMsg);
	//here we can setup to use environmental variable for this configuration to get the SMSaccount and SMSpassword
	const accountSid = "*****";
	const authToken = "****";
	const surveyllamaNumber = "***";
	const client = require("twilio")(accountSid, authToken);
	return new Promise((resolve, reject) => {
		client.messages
			.create({
				body: finalMsg,
				from: surveyllamaNumber,
				to: phone
			})
			.then((message) => resolve(message))
			.catch((error) => {
				logger.warn("sendSMSByTwilio:failed sending message to phone" + phone);
				logger.warn(error);
				reject(error);
			});
	});
}

exports.sendSMS = (req, res, next) => {
	const debug = _debug("sl:sms.controller.js:sendSMS");
	debug("sending text message...");

	//check the request
	//call the sendSMSByTwillo and obtain the results
	//send back response based on success or failure
	if (req.query && req.query.phone && req.query.message) {
		if (req.query.phone !== "" && req.query.message !== "") {
			if (smsService == "Twillio") {
				sendSMSByTwilio(req.body.phone, req.body.message)
					.then((response) => {
						return res.status(httpStatusCodes.httpCode200.code).json({
							success: true,
							message: "SMS message sent. " + httpStatusCodes.httpCode200.message,
							result: response.data,
							error: null,
							statusCode: httpStatusCodes.httpCode200.code
						});
					})
					.catch((error) => {
						logger.warn("sendSMS: failure calling sendSMSByTwilio, aborted.");
						logger.warn(error);
						return next(
							new ErrorClass(
								httpStatusCodes.httpCode500.code,
								false,
								"sendSMS: failure calling sendSMSByTwilio, aborted. " + httpStatusCodes.httpCode500.message
							)
						);
					});
			} else {
				logger.warn("sendSMS: invalid choice of smsService ");
				logger.warn(req.query);
				return next(
					new ErrorClass(
						httpStatusCodes.httpCode400.code,
						false,
						"sendSMS:invalid choice of smsService. " + httpStatusCodes.httpCode400.message
					)
				);
			}
		} else {
			logger.warn("sendSMS: phone or message empty, aborted. ");
			logger.warn(req.query);
			return next(
				new ErrorClass(
					httpStatusCodes.httpCode400.code,
					false,
					"sendSMS: phone or message empty, aborted. " + httpStatusCodes.httpCode400.message
				)
			);
		}
	} else {
		logger.warn("sendSMS: bad request query, phone or message does not exist, aborted.");
		logger.warn(req);
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.code,
				false,
				"sendSMS: bad request query, phone or message does not exist, aborted. " + httpStatusCodes.httpCode400.message
			)
		);
	}
};

exports.sendVerification = async (req, res, next) => {
	const debug = _debug("sl:sms.controller.js:sendVerification");
	debug("sending verification...");
	if (req.body) {
		// * @param {string|number} phoneNumber - phone number to verify
		// * @param {number} countryCode - country code
		// * @param {number} codeLength - length of code
		await axios
			.post(verifyUrl, {
				api_key: apiKey,
				via: "sms",
				phone_number: req.body.phoneNumber,
				country_code: req.body.countryCode,
				code_length: req.body.codeLength
			})
			.then((response) => {
				return res.status(httpStatusCodes.httpCode200.code).json({
					success: true,
					message: "Verification code sent. " + httpStatusCodes.httpCode200.message,
					result: response.data,
					error: null,
					statusCode: httpStatusCodes.httpCode200.code
				});
			})
			.catch((error) => {
				logger.warn("sendVerification: fail sending verification.");
				logger.warn(error);
				return next(
					new ErrorClass(
						httpStatusCodes.httpCode500.code,
						false,
						"sendVerification: fail sending verification." + httpStatusCodes.httpCode500.message
					)
				);
			});
	}
};

exports.checkVerification = async (req, res, next) => {
	const debug = _debug("sl:sms.controller.js:checkVerification");
	debug("checking verification...");
	if (req.body) {
		// * @param {number} code - code sent
		// * @param {string|number} phoneNumber - phone number to verify
		// * @param {number} countryCode - country code

		await axios
			.get(confirmUrl, {
				params: {
					api_key: apiKey,
					verification_code: req.body.code,
					phone_number: req.body.phoneNumber,
					country_code: req.body.countryCode
				}
			})
			.then((response) => {
				return res.status(httpStatusCodes.httpCode200.code).json({
					success: true,
					message: "Checking verification code complete. The code is valid. " + httpStatusCodes.httpCode200.message,
					result: response.data,
					error: null,
					statusCode: httpStatusCodes.httpCode200.code
				});
			})
			.catch((error) => {
				logger.warn("checkVerification: fail checking verification.");
				logger.warn(error);
				return next(
					new ErrorClass(
						httpStatusCodes.httpCode500.code,
						false,
						"checkVerification: fail checking verification." + httpStatusCodes.httpCode500.message
					)
				);
			});
	}
};

exports.sendVerificationCode = (req, res, next) => {
	const debug = _debug("sl:sms.controller.js:sendVerificationCode");
	debug("sending verification code through text message...");

	if (req.body && req.body.phoneNumber) {
		const secret = req.body.phoneNumber; // should design a way to encode secret
		const totp = generateTOTP(secret, (window = 0));
		sendSMSByTwilio(req.body.phoneNumber, totp)
			.then((response) => {
				return res.status(httpStatusCodes.httpCode200.code).json({
					success: true,
					message: "Verification code sent through Twilio sms text message. " + httpStatusCodes.httpCode200.message,
					result: response.data,
					error: null,
					statusCode: httpStatusCodes.httpCode200.code
				});
			})
			.catch((error) => {
				logger.warn("sendVerificationCode: failure calling sendSMSByTwilio, aborted.");
				logger.warn(error);
				return next(
					new ErrorClass(
						httpStatusCodes.httpCode500.code,
						false,
						"sendVerificationCode: failure calling sendSMSByTwilio, aborted. " + httpStatusCodes.httpCode500.message
					)
				);
			});
	} else {
		logger.warn("sendVerificationCode: bad request query, phone does not exist, aborted.");
		logger.warn(req);
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.code,
				false,
				"sendVerificationCode: bad request query, phone does not exist, aborted. " + httpStatusCodes.httpCode400.message
			)
		);
	}
};

exports.checkVerificationCode = (req, res, next) => {
	const debug = _debug("sl:sms.controller.js:checkVerificationCode");
	debug("checking verification code received from the frontend...");
	if (req.body && req.body.verificationCode && req.body.phoneNumber) {
		const secret = req.body.phoneNumber; // should design a way to encode secret
		const result = verifyTOTP(req.body.verificationCode, secret);
		if (result) {
			return res.status(httpStatusCodes.httpCode200.code).json({
				success: true,
				message: "Verification code is valid. " + httpStatusCodes.httpCode200.message,
				result: null,
				error: null,
				statusCode: httpStatusCodes.httpCode200.code
			});
		} else {
			logger.warn("checkVerificationCode: Verification code received from the frontendis invalid.");
			return next(
				new ErrorClass(
					httpStatusCodes.httpCode500.code,
					false,
					"checkVerificationCode: Verification code received from the frontend is invalid." +
						httpStatusCodes.httpCode500.message
				)
			);
		}
	} else {
		logger.warn("checkVerificationCode: bad request query, phoneNumber or verificationCode does not exist, aborted.");
		logger.warn(req);
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.code,
				false,
				"checkVerificationCode: bad request query, phoneNumber or verificationCode does not exist, aborted. " +
					httpStatusCodes.httpCode400.message
			)
		);
	}
};

function generateHOTP(secret, counter) {
	const decodedSecret = base32Decode(secret, "Crockford");
	const buffer = Buffer.alloc(8);
	for (let i = 0; i < 8; i++) {
		buffer[7 - i] = counter & 0xff;
		counter = counter >> 8;
	}

	// Step 1: Generate an HMAC-SHA-1 value
	const hmac = crypto.createHmac("sha1", Buffer.from(decodedSecret));
	hmac.update(buffer);
	const hmacResult = hmac.digest();

	// Step 2: Generate a 4-byte string (Dynamic Truncation)
	const offset = hmacResult[hmacResult.length - 1] & 0xf;
	const code =
		((hmacResult[offset] & 0x7f) << 24) |
		((hmacResult[offset + 1] & 0xff) << 16) |
		((hmacResult[offset + 2] & 0xff) << 8) |
		(hmacResult[offset + 3] & 0xff);

	// Step 3: Compute an HOTP value
	return `${code % 10 ** 6}`.padStart(6, "0");
}

function generateTOTP(secret, window = 0) {
	const counter = Math.floor(Date.now() / 60000);
	const totp = generateHOTP(secret, counter + window);
	console.log("totp obtained from backend...... ", totp);
	return totp;
}

function verifyTOTP(token, secret, window = 1) {
	for (let errorWindow = -window; errorWindow <= +window; errorWindow++) {
		const totp = generateTOTP(secret, errorWindow);
		if (token === totp) {
			return true;
		}
	}
	return false;
}
