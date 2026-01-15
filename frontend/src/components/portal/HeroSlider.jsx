import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, EffectFade, Navigation, Pagination } from 'swiper/modules';
import { portalService } from '../../services/portalService';
import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const HeroSlider = () => {
    const [banners, setBanners] = useState([]);

    useEffect(() => {
        const fetch = async () => {
            const data = await portalService.getBanners();
            setBanners(data);
        };
        fetch();
    }, []);

    // Función auxiliar para imágenes locales/docker
    const fixImageUrl = (url) => url ? url.replace('http://localhost/media', 'http://localhost:8080/media') : '';

    if (banners.length === 0) return null;

    return (
        <section className="relative mt-[80px]"> {/* Ajuste altura navbar */}
            <Swiper
                modules={[Autoplay, EffectFade, Navigation, Pagination]}
                effect="fade"
                spaceBetween={0}
                slidesPerView={1}
                autoplay={{ delay: 6000, disableOnInteraction: false }}
                pagination={{ clickable: true }}
                className="h-[600px] w-full"
            >
                {banners.map((banner) => (
                    <SwiperSlide key={banner.id}>
                        <div 
                            className="w-full h-full bg-cover bg-center relative"
                            style={{ backgroundImage: `url(${fixImageUrl(banner.imagen_desktop)})` }}
                        >
                            {/* Overlay oscuro degradado */}
                            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent"></div>

                            <div className="container mx-auto px-4 h-full flex items-center relative z-10">
                                <div className="max-w-2xl text-white animate-fade-in-up">
                                    <span className="uppercase tracking-widest text-green-400 font-bold mb-2 block text-sm md:text-base">
                                        Servicios Asociados Integrados
                                    </span>
                                    <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
                                        {banner.titulo}
                                    </h1>
                                    <p className="text-lg md:text-xl text-gray-200 mb-8 leading-relaxed">
                                        {banner.descripcion}
                                    </p>
                                    <div className="flex flex-wrap gap-4">
                                        <a href="/servicios" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-bold transition transform hover:scale-105">
                                            Nuestros Servicios
                                        </a>
                                        <a href="https://wa.link/ciie9a" target="_blank" className="bg-transparent border-2 border-white hover:bg-white hover:text-blue-900 text-white px-8 py-3 rounded-full font-bold transition">
                                            Contáctanos
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </section>
    );
};

export default HeroSlider;