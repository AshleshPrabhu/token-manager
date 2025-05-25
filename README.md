# TOKEN MANAGER  -   A Decentralized Token Management System for Solana

## Introduction

Token-Manager is a decentralized token management system built on the Solana blockchain. It allows users to manage their tokens securely and efficiently, providing a seamless experience for both the user and the developer.
With Token-Manager, users can easily create, manage, and transfer their tokens, while the developer can build applications that interact with the token management system.

## Features

- **Token Creation**
  - Custom token creation
  - Token minting
  - Token transfer

- **Token 22 Program**
  - Token management with metadata using token 22 program
  - Fetch token metadata using token 22 program

- **Wallet Integration**
  - Display wallet balance
  - Connect to Solana wallets (Phantom, Sollet, etc.)
  - Display token balances in the wallet
  - Sign message
  - Airdrop Sol

- **Comming Soon**
  - Swap Tokens
  - Stake Tokens (using liquidity pools)

## Tech Stack

- **Frontend**
  - Reactjs 18
  - Tailwind CSS
  - JavaScript

- **UI/UX**
  - Responsive design
  - Dark/Light theme
  - Smooth animations
  - Accessible components

- **Services**
  - @solana/web3.js (Blockchain Integration)
  - @solana/wallet-adapter-react (Wallet Integration)
  - pinata-web3 (IPFS Storage)

## Getting Started

1. **Clone the repository**

    ```bash
    git clone https://github.com/yourusername/token-manager.git
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Run the development server**

    ```bash
    npm run dev
    ```

4. **Open the application**
    Navigate to `http://localhost:5173`

## Project Structure

``` md
token-manager/
├── public/                   # Static assets (images, icons, etc.)
├── src/
│   ├── components/           # Organized React components
│   │   ├── ui/               # Generic, reusable UI components (e.g., Navbar, Footer)
│   │   ├── features/         # Feature-based components (Create, Send, Manage Tokens)
│   │   ├── home/             # Homepage-related components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utility/helper functions (e.g., formatters, API logic)
│   ├── styles/               # Global styles
│   ├── App.jsx               # Main App component
│   └── main.jsx              # Entry point for React (instead of main.js in root)
├── .env                      # Environment variables
├── .gitignore
├── bun.lock                  # Bun package manager lockfile
├── index.html                # HTML entry point (used with bundlers like Vite)
├── package.json
├── postcss.config.js
├── README.md

```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Contact

- Email: [ashlesh.prabhu5@gmail.com]
- LinkedIn: [Ashlesh Prabhu](https://www.linkedin.com/in/ashlesh-prabhu-bb457b312/)
