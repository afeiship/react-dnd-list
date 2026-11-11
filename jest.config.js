// https://jestjs.io/docs/en/configuration
export default {
  verbose: true,
  testRegex: [/\.spec.tsx/],
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
