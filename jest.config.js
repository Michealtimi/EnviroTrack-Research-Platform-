/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  // ponytail: src imports use NodeNext-style ".js" specifiers for .ts files (tsc
  // resolves these natively); Jest's resolver doesn't, so strip the extension.
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
};
