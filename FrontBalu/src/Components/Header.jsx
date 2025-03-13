import React from 'react'

function Header() {
    return (
        <header className="bg-secondary text-white text-center py-16 ">
          <h1 className="text-3xl font-semibold">Nuestras Habitaciones</h1>
          <p className="mt-2 text-yellow-400 hover:underline cursor-pointer">Pensadas para tu comodidad</p>
        </header>
      );
}

export default Header