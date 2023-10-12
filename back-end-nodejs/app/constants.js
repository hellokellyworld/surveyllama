module.exports = {
	userTypes: ["dealer", "other"],

	httpStatusCodes: {
		//1xx Informational
		httpCode100: {
			code: 100,
			message: "Continue"
		},
		httpCode101: {
			code: 101,
			message: "Switching Protocols"
		},
		httpCode102: {
			code: 102,
			message: "Processing"
		},

		//2xx Success
		httpCode200: {
			code: 200,
			message: "OK"
		},
		httpCode201: {
			code: 201,
			message: "Created"
		},
		httpCode202: {
			code: 202,
			message: "Accepted"
		},
		httpCode203: {
			code: 203,
			message: "Non-Authoritative Info"
		},
		httpCode204: {
			code: 204,
			message: "No Content"
		},
		httpCode205: {
			code: 205,
			message: "Reset Content"
		},
		httpCode206: {
			code: 206,
			message: "Partial Content"
		},
		httpCode207: {
			code: 207,
			message: "Multi-Status"
		},
		httpCode208: {
			code: 208,
			message: "Already Reported"
		},

		//3xx Redirection
		httpCode300: {
			code: 300,
			message: "Multiple Choices"
		},
		httpCode301: {
			code: 301,
			message: "Moved Permanently"
		},
		httpCode302: {
			code: 302,
			message: "Found"
		},
		httpCode303: {
			code: 303,
			message: "See Other"
		},
		httpCode304: {
			code: 304,
			message: "Not Modified"
		},
		httpCode305: {
			code: 305,
			message: "Use Proxy"
		},
		httpCode306: {
			code: 306,
			message: "Unused"
		},
		httpCode307: {
			code: 307,
			message: "Temporary Redirect"
		},
		httpCode308: {
			code: 308,
			message: "Permanent Redirect"
		},
		//4xx Client Error
		httpCode400: {
			code: 400,
			message: "Bad Request"
		},
		httpCode401: {
			code: 401,
			message: "Unauthorized"
		},
		httpCode402: {
			code: 402,
			message: "Payment Required"
		},
		httpCode403: {
			code: 403,
			message: "Forbidden"
		},
		httpCode404: {
			code: 404,
			message: "Not Found"
		},
		httpCode405: {
			code: 405,
			message: "Method Not Allowed"
		},
		httpCode406: {
			code: 406,
			message: "Not Acceptable"
		},
		httpCode407: {
			code: 407,
			message: "Proxy Authentication Required"
		},
		httpCode408: {
			code: 408,
			message: "Request Timeout"
		},
		httpCode409: {
			code: 409,
			message: "Conflict"
		},
		httpCode410: {
			code: 410,
			message: "Gone"
		},
		httpCode411: {
			code: 411,
			message: "Length Required"
		},
		httpCode412: {
			code: 412,
			message: "Precondition Failed"
		},
		httpCode413: {
			code: 413,
			message: "Request Entity Too Large"
		},
		httpCode414: {
			code: 414,
			message: "Request - URI Too Long"
		},
		httpCode415: {
			code: 415,
			message: "Unsupported Media Type"
		},
		httpCode416: {
			code: 416,
			message: "Requested Range Not Satisfiable"
		},
		httpCode417: {
			code: 417,
			message: "Expectation Failed"
		},
		httpCode418: {
			code: 418,
			message: "I am a teapot"
		},
		httpCode420: {
			code: 420,
			message: "Enchance Your Calm"
		},
		httpCode422: {
			code: 422,
			message: "Unprocessable Entity"
		},
		httpCode423: {
			code: 423,
			message: "Locked"
		},
		httpCode424: {
			code: 424,
			message: "Failed Dependency"
		},
		httpCode425: {
			code: 425,
			message: "Reserved for WebDAV"
		},
		httpCode426: {
			code: 426,
			message: "Upgrade Required"
		},
		httpCode428: {
			code: 428,
			message: "Precondition Required"
		},
		httpCode429: {
			code: 429,
			message: "Too Many Requests"
		},
		httpCode431: {
			code: 431,
			message: "Request Header Fields Too Large"
		},
		httpCode444: {
			code: 444,
			message: "No Response 449 Retry With"
		},
		httpCode450: {
			code: 450,
			message: "Blocked by Windows Parental Controls"
		},
		httpCode451: {
			code: 451,
			message: "Unavailable For Legal Reasons"
		},
		httpCode499: {
			code: 499,
			message: "Client Closed Request"
		},

		//5xx Server Error
		httpCode500: {
			code: 500,
			message: "Internal Server Error"
		},
		httpCode501: {
			code: 501,
			message: "Not Implemented"
		},
		httpCode502: {
			code: 502,
			message: "Bad Gateway"
		},
		httpCode503: {
			code: 503,
			message: "Service Unavailable"
		},
		httpCode504: {
			code: 504,
			message: "Gateway Timeout"
		},
		httpCode505: {
			code: 505,
			message: "HTTP Version Not Supported"
		},
		httpCode506: {
			code: 506,
			message: "Variant Also Negotiates"
		},
		httpCode507: {
			code: 507,
			message: "Insufficient Storage"
		},
		httpCode508: {
			code: 508,
			message: "Loop Detected(WebDAV)"
		},
		httpCode509: {
			code: 509,
			message: "Bandwidth Limit Exceeded"
		},
		httpCode510: {
			code: 510,
			message: "Not Extended"
		},
		httpCode511: {
			code: 511,
			message: "Network Authentication Required"
		},
		httpCode598: {
			code: 598,
			message: "Network read timeout error"
		},
		httpCode599: {
			code: 599,
			message: "Network connect timeout error"
		}
	}
};
