
import React from 'react';
import Logo from './Logo';

const Header = () => {
  return (
    <div className="flex justify-center items-center mb-8">
      <div className="text-center">
        <Logo />
      </div>
    </div>
  );
};

export default Header;
