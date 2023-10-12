//how to run this example test:
//
//  node test_regexchecker.js
//
//Notes:https: //www.npmjs.com/package/safe-regex

const { regexchecker } = require("./regexchecker.js");
const { logger } = require("../../loggers/logger.js");

(async () => {
	const abc = await regexchecker("\blocations*:[^:\n]+\b(Oakland|San Francisco)\b")
		.then((result) => {
			return result;
		})
		.catch((err) => {
			return false;
		});

	logger.info("abc is: " + abc); //should return true for safe regex

	const def = await regexchecker("(a+){10}")
		.then((result) => {
			return result;
		})
		.catch((err) => {
			return false;
		});

	logger.info("def is: " + def); //should return false for unsafe regex
	let ghi;
	try {
		ghi = await regexchecker("(beep|boop)*");
	} catch (error) {
		logger.error(error);
	}
	logger.info("ghi is: " + ghi);

	regexchecker("(beep|boop)*")
		.then((result) => {
			logger.info("jkl is: " + result);
		})
		.catch((error) => {
			logger.error("jkl is: " + error);
		});

	regexchecker("(a+){10}")
		.then((result) => {
			logger.info("mno is: " + result);
		})
		.catch((error) => {
			logger.error("mno is: " + error);
		});

	//const pqr = await regexchecker('(a+){10}'); //this will NOT work for regexchecker returns Promise
	//logger.info('pqr is: ' + pqr);
})();
