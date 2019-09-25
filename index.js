// https://github.com/facebook/stetho/issues/331
// adb shell cat /proc/net/unix | grep stetho
// adb forward tcp:9999 localabstract:stetho_com.ftw_and_co.happn_devtools_remote


// js
const net = require('net')
const {once} = require('events')
const struct = require('python-struct')
const pad = require('pad-left')

async function readInput(sock, n, tag) {
	let data = ''
	while(data.length < n) {
		const [newData] = await once(sock, 'data')
		console.log(`got newData: ${newData} - ${newData.length}`)
		if(newData.length === 0) {
			break;
		}
		data += newData
	}
	if(data.length !== n){
		throw new Error(`Unexpected end of stream while reading ${tag}.`)
	}
	return data
}

async function selectService(s, service = 'host:transport:any') {
	// select service
	const serviceLengthAsHexString = pad(service.length.toString(16), 4, '0')
	const msg1 = serviceLengthAsHexString + service
	// s.write(Buffer.from(msg1, 'ascii').toString('ascii'))
	s.write(msg1)

	const status = await readInput(s, 4, "status")
	if(status === "OKAY") {
		// all good
	} else if (status === "FAIL") {
		const reasonLength = parseInt(await readInput(s, 4, "fail_reason"), 16)
		const reason = await readInput(s, reasonLength, "fail reason lean")
		throw new Error(reason)
	} else {
		throw new Error(`Unrecognized status=${status}`)
	}
}

async function main() {
	// === connect to stetho through adb ===
	// eq to py stetho_open
	const s = net.connect(9999, '127.0.0.1')
	s.on('data', data => console.log('Received data:', data.toString()))

	// await selectService(s, '')

	// === get commands list ===

	// send "DUMP" message to socket
	s.write(Buffer.from('DUMP\x00\x00\x00\x01'))
	// const dump = Buffer.from('DUMP')
	// const size = struct.pack('!l', 1)
	// s.write(Buffer.concat([dump, size], dump.length + size.length))

	// send args to socket
	s.write(Buffer.from('!\x00\x00\x00\x01\x00\x05happn'))
	// const arg = 'happn'
	// const msg = Buffer.concat([
	// 	Buffer.from('!'), struct.pack('!l', 1), // !\x00\x00\x00\x01
	// 	struct.pack('!H'+arg.length + 's', [arg.length, arg]) // \x00\x05happn
	// ])
	// s.write(msg)
	// const response = await readInput(s, ??)


	console.log('done')
}

try {
	main()
	// process.on('beforeExit', () => {
	// 	setTimeout(() => console.log('sleeping ..'), 10000)
	// })
} catch(e) {
	console.error(e)
}

// === connect to forwarded stetho socket ===
// const s = net.connect(9999, 'localhost')
// s.on('data', data => console.log(data.toString('utf-8')))

// === get commands list ===

// send "DUMP" message to socket
// s.write(Buffer.from('DUMP\x00\x00\x00\x01'))
// const dump = Buffer.from('DUMP')
// const size = struct.pack('!l', 1)
// s.write(Buffer.concat([dump, size], dump.length + size.length))

// // send args to socket
// // s.write(Buffer.from('!\x00\x00\x00\x01\x00\x05happn'))
// const arg = 'happn'
// const msg = Buffer.concat([
// 	Buffer.from('!'), struct.pack('!l', 1), // !\x00\x00\x00\x01
// 	struct.pack('!H'+arg.length + 's', [arg.length, arg]) // \x00\x05happn
// ])
// // console.log(msg)
// s.write(msg)

// console.log(Buffer.concat([dump, size], dump.length + size.length))