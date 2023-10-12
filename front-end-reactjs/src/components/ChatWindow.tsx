import * as React from "react";
import validator from "validator";
import autobind from "autobind-decorator";
import "./ChatWindow.scss";
import Axios from "axios";
import { submitSubscriber } from "../store/Subscriber/SubscriberActionsCreatorSaga";
import { connect } from "react-redux";
import { ChatbotLogo, UserLogo } from "./ReactLogo";
import { RouteComponentProps } from "react-router";
// import { Image } from "react-bootstrap";
import ReactMarkdown from "react-markdown";

import { useNavigate, NavigateFunction } from "react-router-dom";
import { ApplicationState, ConnectedReduxProps } from "../store";
import UseEffect from "../utils/UseEffect";

// props from redux store state (we will use the redux store state as if it was
// a props of this class component)
interface PropsFromState {
	//here is what we use from redux-store//state//SubscribeState
	email: string;
	name: string;
	preferredLanguage: string;
	// subscribers: any[];
}

type Message = {
	type: "apiMessage" | "userMessage" | "none";
	message: string;
	isStreaming?: boolean;
};

//-- new own props
interface PropsForSelf {
	navigate: NavigateFunction;
}

interface messageState {
	messages: Message[];
	pending?: string;
	history: [string, string][];
}
interface PropsFromDispatch {
	//allow uss to use functions from redux-actions as if they were
	//props of this class component
	submitSubscriber: typeof submitSubscriber;
}

interface IChatWindowState {
	name: string;
	email: string;
	emailError: boolean;
	emailAlreadyExists: boolean;
	nameError: boolean;
	preferredLanguage: string;
	preferredLanguageError: boolean;

	userInput: string;
	loading: boolean;
	messageState: messageState;
	AISettingToken: string | null;
	userSessionTimeout: boolean;
	timeBeforeTimeoutOnUserInactive: number;
	offTopicCount: number;
	surveyCreated: Boolean;
	surveyId: string;
}

//--new combined props from state, own props, dispatch props -
//--as well as any props we want to pass - in a union type.
type IChatWindowProps = PropsFromState &
	PropsFromDispatch &
	PropsForSelf &
	RouteComponentProps<any> &
	// RouteComponentProps<{}>&
	ConnectedReduxProps; //ConnectedReduxProps here is simply dispatch

// =======================
class ChatWindowDtl extends React.Component<
	IChatWindowProps, //no props
	IChatWindowState
> {
	_isMounted = false;
	public timeoutOnUserInactive: NodeJS.Timeout | null;
	constructor(props: any) {
		super(props);
		this.timeoutOnUserInactive = null;
		//initialize the state
		this.state = {
			name: "",
			email: "",
			// message: '',
			emailError: false,
			nameError: false,
			preferredLanguage: "",
			preferredLanguageError: false,
			//  messageError: false,
			emailAlreadyExists: false,

			userInput: "",
			loading: false,
			messageState: {
				messages: [
					// {
					//   message: "Hi Customer. How are you?",
					//   type: "apiMessage",
					// },
				],
				history: []
			},
			AISettingToken: "",
			userSessionTimeout: false,
			timeBeforeTimeoutOnUserInactive: 1000 * 60 * 5, //1 second = 1000 milliseconds. 5 minutes = 1000 * 60 * 5
			offTopicCount: 0,
			surveyCreated: false,
			surveyId: ""
		};
	}
	async componentDidMount() {
		this._isMounted = true;
		//const promise = new Promise((resolve, reject) => {
		const params = new URLSearchParams(window.location.search);
		const token = params.get("token");
		this.setState({
			AISettingToken: token
		});
		const config = {
			headers: {
				// "X-CSRF-Token": "",
			}
		};

		const data = {
			AISettingToken: token
		};
		//initialize a survey and submit the request to backend to create the survey in MongoDB
		//after it's created, return the id of the survey, and saved in the id in the state of this class
		const CREATE_SURVEY_API_ENDPOINT = "/api/noncsrf/createSurveySession";
		Axios.post(CREATE_SURVEY_API_ENDPOINT, data, config)
			.then((res) => {
				const surveyId = res.data.result.id;
				this.setState({
					surveyCreated: true,
					surveyId: surveyId
				});

				const GET_GREETING_API_ENDPOINT = "/api/getGreetingFromTaskToken" + "?token=" + token;

				Axios.get(GET_GREETING_API_ENDPOINT, config)
					.then((res) => {
						const data = JSON.parse(res.data.result.output);
						this.setState({
							messageState: {
								...this.state.messageState,
								messages: [
									...this.state.messageState.messages,
									{
										type: "apiMessage",
										message: data.data
									}
								],
								history: [...this.state.messageState.history, ["", data.data]]
							}
						});

						//start to count down once the conversation begins
						this.timeoutOnUserInactive = setTimeout(() => {
							this.setState({
								userSessionTimeout: true
							});
						}, this.state.timeBeforeTimeoutOnUserInactive);
					})
					.catch((err) => {
						console.log(err);
					});
			})
			.catch((err) => {
				console.log(err);
			});
	}

	componentWillUnmount() {
		this.timeoutOnUserInactive && clearTimeout(this.timeoutOnUserInactive);
		this._isMounted = false;
	}

	// Handle form submission
	private handleSubmit = async (e: any) => {
		e.preventDefault();
		let question = this.state.userInput.trim();
		this.setState({
			messageState: {
				...this.state.messageState,
				history: [...this.state.messageState.history],
				messages: [
					...this.state.messageState.messages,
					{
						type: "userMessage",
						message: question
					}
				],
				pending: ""
			},
			loading: true,
			userInput: ""
		});
		const data = {
			question: question,
			history: this.state.messageState.history,
			AISettingToken: this.state.AISettingToken,
			offTopicCount: this.state.offTopicCount,
			surveyId: this.state.surveyId
		};

		const config = {
			headers: {
				// "X-CSRF-Token": "",
			}
		};

		//Tom Long: for now test using the noncsrf routes. /api/noncsrf/**/**
		//otherwise for /api/***/*** type of routes, we need to get csrfToken first from
		//the backend to be able to send the post request to prevent
		//the site being hijacked by others on form entrys
		//usualy the csrfToken must be provided in the config headers above
		//for normal submission of form data using post method

		const API_ENDPOINT = "/api/noncsrf/tta"; //see backend noncsrf.routes.js
		Axios.post(API_ENDPOINT, data, config)
			.then((res) => {
				const data = JSON.parse(res.data.result.output);
				this.setState({
					messageState: {
						...this.state.messageState,
						pending: (this.state.messageState.pending ?? "") + data.data
					}
				});
				this.setState({
					messageState: {
						...this.state.messageState,
						pending: undefined,
						history: [...this.state.messageState.history, [question, this.state.messageState.pending ?? ""]],
						messages: [
							...this.state.messageState.messages,
							{
								type: "apiMessage",
								message: this.state.messageState.pending ?? ""
							}
						]
					},
					loading: false,
					offTopicCount: data.offTopicCount
				});
			})
			.catch((err) => {
				console.log(err);
			});
	};

	// Prevent blank submissions and allow for multiline input
	private handleEnter = (e: any) => {
		if (e.key === "Enter" && this.state.userInput) {
			if (!e.shiftKey && this.state.userInput) {
				this.handleSubmit(e);
			}
		} else if (e.key === "Enter") {
			e.preventDefault();
		}
	};

	@autobind
	private addTextAreaActivityListner() {
		window.addEventListener("keydown", this.handleEnter);
	}
	@autobind
	private removeTextAreaActivityListner() {
		window.removeEventListener("keydown", this.handleEnter);
	}
	render() {
		return (
			<>
				<main className="main">
					{this.state.surveyCreated && (
						<div className="container">
							<div className="cloud">
								<div className="messagelist">
									{this.state.messageState.messages.map((message1, index) => {
										let icon;
										let className;
										if (message1.type === "apiMessage") {
											icon = <ChatbotLogo width="30" height="30" className="boticon" />;
											className = "apimessage";
										} else {
											icon = <UserLogo width="30" height="30" className="usericon" />;

											// The latest message sent by the user will be animated while waiting for a response
											className =
												this.state.loading && index === this.state.messageState.messages.length - 1
													? "usermessagewaiting"
													: "usermessage";
										}
										return (
											<div key={index} className={className}>
												{icon}
												<div className="markdownanswer">
													<ReactMarkdown linkTarget="_blank">{message1.message}</ReactMarkdown>
												</div>
											</div>
										);
									})}
								</div>
							</div>
							<div className="center">
								<div className="cloudform">
									<form onSubmit={this.handleSubmit}>
										<UseEffect
											onLoad={this.addTextAreaActivityListner}
											onUnmount={this.removeTextAreaActivityListner}
										></UseEffect>
										<textarea
											disabled={this.state.loading || this.state.userSessionTimeout}
											onKeyDown={this.handleEnter}
											// ref={textAreaRef}
											autoFocus={false}
											rows={1}
											maxLength={512}
											id="userInput"
											name="userInput"
											placeholder={this.state.loading ? "Waiting for response..." : "Type your question..."}
											value={this.state.userInput}
											onChange={(e) => {
												//user typing in the input box
												const updatedTimeBeforeSessionTimeout =
													this.state.timeBeforeTimeoutOnUserInactive + 1000 * 60 * 5; // extended for another 5 minutes
												this.setState({
													timeBeforeTimeoutOnUserInactive: updatedTimeBeforeSessionTimeout,
													userInput: e.target.value
												});
											}}
											className="textarea"
										/>
										<button
											type="submit"
											//  disabled={this.state.loading}
											className="generatebutton"
										>
											{this.state.loading ? (
												<div className="loadingwheel">{/* <CircularProgress color="inherit" size={20} /> */}</div>
											) : (
												// Send icon SVG in input field
												<svg viewBox="0 0 20 20" className="svgicon" xmlns="http://www.w3.org/2000/svg">
													<path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
												</svg>
											)}
										</button>
									</form>
								</div>
							</div>
						</div>
					)}
				</main>
			</>
		);
	}

	@autobind
	private onNameChange(event: any) {
		event.preventDefault();
		if (!event.target.value.trim().length) {
			//String(event.target.value).length < 1
			this.setState({ nameError: true });
		} else {
			// console.log(event.target.value);
			this.setState({ nameError: false });
			this.setState({ name: event.target.value });
		}
	}

	@autobind
	private onEmailChange(event: any) {
		event.preventDefault();
		this.setState({ emailAlreadyExists: false });
		if (!validator.isEmail(String(event.target.value).toLowerCase())) {
			this.setState({ emailError: true });
		} else {
			this.setState({ emailError: false });
			this.setState({ email: event.target.value });
		}
	}

	// @autobind
	// private handleSubmit(event: any) {
	// 	event.preventDefault();
	// 	if (this.state.email === "") {
	// 		return;
	// 	} else {
	// 		if (!validator.isEmail(String(this.state.email).toLowerCase())) {
	// 			alert("Invalid email address!");
	// 		}
	// 	}

	// 	if (this.state.name === "") {
	// 		// return;
	// 	}

	// 	if (this.state.preferredLanguage === "") {
	// 		this.setState({ preferredLanguageError: true });
	// 		return;
	// 	}

	// 	const backend_uri = "/api/subscriber/createSubscriber";
	// 	const data = {
	// 		name: this.state.name,
	// 		email: this.state.email
	// 	};

	// 	const config = {
	// 		headers: {
	// 			//'Access-Control-Allow-Origin': '*',
	// 			// 'Content-Type': 'application/json',
	// 		}
	// 	};

	// 	Axios.post(backend_uri, data, config)
	// 		.then(function (response) {
	// 			alert(
	// 				"Your subcription has been received. You will receive an email for confirmation. Please check your email. You will be redirected to Homepage sortly."
	// 			);
	// 			setTimeout(() => {
	// 				// window.location.href = "/index.html";
	// 				window.location.href = "/";
	// 			}, 3000);
	// 		})
	// 		.catch(function (error) {
	// 			// console.log(error);
	// 			alert("Failure porcessing your subscription. Please try again.");
	// 		});
	// }

	///todo(): handleVerifyEmail function
	@autobind
	private handleVerifyEmail(event: any) {
		event.preventDefault();
		if (this.state.email === "") {
			return;
		} else {
			if (!validator.isEmail(String(this.state.email).toLowerCase())) {
				alert("Invalid email address!");
			}
		}

		const backend_uri = "/api/subscriber/verifySubscriberByEmail";
		const data = {
			email: this.state.email
		};

		const config = {
			headers: {
				//'Access-Control-Allow-Origin': '*',
				// 'Content-Type': 'application/json',
			}
		};

		Axios.post(backend_uri, data, config)
			.then((response: any) => {
				if (response.data.success === true) {
					this.setState({ emailAlreadyExists: true });
					return true;
				} else {
					this.setState({ emailAlreadyExists: false });
					return false;
				}
			})
			.catch(function (error) {
				// console.log(error);
				return null;
			});
	}

	@autobind
	private handleOnClick() {
		this.setState({ emailAlreadyExists: false });
	}

	@autobind
	private async handleSubmitByRedux(event: any) {
		event.preventDefault();
		if (this.state.email === "") {
			return;
		} else {
			if (!validator.isEmail(String(this.state.email).toLowerCase())) {
				alert("Invalid email address!");
			}
		}

		if (this.state.name === "") {
			// return;
		}

		//check one more time before submitting
		//const emailAlreadyExists =await this.handleVerifyEmail(event);

		//console.log("emailAlreadyExists:",emailAlreadyExists);

		//if (emailAlreadyExists||false){
		//	return;
		//}

		if (this.state.preferredLanguage === "") {
			this.setState({ preferredLanguageError: true });
			return;
		}

		if (this.state.emailAlreadyExists) {
			return;
		}

		const input: any = {
			name: this.state.name,
			email: this.state.email,
			preferredLanguage: this.state.preferredLanguage
		};

		this.props.submitSubscriber(input, this.showSuccessAfterSubmit);
		//call redux-saga to update store state

		// const backend_uri = "/api/subscriber/createSubscriber";
		// const data = {
		// 	name: this.state.name,
		// 	email: this.state.email
		// };

		// const config = {
		// 	headers: {
		// 		//'Access-Control-Allow-Origin': '*',
		// 		// 'Content-Type': 'application/json',
		// 	}
		// };

		// Axios.post(backend_uri, data, config)
		// 	.then(function (response) {
		// 		alert(
		// 			"Your subcription has been received. You will receive an email for confirmation. Please check your email. You will be redirected to Homepage sortly."
		// 		);
		// 		setTimeout(() => {
		// 			window.location.href = "/index.html";
		// 		}, 3000);
		// 	})
		// 	.catch(function (error) {
		// 		// console.log(error);
		// 		alert("Failure porcessing your subscription. Please try again.");
		// 	});
	}

	showSuccessAfterSubmit = () => {
		alert(
			"good news, your email has been subscribed, pls check your email to confirm. You will be redirected to Homepage sortly."
		);
		setTimeout(() => {
			// window.location.href = "/index.html";
			window.location.href = "/";
		}, 3000);
		//here we should update the state using
	};
}

//map props to state, such that if store.state.posts changes. the partialPosts as a prop
//here will also change, once it is changed, the view will be re-rendered

//--new map store state to props
const mapStateToProps = ({ subscriber }: ApplicationState) => {
	return {
		//here ApplicationState.post is taken and mapped to partialPosts
		email: subscriber.email,
		name: subscriber.name,
		preferredLanguage: subscriber.preferredLanguage
		// subscribers:subscriber.subscribers
	};
};

// const mapDispatchToProps = (dispatch: Dispatch) => {
//   return {
//     //return an object that makes the getsearchPosts etc props as actions to the store
//     getSearchPosts: (input: string) => {
//       dispatch(getSearchPosts(input)); //dispatches the getSearchPosts defined in ActionCreator.tsx
//     },
//   };
// };

//map dispatch to props  especially useful for constraining our actions to the connected component.
// You can access these via `this.props`.
const mapDispatchToProps = {
	submitSubscriber: submitSubscriber
};

//connect is used to create a component and get tthe state from the redux store
//and pass the data as props to the component

// Wrapping the main class with this functional component
function ChatWindow(props: any) {
	let navigate: NavigateFunction = useNavigate();
	return <ChatWindowDtl {...props} navigate={navigate} />;
}

// export default withRouter(connect(mapStateToProps, mapDispatchToProps)(ChatWindow) as any);

export default connect(mapStateToProps, mapDispatchToProps)(ChatWindow);
