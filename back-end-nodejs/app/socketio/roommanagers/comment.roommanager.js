const bcrypt = require("bcrypt");
const { logger } = require("../../loggers/logger");

// import { SALT_ROUNDS, MAX_USERS_DEFAULT, MAX_TIMER_DEFAULT } from "../env";
const SALT_ROUNDS = 5;
const MAX_USERS_DEFAULT = 1000;
const MAX_TIMER_DEFAULT = 3600; //seconds

//A Room is a class that provides functions for people or users to interact
class PostCommentsRoom {
	constructor(options) {
		this.io = options.io; // Shortname for -> io.of('/your_namespace_here')  //namespace of the room
		this.socker = options.socket; //socket that is trying to connect to the room
		this.username = options.username || "anonymous"; //Optional, the user name that is coming with the socket
		this.roomId = options.roomId; //roomId (who creates this ID? from incoming socket?)
		this.password = options.password || ""; // Optional,
		// this.action = options.action; // [join, create], stuff to do after the connection
		this.options = JSON.parse(options.options); // {maxTimerLimit, maxUsersLimit} other room parameters
		// start with all of the rooms that exist under the current
		// namespace, and later narrowed down to io.adapter.rooms[roomId]
		//options.io.adapter is used to keep track of the rooms under the name space
		this.store = options.io.adapter;
	}

	/**
	 * Initializes steps on first connection.
	 *
	 * Checks if room available based on roomId:
	 *   If yes, then joins the room
	 *   If no, then creates new room and join
	 *
	 * @access    public
	 * @return   {bool}    Returns true if initialization is successfull, false otherwise
	 */
	async init(username) {
		// first connection initialization
		// Stores an array containing socket ids in 'roomId' //where is this stored?
		let clients;

		//check connected clients for the given roomId, then decide what to do
		await this.io.in(this.roomId).clients((e, _clients) => {
			clients = _clients || logger.error("[INTERNAL ERROR] Room creation failed!");
			// logger.debug(`comment.roommanager.js: Connected Client IDs are: ${clients}`);
		});

		// Check if room size is equal to zero
		//     If yes, create new room and join socket to the room
		//     If not, simply join socket to the room

		if (clients.length < 1) {
			//Tom Long: how do we determine who has the right to create room???
			//well, maybe we check the password or the user's permission parameters (rank or position)
			//for the business

			//if room does not exist yet, basically meaning roomId does not exist in the list of rooms
			//in this.store.rooms

			//join the room then take the store of the room

			try {
				await this.socker.join(this.roomId); //join the room
			} catch (_err) {
				this.socker.emit("join-room-error", { error: "unknown error", roomId: this.roomId });
				return false;
			}

			//---------Here is how join room(s) and leave room work in socket.io----
			// Socket.prototype.join = function (rooms, fn) {
			// 	debug("joining room %s", rooms);
			// 	var self = this;
			// 	if (!Array.isArray(rooms)) {
			// 		rooms = [rooms];
			// 	}
			// 	rooms = rooms.filter(function (room) {
			// 		return !self.rooms.hasOwnProperty(room);
			// 	});
			// 	if (!rooms.length) {
			// 		fn && fn(null);
			// 		return this;
			// 	}
			// 	this.adapter.addAll(this.id, rooms, function (err) {
			// 		if (err) return fn && fn(err);
			// 		debug("joined room %s", rooms);
			// 		rooms.forEach(function (room) {
			// 			self.rooms[room] = room;
			// 		});
			// 		fn && fn(null);
			// 	});
			// 	return this;
			// };
			//-------------------------------------------------------

			this.store = this.store.rooms[this.roomId]; //take teh store of the room

			if (this.password) {
				//store the room password if the creator specfified a password for the room
				//so that new guests need to have the password to be able to join
				this.store.password = await bcrypt.hash(this.password, SALT_ROUNDS);
			} else {
				this.store.passsword = "";
			}

			//record the client in clients array of the room store
			this.store.clients = [{ id: this.socker.id, username: username, isReady: false }];

			this.socker.username = username;

			logger.info(`[CREATE] Client created and joined post-comments room with roomId: ${this.roomId}`);
			this.socker.emit("join-room-success", { roomId: this.roomId });
			return true;
		} else {
			//take the store of the room first, then join the room
			this.store = this.store.rooms[this.roomId];
			logger.info("Clients already in room:", this.store.clients);
			//if already some clients in, room already there, he needs to join instead of creating a room
			if (this.store.password !== "") {
				//if the room has password, check incoming client's password
				if (this.store.password && !(await bcrypt.compare(this.password, this.store.password))) {
					logger.info(`[JOIN FAILED] Incorrect password for room ${this.roomId}`);
					this.socker.emit("join-room-error", { error: "unknown error", roomId: this.roomId });
					return false;
				}
			} else {
				//if the room does not need password at all, join directly
				//do nothing here
			}

			//then join the room
			try {
				//join if password worked above or no need for password
				await this.socker.join(this.roomId);
			} catch (_err) {
				this.socker.emit("join-room-error", { error: "unknown error", roomId: this.roomId });
				return false;
			}

			//record the client in clients array of the room
			//which includes the id, user name etc
			this.store.clients.push({ id: this.socker.id, username: username, isReady: false });
			this.socker.username = username;

			//get back to the socket connection and emit success
			this.socker.emit("join-room-success", { roomId: this.roomId });
			logger.info(`[JOIN] Client joined room with roomId: ${this.roomId}`);
			return true;
		}
	}

	/**
	 * Broadcast info about all users and their ready status joined to given room.
	 * Deafult status as 'Not ready'.
	 *
	 * @access    public
	 */
	//tell everyone one about the people in the room
	showUsers() {
		const { clients } = this.store;
		this.io.to(this.roomId).emit("show-users-joined", { usersJoined: clients });
	}

	/**
	 * update likes count and broadcast to everyone in the room about the likes count change
	 *
	 * @access public
	 */

	onCommentLikeUnlikeClicked() {
		// receiving messagae from client on likes
		this.socker.on("comment-like-unlike-clicked", async (message) => {
			const messageData = JSON.parse(message);
			const commentCtrl = require("../../controllers/comment.controller");
			try {
				// update comment according to action (Like, Unlike) and return the new likesCount
				const result = await commentCtrl.updateComment({
					commentId: messageData.action.payload.commentId,
					action: messageData.action.type
				});

				// broadcast to every one in the same room the new likesCount
				const messageToSend = {
					description: "someone liked/unliked the comment",
					action: {
						type: messageData.action.type == "Like" ? "Like" : "Unlike",
						payload: {
							commentId: messageData.action.payload.commentId,
							likesCount: result,
							isReply: messageData.action.payload.isReply,
							replyToId: messageData.action.payload.replyToId //this is empty for direct comment
						}
					}
				};

				// //broadcast to the room
				this.io.to(this.roomId).emit("comment-like-unlike-clicked", JSON.stringify(messageToSend));

				// or only to send the user himself
				//this.socker.emit("comment-like-unlike-clicked", JSON.stringify(messageToSend));
			} catch (err) {
				logger.error("comment.roommanager.js: Oops update comment error", err);
			}
		});
	}

	/**
	 * update dislikes count and broadcast to everyone in the room about the dislikes count change
	 *
	 * @access public
	 */

	onCommentDislikeUndislikeClicked() {
		// receiving messagae from client on dislikes
		this.socker.on("comment-dislike-undislike-clicked", async (message) => {
			const messageData = JSON.parse(message);
			const commentCtrl = require("../../controllers/comment.controller");

			try {
				// update comment according to action (Like, Unlike) and return the new dislikesCount
				const result = await commentCtrl.updateComment({
					commentId: messageData.action.payload.commentId,
					action: messageData.action.type
				});

				// broadcast to every one in the same room the new likesCount
				const messageToSend = {
					description: "someone disliked/undisliked the comment",
					action: {
						type: messageData.action.type == "Dislike" ? "Dislike" : "Undislike",
						payload: {
							commentId: messageData.action.payload.commentId,
							dislikesCount: result,
							isReply: messageData.action.payload.isReply,
							replyToId: messageData.action.payload.replyToId //this is empty for direct comment
						}
					}
				};

				// //broadcast to the room
				// this.io.to(this.roomId).emit("comment-dislike-undislike-clicked", JSON.stringify(messageToSend));

				//or only to send to the user himself
				this.socker.emit("comment-dislike-undislike-clicked", JSON.stringify(messageToSend));
			} catch (err) {
				logger.error("comment.roommanager.js: Oops update comment error", err);
			}
		});
	}

	/**
	 * Gracefully disconnect the user from the roome and cleanup
	 * @access    public
	 */
	onDisconnect() {
		this.socker.on("disconnect", () => {
			try {
				//remove the user from the clients list
				this.store.clients = this.store.clients.filter((user) => user.id !== this.socker.id);
				// this.showUsers();

				//Tom Long: Here we should also clean the room by removing the room from the
				//this.io.adaptor.rooms[roomId] if no more clients exist
			} catch (_) {
				logger.info("[FORCE DISCONNECT] Server closed forcefully");
			}
			logger.info("Client Disconnected! Client id:", this.socker.id);
		});
	}

	/**
	 * Send data to a particular user
	 */
	// this.io.to(this.store.clients[currentTurnNum].id).emit("personal-turn-start", "It is your chance to pick");

	/**
	 * Other methods of the room
	 *
	 */

	// /**
	//  * Mark user as ready if receiving "is-ready" message from client
	//  *
	//  * @access public
	//  */
	// //check thie socker (the current connection)
	// isReady() {
	// 	this.socker.on("is-ready", () => {
	// 		this.store.clients.forEach((user) => {
	// 			if (user.id === this.socker.id) {
	// 				user.isReady = true;
	// 			}
	// 		});
	// 		this.showUsers();
	// 		const areUsersReady = this.store.clients.every((user) => user.isReady === true);
	// 		if (areUsersReady) {
	// 			// this.beginDraft();
	// 			//start some group event if all users in the room reported ready
	// 		}
	// 	});
	// }

	// /**
	//  * Initiates the draft, by resetting the game -> emitting initial turn
	//  *
	//  * @access    public
	//  */
	// //when do we do this?
	// beginDraft() {
	// 	this.store.clients = this.shufflePlayers(this.store.clients);
	// 	this.showUsers();
	// 	this.io.to(this.roomId).emit("draft-start", "The users order is shuffled and the draft has started...");
	// 	consola.info("Draft started...");

	// 	// //Reset draft object to initial state
	// 	// this._resetCurrentGame();
	// 	// this._emitTurn(0);
	// 	// this.showTeams();
	// }

	// /**
	//  * Emit End current draft event
	//  *
	//  * @access    public
	//  */
	// endDraft() {
	// 	// TODO: Save the teams in DB as a collection
	// 	this.io.to(this.roomId).emit("draft-end", "The draft has ended");
	// }

	// /**
	//  * Shuffle the players ready in a given room in random order.
	//  * Uses Fisher-Yates shuffle algorithm
	//  *
	//  * @param        {Array}    clients    Original clients list from this.store.clients
	//  * @return       {Array}               Shuffled order of this.store.clients
	//  */
	// shufflePlayers(clients) {
	// 	// Shuffle the order of players and return a new order
	// 	let j;
	// 	let x;
	// 	let i;

	// 	for (i = clients.length - 1; i > 0; i--) {
	// 		j = Math.floor(Math.random() * (i + 1));
	// 		x = clients[i];
	// 		clients[i] = clients[j];
	// 		clients[j] = x;
	// 	}
	// 	return clients;
	// }
}

module.exports = {
	PostCommentsRoom
};
