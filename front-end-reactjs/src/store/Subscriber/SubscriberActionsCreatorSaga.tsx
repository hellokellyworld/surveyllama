import { SubscriberActionTypes } from "./SubscriberTypes";

//below are functions that take an input and then return a plain action method
export function submitSubscriber(input: any, callback: any) {
	return {
		//return an action
		type: SubscriberActionTypes.CREATE_SUBSCRIBER,
		payload: { input: input }, //input is data to submit (email, name, preferredLanguage)
		meta: { callbackAction: callback }
		//meta: extra function you want to do after the state is changed
	};
}

export function getSubscribers(input: string) {
	return {
		type: SubscriberActionTypes.FETCH_SUBSCRIBERS,
		payload: { input: input }
	};
}
