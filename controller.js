// Import required modules
const keypress = require("keypress")
const colors = require("colors/safe")

module.exports = {
	// Contains state variable for throttle and both the horizontal and vertical axis
	state: {
		thr: 0, // Throttle
		hor: 0, // Horizontal axis
		ver: 0 // Vertical axis
	},

	/**
	 * Start in-terminal drone control interface
	 * @param  {Fcuntion} endCallback Function to be called when the user quits the script
	 */
	start: function(endCallback) {
		// Init keypress module
		keypress(process.stdin);

		// Hide terminal cursor
		process.stderr.write("\x1B[?25l")

		// Listen for the "keypress" event
		process.stdin.on("keypress", function (ch, key) {
			// Make a shorthand for the state object
			let state = module.exports.state

			// Some keys will not be passed, catch that
			if (!key) {
				return
			}

			// Match pressed key with actions
			switch (key.name) {
				// User pressed right, increase horizontal axis power until we hit the maxmimum
				case "right":
					if (Math.round(state.hor * 100) >= 100) {
						state.hor = 1
					}
					else {
						state.hor += 0.05
					}
					break
				// User pressed left, decrease horizontal axis power until we hit the minimum
				case "left":
					if (Math.round(state.hor * 100) <= -100) {
						state.hor = -1
					}
					else {
						state.hor -= 0.05
					}
					break
				// User pressed up, increase vertical axis power until we hit the maxmimum
				case "up":
					if (Math.round(state.ver * 100) >= 100) {
						state.ver = 1
					}
					else {
						state.ver += 0.05
					}
					break
				// User pressed down, decrease vertical axis power until we hit the minimum
				case "down":
					if (Math.round(state.ver * 100) <= -100) {
						state.ver = -1
					}
					else {
						state.ver -= 0.05
					}
					break
				// User pressed home (throttle up), increase throttle power until we hit the maxmimum
				case "home":
					if (Math.round(state.thr * 100) >= 200) {
						state.thr = 2
					}
					else {
						state.thr += 0.05
					}
					break
				// User pressed home (throttle down), decrease throttle power until we hit the minimum
				case "end":
					if (Math.round(state.thr * 100) <= 0) {
						state.thr = 0
					}
					else {
						state.thr -= 0.05
					}
					break
				// User pressed clear or num5 (reset), decrease throttle to landing power and reset the horizontal and vertical axis
				case "clear":
					state.thr = .35
					state.hor = 0
					state.ver = 0
					break;
			}

			// Print new state to the console
			printState()

			// Catch a ctrl+C (SIGINT) or an escape or q keypress to quit the script
			if ((key.ctrl && key.name == "c") || key.name == "q" || key.name == "escape") {
				// Print a special state
				printState("END")

				// Let the index script clean up
				endCallback()

				// Give the terminal its cursor back and add some newlines
				process.stderr.write('\x1B[?25h')
				process.stdout.write("\n\n")
			}
		})

		// Make STDIN ready to receive keypresses
		process.stdin.setRawMode(true)
		process.stdin.resume()

		// Print the first state
		printState("FIRST")
	}
}

/**
 * Print a nicely formatted view of the drone status
 * @param  {String} special Set to specific values for specal events
 */
function printState(special) {
	// If this is the first time we're printing the state, add a new line
	if (special == "FIRST") {
		process.stdout.write("\n")
	}
	// Otherwise, return to the start of the old line to overwrite it
	else {
		process.stdout.write("\r")
	}

	// Round the throttle to a human readable format
	let thr = Math.round(module.exports.state.thr * 100) / 100
	// Set the text as black and round it to 2 decimals
	thr = colors.black(`  ${thr.toFixed(2)}  `)

	// Color the background red if the throttle is dangerously high
	if (module.exports.state.thr > 1.2) thr = colors.bgRed(thr)
	// Color the background yellow if the throttle is higher than normal
	else if (module.exports.state.thr > .7) thr = colors.bgYellow(thr)
	// Give it a normal white background for normal values
	else thr = colors.bgWhite(thr)

	// Round the horizontal axis to a human readable format
	let hor = Math.round(module.exports.state.hor * 100) / 100
	// Set the text as black, round it to 2 decimals and add extra space in front if it's a positive number (makes natative and positive numbers have the same position)
	hor = colors.black(` ${(hor < 0 ? "" : " ")}${hor.toFixed(2)}  `)

	// Color the background red if the horizontal axis is dangerously high or low
	if (module.exports.state.hor > .5 || module.exports.state.hor < -.5) hor = colors.bgRed(hor)
	// Color the background yellow if the horizontal axis is higher or lower than normal
	else if (module.exports.state.hor > .25 || module.exports.state.hor < -.25) hor = colors.bgYellow(hor)
	// Give it a normal white background for normal values
	else hor = colors.bgWhite(hor)

	// Round the vertical axis to a human readable format
	let ver = Math.round(module.exports.state.ver * 100) / 100
	// Set the text as black, round it to 2 decimals and add extra space in front if it's a positive number (see above)
	ver = colors.black(` ${(ver < 0 ? "" : " ")}${ver.toFixed(2)}  `)

	// Color the background red if the vertical axis is dangerously high or low
	if (module.exports.state.ver > .5 || module.exports.state.ver < -.5) ver = colors.bgRed(ver)
	// Color the background yellow if the vertical axis is higher or lower than normal
	else if (module.exports.state.ver > .25 || module.exports.state.ver < -.25) ver = colors.bgYellow(ver)
	// Give it a normal white background for normal values
	else ver = colors.bgWhite(ver)

	// Default the status line to In flight
	let status = colors.bold.red("In flight ")
	// If the throttle is very low the engines will turn off and it will be in idle
	if (module.exports.state.thr < .25) status = colors.bold.green("Idle      ")
	// If the throttle is low but not too low, the engine power will not be enough to lift off
	else if (module.exports.state.thr < .4) status = colors.bold.yellow("Armed     ")

	// If this is the final print show the status as Stopped
	if (special == "END") {
		status = colors.bold.red("Stopped    ")
	}

	// Print everything to the console
	process.stdout.write(` T: ${thr}   H: ${hor}   V: ${ver}   ${status}`)
}
