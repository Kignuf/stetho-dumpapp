// console.log(process.argv.slice(2, process.argv.length))

const readLine = require('readline')

const rl = readLine.createInterface({
	input: process.stdin,
	output: process.stdout
})

rl.question('Hop ?', (answer) => {
	console.log('You answered', answer)
})