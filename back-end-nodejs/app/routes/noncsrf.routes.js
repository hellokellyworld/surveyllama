const { httpStatusCodes } = require("../constants");
// const { logger } = require("../loggers/logger.js");
// const userPolicyCtrl = require("../controllers/userPolicy.controller");
const prompttoaiCtrl = require("../controllers/prompttoai");

const nonCSRFrouter = require("express").Router();

// //middleware that is specific to this router
// nonCSRFrouter.use((req, res, next) => {
//     //logger.info('Time: ', Date.now())
//     next()
// })

// Add other routes that do not need CSRF checking here
nonCSRFrouter.get("/about", function (req, res, next) {
	return res.status(httpStatusCodes.httpCode200.code).json({
		success: true,
		message: "this is a GET request without csrf checking. " + httpStatusCodes.httpCode200.message,
		result: null,
		error: null,
		statusCode: httpStatusCodes.httpCode200.code
	});
	//next();
});

nonCSRFrouter.post("/tta", prompttoaiCtrl.talktoai);
nonCSRFrouter.post("/createCampaign", prompttoaiCtrl.createCampaign);
nonCSRFrouter.post("/createSurveySession", prompttoaiCtrl.createSurveySession);

// //userPolicyCtrl
// nonCSRFrouter.get("/userPolicy/getUserPolicy", userPolicyCtrl.grabUserPolicy);

module.exports = nonCSRFrouter;
