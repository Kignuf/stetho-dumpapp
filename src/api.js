const struct = require('python-struct')
const {stetho_open} = require('./stetho_open')
const logger = require('./logger')
const {buildMsg, read_frame} = require('./utils')

class DumpApp {
	constructor(device, process) {
		this.device = device
		this.process = process
	}

	async sendCommand(plugin, command) {
		const adb = await stetho_open(this.device, this.process)
		await adb.write(buildMsg('DUMP', struct.pack('!L', 1)))

		// send command
		const params = [plugin, ...command.split(' ')]
		let enter_frame = buildMsg('!', struct.pack('!L', params.length))
		params.forEach(param => {
			enter_frame += struct.pack(
				`!H${param.length}s`,
				param.length,
				param
			)
		})
		await adb.write(enter_frame)

		// read response
		const { stdout, stderr } = await read_frame(adb)
		if (stderr) {
			throw new Error(stderr)
		}
		if (stdout) {
			return stdout
		}
	}
}

module.exports = DumpApp
