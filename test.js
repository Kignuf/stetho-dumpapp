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
const util = require('util')
const nextTick = util.promisify(process.nextTick)

async function main() {
	let n = 0
	while(n < 10) {
		n += 1
		await nextTick()
		console.log(n)
	}
	n+=10
	console.log(n)
}

main()