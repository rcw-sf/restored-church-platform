# Pushpay Sync

A backend service designed to synchronize member data from the Pushpay ChMS (formerly Church Community Builder) API into Firebase Firestore.

## Features

- **Automated Synchronization**: Fetches individual records from specific Pushpay groups and maps them to Firestore documents.
- **XML Data Normalization**: Utilities to handle complex XML structures (e.g., tags returned as object maps with `#text` properties) and normalize them into consistent strings.
- **Efficient Batch Processing**: Uses chunked Firestore writes to handle large data sets safely within Firebase limits.
- **Super Region Mapping**: Automatically assigns members to "Super Regions" based on their specific region selection.

## Project Structure

- `src/clients`: Contains the Pushpay API client logic and authentication handling.
- `src/helpers`: Logic for parsing Pushpay XML responses into typed JSON objects.
- `src/services`: The core business logic that orchestrates fetching, mapping, and committing data to Firestore.
- `src/utils`: Shared utilities for data normalization and Firestore batch management.

## Configuration

### Environment Setup

1. **Local Environment File**: Copy the example environment file to create your local configuration:

   ```bash
   cp .env.example .env
   ```

2. **Google Cloud Authentication**: This service uses Application Default Credentials (ADC) to interact with Firestore. For local development, ensure you have the Google Cloud CLI installed and run the following command to authenticate:
   ```bash
   gcloud auth application-default login
   ```

The following environment variables must be injected (e.g., via your `.env` file) for the service to function:

| Variable                    | Description                                      |
| :-------------------------- | :----------------------------------------------- |
| `PUSHPAY_CHMS_API_USERNAME` | Your Pushpay ChMS API username.                  |
| `PUSHPAY_CHMS_API_PASSWORD` | Your Pushpay ChMS API password.                  |
| `PUSHPAY_CHMS_API_BASE_URL` | The base URL for your Pushpay ChMS API instance. |
| `FIREBASE_PROJECT_ID`       | Your Firebase project ID.                        |

## Development

### Testing

This project uses Vitest for unit testing.

```bash
# Run all tests
pnpm test

# Run tests with coverage reporting
pnpm test:coverage
```

Testing thresholds are configured in `vitest.config.ts` to maintain high reliability:

- **Lines**: 85%
- **Functions**: 80%
- **Branches**: 60%
- **Statements**: 70%
