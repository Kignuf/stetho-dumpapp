const net = require('net')
const util = require('util')
const nextTick = util.promisify(process.nextTick)
// const netlinkwrapper = require('netlinkwrapper')
// const {once} = require('events')
const padLeft = require('pad-left')

const READ_TIMEOUT = 10 * 1000
// ###############################################################################
// ##
// ## Simple utility class to create a forwarded socket connection to an
// ## application's stetho domain socket.
// ##
// ## Usage:
// ##
// ##   sock = stetho_open(
// ##       device='<serial-no>',
// ##       process='com.facebook.stetho.sample')
// ##   doHttp(sock)
// ##
// ###############################################################################


async function stetho_open(device, stetho_process){
	console.log('before adb')
	const adb = await _connect_to_device(device)
	console.log('after adb')
	let socket_name
	if (!stetho_process) {
		socket_name = await _find_only_stetho_socket(device)
	} else {
		socket_name = _format_process_as_stetho_socket(stetho_process)
	}

	console.log('socket_name:', socket_name)
	try {
		await adb.select_service(`localabstract:${socket_name}`)
	} catch(e) {
		console.error(e)
		throw new Error(`Failure to target process ${stetho_process}: ${e.message} (is it running ?)`)
	}

	return adb
}

async function _find_only_stetho_socket(device) {
	const adb = await _connect_to_device(device)
	try {
		adb.select_service('shell:cat /proc/net/unix')
		let last_stetho_socket_name = null
		const process_names = []
		adb.sock.makeFile().forEach(line => { // TODO check this
			let row = line.trimEnd().split(' ')
			if (row.length < 8) {
				return
			}
			const socket_name = row[7]
			if (!socket_name.startsWith('@stetho_')) {
				return
			}
			// Filter out entries that are not server sockets
			if (Number(row[3]) !== 65536 || Number(row[5]) !== 1) {
				return
			}

			last_stetho_socket_name = socket_name.slice(1)
			process_names.push(_parse_process_from_stetho_socket(socket_name))
		})

		if(process_names.length > 1) {
			let msg = `\n\t${process_names}`
			msg += 'Use -p <process> or the environment variable STETHO_PROCESS to select one'
			throw new Error(`Multiple stetho-enabled processes available:${msg}\n`)
		} else if (!last_stetho_socket_name) {
			throw new Error('No stetho-enabled processes running')
		} else {
			return last_stetho_socket_name
		}
	} catch(e) {
		throw e
	} finally {
		adb.close()
	}
}

async function _connect_to_device(device) {
	const adb = new AdbSmartSocketClient()
	console.log('before connect')
	await adb.connect()
	console.log('after connect')

	try {
		if (!device) {
			adb.select_service('host:transport-any')
		} else {
			adb.select_service(`host:transport:${device}`)
		}

		return adb
	} catch (e) {
		throw new Error(`Failure to target device ${device}: ${e.message}`)
	}
}

function _parse_process_from_stetho_socket(socket_name) {
	const m = socket_name.match(/^\@stetho_(.+)_devtools_remote$/) // TODO: cross fingers and hope it works !
	if(!m) {
		throw new Error(`Unexpected Stetho socket formatting: ${socket_name}`)
	}
	return m[1]
}


function _format_process_as_stetho_socket(stetho_process) {
	return `stetho_${stetho_process}_devtools_remote`
}

class AdbSmartSocketClient {
	constructor() {
		this.sock = null
	}

	async connect(port = 5037, host = 'localhost') {
		this.sock = net.connect(port, host)

		this.receivedData = Buffer.alloc(0)
		this.sock.on('data', (data) => {
			if (Buffer.isBuffer(data)) {
				this.receivedData = Buffer.concat([this.receivedData, data])
			} else if (typeof data === 'string') {
				this.receivedData = Buffer.concat([this.receivedData, Buffer.from(data)])
			}
		})
	}

	async write(data) {
		return new Promise(resolve => {
			this.sock.write(data, resolve)
		})
	}

	async read_input(n, tag) {
		return new Promise(async (resolve, reject) => {
			const start = new Date()
			// check each tick until we have received enough data
			while (this.receivedData.length < n) {
				const elapsed = new Date() - start
				if (elapsed >= READ_TIMEOUT) {
					reject(new Error(`Failed reading ${tag}. Expected ${n} bytes from buffer, waited ${READ_TIMEOUT}ms and only had ${this.receivedData.length} bytes in store`))
				}
				await nextTick()
			}

			// remove the asked length from our buffer and return it
			const consumed = this.receivedData.slice(0, n)
			this.receivedData = this.receivedData.slice(n)
			resolve(consumed)
		})
	}

	close(){
		this.sock.end()
	}

	async select_service(service) {
		// // select service
		// const serviceLengthAsHexString = pad(service.length.toString(16), 4, '0')
		// const msg1 = serviceLengthAsHexString + service
		// // s.write(Buffer.from(msg1, 'ascii').toString('ascii'))
		// s.write(msg1)

		// const status = await readInput(s, 4, "status")
		// if(status === "OKAY") {
		// 	// all good
		// } else if (status === "FAIL") {
		// 	const reasonLength = parseInt(await readInput(s, 4, "fail_reason"), 16)
		// 	const reason = await readInput(s, reasonLength, "fail reason lean")
		// 	throw new Error(reason)
		// } else {
		// 	throw new Error(`Unrecognized status=${status}`)
		// }

		console.log('select_service:', service)
		console.log('select_service:', service.length)
		const message = `${padLeft(service.length.toString(16), 4, '0')}${service}` // TODO: check this is correct
		await this.write(Buffer.from(message, 'ascii').toString('ascii')) // TODO: chelou
		console.log('hop')

		const status = await this.read_input(4, 'status')
		console.log('status:', status)

		if (status === 'OKAY') { // TODO: pas sur (en py c'est b'OKAY')
			// All good
			return
		} else if (status === 'FAIL') { // TODO: pas sur (en py c'est b'FAIL')
			const reason_len = parseInt(await this.read_input(4, 'fail reason'), 16)
			const reason = (await this.read_input(reason_len, 'fail reason lean')).toString('ascii') // TODO: vérifier la conversion ascii
			throw new Error(reason)
		} else {
			throw new Error(`Unrecognized status= ${status}`)
		}
	}
}

module.exports = {
	stetho_open
}