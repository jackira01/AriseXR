import Header from '@/components/Header'
import HeroText from '@/components/HeroText'
import HeroChart from '@/components/HeroChart'
import Stats from '@/components/Stats'
import ReviewCarousel from '@/components/ReviewCarousel'
import RuneBackground from '@/components/RuneBackground'
import Starfield from '@/components/Starfield'
import PricingSection from '@/components/PricingSection'
import AboutCoach from '@/components/AboutCoach'

const TOPIC_CATEGORIES = [
    {
        title: 'Mentalidad y Control Emocional',
        topics: ['Cómo dejar el tilt', 'Mentalidad para rankeds', 'Control emocional en partidas perdidas', 'Cómo no rendirse (mentalidad comeback)', 'Manejo de la frustración', 'Confianza en tus decisiones', 'Evitar el autosabotaje', 'Cómo jugar bajo presión', 'Mentalidad de mejora continua', 'Cómo aprender de tus derrotas'],
    },
    {
        title: 'Macro Game',
        topics: ['Cuándo hacer objetivos (dragón, barón)', 'Rotaciones eficientes', 'Control de visión (wards)', 'Prioridad de líneas', 'Cómo cerrar partidas', 'Shotcalling básico', 'Cómo jugar con ventaja', 'Cómo jugar desde atrás', 'Map awareness (lectura del mapa)', 'Control de tempo'],
    },
    {
        title: 'Micro Game y Mecánicas',
        topics: ['Mejora de reflejos', 'Posicionamiento en teamfights', 'Uso correcto de habilidades', 'Trading en línea', 'Farming (CS perfecto)', 'Uso de summoners', 'Cómo kitear correctamente', 'Mecánicas por rol (top, jungle, mid, adc, support)', 'Mejora del early game', 'Dominio del champion pool'],
    },
    {
        title: 'Estrategia de Ranked',
        topics: ['Cómo trakear', 'Errores comunes por elo', 'Cómo carrear partidas', 'Importancia del champion pool', 'Dodge inteligente', 'Cómo aprovechar picks fuertes', 'Win conditions', 'Cómo impactar el mapa', 'Jugar solo vs dúo', 'Zonas de control'],
    },
]

export default function HomePage() {
    return (
        <>
            <Starfield />
            <RuneBackground />

            {/* Fondo degradado */}
            <div
                className="fixed inset-0 z-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse 60% 55% at 75% 30%, rgba(160,10,10,.5) 0%, transparent 65%), radial-gradient(ellipse 50% 65% at 15% 75%, rgba(100,5,5,.55) 0%, transparent 65%), radial-gradient(ellipse 40% 40% at 85% 85%, rgba(80,0,0,.35) 0%, transparent 65%)' }}
            />

            <Header />

            {/* ══════════════════ HERO ══════════════════ */}
            <section
                id="inicio"
                className="relative w-full min-h-screen grid grid-cols-1 md:grid-cols-2 items-center pt-16 px-5 sm:px-8 lg:px-13 pb-10 md:pb-0 overflow-hidden z-[2] gap-8 md:gap-0"
            >
                <HeroText className="md:pl-10" />
                <div className="relative w-full flex items-center justify-center order-first md:order-last py-4 md:py-8 md:pl-6">
                    <div className="w-[85%] sm:w-[70%] md:w-full" style={{ height: 'min(85vh, 650px)' }}>
                        <HeroChart />
                    </div>
                </div>
            </section>

            <Stats />

            <PricingSection />

            {/* ══════════════════ TEMAS ══════════════════ */}
            <section className="relative z-[2] py-16 md:py-28 px-5 sm:px-8 lg:px-13">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12 md:mb-20">
                        <div className="flex items-center justify-center gap-3 font-primary text-[.78rem] tracking-[4px] uppercase text-red-500 mb-4">
                            <span className="w-7 h-px bg-red-500 inline-block" />
                            Currículo
                            <span className="w-7 h-px bg-red-500 inline-block" />
                        </div>
                        <h2 className="font-serif text-[clamp(2rem,3.5vw,3rem)] font-bold uppercase text-[#fff0f0]">
                            Temas que{' '}
                            <span className="bg-linear-to-r from-red-500 via-rose-400 to-orange-300 bg-clip-text text-transparent">se ven</span>
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {TOPIC_CATEGORIES.map((cat) => (
                            <div key={cat.title} className="bg-red-950/30 backdrop-blur-sm border border-red-800/20 rounded-2xl p-8 shadow-sm hover:shadow-red-950/50 hover:border-red-700/30 transition-all duration-300">
                                <h3 className="font-serif text-[1.05rem] font-bold uppercase tracking-[1px] text-[#fff0f0] mb-6">{cat.title}</h3>
                                <ul className="grid grid-cols-1 gap-2">
                                    {cat.topics.map((topic) => (
                                        <li key={topic} className="flex items-center gap-2.5 font-primary text-[.85rem] text-[rgba(255,210,210,.7)]">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                            {topic}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════ SOBRE NOSOTROS ══════════════════ */}
            <section id="sobre-nosotros" className="relative z-[2] py-16 md:py-28 px-5 sm:px-8 lg:px-13">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="flex items-center justify-center gap-3 font-primary text-[.78rem] tracking-[4px] uppercase text-red-500 mb-4">
                        <span className="w-7 h-px bg-red-500 inline-block" />
                        Sobre Nosotros
                        <span className="w-7 h-px bg-red-500 inline-block" />
                    </div>
                    <h2 className="font-serif text-[clamp(2rem,3.5vw,3rem)] font-bold uppercase text-[#fff0f0] mb-6">
                        Coaches de{' '}
                        <span className="bg-linear-to-r from-red-500 via-rose-400 to-orange-300 bg-clip-text text-transparent">Élite</span>
                    </h2>
                    <p className="font-primary text-[1.05rem] leading-[1.9] text-[rgba(255,210,210,.65)] max-w-2xl mx-auto mb-10">
                        Somos un equipo de coaches con rango Challenger dedicados a transformar tu forma de jugar League of Legends.
                        Combinamos análisis estadístico, psicología del rendimiento y entrenamiento práctico para llevarte al siguiente nivel.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        {['Resultados Garantizados', 'Coaches Challenger', 'Método Probado', 'Comunidad Activa'].map((val) => (
                            <div key={val} className="px-5 py-2.5 bg-red-950/40 border border-red-800/25 rounded-full font-primary text-[.82rem] font-semibold text-red-400 tracking-[1px] backdrop-blur-sm">
                                {val}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════ RESEÑAS ══════════════════ */}
            <section id="resenas" className="relative z-[2] py-16 md:py-28 px-5 sm:px-8 lg:px-13">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12 md:mb-20">
                        <div className="flex items-center justify-center gap-3 font-primary text-[.78rem] tracking-[4px] uppercase text-red-500 mb-4">
                            <span className="w-7 h-px bg-red-500 inline-block" />
                            Reseñas
                            <span className="w-7 h-px bg-red-500 inline-block" />
                        </div>
                        <h2 className="font-serif text-[clamp(2rem,3.5vw,3rem)] font-bold uppercase text-[#fff0f0]">
                            Lo que dicen{' '}
                            <span className="bg-linear-to-r from-red-500 via-rose-400 to-orange-300 bg-clip-text text-transparent">Nuestros Clientes</span>
                        </h2>
                    </div>
                    <ReviewCarousel />
                </div>
            </section>

            <AboutCoach />

            {/* ══════════════════ REDES SOCIALES ══════════════════ */}
            <section className="relative z-[2] py-16 md:py-28 px-5 sm:px-8 lg:px-13">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="flex items-center justify-center gap-3 font-primary text-[.78rem] tracking-[4px] uppercase text-red-500 mb-4">
                        <span className="w-7 h-px bg-red-500 inline-block" />
                        Síguenos
                        <span className="w-7 h-px bg-red-500 inline-block" />
                    </div>
                    <h2 className="font-serif text-[clamp(2rem,3.5vw,3rem)] font-bold uppercase text-[#fff0f0] mb-4">
                        Nuestras{' '}
                        <span className="bg-linear-to-r from-red-500 via-rose-400 to-orange-300 bg-clip-text text-transparent">Redes</span>
                    </h2>
                    <p className="font-primary text-[1rem] text-[rgba(255,210,210,.6)] mb-12 max-w-xl mx-auto">
                        Contenido, streams y clips de ranked. Síguenos para no perderte nada.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        {[
                            { platform: 'TikTok', handle: '@arisedxr', url: 'https://www.tiktok.com/@arisedxr', icon: <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.54V6.78a4.85 4.85 0 01-1.02-.09z" /> },
                            { platform: 'Twitch', handle: 'arisexr', url: 'https://www.twitch.tv/arisexr', icon: <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" /> },
                            { platform: 'YouTube', handle: 'AriseXR', url: 'https://www.youtube.com/channel/UCmz7fGX6fhIkbBT7XETgsPA', icon: <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /> },
                        ].map((social) => (
                            <a
                                key={social.platform}
                                href={social.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center gap-4 bg-red-950/30 backdrop-blur-sm border border-red-800/20 rounded-2xl px-8 py-5 w-full sm:w-auto hover:border-red-600/40 hover:shadow-[0_0_30px_rgba(180,20,20,.3)] transition-all duration-300"
                            >
                                <span className="shrink-0 text-[#fff0f0] group-hover:text-red-400 transition-colors duration-300">
                                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">{social.icon}</svg>
                                </span>
                                <div className="text-left">
                                    <p className="font-primary text-[.7rem] uppercase tracking-[2px] text-[rgba(255,180,180,.5)] mb-0.5">{social.platform}</p>
                                    <p className="font-primary text-[.95rem] font-bold text-[#fff0f0] group-hover:text-red-400 transition-colors duration-300">{social.handle}</p>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </section>
        </>
    )
}
