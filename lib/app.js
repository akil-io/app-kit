let Wrapper = require('./wrap');
const util = require('util');
const path = require('path');
const _ = require('lodash');

let appInstance = null;

class Application {
  constructor(loader) {
    this.loader = loader;
    this.api = {};
    this.env = {};
    this.service = {};
    this.hook = {
      startup: [],
      shutdown: []
    };

    this.apiContext = null;
    this.serviceApiConfigs = {};
  }

  static start(loader, config = {}, api = {}) {
    return Application.getInstance(loader).init(
      _.defaultsDeep(loader.getResource("config", loader.mode) || {}, config),
      _.defaultsDeep(loader.getResource("api") || {}, api),
      loader.isCli
    ).then((app) => {
      app.hook.startup.map(hook => hook());
      //process.stdin.resume();//so the program will not close instantly

      const exitHandler = (options, err) => {
          app.hook.shutdown.map(hook => hook());

          if (err) console.log(err.stack);
          if (options.exit) process.exit();
      };

      //do something when app is closing
      process.on('exit', exitHandler.bind(null,{cleanup:true, exit:true}));
      //catches uncaught exceptions
      process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

      //catches ctrl+c event
      process.on('SIGINT', exitHandler.bind(null, {exit:true}));

      if (!loader.isCli) {
        // catches "kill pid" (for example: nodemon restart)
        process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
        process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));
      }

      return app;
    });
  }
  async init(config, api, cliMode) {
    let ignore = (cliMode && config.service && config.service.cli && config.service.cli.ignore) ? config.service.cli.ignore : {};

    this.initAPI(config.api, api);
    await this.initService(config.service, ignore.service || []);
    await this.initENV(config.env);

    return this;
  }
  async initAPI(config, api, parent = null) {
    for (let apiName of Object.keys(config)) {
      let apiModule = api[apiName];
      if (!apiModule) {
        await this.initAPI(config[apiName], this.loader.getResource("api", apiName), apiName);
        continue;
      }

      let apiVarName = parent ? `${parent}.${apiName}` : apiName;

      this.register("api", apiVarName, config[apiName], new Wrapper(
        apiVarName, config[apiName], apiModule, this.getENV.bind(this, apiName)
      ));
    }
  }
  async initService(config, ignore = []) {
    for (let serviceName of Object.keys(config)) {
      let [serviceVarName, serviceModule] = serviceName.split(":");
      if (!serviceModule) {
        serviceModule = serviceName;
        serviceVarName = serviceName;
      }
      
      if (ignore.indexOf(serviceVarName) !== -1) {
        return;
      }

      let instance = await this.loader.getResource("service", serviceModule)(
        Object.assign(config[serviceName], {
          loader: this.loader,
          app: this
        }),
        this.getServiceApiConfigs(serviceVarName),
        this.call.bind(this)
      );
      
      this.register("service", serviceVarName, config[serviceName], instance.state || {});
      if (instance.env) {
        this.register("env", serviceVarName, config[serviceName], instance.env);
      }
      if (instance.startup) {
        this.hook.startup.push(instance.startup);
      }     
      if (instance.shutdown) {
        this.hook.shutdown.push(instance.shutdown);
      }             
    }
  }
  async initENV(config) {
    for (let envName of Object.keys(config)) {
      let [envVarName, envModule] = envName.split(":");
      if (!envModule) {
        envModule = envName;
        envVarName = envName;
      }
      
      let instance = await this.loader.getResource("env", envModule)(Object.assign(config[envName], {
          loader: this.loader,
          app: this
      }));
      this.register("env", envVarName, config[envName], instance);
    }

    let env = Object.keys(this.env)
      .map(name => { return {name, instance: this.env[name].instance } })
      .reduce((result, val) => {
        return Object.assign(result, {
          [val.name]: val.instance
        });
      }, {});
    env.api = Object.keys(this.api)
      .map(name => { return {name, instance: this.call.bind(this, name)} })
      .reduce((result, val) => {
        return Object.assign(result, {
          [val.name]: val.instance
        });
      }, {});

    this.apiContext = env;
  }
  getENV(forAPI) {
    return this.apiContext;
  }
  register(type, name, config, instance) {
      _.set(this[type], name, {
        config: config,
        instance: instance
      });

      if (type == "api") {
        for (let serviceName in config) {
          if (!this.serviceApiConfigs[serviceName]) {
            this.serviceApiConfigs[serviceName] = {};
          }
          this.serviceApiConfigs[serviceName][name] = config[serviceName];
        }
      }
  }
  getServiceApiConfigs(serviceName) {
    return this.serviceApiConfigs[serviceName];
  }
  call(apiName, ...args) {
    return _.get(this.api, apiName).instance.exec(args);
  }
  static getInstance(loader) {
    if (!appInstance) {
      appInstance = new Application(loader);
    }
    return appInstance;
  }
}

module.exports.Application = Application;