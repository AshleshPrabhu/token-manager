import React from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import {
    WalletModalProvider,
} from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';
import Home from './components/Home';
import { Toaster } from 'sonner';
function App() {

  return (
    <ConnectionProvider endpoint={"https://api.devnet.solana.com"}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>
          <Home/>
        </WalletModalProvider>
          <Toaster />
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;