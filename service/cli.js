const _ = require('lodash');

module.exports = async function (config, api, call) {
  return {
      state: {
      	ready: true
      },
      env: {
      	log: (msg) => { console.log(Date.now() + ': ' + msg); }
      },
      startup: () => {
      	console.log('Application started...');
        let apiName = config.loader.cliApi;
        let args = config.loader.cliArgs;

        if (config.loader.isCli) {
          if (api[apiName].emulateHttp) {
            args = {
              req: {
                body: args
              },
              user: {
                _id: null
              }
            };
          }
          if (_.isPlainObject(args)) args = [args];

          call(apiName, ...args)
            .then(result => {
              console.log(`\nRESULT: `, result);
            })
            .catch(err => {
              console.log(`\nERROR: `, err);
            });
        }
      },
      shutdown: () => {
      	console.log('Application stopped.');
      }
    };
};