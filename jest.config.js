export default {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: { module: "CommonJS", target: "ES2022", esModuleInterop: true, types: ["node", "jest"], jsx: "react-jsx" } }] },
  moduleNameMapper: { "^@shared/(.*)$": "<rootDir>/shared/$1", "^@/(.*)$": "<rootDir>/client/src/$1" },
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testTimeout: 15000,
};
