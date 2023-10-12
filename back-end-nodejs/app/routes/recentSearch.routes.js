module.exports = (app) => {
	const recentSearchCtrl = require("../controllers/recentSearch.controller");
	app.post("/search/createRecentSearch", recentSearchCtrl.createRecentSearch); //create
	app.get("/search/getRecentSearch", recentSearchCtrl.grabRecentSearch1); //get
	app.post("/search/deleteRecentSearch", recentSearchCtrl.deleteRecentSearch); //delete
};
