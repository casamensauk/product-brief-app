// Runs before each integration test file. Points Prisma at the test database
// and provides auth env so the better-auth handlers can run. When
// TEST_DATABASE_URL is absent the suites skip themselves (see hasTestDb).
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.DATABASE_URL_UNPOOLED = process.env.TEST_DATABASE_URL
}
process.env.BETTER_AUTH_SECRET ||= "integration-test-secret-not-for-production-000"
process.env.BETTER_AUTH_URL ||= "http://localhost:3000"
