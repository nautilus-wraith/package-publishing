'use strict';

/**
 * Returns a hello world greeting.
 * @param {string} [name='World'] - Name to greet
 * @returns {string}
 */
function hello(name = 'World') {
  return `Hello, ${name}!`;
}

module.exports = { hello };
