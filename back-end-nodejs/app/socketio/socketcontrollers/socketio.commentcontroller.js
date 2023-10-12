const { logger } = require("../../loggers/logger");
const { PostCommentsRoom } = require("../roommanagers/comment.roommanager"); //Room Manager
// const { verifySocker } = require("../socketmiddlewares/socketio.middleware");

const postcommentcontroller = (io) => {
	if (io !== undefined && typeof io === "object") {
		//takes the socketio server instance io and setup rooms etc under comment namespace
		//and return the io

		//configure the io server to use "/post-comments" as namespace
		const postCommentsNSP = io.of("/post-comments");

		postCommentsNSP
			// .use(verifySocker)
			.on("connection", async (socket) => {
				//initialization of rooms if needed, provide callbacks on message received from clients

				//if room avaiable already, make the username join the room
				//if room not avaiable, will create the room for the first time and join the room
				// const joinedRoom = await room.init(username);

				//get data from socket

				//create or join rooms if necessary

				//the incoming connection from client should have the following info:
				//     username, roomId, password, action, options
				//obtain user info etc from the socket query
				const { username, roomname, roomId, password, action, options } = socket.handshake.query;

				const clientUsername = username || "anonymous";
				const clientRoomPassword = password || "";
				const clientRoomId = roomId;
				const clientRoomName = roomname || roomId;

				//use the info to setup a Room with a bunch of options. The Room is basically a class
				//that takes io etc data to create a new instance of Room
				const room = new PostCommentsRoom({
					io: postCommentsNSP,
					socket,
					username: clientUsername,
					roomId: clientRoomId,
					password: clientRoomPassword,
					action,
					options //options used for creating room
				});

				//if room avaiable already, make the username join the room
				//if room not avaiable, will create the room for the first time and join the room
				const joinedRoom = await room.init(clientUsername);

				logger.info("socketio.commentcontroller.js: Client Connected");

				//show rooms etc or do some thing to the room if user joined
				if (joinedRoom) {
					// room.showUsers(); //send users list to every one
					// room.isReady(); //register handler for receiving is-ready message
					room.onCommentLikeUnlikeClicked();
					room.onCommentDislikeUndislikeClicked();
				}

				room.onDisconnect(); //register handler for user disconnect

				logger.info("Finished setting up socketio for post comment namespace /post-comments");
			});
	}
	return io;
};

module.exports = {
	postcommentcontroller
};
