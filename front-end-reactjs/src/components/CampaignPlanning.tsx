import * as React from "react";
import validator from "validator";
import autobind from "autobind-decorator";
import "./CampaignPlanning.scss";
import Axios from "axios";
import { submitSubscriber } from "../store/Subscriber/SubscriberActionsCreatorSaga";
import { connect } from "react-redux";
import { useNavigate, NavigateFunction } from "react-router-dom";
import { ApplicationState, ConnectedReduxProps } from "../store";

interface PropsFromState {}
interface PropsForSelf {
	navigate: any;
}

interface AISettingState {
	role: string;
	goal: string;
}
interface PropsFromDispatch {}

interface ICampaignPlanningState {
	form: AISettingState;
	redirect: boolean;
	errors: any;
	role_chars_left: number;
	goal_chars_left: number;
	max_chars: number;
}

type ICampaignPlanningProps = PropsFromState &
	PropsFromDispatch &
	PropsForSelf &
	// RouteComponentProps<any> &
	// RouteComponentProps<{}>&
	ConnectedReduxProps;

class CampaignPlanningDtl extends React.Component<ICampaignPlanningProps, ICampaignPlanningState> {
	_isMounted = false;
	public timeoutOnUserInactive: NodeJS.Timeout | null;
	constructor(props: any) {
		super(props);
		this.timeoutOnUserInactive = null;
		this.state = {
			form: this.initializeForm(),
			errors: this.initializeError(),
			redirect: false,
			max_chars: 300,
			role_chars_left: 300,
			goal_chars_left: 300
		};
	}
	private initializeForm(): AISettingState {
		return {
			role: "",
			goal: ""
		};
	}

	private initializeError() {
		return {
			role: false,
			goal: false
		};
	}
	async componentDidMount() {
		this._isMounted = true;
	}

	componentWillUnmount() {
		this._isMounted = false;
	}

	// Handle form submission
	private handleSubmit = async (e: any) => {
		const config = {
			headers: {
				// "X-CSRF-Token": "",
			}
		};
		const data = {
			role: this.state.form.role,
			goal: this.state.form.goal
		};

		const API_ENDPOINT = "/api/noncsrf/createCampaign";
		Axios.post(API_ENDPOINT, data, config)
			.then((res) => {
				console.log(res);
				const url = res.data.result.linkToConversation;
				//this.props.history.push(url);
				this.props.navigate(url);
			})
			.catch((err) => {
				console.log(err);
			});
	};

	render() {
		return (
			<>
				<form>
					<div className="segment">
						<h1>Set Up Role</h1>
					</div>

					<label>
						<textarea
							placeholder="What role do you want SurveyLLama AI agent play (e.g. market researcher)?"
							maxLength={this.state.max_chars}
							value={this.state.form.role}
							onChange={(input) => this.formUpdate(input, "role")}
						/>
						{this.state.errors.role ? (
							<span className="inputInvalid">Role description can't be empty!</span>
						) : this.state.role_chars_left < 10 ? (
							<span className="text-red">{this.state.role_chars_left}</span>
						) : (
							<span>{this.state.role_chars_left} characters left</span>
						)}
					</label>
					<div className="segment">
						<h1>Set Up Survey Questions</h1>
					</div>

					<label>
						<textarea
							placeholder="What are the survey questions do you want AI to go over with interviewee?"
							maxLength={300}
							value={this.state.form.goal}
							onChange={(input) => this.formUpdate(input, "goal")}
						/>
						{this.state.errors.goal ? (
							<span className="inputInvalid">Role description can't be empty!</span>
						) : this.state.goal_chars_left < 10 ? (
							<span className="text-red">{this.state.goal_chars_left}</span>
						) : (
							<span>{this.state.goal_chars_left} characters left</span>
						)}
					</label>
					<button
						type="button"
						className={!this.state.redirect ? "unit red" : "unit"}
						onClick={this.handleSubmit}
						disabled={!this.state.redirect}
					>
						Submit
					</button>
				</form>
			</>
		);
	}

	@autobind
	private formUpdate(input: any, property: any) {
		const newObj = {
			...this.state,
			form: { ...this.state.form, [property]: input.target.value },
			errors: {
				...this.state.errors,
				[property]: this.isInvalid(input.target.value, property)
			}
		};
		if (property === "role") {
			const charCount = input.target.value.length;
			const maxChar = this.state.max_chars;
			const charLength = maxChar - charCount;
			newObj.role_chars_left = charLength;
		}
		if (property === "goal") {
			const charCount = input.target.value.length;
			const maxChar = this.state.max_chars;
			const charLength = maxChar - charCount;
			newObj.goal_chars_left = charLength;
		}

		if (input) {
			if (
				newObj.errors["role"] === false &&
				newObj.errors["goal"] === false &&
				newObj.form["role"] !== "" &&
				newObj.form["goal"] !== ""
			) {
				//valid input, activate submit button
				newObj.redirect = true; //used to activate next step button
			} else {
				newObj.redirect = false; //back to false if valid again
			}
		}
		this.setState(newObj);
	}

	private isInvalid = (value: any, property: any): boolean => {
		switch (property) {
			case "goal":
				return value == "";
			case "role":
				return value == "";
			default:
				return false;
		}
	};
}

//--new map store state to props
const mapStateToProps = ({ subscriber }: ApplicationState) => {
	return {
		email: subscriber.email,
		name: subscriber.name,
		preferredLanguage: subscriber.preferredLanguage
	};
};

//map dispatch to props  especially useful for constraining our actions to the connected component.
// You can access these via `this.props`.
const mapDispatchToProps = {
	submitSubscriber: submitSubscriber
};

//connect is used to create a component and get tthe state from the redux store
//and pass the data as props to the component

// Wrapping the main class with this functional component
function CampaignPlanning(props: any) {
	let navigate: NavigateFunction = useNavigate();
	return <CampaignPlanningDtl {...props} navigate={navigate} />;
}

export default connect(mapStateToProps, mapDispatchToProps)(CampaignPlanning);
