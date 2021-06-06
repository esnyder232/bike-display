/* 
This is a quick "bike display" thing for SteeScribbles on twitch. It was meant to be used when Stee is doing the bike streams.
The purpose of this is to display the current bike level to the viewers.
Setup:
 1) Extract the .zip file whereever you want.
 2) Install Node. 
  - You can install it from here: https://nodejs.org/en/ (Download the LTS (Long Term Support) version). If you have already done this step for previous twitch integration projects, you can probably skip this step.
 3) Install libraries.
  - To install libraries, open up a command console.
  - Navigate to the directory where you extracted the .zip file.
  - In the command console, run "npm install".
  - It should show a bunch of information that libraries are being downloaded. It if it succeeded, you will see no red text, and a "Done." on the last line.
 4) Run the server on localhost.
  - To run the server on localhost, open a command console, navigate to the directory, and run "node index.js".
  - The command console should say "Info Webserver listening on port 5733." and then "Connected to twitch channel {channelName}."
 5) Show display on screen.
  - Open a browser.
  - Type in the url "localhost:5733".
  - You should see a screen with "Current Bike Level: ##".

After the setup is working, you should be able to display the browser on your streaming software (OBS, streamlabs, whatever your using).
I'll leave that up to you because I don't know what your using.

Below are configurations for this software. You should configure them to your liking.
*/

// min/max bike level
var minBikeLevel = 3;
var maxBikeLevel = 8

// the bike level you start at. This is also the bike level that it resets too every "resetInterval".
var baseBikeLevel = 3

// milliseconds for the current bike interval. The bike level gets reset back to the baseBikeLevel everytime the interval ends.
var intervalLength = 60000;

// This is the channel name for the software to connect to.
var channelName = "Miles_Gloriosus";

// The twitch chat/bike level mappings:
//  - key: the twitch chat message that will cause the bikelevel change (it will be read in all lowercase)
//  - values: +1 - increases bike level by 1
//			  -1 - decreases bike level by 1
//   		  max - sets the bike level to max
//			  min - sets the bike level to min
//			  base - sets the bike level to base level
var twitchChatMappings = {
	"increase1": "+1",
	"decrease2": "-1",
	"maxlevel": "max",
	"minlevel": "min",
	"baselevel": "base"
}




//////////////////////////////////////////////////////////////////////////////////////////////////////////////
const express = require('express');
const path = require('path');
const tmi = require('tmi.js');
const app = express();
const {performance} = require('perf_hooks');
const port = 5733;

var currentBikeLevel = baseBikeLevel;
var currentInterval = intervalLength;
var previousTick = 0;
var frameTimeStep = 100; //ms
var intervalState = "run"; //stop, run, pause

//create http server
const expressServer = app.listen(port, () => {console.log("info", 'Webserver listening on port ' + port)});

//add middleware to pipeline
app.use(express.json()); //for parsing application/json
app.use(express.urlencoded({extended: false})); //for parsing application/x-www-form-urlencoded

//http endpoints
app.get('/', (req, res) => {res.sendFile(path.join(__dirname, "index.html"));});
app.get('/index.html', (req, res) => {res.sendFile(path.join(__dirname, "index.html"));});
app.get('/styles.css', (req, res) => {res.sendFile(path.join(__dirname, "styles.css"));});

//static files
app.use('/node_modules', express.static(path.join(__dirname, "node_modules")));

//other apis
app.get('/api/get-data', getData);
app.post('/api/mod-interval', modInterval);
app.post('/api/mod-bike-level', modBikeLevel);



//twitch connection
const client = new tmi.Client({
	connection: {
		secure: true,
		reconnect: true
	},
	channels: [ 'Miles_Gloriosus' ]
});

client.connect();

client.on("connected", () => {
	console.log("Connected to twitch channel " + channelName + ".");
})
client.on('message', (channel, tags, message, self) => {
	console.log(tags['display-name'] + " - " + message);

	//scan message for redeeming points
	var trimmedMessage = message.toLowerCase().trim();
	var modCmd = twitchChatMappings[trimmedMessage];
	if(modCmd !== undefined) {
		var userMessage = changeBikeLevel(modCmd);
		if(userMessage === "") {
			console.log('Changed bike level via chat command. Bike level is now: ' + currentBikeLevel);	
		}
	}
});

///////////////////////////////////////////////////////
//apis
function getData(req, res) {
	var bError = false;
	var data = {};
	var userMessage = "";

	try {
		data.currentBikeLevel = currentBikeLevel;
		data.currentInterval = currentInterval;
	}
	catch(ex) {
		userMessage = "Internal server error.";
		console.log(ex);
		bError = true;
	}

	//send the response
	var statusResponse = 200;
	if(bError)		
		statusResponse = 500;
	
	res.status(statusResponse).json({userMessage: userMessage, data: data});
}

function modInterval(req, res) {
	var bError = false;
	var userMessage = "";
	var command = req.body.command;

	try {
		switch(command)
		{
			case "start":
				if(intervalState === "stop") {
					console.log("Starting interval at " + intervalLength + " millisconds.");
					currentInterval = intervalLength;
					intervalState = "run";
					gameLoop();
				}
				break;
			case "pause":
				if(intervalState === "run") {
					console.log("Pausing interval.");
					intervalState = "pause";
				}
				break;
			case "resume":
				if(intervalState === "pause") {
					console.log("Resuming interval.");
					gameLoop();
					intervalState = "run";
				}
				break;
			case "cancel":
				if(intervalState === "run" || intervalState === "pause") {
					console.log("Canceled interval.");
					currentInterval = intervalLength;
					intervalState = "stop";
				}
				break;
		}
	}
	catch(ex) {
		userMessage = "Internal server error.";
		console.log(ex);
		bError = true;
	}

	//send the response
	var statusResponse = 200;
	if(bError)		
		statusResponse = 500;
	
	res.status(statusResponse).json({userMessage: userMessage});
}

function modBikeLevel(req, res) {
	var bError = false;
	var userMessage = "";
	var mod = req.body.mod;

	userMessage = changeBikeLevel(mod);
	

	if(userMessage === "") {
		console.log('Changed bike level via localhost. Bike level is now: ' + currentBikeLevel);
	}
	else {
		bError = true;
	}

	//send the response
	var statusResponse = 200;
	if(bError)		
		statusResponse = 500;
	
	res.status(statusResponse).json({userMessage: userMessage});
}

function changeBikeLevel(mod) {
	var userMessage = "";
	try {
		switch(mod) {
			case "+1":
				currentBikeLevel += 1;
				clampBikeLevel();
				break;
			case "-1":
				currentBikeLevel -= 1;
				clampBikeLevel();
				break;
			case "max":
				currentBikeLevel = maxBikeLevel;
				clampBikeLevel();
				break;
			case "min":
				currentBikeLevel = minBikeLevel;
				clampBikeLevel();
				break;
			case "base":
				currentBikeLevel = baseBikeLevel;
				clampBikeLevel();
				break;
		}
	}
	catch(ex) {
		userMessage = "Internal server error.";
		console.log(ex);
	}

	return userMessage;
}


///////////////////////////////////////////////////////

///////////////////////////////////////////////////////
// helper functions
function clampBikeLevel() {
	if(currentBikeLevel > maxBikeLevel) {
		currentBikeLevel = maxBikeLevel;
	}
	else if(currentBikeLevel < minBikeLevel) {
		currentBikeLevel = minBikeLevel;
	}
}

///////////////////////////////////////////////////////

///////////////////////////////////////////////////////
// main loop
function gameLoop() {
	var nowTime = performance.now();

	//if its the designated time has passed, run the update function
	if(previousTick + (frameTimeStep) < nowTime) {
		previousTick = nowTime;
		update(frameTimeStep);
	}

	//set either the sloppy timer (setTimeout) or accurate timer (setImmediate)
	if(nowTime - previousTick < (frameTimeStep - 16)) {
		//call the sloppy timer
		setTimeout(gameLoop, 1);
	}
	else {
		//call the accurate timer
		setImmediate(gameLoop);
	}
}
///////////////////////////////////////////////////////

///////////////////////////////////////////////////////
// update function
function update(dt) {
	switch(intervalState){
		case "run":
			currentInterval -= dt;
			if(currentInterval < 0) {
				console.log('Interval reached. Resetting interval to ' + intervalLength + ". Resetting bike level to " + baseBikeLevel);
				currentInterval = intervalLength;
				currentBikeLevel = baseBikeLevel;
			}
			break;
		case "stop": 
			break;
		case "pause":
			break;
	}
	
}

///////////////////////////////////////////////////////

//run the game loop
gameLoop();