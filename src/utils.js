const struct = require('python-struct')

function buildMsg(msg, struct) {
	const msgDump = Buffer.from(msg)
	return Buffer.concat([msgDump, struct], msgDump.length + struct.length).toString()
}

async function read_frame(adb) {
	// All frames have a single character code followed by a big-endian int
	const code = await adb.read_input(1, 'code')
	const data = await adb.read_input(4, 'int4', false)
	const n = struct.unpack('!L', data)[0]

	if (code === '1') {
		if (n > 0) {
			return {
				stdout: await adb.read_input(n, 'stdout blob')
			}
		}
	} else if (code === '2') {
		if (n > 0) {
			return {
				stderr: await adb.read_input(n, 'stderr blob')
			}
		}
	} else if (code === '_') {
		if (n > 0) {
			// TODO: user should provide info, see python implementation below for reference
			// BEGIN Python excerpt
			// data = sys.stdin.buffer.read(n)
			// if len(data) == 0:
			// sock.send(b'-' + struct.pack('!L', -1))
			// else:
			// sock.send(b'-' + struct.pack('!L', len(data)) + data)
			// END Python excerpt
			throw new Error('Not implemented')
		}
	} else if (code === 'x') {
		return { end: true }
	} else {
		return { end: true }
	}
}

module.exports = {
	buildMsg,
	read_frame
}