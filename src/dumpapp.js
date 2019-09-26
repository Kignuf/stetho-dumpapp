const struct = require('python-struct')
const {stetho_open} = require('./stetho_open')

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
		const adb = await stetho_open(device, stetho_process)
		console.log('finished stetho_open')

		// 	Send dumpapp hello (DUMP + version=1)
		// print(b'DUMP' + struct.pack('!L', 1))
		// console.log(sock)
		await adb.write(buildMsg('DUMP', struct.pack('!L', 1)))
		console.log('DUMP done')
		// const decoder = new StringDecoder('utf8')
		// const msgDump = Buffer.from(['DUMP']).toString('binary') + Buffer.from([0x00, 0x00, 0x00, 0x01]).toString('binary')
		// const msgDump = Buffer.from('DUMP\x00\x00\x00\x01').toString('binary')
		// console.log('msgDump', msgDump)
		// await adb.write(msgDump)
		// sock.write(buildMsg('DUMP', struct.pack('!l', 1))) // check if should use "!L" instead

		let enter_frame = buildMsg('!', struct.pack('!L', args.length))
		args.forEach(arg => {
			// const argAsUTF8 =
			enter_frame += struct.pack(
				`!H${arg.length}s`,
				arg.length,
				arg
			)
		})
		await adb.write(enter_frame)
		console.log('tutu')
		// console.log('enterframe: ', enter_frame)
		// sock.write(enter_frame)
		// sock.write('!'+padLeft('1', 4, '0') + padLeft('\x05', 2, '\x00')+'happn')
		// let msgDump2 = Buffer.from('!\x00\x00\x00\x01\x00\x05happn').toString('binary')
			// decoder.write(Buffer.from([0x00, 0x00, 0x00, 0x01, 0x00, 0x05])) +
			// decoder.write(Buffer.from('happn'))
		// msgDump2 = decoder.end()
		// console.log('msgDump2', msgDump2.length)
		// await adb.write(msgDump2)

		await read_frames(adb)
	} catch(e) {
		die(e.message, 1)
	}
}

function buildMsg(msg, size) {
	const msgDump = Buffer.from(msg)
	return Buffer.concat([msgDump, size], msgDump.length + size.length).toString()
}

// TODO: modifier quand on vire sync Socket
async function read_frames(adb) {
	while(true) {
		// All frames have a single character code followed by a big-endian int
		const code = await adb.read_input(1, 'code')
		const data = await adb.read_input(4, 'int4')
		const n = struct.unpack('!L', Buffer.from(data))[0]

		if (code === '1') {
			if (n > 0) {
				console.log('1')
				console.log(await adb.read_input(n, 'stdout blob'))
			}
		} else if (code === '2') {
			if (n > 0) {
				console.log('2')
				console.error(await adb.read_input(n, 'stderr blob'))
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