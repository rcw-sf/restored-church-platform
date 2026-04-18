# Restored Church Platform

A monorepo containing administrative tools and applications for the Restored Church.

## Project Structure

This repository is organized into several specialized frontend applications:

- **[Admin Portal](./frontend/admin)**: A dashboard for managing church resources, financial oversight, and platform health.
- **[Deposit Counter](./frontend/deposit-counter)**: A utility for volunteers to accurately count and document physical cash and check deposits.

## Technology Stack

- **Package Manager**: [pnpm](https://pnpm.io/)
- **Frontend**: React + Vite + TypeScript
- **Styling**: Tailwind CSS + daisyUI
- **Backend/Database**: Firebase Firestore
- **Testing**: Vitest + React Testing Library

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
    The Admin Portal requires Firebase configuration. Copy the example file and fill in your keys:
    ```bash
    cp frontend/admin/.env.example frontend/admin/.env
    ```

### Development

You can start the development servers for specific applications directly from the root using these commands:

- **Admin Portal**: `pnpm admin`
- **Deposit Counter**: `pnpm deposit-counter`
- **Main App**: `pnpm main`

### Testing

The project includes comprehensive test suites for all applications:

- **Run all tests**: `pnpm test`
- **Watch mode (Admin)**: `pnpm test:admin:watch`
- **Watch mode (Deposit Counter)**: `pnpm test:deposit-counter:watch`
- **Coverage Report**: `pnpm test:coverage`

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
