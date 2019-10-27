class Wrapper {
  constructor(name, config, func, getENV) {
    this.name = name;
    this.config = config;
    this.func = func;
    this.getENV = getENV;

    this.isShort = this.func.toString().substr(0, 14).indexOf('function') == -1;
    this.isAsync = this.constructor.name == 'AsyncFunction';
  }

  async exec(args) {
    args = [this.getENV(), ...args];

    return this.func(...args);
  }
}

module.exports = Wrapper;