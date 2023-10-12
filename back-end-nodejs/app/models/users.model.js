const mongoose = require("mongoose");
// const constants = require("../constants");
const bcrypt = require("bcrypt");
const { logger } = require("../loggers/logger.js");
//const argon2 = require('argon2'); //npm -i argon2
const UsersSchema = mongoose.Schema({
	hasCompletedUserBasicInfo: {
		type: Boolean,
		default: false
	},
	avatar: String,
	//Address
	addressLines: {
		line1: {
			type: String
		},
		line2: {
			type: String
		},
		line3: {
			type: String
		},
		line4: {
			type: String
		}
	},
	country: String,
	county: String,
	stateProvince: String,
	townCity: String,
	postcodeZip: String,
	//Names
	firstName: String,
	lastName: String,
	fullName: String,
	middleInitial: String,
	organizationName: String, //will later move to organization model
	organizationAddress: String,
	aliaseNickname: String,
	userType: String,
	paymentMethod: String,

	referees: [
		{
			refereeId: {
				type: String
			},
			refereeComment: {
				type: String
			}
		}
	],
	//title or rank
	title: String,
	//BirthDay, gender
	DOB: Date,
	gender: String,
	//phone and Email
	workPhone: {
		countryCode: {
			type: String
		},
		phoneNumber: {
			type: String
		},
		extNumber: {
			type: String
		}
	},
	fax: {
		countryCode: {
			type: String
		},
		faxNumber: {
			type: String
		},
		extNumber: {
			type: String
		}
	},
	//login data
	cellPhone: {
		countryCode: {
			type: String,
			unique: false,
			required: true,
			index: true,
			trim: true,
			uniqueCaseInsensitive: false
		},
		phoneNumber: {
			type: String,
			unique: true,
			required: true,
			index: true,
			trim: true,
			uniqueCaseInsensitive: true
		}
	},
	email: {
		type: String,
		unique: true,
		required: true,
		index: true,
		trim: true,
		uniqueCaseInsensitive: true
	},
	confirmedEmail: {
		type: Boolean,
		default: false
	},
	loginName: String, //reserved for future use
	password: {
		type: String,
		required: true
	},
	//other
	otherDetails: String,
	createdAt: {
		type: Date,
		default: Date.now
	}
});

//async await way of authentication using bcrypt with email and password
UsersSchema.statics.authenticateByEmail = async function (email, password, callback) {
	await this.findOne({
		email: email
	}).exec(function (err, user) {
		if (err) {
			return callback(err);
		} else if (!user) {
			var err = new Error("User not found.");
			err.status = 401;
			return callback(err);
		}
		bcrypt.compare(password, user.password, function (err, result) {
			if (result === true) {
				return callback(null, user);
			} else {
				const timenow = new Date().toISOString().replace("T", " ").substr(0, 19);
				const userLoginFailureLogData = {
					eventType: "LOGIN_FAILURE",
					userId: user._id,
					loginTime: timenow,
					loginInutdata: {
						email: email
						//password: password //do NOT log password to prevent from data leak
					},
					loginMethod: "email", //phone, email,other
					loginError: "incorrect password"
				};
				logger.info("LOGIN_FAILURE", userLoginFailureLogData);
				return callback();
			}
		});
	});
};

//async await way of authentication using bcrypt with phone and password
UsersSchema.statics.authenticateByPhone = async function (countryCode, phoneNumber, password, callback) {
	await this.findOne({
		cellPhone: {
			countryCode: countryCode,
			phoneNumber: phoneNumber
		}
	}).exec(function (err, user) {
		if (err) {
			return callback(err);
		} else if (!user) {
			var err = new Error("User not found.");
			err.status = 401;
			return callback(err);
		}
		bcrypt.compare(password, user.password, function (err, result) {
			if (result === true) {
				return callback(null, user);
			} else {
				const timenow = new Date().toISOString().replace("T", " ").substr(0, 19);
				const userLoginFailureLogData = {
					eventType: "LOGIN_FAILURE",
					userId: user._id,
					loginTime: timenow,
					loginInutdata: {
						countryCode: countryCode,
						phoneNumber: phoneNumber
						//password: password //do NOT log password to prevent from data leak
					},
					loginMethod: "phone", //phone, email,other
					loginError: "incorrect password"
				};
				logger.info("LOGIN_FAILURE", userLoginFailureLogData);
				return callback();
			}
		});
	});
};

// //Argon2 way of authentication
// UsersSchema.statics.authenticate2Argon2 = async function (email, password, callback) {
//     await this.findOne({
//             email: email
//         })
//         .exec(async function (err, user) {
//             if (err) {
//                 return callback(err)
//             } else if (!user) {
//                 var err = new Error('User not found.');
//                 err.status = 401;
//                 return callback(err);
//             }
//             try {
//                 if (await argon2.verify(user.password, password)) {
//                     return callback(null, user);
//                 } else {
//                     return callback();
//                     //should throw error here
//                 }
//             } catch (err) {
//                 return callback(err);
//             }
//         });
// }

//hashing a password before saving it to the database
UsersSchema.pre("save", function (next) {
	var user = this;
	bcrypt.hash(user.password, 10, function (err, hash) {
		//10 here sets the strength of the password hash
		//where do we see salt for the hash?
		if (err) {
			return next(err);
		}
		user.password = hash; //The data stored in database is the hash.
		next();
	});

	//argon2 way of hashing
	// try {
	//     const hash = await argon2.hash(user.password)
	//     if (hash) {
	//         user.password = hash;
	//         next();
	//     } else {
	//         const err = new Error("Oops, error creating hash")
	//     }
	// } catch (err) {
	//     logger.error(err);
	//     return next(err);
	// }
});

module.exports = mongoose.model("Users", UsersSchema);
