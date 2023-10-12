// import logo from './logo.svg';
import "./HomePage.scss";

function HomePage() {
	return (
		<div>
			{showBanner()}
			{showMain()}
		</div>
	);
}

const showBanner = () => {
	return (
		// <div id="header">
		<div className="container">
			<div id="banner">
				<div className="container">
					<section>
						<header className="major">
							<h3>Converce, Do not conform</h3>
							<span className="byline">&hellip; Introduction of Survey LLama Goes Here. </span>
						</header>
					</section>
				</div>
			</div>
		</div>
		// </div>
	);
};

const showMain = () => {
	return (
		<div id="main" className="wrapper style1">
			<section className="container">
				<header className="major">
					<h2>How We Do It </h2>
					<span className="byline">We make it just FOUR you!</span>
				</header>
				<div className="row">
					<div className="6u">
						<section>
							<ul className="style">
								<li>
									<span className="fa fa-wrench"></span>
									<h3>One</h3>
									<span>Part One of How We Do it</span>
								</li>
								<li>
									<span className="fa fa-cloud"></span>
									<h3>Two</h3>
									<span>Part Two of How We Do it. </span>
								</li>
							</ul>
						</section>
					</div>
					<div className="6u">
						<section>
							<ul className="style">
								<li>
									<span className="fa fa-cogs"></span>
									<h3>Three</h3>
									<span>Part Three of How We Do it. </span>
								</li>
								<li>
									<span className="fa fa-leaf"></span>
									<h3>Four</h3>
									<span>Part Four of How We Do it. </span>
								</li>
							</ul>
						</section>
					</div>
				</div>
			</section>
		</div>
	);
};

//--
export default HomePage;
