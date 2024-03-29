const struct = require('python-struct')
const util = require('util')
const readLine = require('readline')
const padLeft = require('pad-left')
const {StringDecoder} = require('string_decoder')
// const readLineP = util.promisify(readLine)

const {read_input, stetho_open} = require('./stetho_open')

function die(msg, code) {
	console.error(msg)
	process.exit(code)
}

async function main() {
	// 	Manually parse out -p <process>, all other option handling occurs inside
	//  the hosting process.

	//  Connect to the process passed in via -p. If that is not supplied fallback
	//  the process defined in STETHO_PROCESS. If neither are defined throw.
	let stetho_process = process.env['STETHO_PROCESS']

	let args = process.argv.slice(2, process.argv.length)
	if( args.length > 0 && (args[0] === '-p' || args[0] === '--process')){
		if(args.length < 2) {
			die('Missing <process>', 1)
		} else {
			stetho_process = args[1]
			args = args.slice(2, args.length)
		}
	}

	// 	Connect to ANDROID_SERIAL if supplied, otherwise fallback to any
	//  transport.
	let device = process.env['ANDROID_SERIAL']

	try {
		const sock = await stetho_open(device, stetho_process)

		// 	Send dumpapp hello (DUMP + version=1)
		// print(b'DUMP' + struct.pack('!L', 1))
		console.log('titi')
		// console.log(sock)
		// console.log('buildmsg', buildMsg('DUMP', struct.pack('!l', 1)))
		// const decoder = new StringDecoder('utf8')
		// const msgDump = Buffer.from(['DUMP']).toString('binary') + Buffer.from([0x00, 0x00, 0x00, 0x01]).toString('binary')
		const msgDump = Buffer.from('DUMP\x00\x00\x00\x01').toString('binary')
		console.log('msgDump', msgDump)
		sock.write(msgDump)
		// sock.write(buildMsg('DUMP', struct.pack('!l', 1))) // check if should use "!L" instead

		let enter_frame = buildMsg('!', struct.pack('!l', args.length))
		args.forEach(arg => {
			// const argAsUTF8 =
			enter_frame += struct.pack(
				`!H${arg.length}s`,
				arg.length,
				arg
			)
		})
		console.log('tutu')
		// console.log('enterframe: ', enter_frame)
		// sock.write(enter_frame)
		// sock.write('!'+padLeft('1', 4, '0') + padLeft('\x05', 2, '\x00')+'happn')
		let msgDump2 = Buffer.from('!\x00\x00\x00\x01\x00\x05happn').toString('binary')
			// decoder.write(Buffer.from([0x00, 0x00, 0x00, 0x01, 0x00, 0x05])) +
			// decoder.write(Buffer.from('happn'))
		// msgDump2 = decoder.end()
		console.log('msgDump2', msgDump2.length)
		sock.write(msgDump2)

		await read_frames(sock)
	} catch(e) {
		die(e.message, 1)
	}
}

function buildMsg(msg, size) {
	const msgDump = Buffer.from(msg)
	return Buffer.concat([msgDump, size], msgDump.length + size.length).toString()
}

// TODO: modifier quand on vire sync Socket
async function read_frames(sock) {
	while(true) {
		// All frames have a single character code followed by a big-endian int
		const code = read_input(sock, 1, 'code')
		const n = struct.unpack('!L', read_input(sock, 4, 'int4'))[0]

		if (code === '1') {
			if (n > 0) {
				console.log('1')
				console.log(read_input(sock, n, 'stdout blob'))
			}
		} else if (code === '2') {
			if (n > 0) {
				console.log('2')
				console.error(read_input(sock, n, 'stderr blob'))
			}
		} else if (code === '_') {
			if (n > 0) {
				// const data = await readLineP()
				throw new Error('Not implemented')
			}
		} else if (code === 'x') {
			process.exit(0)
		} else {
			console.log('terminé')
			return
		}
	}
}

main()