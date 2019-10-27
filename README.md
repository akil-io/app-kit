# app-kit
Application resource loader library

Main features:
- load application modules by named configuration
- split modules to **service -> api -> env** architecture
- service accept requests and call api
- api is business logic only
- env used in api for doing what you need
- pluggable architecture

## Installation
1. We recommend using yarn insted of npm.
```bash
yarn add @akilio/app-kit
```
2. Create **index.js** file with next content:
```js
require('@akilio/app-kit').autostart();
```
3. Add this to your **package.json** scripts section:
```json
"scripts": {
    "start": "node index.js",
    "cli": "node index.js --cli",
  },
```
4. Create **api/index.js** file with exported functions^
```js
function example(env, message) {
	console.log(`Your message is "${message}"`);
}
module.exports = {
	example
};
```

5. Create **config/index.js** file with content:
```js
module.exports = {
	service: {
		cli: {}
	},
	env: {},
	api: {
		example: { cli: {}}
	}
};
```
Your are ready to run! Call function with next command:
```bash
yarn cli example "Hello!"
```

## Building blocks
### Service
This type of modules needed for interacting with external services, accept requests, keep connections and etc. For example this can be http-server, database or queue connection manager.

Service modules placed in **service** directory of your app or can be installed as npm module with names started with **app-kit-service-**.

Base service module (**service/service_test.js**) looked like this:
```js
/**
 * Service bootloader function
 * @param  {[type]} config configuration options for your service from configs
 * @param  {[type]} api    list of available api with configs for this service
 * @param  {[type]} call   callback for calling api
 * @return {[type]}        Object
 */
module.exports = async function (config, api, call) {
	// do initialization here...
	for (let apiName in api) { // for example call given apis periodicaly
		setInterval(() => call(apiName, ...api[apiName].args), api[apiName].interval);
	}

	return {
		state: {}, // any state variables associated with service (for monitoring only)
		env: {}, // functions available to call from api by env.<service name>.<function name>
		startup: () => {}, //hook, called when application loaded and ready to start
		shutdown: () => {} //hook, called before application exit
	};
};
```

### Env
This is needed for excluding from api code worked with external enviroinment. For example FileSystem, web-service api, mailing, image conversion and etc.

Env modules placed in **env** directory of your app or can be installed as npm module with names started with **app-kit-env-**.

Base env module (**env/env_test.js**) looked like this:
```js
/**
 * Env bootloader function
 * @param  {[type]} config configuration options for your module from configs
 * @return {[type]}        Object
 */
module.exports = async function (config) {
	// do initialization here...

	return {
		test: () => {} // any function for your api
	};
};
```

### Api
This is your business logic only code, do not place this anything like remote service calls, data transformations and other staff. Keep it clean and you will get highly reusable code.

API modules placed in **api** directory of your app or can be installed as npm module with names started with **app-kit-api-**.

Base env module looked like this:
```js
module.exports = { // you need to export some functions
	/**
	 * Example API function
	 * @param  {[type]}    env   loaded and configured env modules
	 * @param  {...[type]} other any arguments you want
	 * @return {[type]}          anything
	 */
	example: function (env, ...other) {} // sync or async function,
	exampleAsync: async function (env, a, b) {
		env.env_test.test();
		env.cli.log(`exampleAsync called with ${a} and ${b}`);
		return a + b;
	}
};
```

### Config
With config you can control which modules loaded and config for them.

You have 3 sections in config file: service, env, api.

Example config:
```js
module.exports = {
	service: {
		service_test: {
			configVar1: "<anything>"
		}
	},
	env: {
		env_test: {
			configVar2: "<anything>"
		}
	},
	api: {
		// functions exported from "api/index.js" file
		example: {
			cli: {} //available for service cli
		},
		exampleAsync: {
			cli: {},
			service_test: { //available for service "service_test"
				interval: 3000,
				args: [1,2]
			}
		},
		other_module: {
			// functions from "api/other_module.js" file
			other_function: {} //available only for another api functions
		}
	}
};
```

You can rename loaded modules, for example in **index.js** config you have this:
```js
module.exports = {
	service: {
		"db:mongodb": {}
	}
};
```
And in **local.js** config thix:
```js
module.exports = {
	service: {
		"db:tingo": {}
	}
};
```

In api function code you will call function as **env.db.find(...)**, but when you start with **yarn start** your code will work with mongodb, but when you start with **yarn start local** you will work with tingodb fs database.
