//reducer is used to change state based on type of action and previous state
import {
  // combineReducers,
  Reducer,
  //  AnyAction
} from "redux";
import { SubscriberState, SubscriberActionTypes } from "./SubscriberTypes";

//create Type-safe initialState
export const initialState: SubscriberState = {
  name: "",
  email: "",
  preferredLanguage: "EN", //by default english
  subscribers: [],
};

//here we must need redux 4, otherwise Reducer does not take AnyAction as second argument type
//this postsReducer here is a function that takes the state and action to update the state
const subscriberReducer: Reducer<SubscriberState> = (
  state = initialState,
  action: any
) => {
  switch (action.type) {
    //case fetch success
    case SubscriberActionTypes.FETCH_SUBSCRIBERS_SUCCESS:
      return {
        ...state,
        subscribers: action.data, //must pass back myOptions here from Thunk or Saga
      };

    //case fetch failure:
    case SubscriberActionTypes.FETCH_SUBSCRIBERS_ERROR:
      return {
        ...state,
        subscribers: [],
      };

    //case create success:
    case SubscriberActionTypes.CREATE_SUBSCRIBER_SUCCESS:
      //here we should update the state using
      return { ...state, subscriber: action.payload.subscriber };
    //the data from back-end after new subscriber is added to Database

    case SubscriberActionTypes.CREATE_SUBSCRIBER_ERROR:
      //case create failure:
      return state; // no change to the state

    default: //by default, no change to state
      return state;
  }
};

// Instead of using default export, we use named exports. That way we can group these exports
// inside the `index.js` folder.
export default subscriberReducer;
