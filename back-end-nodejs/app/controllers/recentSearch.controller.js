const RecentSearch = require("../models/recentSearch.model.js");
const mongoSanitize = require("mongo-sanitize");
const { ErrorClass } = require("../helpers/error");
const { httpStatusCodes } = require("../constants");
const { logger } = require("../loggers/logger");
const _debug = require("debug");

//Create  recentSearch data record
exports.createRecentSearch = (req, res, next) => {
	const debug = _debug("sl:recentSearch.controller.js:createRecentSearch");
	debug("creating recent search...");

	Object.keys(req.body).forEach((param) => {
		req.body[param] = mongoSanitize(req.body[param]);
	});
	const form = req.body;
	const searchText = form.searchText; //assume there is text in the form

	if (searchText) {
		//create data and put it in the database
		//and then return the id of that record
		let newRecentSearch = new RecentSearch({
			searchString: searchText,
			searchUserId: ""
		});
		newRecentSearch
			.save()
			.then(
				//got it done, so respond with good news and the data
				(recentSearch) => {
					return res.status(httpStatusCodes.httpCode200.code).json({
						success: true,
						message: "recent search created. " + httpStatusCodes.httpCode200.message,
						result: {
							recentSearch_id: recentSearch._id
						},
						error: null,
						statusCode: httpStatusCodes.httpCode200.code
					});
				}
			)
			.catch((err) => {
				//had problem saving the data into the database
				logger.error("createRecentSearch: not able to save recent search");
				logger.error(err);
				return next(
					new ErrorClass(
						httpStatusCodes.httpCode500.code,
						false,
						"createRecentSearch: not able to save recent search. " + httpStatusCodes.httpCode500.message
					)
				);
			});
	} else {
		//respond to the caller with an error
		logger.warn("createRecentSearch: the searchText can't be empty. ");
		logger.warn(req.body);
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.code,
				false,
				"createRecentSearch: the searchText can't be empty. " + httpStatusCodes.httpCode400.message
			)
		);
	}
};

//Read recentSearch data record(s)
exports.grabRecentSearch1 = (req, res, next) => {
	const debug = _debug("sl:recentSearch.controller.js:grabRecentSearch1");
	debug("grab recent search recent search...");

	Object.keys(req.query).forEach((param) => {
		req.query[param] = mongoSanitize(req.query[param]);
	});

	const searchProperties = ["searchString"];
	if (req.query && req.query.value) {
		const input = req.query.value;
		const searchQueries = searchProperties.map((property) => {
			return {
				[property]: {
					$regex: new RegExp(input.toLowerCase(), "i") //i: inclusive
				}
			};
		});
		RecentSearch.find({
			$or: searchQueries
		})
			.then((records) => {
				records = records.map((record) => {
					return record.searchString;
				});
				return Promise.all(
					records.map((x) => {
						return x.toLowerCase();
					})
				);
			})
			.then((records) => {
				var results = sortByFrequencyAndFilter(records);
				if (results.length > 0 && results.length <= 10) {
					return res.status(httpStatusCodes.httpCode200.code).json({
						success: true,
						message: "got recent searches. " + httpStatusCodes.httpCode200.message,
						result: {
							recentSearches: results
						},
						error: null,
						statusCode: httpStatusCodes.httpCode200.code
					});
				} else if (results.length > 10) {
					return res.status(httpStatusCodes.httpCode200.code).json({
						success: true,
						message: "got recent searches. " + httpStatusCodes.httpCode200.message,
						result: {
							recentSearches: results.slice(0, 10)
						},
						error: null,
						statusCode: httpStatusCodes.httpCode200.code
					});
				} else {
					logger.warn("grabRecentSearch: no recent search found.");
					return next(
						new ErrorClass(
							httpStatusCodes.httpCode404.code,
							false,
							"grabRecentSearch: no recent search found. " + httpStatusCodes.httpCode404.message
						)
					);
				}
			})
			.catch((err) => {
				logger.warn("grabRecentSearch: error looking for search text.");
				logger.warn(err);
				return next(
					new ErrorClass(
						httpStatusCodes.httpCode500.code,
						false,
						"grabRecentSearch: error looking for search text. " + httpStatusCodes.httpCode500.message
					)
				);
			});
	} else {
		logger.warn("grabRecentSearch: oops you did not specify a keyword to search!");
		logger.warn(req);
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.code,
				false,
				"grabRecentSearch: oops you did not specify a keyword to search! " + httpStatusCodes.httpCode400.message
			)
		);
	}
};

function sortByFrequencyAndFilter(myArray) {
	const debug = _debug("sl:recentSearch.controller.js:sortByFrequencyAndFilter");
	debug("sorting by frequency and then filtering...");

	var newArray = [];
	var freq = {};
	//Count Frequency of Occurances
	var i = myArray.length - 1;
	for (var i; i > -1; i--) {
		var value = myArray[i];
		freq[value] == null ? (freq[value] = 1) : freq[value]++;
	}

	//Create Array of Filtered Values
	for (var value in freq) {
		newArray.push(value);
	}

	//Define Sort Function and Return Sorted Results
	function compareFreq(a, b) {
		return freq[b] - freq[a];
	}

	return newArray.sort(compareFreq);
}

exports.grabRecentSearch = (req, res, next) => {
	const debug = _debug("sl:recentSearch.controller.js:grabRecentSearch");
	debug("grabing recent search...");

	Object.keys(req.query).forEach((param) => {
		req.query[param] = mongoSanitize(req.query[param]);
	});

	if (req.query && req.query.value) {
		RecentSearch.find(
			{
				$text: {
					$search: req.query.value
				}
			},
			{
				score: {
					$meta: "textScore"
				}
			}
		)
			.sort({
				score: {
					$meta: "textScore"
				}
			})
			//.sort({ "createdAt": "1" })
			//A.Let database function help deal with the
			//B.then Sort by three standards
			//.sort({ datefield: -1 })//.orderBy('createAt', 'asc')
			.then((record) => {
				logger.info(record);
				if (record.length > 0 && record.length <= 10) {
					// let newRecord = record.map(r => [r.searchString.toLowerCase(), r]);
					return res.status(httpStatusCodes.httpCode200.code).json({
						success: true,
						message: "got recent searches. " + httpStatusCodes.httpCode200.message,
						result: {
							recentSearches: record
						},
						error: null,
						statusCode: httpStatusCodes.httpCode200.code
					});
				} else if (record.length > 10) {
					return res.status(httpStatusCodes.httpCode200.code).json({
						success: true,
						message: "got recent searches. " + httpStatusCodes.httpCode200.message,
						result: {
							recentSearches: record.slice(0, 10)
						},
						error: null,
						statusCode: httpStatusCodes.httpCode200.code
					});
				} else {
					logger.warn("grabRecentSearch: no recent search found.");
					return next(
						new ErrorClass(
							httpStatusCodes.httpCode404.code,
							false,
							"grabRecentSearch: no recent search found. " + httpStatusCodes.httpCode404.message
						)
					);
				}
			})
			.catch((err) => {
				logger.error("grabRecentSearch: error finding recent search.");
				logger.error(err);
				return next(
					new ErrorClass(
						httpStatusCodes.httpCode500.code,
						false,
						"grabRecentSearch: error finding recent search. " + httpStatusCodes.httpCode500.message
					)
				);
			});
	} else {
		logger.warn("grabRecentSearch: oops you did not specify the name.");
		logger.warn(req);
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.code,
				false,
				"grabRecentSearch: oops you did not specify the name. " + httpStatusCodes.httpCode400.message
			)
		);
	}
};

//Update recentSearch data record(s)

//Delete research data record(s)
exports.deleteRecentSearch = (req, res, next) => {
	const debug = _debug("sl:recentSearch.controller.js:deleteRecentSearch");
	debug("deleting recent search...");

	Object.keys(req.body).forEach((param) => {
		req.body[param] = mongoSanitize(req.body[param]);
	});

	const form = req.body;

	if (form && form.id) {
		//const myId = req.query.id;          //get the Id of the recent search record to delete
		RecentSearch.findById(form.id) //find it in the DB
			.then((recentSearch) => {
				//now I have it
				recentSearch
					.remove() //remove the data
					.then(() => {
						return res.status(httpStatusCodes.httpCode200.code).json({
							success: true,
							message: "recents earch deleted. " + httpStatusCodes.httpCode200.message,
							result: null,
							error: null,
							statusCode: httpStatusCodes.httpCode200.code
						});
					})
					.catch((err) => {
						//if error calling the remove() above, return error
						logger.error("deleteRecentSearch: Oops, not able to delete search entry.");
						logger.error(err);
						return next(
							new ErrorClass(
								httpStatusCodes.httpCode500.code,
								false,
								"deleteRecentSearch: Oops, not able to delete search entry. " + httpStatusCodes.httpCode500.message
							)
						);
					});
			})
			.catch((err) => {
				//if did not find the item to remove, also return error
				logger.warn("deleteRecentSearch: Oops, not able find the search entry to delete.");
				logger.warn(err);
				return next(
					new ErrorClass(
						httpStatusCodes.httpCode404.code,
						false,
						"deleteRecentSearch: Oops, not able find the search entry to delete. " + httpStatusCodes.httpCode404.message
					)
				);
			});
	} else {
		logger.warn("deleteRecentSearch: oops you did not specify the id of the search to remove.");
		logger.warn(req);
		return next(
			new ErrorClass(
				httpStatusCodes.httpCode400.code,
				false,
				"deleteRecentSearch: oops you did not specify the id of the search to remove. " +
					httpStatusCodes.httpCode400.message
			)
		);
	}
};
