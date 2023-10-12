module.exports = (app) => {
	const prompttoaiCtrl = require("../controllers/prompttoai");
	app.post("/talktoai", prompttoaiCtrl.talktoai);
	app.get("/getGreetingFromTaskToken", prompttoaiCtrl.getGreetingFromTaskToken);
};
