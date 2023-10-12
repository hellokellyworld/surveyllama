import * as React from "react";
import "./PageNotFound.scss";
interface PropsForSelf {}
interface IState {}
type IProps = PropsForSelf;
class PageNotFound extends React.Component<IProps, IState> {
	constructor(props: any) {
		super(props);
		//initialize the state
		this.state = {};
	}
	componentDidMount() {}
	render() {
		return (
			<div className="page-not-found-page">
				<div className="page-not-found-container">404: Page not found.</div>
			</div>
		);
	}
}

export default PageNotFound;
