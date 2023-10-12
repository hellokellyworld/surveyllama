import { Store, createStore, applyMiddleware, compose } from "redux";
import createSagaMiddleware from "redux-saga";
// `react-router-redux` is deprecated, so we use `connected-react-router`.
// This provides a Redux middleware which connects to our `react-router` instance.
import { routerMiddleware } from "connected-react-router";
// We'll be using Redux Devtools. We can use the `composeWithDevTools()`
// directive so we can pass our middleware along with it
// import { composeWithDevTools } from "redux-devtools-extension";
// If you use react-router, don't forget to pass in your history type.
import { History } from "history";

// Import the state interface and our combined reducers/sagas.
import { ApplicationState, createRootReducer, rootSaga } from "./store";

// import * as socketIO from "socket.io-client";
// import socketIoMiddleware from "./store/socket.io/redux-socket.io-middleware";

declare global {
	interface Window {
		__REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: typeof compose;
		devToolsExtension: any;
		__REDUX_DEVTOOLS_EXTENSION__: any;
	}
}

// const SL_BACKEND_URI = process.env.SL_BACKEND_URI || "http://localhost:3001";
// const socketEndpoint = SL_BACKEND_URI; //.replace(/^http/, "ws"); //THIS WORKS
// const io = socketIO.connect(socketEndpoint);

export default function configureStore(history: History, initialState: ApplicationState): Store<ApplicationState> {
	// create the composing function for our middlewares

	// create the redux-saga middleware
	const sagaMiddleware = createSagaMiddleware();
	// create the middleware for router
	const routerMw = routerMiddleware(history);
	//create a socket channel named user-login-report, with socketId
	//passed automatically (true)
	// const socketMW = socketIoMiddleware(io, "user-login-report", true);
	const middlewares = [routerMw, sagaMiddleware]; //, socketMW];
	const enhancers = compose(
		applyMiddleware(...middlewares), // your own middleware
		window.devToolsExtension ? window.__REDUX_DEVTOOLS_EXTENSION__() : (f: any) => f
	); // devtools a middleware as well

	// We'll create our store with the combined reducers/sagas, and the initial Redux state that
	// we'll be passing from our entry point.
	const store = createStore(
		createRootReducer(history), //reducer
		initialState, //preloadedState
		// composeEnhancers(
		// 	applyMiddleware(...middlewares) //enhancer
		// )
		enhancers
	);
	// Don't forget to run the root saga, and return the store object.
	sagaMiddleware.run(rootSaga);

	return store;
}
