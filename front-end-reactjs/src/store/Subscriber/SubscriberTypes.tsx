//Actions here define the type and the action for each Type identified

// This type is basically shorthand for `{ [key: string]: any }`. Feel free to replace `any` with
// the expected return type of your API response.
//export type ApiResponse = Record<string, any>;

export const enum SubscriberActionTypes {
	//crud (create, read, update, delete)

	//create
	CREATE_SUBSCRIBER = "@@subscribers/CREATE_SUBSCRIBER",
	CREATE_SUBSCRIBER_SUCCESS = "@@subscribers/CREATE_SUBSCRIBER_SUCCESS",
	CREATE_SUBSCRIBER_ERROR = "@@subscribers/CREATE_SUBSCRIBER_ERROR",

	//read
	FETCH_SUBSCRIBERS = "@@subscribers/FETCH_SUBSCRIBERS",
	FETCH_SUBSCRIBERS_SUCCESS = "@@subscribers/FETCH_SUBSCRIBERS_SUCCESS",
	FETCH_SUBSCRIBERS_ERROR = "@@subscribers/FETCH_SUBSCRIBERS_ERROR"

	//update - todo

	//delete - todo
}

// Declare state types with `readonly` modifier to get compile time immutability.
// https://github.com/piotrwitek/react-redux-typescript-guide#state-with-type-level-immutability

// These are going to be in the redux state that the PostsReducer will modify
// upon dispatch with the associated data

export interface SubscriberState {
	//here we should use real type rather than any***
	//readonly loading: boolean;
	//readonly data: any[];
	//readonly errors?: string;
	// readonly subscribers: any[];
	readonly email: string;
	readonly name: string;
	readonly preferredLanguage: string;
	readonly subscribers: any[];
	//Eg. EN for English, ZH for Chinese,JP for Japanese
}
