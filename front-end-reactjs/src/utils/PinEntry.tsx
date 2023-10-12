import * as React from "react";
import Axios from "axios";
import "./PinEntry.scss";

interface IPinEntryProps {
	referrerUrl?: string;
	nextUrl?: string;
	onPinReady?: (pin: string) => void;
	pinSentMessage?: string;
	isPinReady?: boolean;
	pinReadyMessage?: string;
	sendPinFunc?: () => void;
}

type IProps = IPinEntryProps;
interface IPinForm {
	pin: string;
}

interface IPinEntryState {
	pinVerificationStatusMessage: string;
	showStatusMessage: boolean; //flag to show or not show statusMessage
	showStatusMessageColor: string; //"red","green","yellow" for error, okay, or warning
	PinEntryRetrieveSuccess: boolean;
	PinEntryContent: string;
	referrerUrl: string;
	nextUrl: string;
	form: IPinForm;
	pinIsCorrect: boolean;
}

type IState = IPinEntryState;

export default class PinEntry extends React.Component<IProps, IState> {
	_isMounted = false;
	public timeoutRestoreOldMessageinEditSMS: NodeJS.Timeout | null;

	constructor(props: IProps) {
		super(props);
		//initialize state
		this.timeoutRestoreOldMessageinEditSMS = null;
		this.state = {
			pinVerificationStatusMessage: "",
			showStatusMessage: false,
			showStatusMessageColor: "green",
			PinEntryRetrieveSuccess: false,
			PinEntryContent: "",
			referrerUrl: "",
			nextUrl: "",
			form: this.initializeForm(),
			pinIsCorrect: false
		};
	}
	private initializeForm(): IPinForm {
		return {
			pin: ""
		};
	}

	async componentDidMount() {
		this._isMounted = true;
		// if (this.props.history.location.state) {
		// 	const referrerURLByState = (this.props.history.location as any).state.history
		// 		? (this.props.history.location as any).state.history
		// 		: null;
		// 	const nextURLByState = (this.props.history.location as any).state.nextUrl
		// 		? (this.props.history.location as any).state.nextUrl
		// 		: null;
		// 	const referrerURLByHistory = (this.props.history.location as any).state.history
		// 		? (this.props.history.location as any).state.history
		// 		: null;
		// 	this.setState({
		// 		referrerUrl: referrerURLByState ? referrerURLByState : referrerURLByHistory,
		// 		nextUrl: nextURLByState
		// 	});
		// }
	}

	componentWillUnmount() {
		this.timeoutRestoreOldMessageinEditSMS && clearTimeout(this.timeoutRestoreOldMessageinEditSMS);
		this._isMounted = false;
	}
	render(): JSX.Element {
		const isPinReady = this.props.isPinReady ? this.props.isPinReady : null;
		const pinReadyMessage = this.props.pinReadyMessage ? this.props.pinReadyMessage : null;
		return isPinReady ? (
			<div style={{ fontSize: 16, textAlign: "center", color: "green" }}>{pinReadyMessage}</div>
		) : (
			<div className="pin-entry-div">
				<div className="share-status-message">{this.buildShareStausMessage()}</div>
				<div className="pin-entry-message">
					<p>{this.props.pinSentMessage ? this.props.pinSentMessage : "Please entere your pin"}</p>
				</div>
				<div className="pin-entry-content">
					<input
						className="pin-input"
						type="text"
						onChange={(input) => {
							input.preventDefault();
							let property = "pin";
							const newObj = {
								...this.state,
								form: { ...this.state.form, [property]: input.target.value }
							};
							if (this._isMounted) {
								this.setState(newObj);
							}
						}}
					/>
					<button
						className="pin-submit"
						onClick={() => {
							if (this.state.form.pin !== "") {
								this.verifyPin();
							} else {
								alert("please enter pin first");
							}
						}}
					>
						Submit Pin
					</button>
					{!isPinReady && (
						<button
							className="pin-request"
							onClick={() => {
								if (this.props.sendPinFunc && typeof this.props.sendPinFunc == "function") {
									this.props.sendPinFunc();
								}
							}}
						>
							Request Pin
						</button>
					)}
				</div>
			</div>
		);
	}

	verifyPin = () => {
		const backend_uri = "/api/verifyPin";
		const data = { pin: this.state.form.pin };
		const config = {};
		Axios.post(backend_uri, data, config)
			.then((res) => {
				if (res.data.success == true) {
					this.callbackOnSuccess();
				} else {
					throw "Pin did not work";
				}
			})
			.catch((err) => {
				this.callbackOnFailure();
			});
	};

	callbackOnFailure = () => {
		//display error in red
		const oldMessageText = this.state.pinVerificationStatusMessage;
		const oldMessageColor = this.state.showStatusMessageColor;
		const messageText = "Pin entered is wrong. Please try again.";
		if (this.state.showStatusMessage === false && this._isMounted) {
			this.setState({
				showStatusMessage: true,
				pinVerificationStatusMessage: messageText,
				showStatusMessageColor: "red",
				pinIsCorrect: false
			});
			this.timeoutRestoreOldMessageinEditSMS = setTimeout(
				//restore to old message after 3 seconds
				() => {
					if (this._isMounted) {
						this.setState({
							showStatusMessage: false,
							pinVerificationStatusMessage: oldMessageText,
							showStatusMessageColor: oldMessageColor
						});
					}
				},
				3000
			);
		}
	};

	callbackOnSuccess = () => {
		const messageText = "pin verification successful!";
		if (this.state.showStatusMessage === false && this._isMounted) {
			this.setState({
				showStatusMessage: true,
				pinVerificationStatusMessage: messageText,
				showStatusMessageColor: "green",
				pinIsCorrect: true
			});

			if (this.props.onPinReady && this.state.form && this.state.form.pin) {
				this.props.onPinReady(this.state.form.pin);
			}

			if (this.props.referrerUrl || this.props.nextUrl || this.state.referrerUrl || this.state.nextUrl) {
				this.timeoutRestoreOldMessageinEditSMS = setTimeout(
					//redirect after 3 seconds
					() => {
						// this.props.history.push(
						window.location.href = this.props.nextUrl
							? this.props.nextUrl
							: this.props.referrerUrl //go back to referrerUrl if no nextURL set
							? this.props.referrerUrl
							: this.state.referrerUrl;
					},
					3000
				);
			}
		}
	};

	buildShareStausMessage = () => {
		if (this.state.showStatusMessage) {
			switch (this.state.showStatusMessageColor) {
				case "red":
					return <span className="status-text-span status-text-red">{this.state.pinVerificationStatusMessage}</span>;
				case "yellow":
					return <span className="status-text-span status-text-yellow">{this.state.pinVerificationStatusMessage}</span>;
				case "green":
					return <span className="status-text-span status-text-green">{this.state.pinVerificationStatusMessage}</span>;
				default:
					return <span className="status-text-span status-text-green">{this.state.pinVerificationStatusMessage}</span>;
			}
		} else {
			return <></>;
		}
	};
}
