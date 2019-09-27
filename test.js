// console.log(process.argv.slice(2, process.argv.length))

// ---------

// const readLine = require('readline')

// const rl = readLine.createInterface({
// 	input: process.stdin,
// 	output: process.stdout
// })

// rl.question('Hop ?', (answer) => {
// 	console.log('You answered', answer)
// })

// ---------
// const util = require('util')
// const nextTick = util.promisify(process.nextTick)

// async function main() {
// 	let n = 0
// 	while(n < 10) {
// 		n += 1
// 		await nextTick()
// 		console.log(n)
// 	}
// 	n+=10
// 	console.log(n)
// }

// main()

// --------
const net = require('net')

async function main() {
	const s = net.connect(5037, 'localhost')
	// const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
	s.on('data', (data) => {
		console.log('COUCOU', data)
	})

	s.on('ready', () => {
		console.log('ready')
	})
	s.write('0012host:transport-any')


	// process.on('beforeExit', () => {
	// 	console.log('pipo')
	// 	// sleep(10)
	// })
}

main()
