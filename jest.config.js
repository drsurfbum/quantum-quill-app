export default {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  transform: { "^.+\\.m?js$": ["ts-jest", { tsconfig: { module: "CommonJS", target: "ES2022", allowJs: true, esModuleInterop: true }, diagnostics: false }], "^.+\\.tsx?$": ["ts-jest", { tsconfig: { module: "CommonJS", target: "ES2022", esModuleInterop: true, types: ["node", "jest"], jsx: "react-jsx" } }] },
  // Modern sanitizer dependencies ship ESM; transpile only that dependency chain
  // for Jest's CommonJS harness. Production runs their native Node 24 modules.
  transformIgnorePatterns: ["node_modules/(?!(?:.*node_modules/)?(?:htmlparser2|entities|domhandler|domelementtype|domutils|dom-serializer)/)"],
  moduleNameMapper: { "^@shared/(.*)$": "<rootDir>/shared/$1", "^@/(.*)$": "<rootDir>/client/src/$1" },
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testTimeout: 15000,
};
