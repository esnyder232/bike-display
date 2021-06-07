# bike-display
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

Configuration:
The configuration is in index.js.
Open up "index.js" and you'll see the configuration variables near the top.