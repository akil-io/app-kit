const { ResourceLoader } = require('./lib/loader');
const { Application } = require('./lib/app');

/**
 * Autostart application with given config and api
 * @param  {Object} config [description]
 * @param  {Object} api    [description]
 * @return {[type]}        [description]
 */
function autostart(mode = null, config = {}, api = {}) {
	return Application.start(ResourceLoader.getInstance(mode), config, api);
}

// If user application do not have own index.js file autostart app with default params
if (!module.parent) {
	autostart();
}

module.exports = {
	Application,
	ResourceLoader,
	autostart
};