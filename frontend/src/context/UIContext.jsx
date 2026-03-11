import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { systemDynamicEsToEn } from '../i18n/modules/system';
import { adminDynamicEsToEn } from '../i18n/modules/admin';
import { portalDynamicEsToEn } from '../i18n/modules/portal';

const THEME_STORAGE_KEY = 'ui:theme';
const LANGUAGE_STORAGE_KEY = 'ui:language';
const commonDynamicEsToEn = {
    General: 'General',
    Configuracion: 'Settings',
    'Configuración': 'Settings',
    Pacientes: 'Patients',
    Usuarios: 'Users',
    Profesional: 'Professional',
    Profesionales: 'Professionals',
    Agenda: 'Schedule',
    'Gestion de Citas': 'Appointment Management',
    'Gestión de Citas': 'Appointment Management',
    Recepcion: 'Reception',
    'Recepción': 'Reception',
    'Validar Usuarios': 'Validate Users',
    'Cerrar Sesión': 'Sign out',
    'Notificaciones SaaS': 'SaaS notifications',
    'Mi Perfil': 'My Profile',
    Perfil: 'Profile',
    Dashboard: 'Dashboard',
    'Admin Citas': 'Admin Appointments',
    'Admin Usuarios': 'Admin Users',
    'Admin Profesionales': 'Admin Professionals',
    'Admin Parametricas': 'Admin Parameters',
    'Admin Paramétricas': 'Admin Parameters',
    'Configuracion Inicial': 'Initial Setup',
    'Configuración Inicial': 'Initial Setup',
    'Guia y Ayuda': 'Guide and Help',
    'Guía y Ayuda': 'Guide and Help',
    Auditoria: 'Audit',
    'Auditoría': 'Audit',
    'Trabaje con Nosotros': 'Work With Us',
};
const dynamicEsToEn = {
    ...commonDynamicEsToEn,
    ...systemDynamicEsToEn,
    ...adminDynamicEsToEn,
    ...portalDynamicEsToEn,
};

const normalizeText = (value) =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

const normalizedDynamicMap = Object.fromEntries(
    Object.entries(dynamicEsToEn).map(([key, val]) => [normalizeText(key), val])
);

const dictionaries = {
    es: {
        appTitle: 'Idefnova',
        backToPortal: 'Volver al Portal',
        login: 'Iniciar sesion',
        register: 'Crear cuenta',
        identityDocument: 'Documento de identidad',
        password: 'Contrasena',
        forgotPassword: 'Olvidaste tu contrasena?',
        validate: 'Validando...',
        enter: 'Ingresar',
        noAccount: 'No tienes cuenta?',
        registerHere: 'Registrate aqui',
        names: 'Nombres',
        lastNames: 'Apellidos',
        docType: 'Tipo doc.',
        number: 'Numero',
        user: 'Usuario',
        email: 'Correo electronico',
        phone: 'Telefono',
        repeat: 'Repetir',
        processing: 'Procesando...',
        termsAccepted: 'Terminos aceptados',
        readTerms: 'Leer terminos y condiciones',
        alreadyHaveAccount: 'Ya tienes cuenta?',
        signIn: 'Iniciar sesion',
        userRoleFallback: 'Usuario',
        pendingRequests: 'Solicitudes pendientes',
        noPageFound: '404 - Pagina no encontrada',
        theme: 'Tema',
        language: 'Idioma',
        light: 'Claro',
        dark: 'Oscuro',
        system: 'Sistema',
        spanish: 'Espanol',
        english: 'Ingles',
        logout: 'Cerrar sesion',
        saasNotifications: 'Notificaciones SaaS',
        enterpriseLabel: 'Enterprise',
        languageChanged: 'Idioma cambiado',
        themeChanged: 'Tema cambiado',
    },
    en: {
        appTitle: 'Idefnova',
        backToPortal: 'Back to portal',
        login: 'Sign in',
        register: 'Create account',
        identityDocument: 'Identity document',
        password: 'Password',
        forgotPassword: 'Forgot your password?',
        validate: 'Validating...',
        enter: 'Sign in',
        noAccount: "Don't have an account?",
        registerHere: 'Register here',
        names: 'First name',
        lastNames: 'Last name',
        docType: 'Doc type',
        number: 'Number',
        user: 'User',
        email: 'Email',
        phone: 'Phone',
        repeat: 'Repeat',
        processing: 'Processing...',
        termsAccepted: 'Terms accepted',
        readTerms: 'Read terms and conditions',
        alreadyHaveAccount: 'Already have an account?',
        signIn: 'Sign in',
        userRoleFallback: 'User',
        pendingRequests: 'Pending requests',
        noPageFound: '404 - Page not found',
        theme: 'Theme',
        language: 'Language',
        light: 'Light',
        dark: 'Dark',
        system: 'System',
        spanish: 'Spanish',
        english: 'English',
        logout: 'Sign out',
        saasNotifications: 'SaaS notifications',
        enterpriseLabel: 'Enterprise',
        languageChanged: 'Language changed',
        themeChanged: 'Theme changed',
    },
};

const UIContext = createContext(null);

const readTheme = () => {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
};

const readLanguage = () => {
    const value = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return value === 'es' || value === 'en' ? value : 'es';
};

const resolveDarkMode = (theme) => {
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const UIProvider = ({ children }) => {
    const [theme, setTheme] = useState(readTheme);
    const [language, setLanguage] = useState(readLanguage);

    useEffect(() => {
        localStorage.setItem(THEME_STORAGE_KEY, theme);

        const root = document.documentElement;
        const apply = () => {
            const darkMode = resolveDarkMode(theme);
            root.classList.toggle('dark', darkMode);
        };

        apply();

        if (theme !== 'system') return undefined;
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = () => apply();
        media.addEventListener('change', onChange);
        return () => media.removeEventListener('change', onChange);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
        document.documentElement.lang = language === 'en' ? 'en' : 'es';
    }, [language]);

    const value = useMemo(() => {
        const dict = dictionaries[language] || dictionaries.es;
        const t = (key, fallback = '') => dict[key] || fallback || key;
        const td = (text, enFallback = '') => {
            if (language !== 'en') return text;
            if (dynamicEsToEn[text]) return dynamicEsToEn[text];
            const normalized = normalizeText(text);
            return normalizedDynamicMap[normalized] || enFallback || text;
        };
        return {
            theme,
            setTheme,
            language,
            setLanguage,
            t,
            td,
        };
    }, [theme, language]);

    return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI must be used within UIProvider');
    }
    return context;
};

