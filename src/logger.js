const DEBUG = process.env['DEBUG']
const LOGGING_ENABLED = DEBUG === '*' || DEBUG === 'stetho-node'
module.exports = {
	log: (...args) => {
		if(LOGGING_ENABLED){
			console.log('stetho-node:', ...args)
		}
	},
	error: (...args) => {
		if(LOGGING_ENABLED) {
			console.error('stetho-node:', ...args)
		}
	}
}