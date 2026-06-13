# Pushpay Sync

A backend service designed to synchronize member and giving data from the Pushpay ChMS (formerly Church Community Builder) API into Firebase Firestore. Includes automated workflows for calculating weekly giving summaries and member statistics.

## Features

- **Member Synchronization**: Fetches individual records from Pushpay groups and maps them to Firestore documents with normalized fields (pledge, region, ministry, etc.).
- **Giving Synchronization**: Syncs transaction records from Pushpay and aggregates them into weekly giving summaries by member and region.
- **Weekly Giving Summaries**: Calculates comprehensive weekly giving statistics including contribution totals, net growth, and member participation rates.
- **Member Statistics**: Tracks pledge totals, member counts, and regional breakdowns stored in a dedicated statistics collection.
- **Idempotent Processing**: All sync operations are designed to be safely re-runnable without duplicating data.
- **Sync Monitoring**: Built-in monitoring and metrics tracking via Firestore sync state documents.
- **XML Data Normalization**: Utilities to handle complex XML structures and normalize them into consistent strings.
- **Efficient Batch Processing**: Uses chunked Firestore writes to handle large data sets safely within Firebase limits.
- **Super Region Mapping**: Automatically assigns members to "Super Regions" based on their specific region selection.

## Project Structure

- `src/clients`: Pushpay API client logic and authentication handling.
- `src/config`: Firebase configuration and initialization.
- `src/helpers`: XML parsing utilities, date helpers, and data normalizers.
- `src/services`: Core business logic for member sync, giving sync, and summary calculations.
- `src/types`: TypeScript interfaces and type definitions (including `Region` type).
- `src/utils`: Shared utilities for Firestore batch operations, sync monitoring, and caching.
- `src/env.ts`: Centralized environment variable management with full TypeScript typing.

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

### Required Environment Variables

| Variable                          | Description                                            |
| :-------------------------------- | :----------------------------------------------------- |
| `PUSHPAY_CHMS_API_BASE_URL`       | Base URL for the Pushpay ChMS API                      |
| `PUSHPAY_CHMS_API_USERNAME`       | Pushpay ChMS API username                              |
| `PUSHPAY_CHMS_API_PASSWORD`       | Pushpay ChMS API password                              |
| `PUSHPAY_GIVING_API_BASE_URL`     | Base URL for the Pushpay Giving API                    |
| `PUSHPAY_AUTH_TOKEN_API_BASE_URL` | Base URL for Pushpay OAuth token endpoint              |
| `PUSHPAY_AUTH_TOKEN_USERNAME`     | OAuth client ID for authentication                     |
| `PUSHPAY_AUTH_TOKEN_PASSWORD`     | OAuth client secret for authentication                 |
| `TRCSF_ORGANIZATION_ID`           | Your Pushpay organization ID                           |
| `FIREBASE_PROJECT_ID`             | Your Firebase project ID                               |
| `TENANT_ID`                       | Tenant identifier for multi-tenant Firestore structure |
| `TRCSF_WEEKLY_CONTRIBUTION_KEY`   | Fund key for weekly contribution transactions          |
| `TRCSF_BENEVOLENCE_KEY`           | Fund key for benevolence transactions                  |
| `TRCSF_SPECIAL_MISSIONS_KEY`      | Fund key for special missions transactions             |

### Optional Environment Variables

| Variable                         | Description                                                               | Default         |
| :------------------------------- | :------------------------------------------------------------------------ | :-------------- |
| `SYNC_TYPE`                      | Sync mode: `today`, `yesterday`, `weekly`, `all`, `only-modified`         | `yesterday`     |
| `PUSHPAY_RATE_LIMIT_MS`          | Rate limit delay between API calls (ms)                                   | `6000`          |
| `MAX_SYNC_STATE_TTL_DAYS`        | TTL for sync state documents (days)                                       | `30`            |
| `MAX_DAILY_USAGE_TTL_DAYS`       | TTL for daily usage tracking (days)                                       | `60`            |
| `TRANSACTION_TTL_DAYS`           | TTL for transaction documents (days)                                      | `30`            |
| `WEEKLY_GIVING_SUMMARY_TTL_DAYS` | TTL for weekly giving summary documents (days)                            | `90`            |
| `GITHUB_ACTION_CACHE_PATH`       | Path for GitHub Actions cache                                             | `process.cwd()` |
| `SYNC_FROM`                      | Manual override: start date for sync range (ISO format, requires SYNC_TO) | -               |
| `SYNC_TO`                        | Manual override: end date for sync range (ISO format, requires SYNC_FROM) | -               |

### Manual Date Range Overrides (SYNC_FROM / SYNC_TO)

The `SYNC_FROM` and `SYNC_TO` environment variables allow you to specify a custom date range for syncing, bypassing the `SYNC_TYPE` logic. When both are provided, they take precedence over `SYNC_TYPE`.

**Important notes:**

- **Both variables must be set together** — if only one is provided, it is ignored and `SYNC_TYPE` logic is used instead
- **Format**: ISO 8601 format (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss`)
- **Validation**:
  - Invalid date formats will throw an error
  - `SYNC_FROM` cannot be after `SYNC_TO`
- **Use case**: Useful for backfilling historical data, debugging specific date ranges, or manual corrections

**Examples:**

```bash
# Sync a specific week in March
SYNC_FROM=2024-03-01 SYNC_TO=2024-03-07 pnpm sync-giving

# Sync with full ISO timestamp (inclusive of entire end day)
SYNC_FROM=2024-01-01T00:00:00 SYNC_TO=2024-01-31T23:59:59 pnpm sync-giving

# Calculate summaries for a custom range
SYNC_FROM=2024-06-01 SYNC_TO=2024-06-30 pnpm calculate-summaries
```

## Development

### Testing

This project uses Vitest for unit testing.

```bash
# Run all tests
pnpm test

# Run tests with coverage reporting
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch

# Run integration tests (requires Java for Firebase Emulators)
pnpm test:integration
```

Testing thresholds are configured in `vitest.config.ts`:

- **Lines**: 85%
- **Functions**: 80%
- **Branches**: 60%
- **Statements**: 70%

### Running Syncs Locally

```bash
# Member sync
SYNC_TYPE=all pnpm sync-members

# Giving sync (requires SYNC_TYPE environment variable)
SYNC_TYPE=weekly pnpm sync-giving

# Calculate weekly summaries
pnpm calculate-summaries
```

## Scheduled Workflows

The service includes GitHub Actions workflows for automated execution:

- **Member Sync**: Runs on a schedule to keep member data up-to-date
- **Giving Sync**: Can be triggered manually or on schedule with configurable date ranges
- **Weekly Summaries**:
  - Daily at 4 AM UTC
  - Hourly on Sundays from 3 PM to 11 PM UTC (for end-of-week updates)
  - Manual dispatch with optional date range inputs

## Firestore Collections

- `tenants/{tenantId}/members`: Member documents with profile data, pledge, and region
- `tenants/{tenantId}/member_statistics/current`: Aggregated member statistics
- `tenants/{tenantId}/member_giving/{date}_{pushpayIndividualId}`: Weekly giving aggregates per member
- `tenants/{tenantId}/non_member_giving/{date}_{pushpayIndividualId}`: Weekly giving aggregates for non-members
- `tenants/{tenantId}/weekly_giving_summary/{sundayDate}`: Weekly summary statistics
- `tenants/{tenantId}/sync_state/{syncId}`: Sync operation state and metrics
- `tenants/{tenantId}/daily_usage/{date}`: Daily Firestore usage tracking

## Type Safety

All environment variables are centralized in `src/env.ts` with full TypeScript typing. The `Region` type defines valid normalized regions:

```typescript
type Region =
  | "San Mateo"
  | "San Francisco"
  | "San Jose"
  | "Berkeley"
  | "Contra Costa"
  | "Hayward"
  | "Unknown";
```
