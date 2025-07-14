# E2E Tests

Integration tests for the SaveIt.now application using Playwright.

## Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   npx playwright install chromium
   ```

2. **Environment Variables**:
   Make sure you have all required environment variables set up in your `.env` file. The tests require:
   - `DATABASE_URL` - PostgreSQL database connection
   - `BETTER_AUTH_SECRET` - Secret for Better Auth
   - `PLAYWRIGHT_TEST_BASE_URL` - Base URL for tests (defaults to http://localhost:3000)
   - All other environment variables listed in `turbo.json`

3. **Database Setup**:
   The tests use the same database as the application. Make sure your database is set up and migrations are run:
   ```bash
   pnpm db:migrate
   ```

## Running Tests

### Local Development (with UI)
```bash
pnpm test:e2e
```

### CI/Headless Mode
```bash
pnpm test:e2e:ci
```

### Running Specific Tests
```bash
pnpm test:e2e auth.spec.ts
```

## Test Structure

- **`global-setup.ts`** - Sets up test data before all tests run
- **`global-teardown.ts`** - Cleans up test data after all tests complete
- **`utils/`** - Helper functions for tests
  - `auth-test.ts` - Authentication helpers
  - `database.ts` - Database utilities  
  - `test-data.ts` - Test data generation
- **`tests/`** - Test files
  - `auth.spec.ts` - Authentication flow tests

## Test Features

### Global Setup/Teardown
- Creates a main test user with predictable credentials
- Seeds test bookmarks and tags
- Cleans up all test data (prefixed with "playwright-test-")

### Authentication Tests
- Verifies unauthenticated users are redirected from `/app` to `/signin`
- Tests signin page functionality
- Validates email/OTP form behavior
- Tests navigation between form steps

### Database Integration
- Uses real database (no mocking)
- Isolated test data with predictable prefixes
- Automatic cleanup after tests

## Environment Variables

Set `PLAYWRIGHT_TEST_BASE_URL` if you want to test against a different server:
```bash
PLAYWRIGHT_TEST_BASE_URL=https://staging.saveit.now pnpm test:e2e:ci
```

## Troubleshooting

1. **Database connection errors**: Make sure `DATABASE_URL` is set and database is accessible
2. **Build failures**: Ensure all environment variables from `turbo.json` are configured
3. **Auth errors**: Verify `BETTER_AUTH_SECRET` is set
4. **Server startup timeout**: Increase timeout in `playwright.config.ts` if needed

## Future Enhancements

- OTP code testing with email verification bypass
- OAuth flow testing
- Bookmark management tests  
- API endpoint testing