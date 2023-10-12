//A general error handler for express to handle both error message and statusCode
//https://dev.to/nedsoft/central-error-handling-in-express-3aej
//
// Example use:
// ========../../server.js===========
// const express = require('express')
// const { handleError, ErrorClass } = require('./helpers/error')
// const app = express()

// app.use(express.json())
// const PORT = process.env.PORT || 3000
// app.get('/', (req, res) => {
//   return res.status(200).json('Hello world');
// })
//
// app.get('/error', (req, res) => {    //error thrown will be passed to the error handler below
//   throw new ErrorClass(500, 'Internal server error');  //generate an error with both stauts code and message
// })
//
// app.use((err, req, res, next) => {
//   handleError(err, res);             //handle the error at the end
// });
// app.listen(PORT, () => console.log(`server listening at port ${PORT}`))
//=============================

class ErrorClass extends Error {
	constructor(statusCode, successTrueFalse, message) {
		super();
		this.statusCode = statusCode;
		this.message = message;
		this.success = successTrueFalse == true;
	}
}

const handleError = (error, res) => {
	const { statusCode, message, success } = error;
	res.status(statusCode).json({
		success,
		message,
		result: null,
		error: error,
		statusCode
	});
};

const wrapAsync = function (fn) {
	//wrapper to async fn(req,res,next)
	return function (req, res, next) {
		// Make sure to `.catch()` any errors and pass them along to the `next()`
		// middleware in the chain, in this case the error handler.
		fn(req, res, next).catch(next);
	};
};

module.exports = {
	ErrorClass,
	handleError,
	wrapAsync
};
