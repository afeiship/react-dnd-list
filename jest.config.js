// https://jestjs.io/docs/en/configuration
export default {
  verbose: true,
  testRegex: [/\.spec\.tsx?$/],
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  transformIgnorePatterns: ['/node_modules/(?!@jswork/react-list)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
