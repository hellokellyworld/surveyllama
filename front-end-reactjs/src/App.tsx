import "./App.scss";
import ChatWindow from "./components/ChatWindow";
import CampaignPlanning from "./components/CampaignPlanning";
import PageNotFound from "./components/PageNotFound"; //404 handling
import { Provider } from "react-redux";
import { Route, BrowserRouter, Routes } from "react-router-dom";

//---new store combined from multiple stores and multiple reducers ---
import { createBrowserHistory } from "history";
import configureStore from "./configureStore";
import { ApplicationState } from "./store";
// import HomePage from "./HomePage";

function App() {
	const history = createBrowserHistory();
	const initialState = (window as any).initialReduxState as ApplicationState;
	const store = configureStore(history, initialState);

	return (
		<div>
			<Provider store={store}>
				<BrowserRouter>
					<Routes>
						{/* Otherrs say not found */}
						<Route path="*" element={<PageNotFound />} />
						{/* These two are the same */}
						<Route path="/" element={<CampaignPlanning />} />
						<Route path="/index.html" element={<CampaignPlanning />} />
						{/* Poin to Planning and SurveyChat Session subscription */}
						<Route path="/CampaignPlanning" element={<CampaignPlanning />} />
						<Route path="/chatwindow" element={<ChatWindow />} />
					</Routes>
				</BrowserRouter>
			</Provider>
		</div>
	);
}

const showHeader = () => {
	return (
		<>
			{/* <!-- Header --> */}
			<div id="header">
				<div className="container">
					{/* <!-- Logo --> */}
					<h1>
						<a href="#" id="logo">
							Survey LLama
						</a>
					</h1>
					{/* <!-- Nav --> */}
					<nav id="nav">
						<ul>
							<li>
								<a href="/">Home</a>
							</li>
						</ul>
					</nav>
				</div>
			</div>
		</>
	);
};

const showCopyRight = () => {
	return (
		<>
			<div className="copyright">
				<p>
					{" "}
					&copy;
					<script>document.write(new Date().getFullYear())</script> SurveyLLama
				</p>
				<p> Address:TBD</p>
			</div>
		</>
	);
};

//--
export default App;
