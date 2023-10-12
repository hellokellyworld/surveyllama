const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const { createProxyMiddleware } = require("http-proxy-middleware");
const httpApp = express();
const port = process.env.PORT || 8080;
const env = process.env.NODE_ENV || "development";
httpApp.use(express.static(path.join(__dirname, "./build")));
const backendUri = process.env.BACKEND_URI || "http://localhost:3001";
const proxyOptions = {
	target: backendUri,
	changeOrigin: true,
	pathRewrite: {
		"^/api": ""
	},
	secure: false
};
if (process.env.NODE_ENV === "production") {
	//NODE_ENV
	httpApp.set("trust proxy", 1); // trust first
	proxyOptions.secure = false;
}

httpApp.use("/api", createProxyMiddleware(proxyOptions));

//send the user to index html page inspite of the url
httpApp.get("*", (req, res) => {
	res.sendFile(path.resolve(__dirname, "./build/index.html"));
});

//This is now moved into App.tsx
// httpApp.use((req, res) => {
// 	// res.status(404).json({ result: "page not found" });
// 	res.status(404).send("<h1>Page not found on the server</h1>");
// });

//****note body parser and cookie parser must be after proxy setup above****
httpApp.use(bodyParser.json());
httpApp.use(
	bodyParser.urlencoded({
		extended: true
	})
);

if (env === "development") {
	console.log("running SurveyLLama in development mode");
	httpApp.listen(port); //listen directly to 8080 without the above greenlock-express
} else {
	console.log("running SurveyLLama in production mode");
	//create https SSL certification wrapper to the aloggerpp
	const lex = require("greenlock-express")
		.init({
			packageRoot: "./", //__dirname
			configDir: "./greenlock.d",
			// contact for security and critical bug notices
			maintainerEmail: "SurveyLLama@gmail.com",
			// whether or not to run at cloudscale
			cluster: false
		})
		.serve(httpApp);
}
