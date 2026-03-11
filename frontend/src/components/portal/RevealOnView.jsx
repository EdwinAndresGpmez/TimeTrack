import React, { useEffect, useMemo, useRef, useState } from "react";

const VARIANT_CLASS = {
  left: "portal-slide-left",
  right: "portal-slide-right",
  top: "portal-slide-top",
  bottom: "portal-slide-bottom",
};

const HIDDEN_TRANSFORM = {
  left: "translateX(-26px) scale(0.985)",
  right: "translateX(26px) scale(0.985)",
  top: "translateY(-22px) scale(0.985)",
  bottom: "translateY(24px) scale(0.985)",
};

const RevealOnView = ({ children, variant = "bottom", delay = 0, className = "" }) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [animTick, setAnimTick] = useState(0);
  const wasVisibleRef = useRef(false);

  const motionClass = useMemo(() => VARIANT_CLASS[variant] || VARIANT_CLASS.bottom, [variant]);
  const hiddenTransform = useMemo(() => HIDDEN_TRANSFORM[variant] || HIDDEN_TRANSFORM.bottom, [variant]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const nowVisible = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.2);
        const wasVisible = wasVisibleRef.current;

        if (nowVisible && !wasVisible) {
          setAnimTick((v) => v + 1);
        }

        wasVisibleRef.current = nowVisible;
        setIsVisible(nowVisible);
      },
      { threshold: [0, 0.2, 0.35], rootMargin: "0px 0px -6% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      <div
        key={animTick}
        className={isVisible ? motionClass : ""}
        style={
          isVisible
            ? { animationDelay: `${delay}ms` }
            : { opacity: 0, transform: hiddenTransform }
        }
      >
        {children}
      </div>
    </div>
  );
};

export default RevealOnView;

