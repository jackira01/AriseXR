'use client'

import Image from 'next/image'
import dynamic from 'next/dynamic'

// Cargamos de forma dinámica el reproductor sin SSR
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false })

export default function AboutCoach() {
    const socialLinks = [
        { platform: 'TikTok', handle: '@arisedxr', url: 'https://www.tiktok.com/@arisedxr' },
        { platform: 'Twitch', handle: 'arisexr', url: 'https://www.twitch.tv/arisexr' },
        { platform: 'YouTube', handle: 'AriseXR', url: 'https://www.youtube.com/channel/UCmz7fGX6fhIkbBT7XETgsPA' },
    ]

    return (
        <section id="sobre-coach" className="relative z-[2] py-16 md:py-28 px-5 sm:px-8 lg:px-13">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12 md:mb-20">
                    <div className="flex items-center justify-center gap-3 font-primary text-[.78rem] tracking-[4px] uppercase text-red-500 mb-4">
                        <span className="w-7 h-px bg-red-500 inline-block" />
                        Sobre Mi
                        <span className="w-7 h-px bg-red-500 inline-block" />
                    </div>
                    <h2 className="font-serif text-[clamp(2rem,3.5vw,3rem)] font-bold uppercase text-[#fff0f0]">
                        Mi Historia Como{' '}
                        <span className="bg-linear-to-r from-red-500 via-rose-400 to-orange-300 bg-clip-text text-transparent">Coach</span>
                    </h2>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
                    {/* Left: Bio and Stats */}
                    <div className="space-y-8">
                        {/* Bio Text */}
                        <div className="bg-red-950/30 backdrop-blur-sm border border-red-800/20 rounded-2xl p-8 shadow-sm">
                            <p className="font-primary text-[1.05rem] leading-[1.9] text-[rgba(255,210,210,.75)]">
                                Con más de <span className="text-red-400 font-semibold">10 años de experiencia</span> en el competitivo de League of Legends,
                                he dedicado mi carrera a dominar el juego y enseñar a otros cómo hacerlo.
                            </p>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { label: 'Años Challenger', value: '10+' },
                                { label: 'Años de Juego Elite', value: '8' },
                                { label: 'Años Coaching', value: '4' },
                            ].map((stat) => (
                                <div key={stat.label} className="bg-red-950/40 border border-red-800/20 rounded-xl p-6 text-center hover:border-red-700/30 hover:shadow-[0_0_20px_rgba(180,20,20,.2)] transition-all duration-300">
                                    <p className="font-serif text-[2.5rem] font-bold text-red-400 mb-1">{stat.value}</p>
                                    <p className="font-primary text-[.8rem] uppercase tracking-[1px] text-[rgba(255,210,210,.5)]">{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Description */}
                        <div className="bg-red-950/20 border border-red-800/15 rounded-2xl p-6">
                            <h3 className="font-serif font-bold text-[1.05rem] text-[#fff0f0] mb-3 uppercase tracking-[1px]">Mi Trayectoria</h3>
                            <ul className="space-y-2">
                                <li className="flex items-start gap-3 font-primary text-[.95rem] text-[rgba(255,210,210,.65)]">
                                    <span className="text-red-500 font-bold mt-0.5">✓</span>
                                    <span><span className="text-red-400 font-semibold">Challenger por 10+ years consecutivos</span> en la región</span>
                                </li>
                                <li className="flex items-start gap-3 font-primary text-[.95rem] text-[rgba(255,210,210,.65)]">
                                    <span className="text-red-500 font-bold mt-0.5">✓</span>
                                    <span><span className="text-red-400 font-semibold">8 años siendo jugador Elite</span>, compitiendo en torneos profesionales</span>
                                </li>
                                <li className="flex items-start gap-3 font-primary text-[.95rem] text-[rgba(255,210,210,.65)]">
                                    <span className="text-red-500 font-bold mt-0.5">✓</span>
                                    <span><span className="text-red-400 font-semibold">4 años enseñando en NA y LAN</span>, entrenando a cientos de jugadores</span>
                                </li>
                            </ul>
                        </div>

                        {/* Social Links */}
                        <div className="pt-4">
                            <p className="font-primary text-[.78rem] uppercase tracking-[2px] text-red-500/60 mb-4">Sígueme en</p>
                            <div className="flex gap-3">
                                {socialLinks.map((social) => (
                                    <a
                                        key={social.platform}
                                        href={social.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-red-950/40 border border-red-800/20 rounded-lg font-primary text-[.8rem] font-semibold text-red-400 hover:border-red-600/40 hover:bg-red-950/60 transition-all duration-300"
                                    >
                                        {social.platform}
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: Images Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { src: '/image.png', alt: 'Prueba 1' },
                            { src: '/image2.png', alt: 'Prueba 2' },
                            { src: '/image3.png', alt: 'Prueba 3' },
                            { src: '/image4.png', alt: 'Prueba 4' },
                        ].map((img, idx) => (
                            <div
                                key={idx}
                                className="relative aspect-square rounded-xl overflow-hidden border border-red-800/20 hover:border-red-700/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(180,20,20,.25)] group"
                            >
                                <img
                                    src={img.src}
                                    alt={img.alt}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <div className="text-center pt-8">
                    <p className="font-primary text-[1rem] text-[rgba(255,210,210,.6)] mb-6">
                        ¿Listo para transformar tu juego?
                    </p>
                    <a
                        href="#precios"
                        className="inline-block bg-linear-to-r from-red-600 to-red-800 text-white font-primary font-bold tracking-[2px] uppercase text-[.85rem] px-10 py-3.5 rounded-full hover:shadow-[0_0_30px_rgba(220,38,38,.4)] transition-all duration-300 border border-red-500/30"
                    >
                        Conoce Mis Paquetes
                    </a>
                </div>

                {/* Contenedor Vertical Optimizado */}
                <div className="flex justify-center">
                    <div className="w-[325px] h-[580px] rounded-2xl overflow-hidden border border-red-800/20 hover:border-red-700/40 transition-all duration-300 hover:shadow-[0_0_30px_rgba(180,20,20,.25)] bg-black/50">

                        <iframe
                            // 1. Asegúrate de cambiar el final del link de /view a /preview
                            src="https://drive.google.com/file/d/1jwoXdBYB4B0F41WLFgzQssRzKoiA1hAM/preview?usp=sharing"
                            className="w-full h-full"
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                        ></iframe>

                    </div>
                </div>
            </div>
        </section>
    )
}