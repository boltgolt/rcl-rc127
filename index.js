// Import required modules
const wifi = require("node-wifi")
const colors = require("colors/safe")
const dgram = require("dgram")
const net = require("net")

// Import other node files
const magic = require("./magic.js")
const controller = require("./controller.js")

// Hardcode drone IP and ports
const drone = {
	ip: "172.16.10.1",
	tcpPort: 8888,
	udpPort: 8895
}

// Init TCP socket object, this socket is olny keeping the drone awake
let tcpControl = new net.Socket()
// Init TCP socket object, this sockets is sending instructions to the drone
let udpControl = dgram.createSocket("udp4")

// Will shut down drone when true
let shutDown = false

// Init OS wifi integration
wifi.init({
	// Allow any wifi interface
	iface: null
})

/**
 * Prints a nice massage to the console
 * @param  {String} text  Message to be shown
 * @param  {Bool}   error When true, will print as error and quit the program
 */
global.print = function(text, error) {
	// Get the current time and add a leading 0 when needed
	let d = new Date()
	let h = (d.getHours() < 10 ? "0" : "") + d.getHours()
	let m = (d.getMinutes() < 10 ? "0" : "") + d.getMinutes()
	let s = (d.getSeconds() < 10 ? "0" : "") + d.getSeconds()

	// Turn the text red if this is a critical error
	if (error) {
		text = colors.red.bold(text)
	}

	// Write it all to console
	process.stdout.write(`[${h}:${m}:${s}] ${text}\n`)

	// If an error, stop the script
	if (error) {
		process.exit(1)
	}
}

// Let the user know we're starting the scan
print("Scanning for drone wifi network...")

// Scan for availible wifi networks
wifi.scan(function(err, networks) {
	// Catch error and quit script
	if (err) {
		print("Could not scan for wifi networks", true)
	}
	else {
		// Default to false to catch no-drone error
		let network = false

		// Loop through wifi networks
		for (let i in networks) {
			// If network SSID looks like a done network, save that and stop the loop
			if (/RC Leading-[a-f0-9]{6}/.test(networks[i].ssid)) {
				network = networks[i]
				break
			}
		}

		// If we couldn't find a network, stop script with error
		if (network === false) {
			print("Could not find drone network", true)
		}
		else {
			// Let the user know to what drone we're connecting
			print(`Connecting to "${network.ssid}" (${network.mac})...`)

			// Connect to drone network without a password (it's an open network)
			wifi.connect({
				ssid: network.ssid,
				password: ""
			}, function(err) {
				// Crash with error if connecting failed
				if (err) {
					print("Could not connect to drone network", true)
				}

				// Let the user know we're opening the TCP socket to the dronw
				print("Opening control socket to drone...")

				// Connect to the TCP server on the drone
				tcpControl.connect(drone.tcpPort, drone.ip, function() {
					// Send the magic packet that will wake the drone up (lights will stop flashing at this point)
					tcpControl.write(magic.tcpStart)

					// Let the user know we have a connection now
					print(colors.green("Connected to drone!"))

					// Start the controller terminal interface
					controller.start(stopDrone)

					// Send the first UDP packet with all default fields, which will put al conrols in the natural position
					udpControl.send(magic.defaultUdp, 0, magic.defaultUdp.length, drone.udpPort, drone.ip)

					// Send a control UDP packet every 50ms
					setInterval(function() {
						// If the user has send the quit signal
						if (shutDown) {
							// Get the natural UDP datagram
							let stopUdp = magic.defaultUdp
							// Set the throttle to 1/256, which will shut down the rotors from any state
							stopUdp[3] = 0x01

							// Send the datagram aff to the drone and stop here
							return udpControl.send(stopUdp, 0, stopUdp.length, drone.udpPort, drone.ip)
						}

						// Get the natural UDP datagram
						let data = magic.defaultUdp

						// Translate the -1 to 1 value of the horizontal axis to 0-256 and insert it into the natural datagram
						data[1] = Math.round((controller.state.hor + 1) * 127)
						// Translate the -1 to 1 value of the vertical axis to 0-256 and insert it into the natural datagram
						data[2] = Math.round((controller.state.ver + 1) * 127)
						// Translate the 0 to 2 value of the throttle to 0-256 and insert it into the natural datagram
						data[3] = Math.round(controller.state.thr * 127)

						// Generate the mew XOR checksum for this datagram
						data[6] = data[1] ^ data[2] ^ data[3] ^ 0x80

						// Send the datagram off to the drone
						udpControl.send(data, 0, magic.defaultUdp.length, drone.udpPort, drone.ip)
					}, 50)
				})
			})
		}
	}
})

/**
 * Stops drone gracefully
 */
function stopDrone() {
	// Set the global accordingly
	shutDown = true

	// Wait .2s for the shutdown to reach the drone and stop the script
	setTimeout(function () {
		process.exit()
	}, 200)
}

// If the TCP socket gets broken, let the user know and stop the script
tcpControl.on("close", function() {
	print("Connection closed by drone", true)
})
