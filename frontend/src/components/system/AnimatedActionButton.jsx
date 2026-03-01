import React from 'react';

/**
 * AnimatedActionButton
 * Un botón reutilizable con animación y doble línea de texto.
 * Props:
 * - onClick: función a ejecutar al hacer click
 * - icon: componente de icono (ej: <FaPlusCircle />)
 * - label: texto principal (ej: "Nueva Sede")
 * - sublabel: texto pequeño arriba (ej: "Crear")
 * - className: clases extra opcionales
 * - type: tipo de botón ("button" por defecto)
 * - disabled: boolean opcional
 */

const AnimatedActionButton = ({
  as: Component = 'button',
  onClick,
  icon,
  label,
  sublabel = 'Crear',
  className = '',
  type = 'button',
  disabled = false,
  ...props
}) => {
  const isButton = Component === 'button' || Component === undefined;
  return (
    <Component
      type={isButton ? type : undefined}
      onClick={onClick}
      disabled={isButton ? disabled : undefined}
      className={`group relative inline-flex items-center justify-center px-8 py-3 font-bold text-white transition-all duration-200 bg-blue-600 rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 overflow-hidden active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      <div className="absolute inset-0 w-full h-full transition-all duration-300 scale-0 group-hover:scale-100 group-hover:bg-white/10 rounded-2xl"></div>
      {icon && React.cloneElement(icon, { className: 'mr-3 text-xl animate-bounce' })}
      <div className="flex flex-col items-start leading-tight">
        <span className="text-[10px] uppercase tracking-widest opacity-80 font-black">{sublabel}</span>
        <span className="text-lg">{label}</span>
      </div>
    </Component>
  );
};

export default AnimatedActionButton;
