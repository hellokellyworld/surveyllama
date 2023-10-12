const session = require("express-session");
const MongoStore = require("connect-mongo")(session);
//import session from "express-session";
//import mongoStoreFactory from "connect-mongo";
const genUuid = require("../app/utils/uuid/genuuid");

const { logger } = require("../app/loggers/logger");
const _debug = require("debug");

const mongoDBStoreCachedFactory = require("connect-mongodb-session-cached");
const MongoDBStoreCached = mongoDBStoreCachedFactory(session);

const session_secret = process.env.SESSION_SECRET || "AALJ(#&(&asdfasALKJJ{!@ALJ)#LKJ";
//on linux such a 20byte secret can be created using "head -c20 /dev/urandom | base64"

//Q: here we set a session with secret, what about cookie?.
//A: cookie should be automatically generated
//by the express-session

function sessionConfig(app, db, io) {
	const debug = _debug("sl:session.config.js:sessionConfig");
	debug("configuring session...");
	//app : an Express ap
	//db  : a mongoose connection e.g. const db = mongoose.connection;
	//here we set a session with secret, what about cookie?.
	//cookie should be automatically generated
	//by the express-session
	//const MongoStore = mongoStoreFactory(session);
	//  secret: string | string[];
	//  name ? : string;
	//  store ? : Store | MemoryStore;
	//  cookie ? : express.CookieOptions;
	//  genid ? (req: express.Request) : string;
	//  rolling ? : boolean;
	//  resave ? : boolean;
	//  proxy ? : boolean;
	//  saveUninitialized ? : boolean;
	//  unset ? : string;
	// const oldStore = new MongoStore({
	// 	mongooseConnection: db,
	// 	ttl: 1 * 60 * 60 //3600 sec for session length
	// });

	mongoDBUri = require("./sessionDatabase.config.js")();
	const newStore = new MongoDBStoreCached({
		// uri: "mongodb://localhost:27017/connect_mongodb_session_test",
		uri: mongoDBUri,
		ttl: 1 * 60 * 60, //3600 sec for session length
		collection: "surveyllama-session"
		//expireCacheAfter: 10
	});

	var sess = {
		genid: function (req) {
			//in what case should I use req here?
			return genUuid(); // use UUIDs for session IDs
		},
		secret: session_secret, //this is used to sign the session cookie to sent to the client
		resave: true, //check with your store if it implements the touch method. If it does, then you
		//can safely set resave: false. If it does not implement the touch method and your
		//store sets an expiration date on stored sessions, then you likely need resave: true.
		saveUninitialized: false,
		store: newStore,
		cookie: {
			//what does this have to do with cookie in the browser???  //this will set up a cookie in the browser
			//expires: 10*60*1000, //10min
			//domain:
			httpOnly: true, // cookie attribute instructs web browsers not to allow scripts (e.g. JavaScript or VBscript) an ability to access the cookies via the DOM document.cookie object.
			//to prevent session ID stealing through XSS attacks.
			maxAge: 5 * 60 * 1000, //5min
			path: "/",
			sameSite: true, //  SameSite allows a server define a cookie attribute making it impossible to the browser send this cookie along with cross - site requests.The main goal is mitigate the risk of cross - origin information leakage,
			// and provides some protection against cross - site request forgery attacks.
			secure: false //by default false, but for production, will be changed to true below
		},
		name: "msid", //instead of having "connection.sid" as cookie name in client browser, give general name "msid" so attacker can't easily
		//guess the session mechanism behind it. By default, express-session uses "connect.sid" as cookie name
		//that means the client can't create another cookie with the same name msid anymore?
		rolling: true
	};

	//use secure cookie only if in production mode (HTTPS required)
	//for development mode, use without secure so that browser send cookies back over HTTP

	logger.info("server mode is", process.env.NODE_ENV === "production" ? "production" : "development");
	if (process.env.NODE_ENV === "production") {
		//NODE_ENV
		app.set("trust proxy", 1); // trust first proxy
		sess.cookie.secure = true; // serve secure cookies and work with HTTPS only
	}

	// app.use(session(sess));
	const sessionMiddleware = session(sess);
	app.use(sessionMiddleware);
	if (typeof io === "object") {
		//socket.io middleware that wrapped the express-session middleware here based on the sess configuration
		io.use(function (socket, next) {
			sessionMiddleware(socket.request, {}, next); //This is how the session req gets updated
			//sessionMiddleware(socket.request, socket.request.res, next); //This is how the session req gets updated
			//and how the cookies got set in the socket as well?
			//https://stackoverflow.com/questions/47171238/socket-request-and-socket-request-res
		});
	}
}

module.exports = sessionConfig;
