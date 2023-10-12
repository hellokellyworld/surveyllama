# SurveyLlama Backend Node.js Application

# How to setup and run in local computer (localhost)

    1. Install dependencies

    	npm install
    or
        yarn

    2. Run in development mode

    	First you need to set the NODE_ENV to be development mode, and then run "node server.js". On Linux/Mac,
    	the two steps can be combined :

    		NODE_ENV=development node server.js

    	The code will look for config/mongo.json file to look for the mongodb server URI

    3. Run in production mode

    	First you need to set the NODE_ENV to production mode, and also give the MONGODB_URI information about the production mongodb, and finally run "node server.js". On Linux/Mac these 3 steps can be combined as:

    		NODE_ENV=production SL_FRONTEND_URI="http://localhost:8080" "SL_BACKEND_URI="http://localhost:3001" MONGODB_URI=mongodb://********** LOG_LEVEL=debug node server.js

    	To run at a different log level other than debug:

    		NODE_ENV=production SL_FRONTEND_URI="http://localhost:8080" "SL_BACKEND_URI="http://localhost:3001" MONGODB_URI=mongodb://*********** LOG_LEVEL=info node server.js

    	#LOG_LEVEL can be: trace,debug, info, warn,error,fatal. By default it is debug

    4. Run in test mode

    	First you need to set NODE_ENV to test and then run "node server.js"

    		NODE_ENV=test node server.js

    	To run it using a different log level:

    		NODE_ENV=test LOG_LEVEL=info node server.js #LOG_LEVEL can be: trace,debug,
    		#info, warn,error,fatal. By default it is debug

    	You can browse the app at <http://localhost:3001>

    	To automatically restart server:
    		npm i nodemon -g
    		nodemon node server.js

# How to setup and run in DigitalOcean

    5. How to deploy to www.test-sl-yourname.com on Digital Ocean
    	a) create an account on digitalocean.com
    	b) register test-sl-yourname.com at godaddy or other domain service
    	c) create a digital ocean droplet named test-sl-yourname
    	d) setup network on the test-sl-yourname droplet
    	e) setup firewall on the test-sl-yoruname droplet
    	f) point digitalocean.com to the DO name server on godaddy.com
    	g) login the droplet at www.test-sl-yourname.com
    	h) install the mongodb on the droplet
    	i）install git on the droplet
    	j) install nodeJS on the droplet
    	k) clone the source code on the droplet
    	l) register account on googleads
    	m) register account on dropbox or amazon S3 for storing images
    	n) register account on mailgun for email service
    	o) register account on twilio for SMS messaging
    	p) cd back-end  && npm install
    	q) start mongoDB
    	r) setup environmental variables for back-end
    	s) node server.js
    	t) cd front-end && npm install &&npm run build
    	u) setup environmental varibles for front-end
    	v) run front-end in dev mode: npm run start
    	w) run front-end in production mode: node server.js

# Coding Styles:

    All middlewares must return the following response on success:

    	res.status(httpStatusCodes.httpCode200.code).json({
      		success: true,
        	message: "Welcome to SurveyLLama, help you doing surveys with AI."+httpStatusCodes.httpCode200.message,
        	result: dataObject,
        	error: null,
        	statusCode: httpStatusCodes.httpCode200.code
    	})

    All middleware failures must throw error this way:
    	next (new ErrorClass(httpStatusCodes.httpCode500.code,false,"message about the error"));
    so that the error will be caught by the final errorHandler in app/helpers/error.js

    All HTTP responses must supply a status code according to httpStatusCodes in app/constants.js

    JS:  		https://google.github.io/styleguide/jsguide.html
    CSS HTML: 	https://google.github.io/styleguide/htmlcssguide.html

    TypeScript:
    	https://github.com/microsoft/TypeScript/wiki/Coding-guidelines
    	https://www.intertech.com/Blog/google-javascript-style-guide-takeaways-for-typescript-developers/

# Project Struture

    The back-end is responsible for chatting with an AI LLM such as openai GPT-3.5 or GPT4.0

    The chatting with the AI part includes the following mechanisms borrowed from babyagi and Auto-GPT

    0) establishing of dummy users and established users (users who want to do survey)
    1)Define survey campaign based on user request and create campaign objective data and id
    2)prompiting AI for suggested task list to finish the objective
    3)task management
    4)memory/storage of the context
    5)agents that can be used to finish the tasks
    6)checking of if objective finsihed
    7)output of final results in format that can be used to store in DB for the user's specific objective
    8)API for front-end to supply new context
    9)API for instructions for each objective/task for each chatting session to receive instructions to talk humans/bots on front-end
    10)API for providing possible ads/linsk that can help front-end user achive his/her goal of buying/selling

    The key is a)Survey planning
    		   b)tasklist
    		   c)chatting session
    		   d)context and task/objective status check
    		   e)output to DB and vectorization for summary and retrieval later
    		   f)instructions to front-end and receiving new context from front-end
    		   g)checking of frotn-end user's mood/feeling/message-modality
