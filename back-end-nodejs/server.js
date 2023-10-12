// import { SockerController as socker } from "./app/socketio/socker.controller.js";
// import { attachIOtoAppReq } from "./app/socketio/socketmiddlewares/socketio.middleware.js";

const express = require("express");
const bodyParser = require("body-parser");
const http = require("http");
// const https = require("https");
// const WebSocket = require("ws");
const sessionConfig = require("./config/session.config");
// const redirectHttps = require("redirect-https");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const csurf = require("csurf"); //middleware to use cookie to prevent CSRF attack on form submissions
const cors = require("cors");
const RateLimiter = require("express-rate-limit");
const { httpStatusCodes } = require("./app/constants");
const { ErrorClass } = require("./app/helpers/error");

//tools for socket.io and create a socket Server named io
// const io = require("socket.io")();
// const { getSocketIo, initialize } = require("./app/socketio/socketcontrollers/socketio.maincontroller");

//const adapter = require('socket.io-redis');
//const redis = require('./config/redis.config.js'); //setting up connection to the redis system
//const redisAdapter = adapter({ //this can be put in socket.io-redis.config.js
//  host: process.env.REDIS_HOST || 'localhost',
//  port: process.env.REDIS_PORT || 6379,
//  //password: process.env.REDIS_PASS || 'password',
//});

const pinoDebug = require("pino-debug");
const { logger, expressLogger } = require("./app/loggers/logger");
const _debug = require("debug");
const PROD = process.env.NODE_ENV === "production" || false;
logger.info("Back-end is running with production mode?:" + PROD);

// set the port of our application
// process.env.PORT lets the port be set by Heroku
// var securePort = process.env.PORT || 8443; //by default lets use 8443 as secure port
// var insecurePort = process.env.PORT || 3001;
var port = process.env.PORT || 3001;
// create express app
const app = express(); //this is an HTTP internet server, written in JS language, to be run by node environment
//HTTP server basically sends HTTP data and HTML pages to clients

//wire pino with debug tool so that namespace can be used
if (!pinoDebug.called) {
	//call it only once
	pinoDebug(logger, {
		auto: true, // default
		safe: true,
		map: {
			"sl:server.js": "debug" //map sl:server namespace of debug to 'debug' level of the pino logger
			//   '*': 'trace' // everything else - trace
		}
	});
}
//create debug.Debugger with given namespace in the above pinoDebug map
const debug = _debug("sl:server.js"); //define sl:server namespace for the debug.Debugger

app.use(expressLogger); //log all express server requests

//setup rate-limiter to stop being bombarded by a large set of requests and subsequently crashing
debug("Setting up rate limit...");
const limiter = new RateLimiter({
	windowMs: 15 * 60 * 1000, //15min
	max: 9000 //limit each IP to 9000 request per windowMs (1 request per second)
});

app.use(limiter); //app.use("/api/", limiter); //could have different number of limiters for different routes

//use helmet for hsts and dnsPrefetchControl
const sixtyDaysInSeconds = 5184000;
app.use(
	helmet.hsts({
		maxAge: sixtyDaysInSeconds
	})
);

app.use(
	helmet.dnsPrefetchControl({
		allow: true
	})
);
//set "X-Frame-Options" to DENY to prevent clickjacking in frames
app.use(
	helmet.frameguard({
		action: "deny"
	})
);

//disable x-powered-by  header so that attcaker does not use it to detect if it is node express server
app.disable("x-powered-by");

// parse application/x-www-form-urlencoded
app.use(
	bodyParser.urlencoded({
		extended: true
	})
);

// parse application/json
app.use(
	bodyParser.json({
		limit: "100mb"
	})
);

app.use(express.static("public")); //serve public folder files as static content

// Configuring the database
const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const db = mongoose.connection;

app.use((req, res, next) => {
	logger.info("use for mongo call back");
	if (db.readyState) {
		logger.info("Mongoose connection is ready");
		next();
	} else {
		logger.info("using mongo.json to connect...");
		require("./config/database.config.js")()
			.then(() => {
				logger.info("finished using mongo.js to connect");
				next();
			})
			.catch((error) => {
				logger.error("server: not able to connect with mongo DB", error);
				next();
			});
	}
});

app.set("port", port);

//apply cors to allow Cross-Origin-Resource-Sharing settings to allow only specific sites and methods
const { corsOptionsDelegate } = require("./config/cors.config.js");
//app.use(cors(corsOptionsDelegate));

// define a simple route
app.get("/", (req, res, next) => {
	// logger.debug('Serving the welcome message.');
	// logger.warn('Serving the welcome message.');
	logger.info("Serving the welcome message.");
	// logger.error('Serving the welcome message.');

	res.status(httpStatusCodes.httpCode200.code).json({
		success: true,
		message: "Welcome to SurveyLLama! An Intelligent Conversational Survey Tool" + httpStatusCodes.httpCode200.message,
		result: null,
		error: null,
		statusCode: httpStatusCodes.httpCode200.code
	});
});

debug("Setting up HTTP server...");
const server = http.createServer(app);

debug("Setting up socket io...");
//initalize socketio
//initialize(server, {}); //setup the socketio with empty options
const io = require("socket.io")(server);
//const io = getSocketIo();

debug("Setting up user session...");
//application side middleware that sets up session
if (io) {
	debug("Setting up user session with socket.io sharing the session...");
	sessionConfig(app, db, io);
	app.set("socketio", io); //put io in a app property so that routes below can use them
} else {
	debug("Setting up user session...");
	sessionConfig(app, db);
}

debug("Setting up CSRF token...");
//routes that do not need CSRF check are here
//create api router, mount api before csrf is appended to the app stack
const apiNonCSRF = require("./app/routes/noncsrf.routes");
app.use("/noncsrf", apiNonCSRF); //mount the noncsrf routes under /noncsrf
debug("Setting up adserver routes which is also non CSRF ...");

//routes that need CSRF check are below
//csurf below uses cookie,so must have cookieParser first here
csrf_cookie_secret = process.env.SESSION_SECRET || "AMlAl12341KLALNNADDFDFDFD@$^23";
app.use(cookieParser(csrf_cookie_secret));

//function used to check CSRF token from incoming request and be checked with the cookie
//const calculateCSRFToken = require('./app/controllers/csrf.controller').calculateCSRFToken;

//csurf as a middleware will inject a csrfToken into all requests
//accessible from req.csrfToken() in back-end
app.use(
	csurf({
		cookie: {
			key: "_csrf", //default to _csrf
			path: "/",
			httpOnly: true,
			secure: PROD,
			sameSite: true,
			signed: true, //the above csrf_cookie_secret will be used to sign the csrf cookie
			maxAge: 3600 // 1-hour
			//domain:
			//other methods like GET, POST, UPDATE, PUT,will all be including this CSRF cookie
		},
		ignoreMethods: ["HEAD", "OPTIONS", "GET"],
		sessionKey: "session" //this is not used if cookie option above is given and not false
		// //here we are not using cookie:false above, so we are using the actual sessionKey.
		// //by default session key is session, i.e. req.session.
		//value: calculateCSRFToken //function that will be invoked by csurf with req to
		// //calculate the CSRFToken from the req
	})
);

debug("Setting up routes...");

// if (io) {
// 	//here we can set all io related stuff (we should be able to put this in a separate file)
// 	//e.g.
// 	UserConnections = require("./app/models/userConnections.model");
// 	io.sockets.on("connection", (socket) => {
// 		socket.on("user-login-report", function (action) {
// 			switch (action.type) {
// 				case "@@users/REPORT_USER_LOGIN_SUCCESS_TO_SERVER":
// 					//UsersActionTypes.REPORT_USER_LOGIN_SUCCESS_TO_SERVER
// 					var userConn = new UserConnections({
// 						userId: action.userId.toString(),
// 						socketId: action.socketId || socket.id
// 					});
// 					userConn.save();
// 			}
// 		});
// 		socket.on("user-logout-report", function (action) {
// 			logger.info("getting user-logout-report with action");
// 			logger.info(action);
// 			switch (action.type) {
// 				case "@@users/REPORT_USER_LOGOUT_SUCCESS_TO_SERVER":
// 					//UsersActionTypes.REPORT_USER_LOGIN_SUCCESS_TO_SERVER
// 					UserConnections.findOne({
// 						userId: action.userId.toString(),
// 						socketId: action.socketId || soket.id
// 					})
// 						.remove()
// 						.exec();
// 			}
// 		});

// 		socket.on("disconnect", () => {
// 			logger.info("getting user-logout-report with action");
// 			const SocketId = socket.id;
// 			UserConnections.findOne({
// 				//remove from UserConnections DB
// 				socketId: SocketId
// 			})
// 				.remove()
// 				.exec();
// 			socket.disconnect();
// 			logger.info("socket client with id " + SocketId + " disconnected");
// 		});

// 		//receiving messagae from client
// 		socket.on("updateLikes", (message) => {
// 			logger.info("The post id is ", message.postId, " and the action is ", message.action);
//      //Do the action here
// 			logger.info("Succesfully updated post's like count ");
//      const dataToBeEmitted = ****
// 			io.sockets.emit("updateLikes", {
//        data:dataToBeEmitted
//
// 			});
// 		});
// 	});

// 	//make io available to req for any future routes beyond this
// 	//inject io into the req using the following socketio middleware
// 	const socketMW = require("./app/socketio/socketio.middleware.js")
// 	app.use(socketMW);

const { attachIOtoAppReq } = require("./app/socketio/socketmiddlewares/socketio.middleware.js");
const socketMW = attachIOtoAppReq(app, io);
app.use(socketMW);

// }

//more routes under csrf are provided here
// require("./app/routes/sms.routes.js")(app);
// require("./app/routes/users.routes.js")(app);
// require("./app/routes/recentSearch.routes.js")(app);
// require("./app/routes/csrf.routes.js")(app);
require("./app/routes/prompttoai.routes.js")(app);
app.use;
debug("Setting up error handler...");

// // CSRF error handler
app.use(function (err, req, res, next) {
	if (err.code !== "EBADCSRFTOKEN") return next(err);
	res.status(httpStatusCodes.httpCode403.code).json({
		success: false,
		message:
			"server: Form may be tampered with." +
			"plese check your network environment!" +
			+httpStatusCodes.httpCode403.message,
		result: null,
		error: null,
		statusCode: httpStatusCodes.httpCode403.code
	});
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	var err = new ErrorClass(
		httpStatusCodes.httpCode404.code,
		false,
		"server: path not found. " + httpStatusCodes.httpCode404.message
	);
	return next(err);
});

const { handleError } = require("./app/helpers/error");

app.use((err, req, res, next) => {
	handleError(err, res); //handle the error at the end
});

// //attach the io server to the http server and return the io server
// io.attach(server);
// //io.adapter(redisAdapter); // and redis

//start the server
server.listen(app.get("port"), function () {
	debug("HTTP is listening on %d", app.get("port"));
	logger.info("HTTP is listening on %d", app.get("port"));
	//logger.warn("HTTP is listening on %d",app.get("port"));
	//logger.error("HTTP is listening on %d", app.get("port"));
	//logger.debug("HTTP is listening on %d", app.get("port"));
});

//const server = https.createServer(
//   lex.httpsOptions,
//   lexMiddleware(app)).listen(app.get("port"), function () {
//   logger.info("HTTPS is listening on %d", +app.get("port"));
// });
//redirect all HTTP to HTTPS
// http.createServer(lexMiddleware(redirectHttps())).listen(app.get("port"), function () {
//   logger.info("HTTP is listening on %d and redirected to HTTPS", +app.get("port"));
// });

// const server = https.createServer(app).listen(app.get("port"), function () {
//   logger.info("HTTPS is listening on %d", +app.get("port"));
// });

//redirect all HTTP requests to HTTPS
// http.createServer(redirectHttps()).listen(insecurePort, function () {
//   logger.info("HTTP is listening on %d and redirected to HTTPS", +insecurePort);
// });

// logger.info("setting up removal of fake users every 12 hours...");
// const millisForTwelveHours = 12 * 3600 * 1000; //12hour interval
// const millisExpireTime = 30 * 24 * 3600 * 1000; //30days
// if (db.readyState) {
//   removeFakeUsersRoutinely(millisForTwelveHours, millisExpireTime);
// } else {
//   require("./config/database.config.js")().then(() => {
//     removeFakeUsersRoutinely(millisForTwelveHours, millisExpireTime);
//     console.log("trying to initialize mongodb");
//     //import old database and add new database data
//     //user: name, email
//     //user: name, email, address, creditcard
//     console.log("finished initializing mongodb");
//   });
// }

function removeFakeUsersRoutinely(interval, expireTime) {
	//check if the email verification is expired with interval
	//note interval must be less than one day
	//and expireTime must be greater than 1 day
	const usersCtrl = require("./app/controllers/users.controller");
	setInterval(() => {
		logger.info("removing fake users...");
		usersCtrl.removeFakeUsers(interval, expireTime);
	}, interval);
}
