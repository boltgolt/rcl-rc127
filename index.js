const wifi = require("node-wifi")
const colors = require("colors/safe")
const dgram = require("dgram")
const net = require("net")


const magic = require("./magic.js")

const drone = {
	ip: "172.16.10.1",
	tcpPort: 8888,
	udpPort: 8895
}


global.print = function(text, error) {
	// Get the current time and add a leading 0 when needed
	let d = new Date()
	let h = (d.getHours() < 10 ? "0" : "") + d.getHours()
	let m = (d.getMinutes() < 10 ? "0" : "") + d.getMinutes()
	let s = (d.getSeconds() < 10 ? "0" : "") + d.getSeconds()

	if (error) {
		text = colors.red.bold(text)
	}

	// Write it all to console
	process.stdout.write(`[${h}:${m}:${s}] ${text}\n`)

	if (error) {
		process.exit(1)
	}
}

// Init OS wifi integration
wifi.init({
	// Any wifi iface is fine
	iface: null
})

let udpControl = dgram.createSocket("udp4")
let tcpControl = new net.Socket()



print("Scanning for drone wifi network");

// Scan for wifi networks
// wifi.scan(function(err, networks) {
// 	if (err) {
// 		console.log(err)
// 		print("Could not scan for wifi networks", true)
// 	} else {
// 		let network = false
//
// 		for (let i in networks) {
// 			if (/RC Leading-[a-f0-9]{6}/.test(networks[i].ssid)) {
// 				network = networks[i]
// 				break
// 			}
// 		}
//
// 		if (network === false) {
// 			print("Could not find drone network", true)
// 		}
// 		else {
// 			print(`Connecting to ${network.ssid} (${network.mac})`);
//
// 			wifi.connect({
// 				ssid: network.ssid,
// 				password: ""
// 			}, function(err) {
// 				if (err) {
// 					console.log(err)
// 					console.error("Could connect to drone network");
// 					process.exit(1)
// 				}
// 				console.log('Connected');
//
//
//
// 			});
//
// 		}
// 	}
// })

tcpControl.connect(drone.tcpPort, drone.ip, function() {

	console.log('Connected');
	tcpControl.write(magic.tcpStart);

	setTimeout(function () {
		udpControl.send(magic.defaultUdp, 0, magic.defaultUdp.length, drone.udpPort, drone.ip);

		setInterval(function () {
			function genChecksum(data) {
				return (data[1] ^ data[2] ^ data[3] ^ data[4] ^ data[5]) & 0xFF
			}

			let data = magic.defaultUdp

			// data[1] = Math.floor((0 + 1) * 127);
			// data[2] = Math.floor((0) * 127);
			// data[3] = Math.floor((0) * 255);
			// data[4] = Math.floor((0 + 1) * 127);
			data[3] = 0x20
			data[6] = genChecksum(data);

			console.log(data);

			udpControl.send(data, 0, magic.defaultUdp.length, drone.udpPort, drone.ip);
		}, 50);
	}, 1000);


});

tcpControl.on('data', function(data) {
	console.log("data from drone:");
	console.log(data);
});

tcpControl.on('close', function() {
	console.log('tcpControl connection closed by drone')
})
