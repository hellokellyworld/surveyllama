module.exports = (app) => {
	const smsCtrl = require("../controllers/sms.controller");
	app.get("/sendSMS/", smsCtrl.sendSMS);
	app.post("/sendVerificationCode", smsCtrl.sendVerificationCode);
	app.post("/checkVerificationCode", smsCtrl.checkVerificationCode);
};
