const Server = require("socket.io");
const { postcommentcontroller } = require("./socketio.commentcontroller");
// const { usercontroller } = require("./socketio.usercontroller");
const { postcontroller } = require("./socketio.postcontroller");

// import { fixedOrigin } from "./corsFixer";
// import { hosts } from "../env";
const { logger } = require("../../loggers/logger");

var io = null;

exports.initialize = function (httpServer, options) {
	io = new Server(httpServer, {
		...options,
		path: "/surveyLlamaSocketio"
		// origins: fixedOrigin(hosts)
	});
	logger.info("Socketio initialized, under path '/surveyLlamaSocketio' ");

	applySocketControllers(io);
	logger.info("Socketio is set up!");
	return io;
};

exports.getSocketIo = function () {
	return io;
};

function applySocketControllers(io) {
	usercontroller(io);
	postcommentcontroller(io);
	// apply other controllers if more
	//  .... more controllers here ...
	return io;
}
