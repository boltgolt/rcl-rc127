const keypress = require("keypress")
const colors = require("colors/safe")

module.exports = {
	state: {
		thr: 0,
		hor: 0,
		ver: 0
	},
	start: function() {


		// make `process.stdin` begin emitting "keypress" events
		keypress(process.stdin);

		process.stderr.write('\x1B[?25l')


		// listen for the "keypress" event
		process.stdin.on("keypress", function (ch, key) {
			let state = module.exports.state

			// Some keys will not be passed, catch that
			if (!key) {
				return
			}

			switch (key.name) {
				case "right":
					if (Math.round(state.hor * 100) >= 100) {
						state.hor = 1
					}
					else {
						state.hor += 0.05
					}
					break;
				case "left":
					if (Math.round(state.hor * 100) <= -100) {
						state.hor = -1
					}
					else {
						state.hor -= 0.05
					}
					break;
				case "up":
				if (Math.round(state.ver * 100) >= 100) {
						state.ver = 1
					}
					else {
						state.ver += 0.05
					}
					break;
				case "down":
				if (Math.round(state.ver * 100) <= -100) {
						state.ver = -1
					}
					else {
						state.ver -= 0.05
					}
					break;
				case "home":
					if (Math.round(state.thr * 100) >= 200) {
						state.thr = 2
					}
					else {
						state.thr += 0.05
					}
					break;
				case "end":
					if (Math.round(state.thr * 100) <= 0) {
						state.thr = 0
					}
					else {
						state.thr -= 0.05
					}
					break;
				case "clear":
					state.thr = .35
					state.hor = 0
					state.ver = 0
					break;
			}

			printState()

			if (key && key.ctrl && key.name == 'c') {
				printState("END")

				process.stderr.write('\x1B[?25h')
				process.stdout.write("\n\n")
				process.exit()
			}
		})

		process.stdin.setRawMode(true)
		process.stdin.resume()

		printState("FIRST")
	}
}

function printState(special) {
	if (special == "FIRST") {
		process.stdout.write("\n")
	}
	else {
		process.stdout.write("\r")
	}

	let thr = Math.round(module.exports.state.thr * 100) / 100
	thr = colors.black(`  ${thr.toFixed(2)}  `)

	if (module.exports.state.thr > 1.2) {
		thr = colors.bgRed(thr)
	}
	else if (module.exports.state.thr > .7) {
		thr = colors.bgYellow(thr)
	}
	else {
		thr = colors.bgWhite(thr)
	}

	let hor = Math.round(module.exports.state.hor * 100) / 100
	hor = colors.black(` ${(hor < 0 ? "" : " ")}${hor.toFixed(2)}  `)

	if (module.exports.state.hor > .5 || module.exports.state.hor < -.5) {
		hor = colors.bgRed(hor)
	}
	else if (module.exports.state.hor > .25 || module.exports.state.hor < -.25) {
		hor = colors.bgYellow(hor)
	}
	else {
		hor = colors.bgWhite(hor)
	}

	let ver = Math.round(module.exports.state.ver * 100) / 100
	ver = colors.black(` ${(ver < 0 ? "" : " ")}${ver.toFixed(2)}  `)

	if (module.exports.state.ver > .5 || module.exports.state.ver < -.5) {
		ver = colors.bgRed(ver)
	}
	else if (module.exports.state.ver > .25 || module.exports.state.ver < -.25) {
		ver = colors.bgYellow(ver)
	}
	else {
		ver = colors.bgWhite(ver)
	}

	let status = colors.bold.red("In flight ")

	if (module.exports.state.thr < .2) {
		status = colors.bold.green("Idle      ")
	}
	else if (module.exports.state.thr < .4) {
		status = colors.bold.yellow("Armed     ")
	}

	if (special == "END") {
		status = colors.bold.red("Stopped    ")
	}

	process.stdout.write(` T: ${thr}   H: ${hor}   V: ${ver}   ${status}`);
}
