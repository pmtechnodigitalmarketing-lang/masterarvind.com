import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  AnimatePresence,
} from "framer-motion";
import { Link } from "react-router-dom";
import { X, ChevronLeft } from "lucide-react";
import "./CarouselStacked.css";

const getCarouselConfig = (width) => {
  if (width < 640) {
    return {
      distanceDivisor: 120,
      velocityDivisor: 500,
      sensitivity: 180,
      xMultiplier: 90,
      yMultiplier: 20,
      rotationMultiplier: 8,
      scaleReduction: 0.06,
    };
  }
  if (width < 1024) {
    return {
      distanceDivisor: 160,
      velocityDivisor: 650,
      sensitivity: 220,
      xMultiplier: 130,
      yMultiplier: 30,
      rotationMultiplier: 10,
      scaleReduction: 0.09,
    };
  }
  return {
    distanceDivisor: 200,
    velocityDivisor: 800,
    sensitivity: 250,
    xMultiplier: 170,
    yMultiplier: 40,
    rotationMultiplier: 12,
    scaleReduction: 0.12,
  };
};

const CarouselStacked = ({ slides }) => {
  const scrollProgress = useMotionValue(0);
  const startProgress = useRef(0);
  const [windowWidth, setWindowWidth] = useState(0);
  const [activeSlide, setActiveSlide] = useState(null);

  const total = slides.length;

  useEffect(() => {
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close active slide on scroll down
  useEffect(() => {
    if (!activeSlide) return;

    let startScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      // Close if user scrolls down (moving past the section)
      if (currentScrollY > startScrollY + 50) {
        setActiveSlide(null);
      }
      // If user scrolls up, reset the start point so we only on a definitive scroll down
      else if (currentScrollY < startScrollY) {
        startScrollY = currentScrollY;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeSlide]);

  const config = useMemo(() => getCarouselConfig(windowWidth), [windowWidth]);

  const handleDragStart = () => {
    startProgress.current = scrollProgress.get();
  };

  const handleDragEnd = (_, info) => {
    const dragDistance = info.offset.x;
    const velocity = info.velocity.x;

    const distanceShift = -dragDistance / config.distanceDivisor;
    const velocityShift = -velocity / config.velocityDivisor;

    let totalShift = Math.round(distanceShift + velocityShift);
    totalShift = Math.max(-3, Math.min(3, totalShift));

    const target = Math.round(startProgress.current) + totalShift;

    animate(scrollProgress, target, {
      type: "spring",
      stiffness: 200,
      damping: 30,
      mass: 1,
    });
  };

  if (!windowWidth) return null;

  return (
    <div className="carousel-container">
      <AnimatePresence mode="wait">
        {!activeSlide ? (
          <motion.div
            key="carousel-deck"
            className="carousel-wrapper"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5 }}
          >
            {slides.map((slide, i) => (
              <Card
                key={i}
                slide={slide}
                index={i}
                total={total}
                progress={scrollProgress}
                config={config}
                handleDragStart={handleDragStart}
                handleDragEnd={handleDragEnd}
                setActiveSlide={setActiveSlide}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="inline-detail"
            className="inline-detail-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="inline-left">
              <motion.img
                layoutId={`card-image-${activeSlide.title}`}
                src={activeSlide.image}
                alt={activeSlide.title}
                className="inline-image"
              />
            </div>

            <div className="inline-right">
              <button
                className="inline-back-btn"
                onClick={() => setActiveSlide(null)}
                title="Back"
              >
                <ChevronLeft size={24} />
              </button>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-info-stack"
              >
                <div className="inline-badge">{activeSlide.badge}</div>
                <h3 className="inline-title">{activeSlide.title}</h3>
                <p className="inline-description">{activeSlide.description}</p>

                <Link
                  to="/book"
                  className="btn-primary"
                  style={{ marginTop: "2rem", display: "inline-block" }}
                >
                  Book Session
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Card = ({
  slide,
  index,
  total,
  progress,
  config,
  handleDragStart,
  handleDragEnd,
  setActiveSlide,
}) => {
  const isDragging = useRef(false);

  const offset = useTransform(progress, (p) => {
    let diff = (index - p) % total;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    return diff;
  });

  const x = useTransform(offset, (o) => o * config.xMultiplier);
  const rotate = useTransform(offset, (o) => {
    const absO = Math.abs(o);
    if (absO < 0.05) return 0;
    return o * config.rotationMultiplier;
  });
  const y = useTransform(offset, (o) => {
    const absO = Math.abs(o);
    if (absO < 0.05) return 0;
    return absO * config.yMultiplier;
  });
  const scale = useTransform(
    offset,
    (o) => 1 - Math.abs(o) * config.scaleReduction,
  );
  const opacity = useTransform(
    offset,
    [-total / 2, -total / 2 + 0.5, 0, total / 2 - 0.5, total / 2],
    [0, 1, 1, 1, 0],
  );
  const zIndex = useTransform(offset, (o) =>
    Math.round(100 - Math.abs(o) * 10),
  );

  return (
    <motion.div
      onPanStart={() => {
        handleDragStart();
      }}
      onPan={(_, info) => {
        isDragging.current = true;
        const delta = -info.delta.x / config.sensitivity;
        progress.set(progress.get() + delta);
      }}
      onPanEnd={(e, info) => {
        setTimeout(() => {
          isDragging.current = false;
        }, 100);
        handleDragEnd(e, info);
      }}
      onClick={() => {
        if (!isDragging.current) {
          setActiveSlide(slide);
        }
      }}
      style={{
        x,
        rotate,
        y,
        scale,
        opacity,
        zIndex,
      }}
      className="carousel-card-container group"
    >
      <motion.img
        layoutId={`card-image-${slide.title}`}
        src={slide.image}
        alt={slide.title}
        className="carousel-card-image"
      />

      <motion.div
        style={{
          opacity: useTransform(
            offset,
            [-2, -0.5, 0, 0.5, 2],
            [0.5, 0.2, 0, 0.2, 0.5],
          ),
        }}
        className="carousel-card-dimmer"
      />

      <div className="carousel-card-gradient" />

      <div className="carousel-badge">{slide.badge}</div>

      <div className="carousel-card-content">
        <motion.p
          style={{
            opacity: useTransform(offset, [-0.5, 0, 0.5], [0, 1, 0]),
          }}
          className="carousel-card-title"
        >
          {slide.title}
        </motion.p>
        <motion.p
          style={{
            opacity: useTransform(offset, [-0.5, 0, 0.5], [0, 1, 0]),
          }}
          className="carousel-card-description"
        >
          {slide.description}
        </motion.p>
      </div>
    </motion.div>
  );
};

export default CarouselStacked;
