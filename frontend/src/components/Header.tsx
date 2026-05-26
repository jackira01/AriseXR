'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'

const NAV_LINKS = [
    { label: 'Precios', href: '#precios' },
    { label: 'Sobre mi', href: '#sobre-coach' },
]

export default function Header() {
    const [menuOpen, setMenuOpen] = useState(false)
    const { data: session } = useSession()

    return (
        <nav className="fixed top-0 left-0 right-0 z-[200] bg-[#080102]/94 backdrop-blur-[12px] border-b border-red-800/20">
            <div className="flex items-center justify-between h-16 px-5 sm:px-8 lg:px-13">
                {/* Logo */}
                <Link href="/" className="flex items-center no-underline" onClick={() => setMenuOpen(false)}>
                    <Image src="/logo.png" alt="AriseXR" width={120} height={36} className="h-8 sm:h-9 w-auto object-contain" />
                </Link>

                {/* Desktop nav */}
                <ul className="hidden md:flex items-center gap-8 lg:gap-11 list-none">
                    {NAV_LINKS.map((link) => (
                        <li key={link.label}>
                            <a
                                href={link.href}
                                className="text-[rgba(255,210,210,.85)] font-primary text-[.85rem] lg:text-[.9rem] font-semibold tracking-[2px] uppercase no-underline transition-colors duration-250 hover:text-red-400"
                            >
                                {link.label}
                            </a>
                        </li>
                    ))}
                    <li>
                        <Link
                            href={session ? '/cuenta' : '/login'}
                            className="text-[rgba(255,210,210,.85)] font-primary text-[.85rem] lg:text-[.9rem] font-semibold tracking-[2px] uppercase no-underline transition-colors duration-250 hover:text-red-400"
                        >
                            {session ? 'Cuenta' : 'Iniciar sesión'}
                        </Link>
                    </li>
                </ul>

                {/* Hamburger */}
                <button
                    className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 cursor-pointer"
                    aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
                    onClick={() => setMenuOpen(!menuOpen)}
                >
                    <span className={`block w-6 h-0.5 bg-[#fff0f0] transition-all duration-300 origin-center ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
                    <span className={`block w-6 h-0.5 bg-[#fff0f0] transition-all duration-300 ${menuOpen ? 'opacity-0 scale-x-0' : ''}`} />
                    <span className={`block w-6 h-0.5 bg-[#fff0f0] transition-all duration-300 origin-center ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
                </button>
            </div>

            {/* Mobile menu */}
            <div className={`md:hidden overflow-hidden transition-all duration-300 ease-out ${menuOpen ? 'max-h-60 border-t border-red-800/15' : 'max-h-0'}`}>
                <ul className="flex flex-col list-none px-5 py-4 gap-1 bg-[#080102]/98">
                    {NAV_LINKS.map((link) => (
                        <li key={link.label}>
                            <a
                                href={link.href}
                                className="block py-3 px-2 text-[rgba(255,210,210,.85)] font-primary text-[.95rem] font-semibold tracking-[2px] uppercase no-underline border-b border-red-800/12 last:border-b-0 transition-colors duration-200 hover:text-red-400"
                                onClick={() => setMenuOpen(false)}
                            >
                                {link.label}
                            </a>
                        </li>
                    ))}
                    <li>
                        <Link
                            href={session ? '/cuenta' : '/login'}
                            className="block py-3 px-2 text-[rgba(255,210,210,.85)] font-primary text-[.95rem] font-semibold tracking-[2px] uppercase no-underline transition-colors duration-200 hover:text-red-400"
                            onClick={() => setMenuOpen(false)}
                        >
                            {session ? 'Cuenta' : 'Iniciar sesión'}
                        </Link>
                    </li>
                </ul>
            </div>
        </nav>
    )
}
