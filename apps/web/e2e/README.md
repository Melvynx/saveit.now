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
   - `BETTER_AUTH_SECRET` - Secret for Better Auth
   - `PLAYWRIGHT_TEST_BASE_URL` - Base URL for tests (defaults to http://localhost:3000)
   - All other environment variables listed in `turbo.json`

3. **Backend Setup**:
   Start the app against the intended Convex deployment before running authenticated tests.

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
- **`utils/`** - Helper functions for tests
  - `auth-test.ts` - Authentication helpers
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

## Environment Variables

Set `PLAYWRIGHT_TEST_BASE_URL` if you want to test against a different server:
```bash
PLAYWRIGHT_TEST_BASE_URL=https://staging.saveit.now pnpm test:e2e:ci
```

## Troubleshooting

1. **Build failures**: Ensure all environment variables from `turbo.json` are configured
2. **Auth errors**: Verify `BETTER_AUTH_SECRET` is set
3. **Server startup timeout**: Increase timeout in `playwright.config.ts` if needed

## Future Enhancements

- OTP code testing with email verification bypass
- OAuth flow testing
- Bookmark management tests  
- API endpoint testing
