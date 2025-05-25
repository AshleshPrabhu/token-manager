import React, { useState } from 'react';
import {
  WalletDisconnectButton,
  WalletIcon,
  WalletMultiButton
} from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'sonner';

function Navbar({ darkMode, setDarkMode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { connected } = useWallet(); 

  return (
    <nav className={`${darkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-100'} border-b`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>
            Token-Manager
          </h1>

          {/* Mobile menu button */}
          <div className="flex items-center space-x-2 sm:hidden">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg ${
                darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {darkMode ? '🌙' : '☀️'}
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 ${darkMode ? 'text-white' : 'text-black'}`}
            >
              ☰
            </button>
          </div>

          {/* Desktop menu */}
          <div className="hidden sm:flex items-center space-x-6">
            <div className={`space-x-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <a href="#" className="hover:text-gray-900 dark:hover:text-white">Wallet</a>
              <a href="#" className="hover:text-gray-900 dark:hover:text-white" onClick={()=>toast.info("feature comming soon")}>Swap</a>
              <a href="#" className="hover:text-gray-900 dark:hover:text-white" onClick={()=>toast.info("feature comming soon")}>Stake</a>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg ${
                  darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {darkMode ? '🌙' : '☀️'}
              </button>
              {connected ? (
                <WalletDisconnectButton className={`px-4 py-2 rounded-lg border ${ 
                  darkMode 
                    ? 'border-white text-white hover:bg-white hover:text-black' 
                    : 'border-black text-black hover:bg-black hover:text-white'
                } transition-colors`} />
              ) : (
                <WalletMultiButton className={`px-4 py-2 rounded-lg border ${
                  darkMode 
                    ? 'border-white text-white hover:bg-white hover:text-black' 
                    : 'border-black text-black hover:bg-black hover:text-white'
                } transition-colors`} />
              )}
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="sm:hidden mt-4 pb-2 space-y-3">
            <div className={`flex flex-col space-y-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <a
                href="https://ashlesh-wallet.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-900 dark:hover:text-white py-2"
              >
                Wallet
              </a>
              <a href="#" className="hover:text-gray-900 dark:hover:text-white py-2" onClick={()=>toast.info("feature comming soon")}>Swap</a>
              <a href="#" className="hover:text-gray-900 dark:hover:text-white py-2" onClick={()=>toast.info("feature comming soon")}>Swap</a>
            </div>
            {
              connected ? (
                <WalletDisconnectButton className={`w-full px-4 py-2 rounded-lg border ${
                  darkMode 
                    ? 'border-white text-white hover:bg-white hover:text-black' 
                    : 'border-black text-black hover:bg-black hover:text-white'
                } transition-colors`} />
              ) : (
                <WalletMultiButton className={`w-full px-4 py-2 rounded-lg border ${
                  darkMode 
                    ? 'border-white text-white hover:bg-white hover:text-black' 
                    : 'border-black text-black hover:bg-black hover:text-white'
                } transition-colors`} />
              )
            }
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
