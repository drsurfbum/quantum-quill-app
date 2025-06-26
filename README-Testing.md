# Authentication Testing Guide

This project includes a comprehensive automated authentication test suite that replaces the previous manual token authentication testing.

## Test Suite Components

### 1. Core Authentication Tests (`tests/auth.test.ts`)
- User registration and validation
- Login/logout functionality  
- Session-based authentication
- Token-based authentication
- Protected route access control
- Development mode bypass testing

### 2. Integration Tests (`tests/auth-integration.test.ts`)
- End-to-end authentication flows
- Concurrent authentication handling
- Session persistence across requests
- Token and session preference handling
- Error handling and edge cases

### 3. Token Validation Tests (`tests/token-validation.test.ts`)
- Token format validation
- Security injection attempt protection
- Token generation compatibility
- Authorization header handling
- Edge case token processing

### 4. Password Security Tests (`tests/password-security.test.ts`)
- Password hashing with unique salts
- Plain text password protection
- Password verification accuracy
- Timing attack protection
- Password strength handling

## Running Tests

The test suite uses Jest with TypeScript support and ES modules configuration.

### Available Test Commands
```bash
# Run all authentication tests
npx jest tests/

# Run specific test file
npx jest tests/auth.test.ts

# Run tests with verbose output
npx jest --verbose

# Run tests in watch mode
npx jest --watch
```

### Test Infrastructure
- **Jest Configuration**: ES module support with TypeScript integration
- **Test Setup**: Database connection management and cleanup
- **Test Environment**: Node.js environment with authentication middleware
- **Coverage**: Comprehensive authentication flow and security testing

## Authentication Methods Tested

### Session-Based Authentication
- Cookie-based session management
- Session validation and expiration
- Cross-request session persistence
- Session cleanup on logout

### Token-Based Authentication
- Bearer token format validation
- Token parsing and user extraction
- Authorization header processing
- Token security validation

### Development Mode
- Authentication bypass in development
- Development user creation
- Environment-specific behavior

## Security Testing Coverage

### Password Security
- Unique salt generation per password
- Secure password hashing (scrypt)
- Password verification timing consistency
- Plain text password prevention

### Token Security
- SQL injection attempt protection
- XSS attempt validation
- Authorization header manipulation
- Token format enforcement

### Edge Cases
- Malformed request handling
- Missing authentication data
- Concurrent authentication attempts
- Session tampering protection

## Migrating from Manual Testing

The automated test suite replaces the previous `token-auth-test.js` manual testing script with:

1. **Comprehensive Coverage**: All authentication scenarios covered automatically
2. **Consistent Results**: Eliminates manual testing variability
3. **Security Validation**: Automated security vulnerability testing
4. **Integration Testing**: End-to-end flow validation
5. **Regression Prevention**: Automated validation of authentication changes

## Test Database Management

Tests use the same database configuration as the main application with:
- Automatic test data cleanup where possible
- Isolated test user creation with timestamps
- Database connection lifecycle management
- Test-specific environment handling

Note: Some test users may remain in the database for manual cleanup as the storage interface doesn't include user deletion methods.