//actions here define the type and the action for each Type identified
import { SubscriberActionTypes } from "./SubscriberTypes";
//actions on CRUD of newsletters
//C //Create
export const createSubscriberSuccess = (subscriber: any) => {
	//plain action (no functions, only data)
	return {
		type: SubscriberActionTypes.CREATE_SUBSCRIBER_SUCCESS,
		payload: { subscriber: subscriber }
	};
};
export const createSubscriberError = (error: any) => {
	return { type: SubscriberActionTypes.CREATE_SUBSCRIBER_ERROR, error };
};

//R //Read
export const fetchSubscribersSucess = (myOptions: string[]) => {
	return {
		type: SubscriberActionTypes.FETCH_SUBSCRIBERS_SUCCESS
		// myOptions: myOptions
	};
};
export const fetchSubscribersError = (error: any) => {
	return { type: SubscriberActionTypes.FETCH_SUBSCRIBERS_ERROR, error };
};

//U //update

//D //delete
