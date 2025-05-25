import React from 'react';

function Footer({ darkMode }) {
  return (
    <footer className={`border-t ${darkMode ? 'border-gray-800 bg-black' : 'border-gray-200 bg-white'} py-6 mt-8`}>
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <div className={`text-lg font-semibold mb-4 sm:mb-0 ${darkMode ? 'text-white' : 'text-black'}`}>
            Token-Manager
          </div>
          <div className="flex space-x-6">
            <a
              href="https://github.com/AshleshPrabhu"
              target="_blank"
              rel="noopener noreferrer"
              className={`text-sm ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'}`}
            >
              GitHub
            </a>
            <a
              href="https://www.linkedin.com/in/ashlesh-prabhu-bb457b312/"
              target="_blank"
              rel="noopener noreferrer"
              className={`text-sm ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'}`}
            >
              LinkedIn
            </a>
            <a
              href="https://mail.google.com/mail/?view=cm&fs=1&to=ashlesh.prabhu5@gmail.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`text-sm ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'}`}
            >
              Email
            </a>

          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;