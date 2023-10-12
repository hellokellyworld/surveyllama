const jwt = require("jsonwebtoken");
const { jsonwebtokenkeys } = require("../../../config/jsonwebtokenkeys");

module.exports.attachIOtoAppReq = (app, io) => {
	return (req, res, next) => {
		if (io) {
			//inject io into the req, so that all other routed controllers can access it in req.
			req.io = io;
		}
		next();
	};
};

//
//a middleware for the room to handle any socket connection
//make sure user already logged in by returning the token assigned during login
//

module.exports.verifySocker = (socket, next) => {
	if (socket.handshake.query && socket.handshake.query.token) {
		const decoded = verifyToken(socket.handshake.query.token);
		socket.decoded = decoded;
		next();
	}
};

//utility to verify token using jwt
module.exports.verifyToken = (token) => {
	try {
		const decoded = jwt.verify(token, jsonwebtokenkeys.JWT_API_KEY);
		return decoded;
	} catch (err) {
		return false;
	}
};
