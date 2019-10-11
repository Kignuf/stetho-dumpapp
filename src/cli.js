#!/usr/bin/env node
const struct = require('python-struct')
const {stetho_open} = require('./stetho_open')
const logger = require('./logger')
const {buildMsg, read_frame} = require('./utils')

function die(msg, code) {
	logger.error(msg)
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
			args = args.slice(2)
		}
	}

	// 	Connect to ANDROID_SERIAL if supplied, otherwise fallback to any
	//  transport.
	let device = process.env['ANDROID_SERIAL']

	try {
		const adb = await stetho_open(device, stetho_process)

		// 	Send dumpapp hello (DUMP + version=1)
		await adb.write(buildMsg('DUMP', struct.pack('!L', 1)))

		let enter_frame = buildMsg('!', struct.pack('!L', args.length))
		args.forEach(arg => {
			enter_frame += struct.pack(
				`!H${arg.length}s`,
				arg.length,
				arg
			)
		})
		await adb.write(enter_frame)
		await read_frames(adb)
	} catch(e) {
		die(e.message, 1)
	}
}

async function read_frames(adb) {
	let doing = true
	while (doing) {
		const result = await read_frame(adb)

		if (result.stdout) {
			console.log(result.stdout)
		}
		if (result.stderr) {
			console.error(result.stderr)
		}
		doing = !result.end
	}
	process.exit(0)
}

main()