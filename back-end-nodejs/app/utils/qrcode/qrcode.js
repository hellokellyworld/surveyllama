const jwt = require("jsonwebtoken");
const QRCode = require("qrcode");
const { createCanvas, loadImage } = require("canvas");
// const fs = require("file-system");
// const uuid = require("uuid");
const { jsonwebtokenkeys } = require("../../../config/jsonwebtokenkeys");
const qrCodeEncodeSecret = jsonwebtokenkeys.SL_QRCODE_JWT_KEY;
const path = require("path");
const { logger } = require("../../loggers/logger");
const tempFileServer = require("../tempfile/tempfile");
const { httpStatusCodes } = require("../../constants");

exports.createQRCodeWithLogo = async function (dataForQRcode, center_image, width, cwidth) {
	const canvas = createCanvas(width, width);
	QRCode.toCanvas(canvas, dataForQRcode, {
		errorCorrectionLevel: "H",
		margin: 1,
		color: {
			dark: "#000000",
			light: "#ffffff"
		}
	});
	const ctx = canvas.getContext("2d");
	const img = await loadImage(center_image);
	const center = (width - cwidth) / 2;
	ctx.drawImage(img, center, center, cwidth, cwidth);
	canvas.toDataURL("image/png");

	return new Promise((resolve, reject) => {
		canvas.toDataURL("image/png", function (err, url) {
			if (err) {
				logger.error("qrcode.js:createQRCodeWithLogo: not able to generate QR code url.", err);
				reject(err);
			}
			resolve(url);
		});
	});
};
exports.createQRCodeWithoutLogo = async function (dataForQRcode) {
	return new Promise((resolve, reject) => {
		QRCode.toDataURL(dataForQRcode, function (err, url) {
			if (err) {
				logger.error("qrcode.js:createQRCodeWithoutLogo: not able to generate QR code url.", err);
				reject(err);
			}
			resolve(url);
		});
	});
};

async function decodeBase64Image(dataString) {
	return new Promise((resolve, reject) => {
		var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
		let response = {};
		if (matches.length !== 3) {
			logger.error("qrcode.js:decodeBase64Image: not able to decode base64 image.", err);
			reject(err);
		}
		response.type = matches[1];
		response.data = new Buffer.from(matches[2], "base64");
		resolve(response);
	});
}

exports.saveQrCodeToTmpFolder = async function (qrCode, qrCodeFileName, qrCodeFilePath) {
	let imageBuffer;
	let qrCodeFileInfo;
	try {
		try {
			imageBuffer = await decodeBase64Image(qrCode);
		} catch (err) {
			logger.error("qrcode.js:saveQrCodeToTmpFolder: not able to decode base64 image buffer", err);
			throw err;
		}
		try {
			qrCodeFileInfo = await tempFileServer.makeTempFile(qrCodeFilePath, qrCodeFileName, ".png");
		} catch (err) {
			logger.error("qrcode.js:saveQrCodeToTmpFolder: not able to make a temp png file", err);
			throw err;
		}
		try {
			await tempFileServer.writeFile(imageBuffer.data, qrCodeFileName, qrCodeFileInfo.path);
			return qrCodeFileInfo;
		} catch (err) {
			logger.error("qrcode.js:saveQrCodeToTmpFolder: not able to write a temp png file", err);
			throw err;
		}
	} catch (err) {
		logger.error("qrcode.js:saveQrCodeToTmpFolder: save qrcode to tmp file error", err);
		throw err;
	}
};

exports.decodeQrCodeToken = async function (qrCodeToken) {
	let qrCodeEncodeInfo = qrCodeToken.substring(qrCodeToken.indexOf("=") + 1);
	return new Promise((resolve, reject) => {
		jwt.verify(qrCodeEncodeInfo, qrCodeEncodeSecret, function (err, result) {
			if (err) {
				logger.error("qrcode.js:decodeQrCodeToken: fail verifying QR code token", err);
				reject(err);
			}
			resolve(result);
		});
	});
};

exports.concatQRCodeInfo = async function (qrCodeEncodeInfo, url) {
	return new Promise((resolve, reject) => {
		const qrCodeEncodeInfoEXP = Math.floor(Date.now() / 1000) + 60 * 60; //1 hour exp
		jwt.sign(
			{
				id: qrCodeEncodeInfo,
				exp: qrCodeEncodeInfoEXP
			},
			qrCodeEncodeSecret,
			function (err, result) {
				if (err) {
					logger.error("qrcode.js:concatQRCodeInfo: fail sign QR code token", err);
					reject(err);
				}
				const concatenatedUrl = url + "?code=" + result;
				resolve(concatenatedUrl);
			}
		);
	});
};

exports.concatQRCodeInfoObj = async function (qrCodeEncodeInfo, url) {
	let pinObj = { pinValue: 123456 };
	let infoTobeEncoded = { isPinRequired: true, encodedInfoObj: { pinObj: pinObj, qrCodeEncodeInfo: qrCodeEncodeInfo } };
	const qrCodeEncodeInfoEXP = Math.floor(Date.now() / 1000) + 60 * 60; //1 hour exp

	return new Promise((resolve, reject) => {
		jwt.sign(
			{
				id: infoTobeEncoded,
				exp: qrCodeEncodeInfoEXP
			},
			qrCodeEncodeSecret,
			function (err, result) {
				if (err) {
					logger.error("qrcode.js:concatQRCodeInfo: fail sign QR code token", err);
					reject(err);
				}
				const concatenatedUrl = url + "?code=" + result;
				resolve(concatenatedUrl);
			}
		);
	});
};

exports.decodeQrCodeTokenObj = async function (qrCodeToken) {
	let qrCodeEncodeInfo = qrCodeToken.substring(qrCodeToken.indexOf("=") + 1);
	return new Promise((resolve, reject) => {
		jwt.verify(qrCodeEncodeInfo, qrCodeEncodeSecret, function (err, result) {
			if (err) {
				logger.error("qrcode.js:decodeQrCodeToken: fail verifying QR code token", err);
				reject(err);
			}
			if (result.id.isPinRequired == true) {
				const pinValue = result.id.encodedInfoObj.pinObj.pinValue;
				//Upon scan of the qr code,
				//if infoTobeEncoded.isPinReuqired == true
				// redirect user to pin entry page (test this in user.controller.grabUser())
				//
				// 0) users scan the qrcode, the backend should redirect
				// the user to front-end pin entry page using res.redirect
				// if the backend find the  pin is required, ie, isPinRequired = true
				// 1) front-end has th entry page of the pin code
				// 2) Upon entry of the pin in front-end, front end call backend to verify the pin
				// 3) backend verify the pin and return result to front end(result should include the original url iff verificaition reuslt is true)
				// 4) frontend will redirect the user to the url in the reuslt if verification pass
				return res.status(httpStatusCodes.httpCode401.code).json({
					success: false,
					result: null,
					error: null,
					redirectURL: `http://localhost:8080/pinEntry`, //  redirectUri
					statusCode: httpStatusCodes.httpCode401.code
				});
			} else {
				//do nothing for now
			}
			resolve(result);
		});
	});
};
