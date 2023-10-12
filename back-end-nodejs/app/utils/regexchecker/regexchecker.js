//function that checks if a regular expression is safe
//how to use:
//   const result=regexchecker(regrex)
//where result is true for safe, false for unsafe, regrex is the regular expression string e.g. '(beep|boop)*'
//
const saferegex = require("safe-regex");
const opts = {
	limit: 25
};

const regexchecker = (regex) => {
	return new Promise((resolve, reject) => {
		const result = saferegex(regex, opts);
		if (result) {
			resolve(true);
		} else {
			reject(false);
		}
	});
};

module.exports = {
	regexchecker
};
