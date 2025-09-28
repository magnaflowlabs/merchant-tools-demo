# MagnaFlow Merchant Tools
A powerful blockchain merchant tool management platform designed specifically for cryptocurrency merchants, providing comprehensive wallet management, fund collection, and payment solutions.

## 🚀 Quick Start

### Requirements

- Node.js 20+
- npm or pnpm

### Install Dependencies

```bash
# Using npm
npm install

# Or using pnpm (recommended)
pnpm install
```

### Start Development Server

```bash
npm run dev
# or
pnpm dev
```

The application will start at `http://localhost:5173`

### Build for Production

```bash
npm run build
# or
pnpm build
```

### Code Linting

```bash
npm run lint
# or
pnpm lint
```

#### WebSocket Connection

- WebSocket connection is automatically established after login
- Connection URL format: `ws://<host>/ws`
- Authentication token is automatically saved to localStorage after successful authentication

#### Blockchain Network Configuration

- **Mainnet**: TRON Mainnet
- **Testnet**: TRON Nile Testnet
- Supports multi-chain configuration and switching

## 📖 User Guide

### Wallet Management

1. **Create Wallet**: Administrators can create new wallets through a wizard-guided process
2. **Import Wallet**: Supports importing Keystore files in standard JSON format
3. **Connect Wallet**: Supports connecting various mainstream wallet adapters

### Fund Collection

1. Set collection threshold (default: 1 USDT)
2. Configure target collection address
3. Enable automatic collection feature
4. Monitor collection status and history

### Payment Tools

1. View pending payment orders
2. Select individual or batch orders
3. Configure automatic payment rules
4. Track payment execution status

## 🤝 Contributing

We welcome Issues and Pull Requests to improve the project.

## 📄 License

This project is licensed under an open source license. See the LICENSE file for details.
