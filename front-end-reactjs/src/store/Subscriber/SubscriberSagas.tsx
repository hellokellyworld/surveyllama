import {
	all,
	call,
	fork,
	put,
	//  select,
	takeEvery,
	takeLatest
} from "redux-saga/effects";
import { SubscriberActionTypes } from "./SubscriberTypes";
import axios from "axios";
// import { getRecentSearches } from "./SearchesActionsCreatorSaga";
import {
	fetchSubscribersSucess,
	fetchSubscribersError,
	createSubscriberSuccess,
	createSubscriberError
} from "./SubscriberActionsSaga";

//GENERATOR functions are coded here to deal with async processes such as fetch data, and then it will call the
//fucntions in PostsActionsCreateSaga.tsx to do the actual dispatch to update the store.

//--FETCH_SUBSCRIBERS
function fecthSubscribersApi(value: string) {
	//const API_ENDPOINT =
	//  process.env.REACT_APP_API_ENDPOINT || "https://api.opendota.com";
	//function that returns an axios call
	const API_ENDPOINT = "/api/subscriber/getSubscribers";

	return axios.get(API_ENDPOINT, {
		params: {
			//value should be the email or name to be searched in database
			value
		}
	});
}
/** saga worker that is responsible for the side effects */
function* fecthSubscribersSaga(action: any) {
	//GENERATOR function* that calls the fetchPostApi with the argument provided
	try {
		//data is obtained after axios call is resolved
		//after fetch, if success, data should contain the subscribers returned from back-end

		let { data } = yield call(fecthSubscribersApi, action.payload.input);
		//you may want to store response to localStorage, or not.
		//here is where the dispatch happens,and the data obtained will be used to update the redux-store
		if (data.success === true && data.result.subscribers) {
			let myOptions: any = [];
			const subscribers = data.result.subscribers;
			if (subscribers.length > 0) {
				subscribers.map((subscriber: any) => myOptions.push(subscribers));
			} else {
				myOptions = [];
			}
			yield put(fetchSubscribersSucess(myOptions));
			//invoke the callBack function in action if needed
		} else {
			const error = new Error("error fetching recent searches");
			throw error;
		}
	} catch (error) {
		yield put(fetchSubscribersError(error));
	}
}
// This is our watcher function. We use `take*()` functions to watch Redux for a specific action
// type, and run our saga, for example the `fecthPostsSaga()` saga above.
function* watchFetchSubscribers() {
	yield takeLatest(SubscriberActionTypes.FETCH_SUBSCRIBERS, fecthSubscribersSaga);
}

//---Create Search
function submitSubscriberApi(
	//here should include name, email and preferredLanguage  to submit to back-end
	input: { name: string; email: string; preferredLanguage: string }
	//csrfToken: string
) {
	//const API_ENDPOINT =
	//  process.env.REACT_APP_API_ENDPOINT || "https://api.opendota.com";
	//function that returns an axios call
	const API_ENDPOINT = "/api/subscriber/createSubscriber";
	return axios.post(API_ENDPOINT, input, {
		headers: {
			//"X-CSRF-Token": csrfToken
		}
	});
}

/** saga worker that is responsible for the side effects */
function* submitSubscriberSaga(action: any): any {
	//GENERATOR function* that calls the fetchPostApi with the argument provided
	try {
		//let csrfTokenNew = yield call(fetchCSRFToken);
		//if (csrfTokenNew !== null && csrfTokenNew !== "" && csrfTokenNew !== undefined) {
		//			yield put(fetchCSRFSuccess(csrfTokenNew));
		//		} else {
		//			yield put(fetchCSRFError(new Error("Error fetching CSRF token")));
		//		}
		//		const csrfToken: string = yield select(getCSRFFromStore);

		//data is obtained after axios callis resolved
		let { data } = yield call(
			submitSubscriberApi, //This is the API that goes to the back-end and
			//
			action.payload.input
			//csrfToken
		);
		//You may want to store data to localStorage, or not.
		//Here is where the dispatch happens,and the posts data obtained
		//ill be used to update the redux-store
		if (data.success === true && data.result) {
			yield put(createSubscriberSuccess(data.result.subscriber)); //call action in reducer to update state
			yield call(action.meta.callbackAction); //and then call the meta function if needed
		} else {
			throw new Error("Error creating subscriber");
		}
	} catch (error) {
		yield put(createSubscriberError(error));
		//call the action to handle the error in state
		//some times no thing is done at all
	}
}
// This is our watcher function. We use `take*()` functions to watch Redux for a specific action
// type, and run our saga, for example the `submitPostInfoSaga()` saga above.
function* watchSubmitSubscriber() {
	yield takeEvery(SubscriberActionTypes.CREATE_SUBSCRIBER, submitSubscriberSaga);
}

//put all above sagas for posts together into postsSaga and export it
// We can also use `fork()` here to split our saga into multiple watchers.
function* subscribersSaga() {
	yield all([
		fork(watchFetchSubscribers),
		fork(watchSubmitSubscriber)
		//,Add other watchers here to the list for handling posts related actions
	]);
}
export default subscribersSaga;
