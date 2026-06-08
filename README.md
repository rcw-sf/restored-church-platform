# Restored Church Platform

A monorepo containing administrative tools and applications for the Restored Church.

## Project Structure

This repository is organized into frontend applications and backend services:

### Frontend Applications

- **[Admin Portal](./frontend/admin)**: A dashboard for managing church resources, financial oversight, and platform health.
- **[Deposit Counter](./frontend/deposit-counter)**: A utility for volunteers to accurately count and document physical cash and check deposits.

### Backend Services

- **[Pushpay Sync](./backend/pushpay-sync)**: A Node.js service that synchronizes member and giving data from the Pushpay ChMS API into Firebase Firestore. Includes scheduled workflows for weekly giving summaries and member statistics.

### Shared Packages

- **[Rules Package](./shared/rules)**: Contains modular Firestore rules slices, a compilation script (`build-rules.js`), and a dedicated unit testing suite.

## Technology Stack

- **Package Manager**: [pnpm](https://pnpm.io/)
- **Frontend**: React + Vite + TypeScript
- **Backend**: Node.js + TypeScript
- **Styling**: Tailwind CSS + daisyUI
- **Backend/Database**: Firebase Firestore
- **Testing**: Vitest + React Testing Library
- **Scheduling**: GitHub Actions (for automated sync workflows)

## Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- pnpm

### Installation

1.  Clone the repository and install dependencies:
    ```bash
    pnpm install
    ```
2.  **Configure Environment Variables**:
    - **Admin Portal**: Copy the example file and fill in your keys:
      ```bash
      cp frontend/admin/.env.example frontend/admin/.env
      ```
    - **Pushpay Sync**: Copy and configure the backend environment:
      ```bash
      cp backend/pushpay-sync/.env.example backend/pushpay-sync/.env
      ```
      Then authenticate with Google Cloud for Firestore access:
      ```bash
      gcloud auth application-default login
      ```

### Development

You can start the development servers for specific applications directly from the root using these commands:

- **Admin Portal (Local Emulator Mode)**: `pnpm admin` (Starts the local Firebase Emulator Suite and launches the Vite dev server concurrently, then handles clean shutdown on exit)
- **Admin Portal (Production Mode)**: `pnpm admin:prd` (Starts the Vite dev server pointed directly to your production Firebase project)
- **Deposit Counter**: `pnpm deposit-counter`
- **Main App**: `pnpm main`

#### Firebase Emulator Suite

A local Firebase Emulator Suite is configured for offline development, local rules testing, and database isolation.

- **Pre-seeded Data**: The repository commits development seed data in the `./emulator-data` directory (which **should be committed to Git** to keep local dev states in sync).
  - **Super Admin**: `admin@restoredsf.org`
  - **Regular Admin**: `admin-regular@restoredsf.org`
  - **Editor**: `editor@restoredsf.org`
  - Includes mock member records under `tenants/san-francisco/members` and a public finance dashboard document.
- **Testing Auth/Sign In locally**: Click **"Sign in with Google"** on the login page, then select one of the pre-seeded accounts from the list in the mock Google Auth popup window.
- **Start Emulators manually**: Run `pnpm emulator` (or `npx firebase emulators:start --import=./emulator-data`) from the root.
- **Emulator UI Dashboard**: Accessible at `http://localhost:4000` once started.

#### Root-level Commands

- **Install dependencies**: `pnpm install`
- **Run all tests**: `pnpm test`
- **Lint**: `pnpm lint`
- **Format**: `pnpm format`

#### Backend Services

The Pushpay Sync service provides scripts for synchronizing data from the Pushpay API to Firestore:

```bash
# Sync members from Pushpay ChMS
# SYNC_TYPE can be 'all' or 'only-modified'
SYNC_TYPE=all pnpm pushpay-sync:members

# Sync giving transactions
# SYNC_TYPE can be 'weekly', 'yesterday' or 'today'
SYNC_TYPE=weekly pnpm pushpay-sync:giving

# Calculate weekly giving summaries
pnpm pushpay-sync:calculate-summaries
```

### Testing

The project includes comprehensive test suites for all applications:

- **Run all tests**: `pnpm test` (Runs frontend, backend, and Firestore rules tests recursively)
- **Rules unit tests**: `pnpm test:rules` (Runs security rules assertions locally)
- **Watch mode (Admin)**: `pnpm test:admin:watch`
- **Watch mode (Deposit Counter)**: `pnpm test:deposit-counter:watch`
- **Coverage report**: `pnpm test:coverage`
- **Backend tests**: `pnpm test:pushpay-sync`
- **Integration tests**: `pnpm test:integration`

### Deployment

Deployments are handled via Firebase Hosting. The following commands build the project and deploy it automatically:

```bash
pnpm deploy:admin
pnpm deploy:deposit-counter
```

### Code Quality

To maintain code standards, use the following commands:

- **Linting**: `pnpm lint`
- **Formatting**: `pnpm format` (uses Prettier)
- **Format Check**: `pnpm format:check`

## Contributing

Contributions are welcome! Please open an issue or create a pull request to propose changes or additions to the platform.

1. Ensure your code passes linting: `pnpm lint`
2. Ensure all tests pass: `pnpm test`
3. Format your code: `pnpm format`

---
