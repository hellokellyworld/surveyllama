import { logger } from "../../loggers/logger";

export default function (io) {
	if (io !== undefined && typeof io === "object") {
		//here we can set all io related stuff (we should be able to put this in a separate file)
		//e.g.

		logger.info("Setting up socketio for user namespace /user-connections ...");
		//
		//namespace /user-connections to manage user connections
		// (e.g. to disconnect on previous devices if user is logged on a new device
		//  or allow user to select which devices to keep alive on user's dashboard)

		//configure the io server to use "/user-connections" as namespace
		const userConnectionsNSP = io.of("/user-connections");
		const UserConnections = require("./app/models/userConnections.model");

		// io.sockets.on("connection", (socket) => {
		userConnectionsNSP
			// .use(
			// 	(err, socket, next) => {
			// 		next();
			// 	} //middlewares here
			// )
			.on("connection", (socket) => {
				//report on logging in on a device (when user logs in on a device)
				socket.on("user-login-report", function (action) {
					switch (action.type) {
						case "@@users/REPORT_USER_LOGIN_SUCCESS_TO_SERVER":
							//UsersActionTypes.REPORT_USER_LOGIN_SUCCESS_TO_SERVER
							var userConn = new UserConnections({
								userId: action.userId.toString(),
								socketId: action.socketId || socket.id
							});
							userConn.save();
					}
				});

				//report on logging out on a device (when user logs out on a device, sometimes just timed out
				//when the device is idle for a long time )
				socket.on("user-logout-report", function (action) {
					logger.info("getting user-logout-report with action");
					logger.info(action);
					switch (action.type) {
						case "@@users/REPORT_USER_LOGOUT_SUCCESS_TO_SERVER":
							//UsersActionTypes.REPORT_USER_LOGIN_SUCCESS_TO_SERVER
							UserConnections.findOne({
								userId: action.userId.toString(),
								socketId: action.socketId || soket.id
							})
								.remove()
								.exec();
					}
				});

				//when user's socket connection from a device is disconnected by user choice or by
				//network disconnection
				socket.on("disconnect", () => {
					logger.info("getting user-logout-report with action");
					const SocketId = socket.id;
					UserConnections.findOne({
						//remove from UserConnections DB
						socketId: SocketId
					})
						.remove()
						.exec();
					socket.disconnect();
					logger.info("socket client with id " + SocketId + " disconnected");
				});
			});

		logger.info("Finished setting up socketio for user namespace /user-connections");
		//Add other namespaces and register middleware or callbacks for them
		//e.g. user groupchats with a groupId etc

		//e.g. platform representative and customer help chats

		//e.g. user workgroups for contracts, logistics etc
	}

	return io;
}
