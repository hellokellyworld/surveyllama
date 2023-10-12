//  "/api/csrf/getCSRF"

module.exports = (app) => {
	const csrfCtrl = require("../controllers/csrf.controller.js");
	app.get("/csrf/getCSRF", csrfCtrl.grabCSRF); //get
};
