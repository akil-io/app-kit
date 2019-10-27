const path = require('path');
const argv = require('yargs').argv;
const _ = require('lodash');
const fs = require('fs');

class ResourceLoader {
	constructor() {
		this.cwd = process.cwd();
		this.appFile = module.parent.parent ? module.parent.parent.filename : module.parent.filename;
		this.app = path.dirname(this.appFile);
		this.libName = require('../package.json').name;
		this.lib = path.dirname(module.parent.filename);
		this.libPlugins = Object.keys(require(path.join(this.app, 'package.json')).dependencies).filter(name => name.indexOf(this.libName) !== -1);

		this.argv = require('yargs').argv;
		this.mode = 'index';

		if (argv.cli) {
			this.isCli = true;
			let [cliMode, apiName] = argv.cli.split(":");
			if (apiName != undefined) {
				this.mode = cliMode;
			} else {
				apiName = cliMode;
			}

			this.cliApi = apiName;
			this.cliArgs = null;

			if (this.argv._.length == 0) {
				this.cliArgs = Object.keys(this.argv).filter(key => ['_', '$0', 'cli'].indexOf(key) == -1).reduce((a, c) => Object.assign(a, {
					[c]: this.argv[c]
				}),{});
			} else {
				this.cliArgs = this.argv._.map(arg => {
					try { return JSON.parse(arg); }
					catch (err) { return arg; }
				});
			}
		} else {
			this.isCli = false;
			this.mode = process.argv[process.argv.length - 1];
			if (this.mode == this.appFile) this.mode = 'index';
		}
	}

	resolveModule(type, target) {
		let npmModuleName = `${this.libName}-${type}-${target}`;
		let lookupPath = [this.cwd, this.app, this.lib];
		try {
			return require.resolve(npmModuleName, lookupPath);
		} catch (err) {
			for (let base of lookupPath) {
				let lookupVariants = [
					path.join(base, type, `${target}.js`),
					path.join(base, type, `${target}`, 'index.js')
				];
				for (let p of lookupVariants) {
					try {
						fs.statSync(p);
						return p;
					} catch (err) {}
				}
			}
		}
		return null;
	}

	getResource(type, target = 'index') {
		let resPath = this.resolveModule(type, target);
		//console.log(`load ${type}:${target} from ${resPath}`);
		return require(resPath);
	}
}

const instance = new ResourceLoader();

module.exports = instance;