import { Link } from "react-router-dom";
import { ArrowLeft, Mail, MessageSquare, MapPin } from "lucide-react";

export default function Contact() {
    return (
        <div className="min-h-screen bg-background">
            <nav className="border-b border-border/50 bg-background/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                        <span>Volver al inicio</span>
                    </Link>
                    <div className="font-display font-bold text-xl tracking-tight gradient-text">TABE</div>
                </div>
            </nav>

            <main className="container mx-auto px-4 py-16 max-w-4xl">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">
                        <span className="gradient-text">Contacto</span>
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        ¿Tenés dudas, consultas o sugerencias? Estamos acá para ayudarte.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                        <h2 className="text-2xl font-display font-bold">Información de Contacto</h2>
                        <p className="text-muted-foreground">
                            Contactate con nuestro equipo de soporte técnico y administración a través de nuestros canales oficiales. Respondemos a la brevedad.
                        </p>

                        <div className="space-y-6">
                            <a href="mailto:soporte@tabe.com.ar" className="flex items-center gap-4 card-gamer p-4 rounded-xl hover:scale-[1.02] transition-transform">
                                <div className="w-12 h-12 rounded-full bg-neon-cyan/20 flex items-center justify-center">
                                    <Mail className="w-6 h-6 text-neon-cyan" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-foreground">Email</h3>
                                    <p className="text-sm text-neon-cyan/80">soporte@tabe.com.ar</p>
                                </div>
                            </a>

                            <a href="https://wa.me/5492617737367" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 card-gamer p-4 rounded-xl hover:scale-[1.02] transition-transform">
                                <div className="w-12 h-12 rounded-full bg-neon-green/20 flex items-center justify-center">
                                    <MessageSquare className="w-6 h-6 text-neon-green" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-foreground">WhatsApp</h3>
                                    <p className="text-sm text-neon-green/80">+54 9 261 773-7367</p>
                                </div>
                            </a>

                            <div className="flex items-center gap-4 card-gamer p-4 rounded-xl">
                                <div className="w-12 h-12 rounded-full bg-neon-purple/20 flex items-center justify-center">
                                    <MapPin className="w-6 h-6 text-neon-purple" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-foreground">Ubicación</h3>
                                    <p className="text-sm text-muted-foreground">Mendoza, Argentina</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card-gamer p-8 rounded-2xl border border-border">
                        <h2 className="text-2xl font-display font-bold mb-6">Envíanos un mensaje</h2>
                        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); window.location.href = "mailto:soporte@tabe.com.ar"; }}>
                            <div>
                                <label className="block text-sm font-medium mb-2">Nombre</label>
                                <input type="text" className="w-full bg-secondary border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-neon-cyan/50" placeholder="Tu nombre" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Email</label>
                                <input type="email" className="w-full bg-secondary border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-neon-cyan/50" placeholder="tu@email.com" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Mensaje</label>
                                <textarea className="w-full bg-secondary border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-neon-cyan/50 min-h-[120px]" placeholder="¿En qué te podemos ayudar?" required></textarea>
                            </div>
                            <button className="w-full py-4 rounded-xl bg-gradient-to-r from-neon-cyan to-neon-purple text-white font-bold hover:opacity-90 transition-opacity">
                                Enviar Mensaje
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
