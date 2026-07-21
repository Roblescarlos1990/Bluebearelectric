"use client";

/* eslint-disable @next/next/no-img-element -- Standard img keeps this drop-in compatible with Next.js and Vite. */

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./BlueBearTerritory.module.css";

type Zone = {
  id: string;
  city: string;
  state: string;
  kicker: string;
  description: string;
  image: string;
  services: string[];
  coordinates: string;
  response: string;
  pin: { x: number; y: number };
};

const ZONES: Zone[] = [
  {
    id: "los-angeles",
    city: "Los Angeles",
    state: "California",
    kicker: "Urban power systems",
    description:
      "High-demand commercial, industrial, solar, BESS, and residential electrical support across Greater Los Angeles.",
    image: "/bluebear/territory/los-angeles.webp",
    services: ["Industrial", "Commercial", "Solar & BESS", "Residential"],
    coordinates: "34.0522° N  ·  118.2437° W",
    response: "Regional dispatch",
    pin: { x: 27, y: 37 },
  },
  {
    id: "san-diego",
    city: "San Diego",
    state: "California",
    kicker: "Coastal energy corridor",
    description:
      "Responsive electrical service for commercial facilities, residences, clean-energy assets, and complex field work.",
    image: "/bluebear/territory/san-diego.webp",
    services: ["Industrial", "Commercial", "Solar & BESS", "Residential"],
    coordinates: "32.7157° N  ·  117.1611° W",
    response: "24/7 availability",
    pin: { x: 34, y: 73 },
  },
  {
    id: "coachella-valley",
    city: "Coachella Valley",
    state: "California",
    kicker: "Desert energy systems",
    description:
      "Specialized field support for solar, battery storage, industrial facilities, commercial sites, and maintenance programs.",
    image: "/bluebear/territory/coachella-valley.webp",
    services: ["Solar & BESS", "Industrial", "Commercial", "Maintenance"],
    coordinates: "33.6803° N  ·  116.1739° W",
    response: "Desert-ready crews",
    pin: { x: 56, y: 48 },
  },
  {
    id: "imperial-valley",
    city: "Imperial Valley",
    state: "California",
    kicker: "Home-field expertise",
    description:
      "Local electrical expertise for utility-scale renewable energy, agricultural operations, businesses, and homes.",
    image: "/bluebear/territory/imperial-valley.webp",
    services: ["Industrial", "Commercial", "Solar & BESS", "Residential", "Maintenance"],
    coordinates: "32.7920° N  ·  115.5631° W",
    response: "Local team",
    pin: { x: 63, y: 83 },
  },
  {
    id: "yuma",
    city: "Yuma",
    state: "Arizona",
    kicker: "Cross-border power corridor",
    description:
      "Industrial, commercial, renewable-energy, and maintenance coverage across the lower Colorado River region.",
    image: "/bluebear/territory/yuma-az.webp",
    services: ["Industrial", "Commercial", "Solar & BESS", "Maintenance"],
    coordinates: "32.6927° N  ·  114.6277° W",
    response: "Fast regional response",
    pin: { x: 84, y: 59 },
  },
];

const FACES = ["Environment", "Capabilities", "Coverage", "Dispatch"];

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13.4 1 4.8 13.1h6.4L10.4 23l8.8-13h-6.5L13.4 1Z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 9h17M3.5 15h17M12 3c2.4 2.5 3.5 5.5 3.5 9S14.4 18.5 12 21M12 3C9.6 5.5 8.5 8.5 8.5 12S9.6 18.5 12 21" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 10h13M11 5l5 5-5 5" />
    </svg>
  );
}

export default function BlueBearTerritory() {
  const [activeIndex, setActiveIndex] = useState(3);
  const [faceIndex, setFaceIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);
  const activeZone = ZONES[activeIndex];

  const activateZone = useCallback((index: number) => {
    setActiveIndex(index);
    setFaceIndex(0);
  }, []);

  useEffect(() => {
    if (!autoPlay) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % ZONES.length);
      setFaceIndex(0);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [autoPlay]);

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    stageRef.current.style.setProperty("--pointer-x", `${x * 13}deg`);
    stageRef.current.style.setProperty("--pointer-y", `${y * -9 - 7}deg`);
    stageRef.current.style.setProperty("--glow-x", `${(x + 0.5) * 100}%`);
    stageRef.current.style.setProperty("--glow-y", `${(y + 0.5) * 100}%`);
  }

  function resetPointer() {
    stageRef.current?.style.setProperty("--pointer-x", "-13deg");
    stageRef.current?.style.setProperty("--pointer-y", "-7deg");
    stageRef.current?.style.setProperty("--glow-x", "64%");
    stageRef.current?.style.setProperty("--glow-y", "38%");
  }

  return (
    <section className={styles.territory} aria-labelledby="territory-title">
      <div className={styles.aurora} aria-hidden="true" />
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.shell}>
        <header className={styles.heading}>
          <div>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowIcon}><GlobeIcon /></span>
              Blue Bear Electric · Service Territory
            </div>
            <h1 id="territory-title">
              Power where the <span>work leads.</span>
            </h1>
          </div>
          <p>
            Five power corridors. One field-tested team. Explore each region through our interactive 4D territory system.
          </p>
        </header>

        <div className={styles.metrics} aria-label="Service territory highlights">
          <div className={styles.metricLead}>
            <GlobeIcon />
            <span><strong>500+ miles</strong><small>connected coverage</small></span>
          </div>
          <div className={styles.metric}><strong>05</strong><span>Major<br />regions</span></div>
          <div className={styles.metric}><strong>24/7</strong><span>Field<br />availability</span></div>
          <div className={styles.metric}><strong>Fast</strong><span>Regional<br />response</span></div>
          <a className={styles.metricCta} href="tel:+17605409527">
            Dispatch a crew <ArrowIcon />
          </a>
        </div>

        <div
          className={styles.stage}
          ref={stageRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={resetPointer}
          onPointerEnter={() => setAutoPlay(false)}
        >
          <div className={styles.stageGlow} aria-hidden="true" />
          <div className={styles.mapColumn}>
            <div className={styles.mapMeta}>
              <span>Live coverage topology</span>
              <span className={styles.live}><i /> 05 zones online</span>
            </div>
            <div className={styles.mapFrame}>
              <img
                src="/bluebear/territory/service-territory-map.webp"
                alt="Blue Bear Electric service territory across Southern California and Arizona"
                draggable="false"
              />
              <div className={styles.mapShade} aria-hidden="true" />
              <div className={styles.scanLine} aria-hidden="true" />
              {ZONES.map((zone, index) => (
                <button
                  key={zone.id}
                  type="button"
                  className={`${styles.pin} ${index === activeIndex ? styles.pinActive : ""}`}
                  style={{ left: `${zone.pin.x}%`, top: `${zone.pin.y}%` }}
                  onClick={() => activateZone(index)}
                  aria-label={`Explore ${zone.city}`}
                  aria-pressed={index === activeIndex}
                >
                  <span className={styles.pinPulse} />
                  <span className={styles.pinCore}><BoltIcon /></span>
                  <span className={styles.pinLabel}>{zone.city}</span>
                </button>
              ))}
              <div className={styles.mapLegend}>
                <span>CA</span>
                <i />
                <span>AZ</span>
                <small>Industrial · Commercial · Renewable</small>
              </div>
            </div>
          </div>

          <div className={styles.zoneColumn}>
            <div className={styles.zoneTopline}>
              <div>
                <span>Zone {String(activeIndex + 1).padStart(2, "0")}</span>
                <strong>{activeZone.city}</strong>
              </div>
              <button
                type="button"
                className={styles.autoButton}
                onClick={() => setAutoPlay((value) => !value)}
                aria-pressed={autoPlay}
              >
                <i className={autoPlay ? styles.playing : ""} />
                {autoPlay ? "Auto orbit" : "Manual orbit"}
              </button>
            </div>

            <div className={styles.cubeViewport}>
              <div className={styles.cubeTilt}>
                <div
                  className={styles.cube}
                  style={{ "--face-turn": `${faceIndex * -90}deg` } as CSSProperties}
                  aria-live="polite"
                >
                  <div className={`${styles.cubeFace} ${styles.faceFront}`}>
                    <img src={activeZone.image} alt="" draggable="false" />
                    <div className={styles.imageVeil} />
                    <div className={styles.faceNumber}>{String(activeIndex + 1).padStart(2, "0")}</div>
                    <div className={styles.faceCopy}>
                      <span>{activeZone.state}</span>
                      <h2>{activeZone.city}</h2>
                      <p>{activeZone.kicker}</p>
                    </div>
                  </div>

                  <div className={`${styles.cubeFace} ${styles.faceRight}`}>
                    <span className={styles.faceTag}>Capabilities</span>
                    <h3>Built for complex power.</h3>
                    <ul>
                      {activeZone.services.map((service) => <li key={service}>{service}</li>)}
                    </ul>
                    <div className={styles.trace} aria-hidden="true" />
                  </div>

                  <div className={`${styles.cubeFace} ${styles.faceBack}`}>
                    <span className={styles.faceTag}>Coverage intelligence</span>
                    <h3>{activeZone.coordinates}</h3>
                    <p>{activeZone.description}</p>
                    <div className={styles.coverageRing} aria-hidden="true"><span>500+</span><small>miles</small></div>
                  </div>

                  <div className={`${styles.cubeFace} ${styles.faceLeft}`}>
                    <span className={styles.faceTag}>Rapid dispatch</span>
                    <h3>{activeZone.response}</h3>
                    <p>Tell us what is happening. We will align the right electrical capability to the work.</p>
                    <a href="tel:+17605409527">Call (760) 540-9527 <ArrowIcon /></a>
                  </div>

                  <div className={`${styles.cubeFace} ${styles.faceTop}`}>
                    <BoltIcon />
                    <strong>Blue Bear Electric</strong>
                  </div>
                  <div className={`${styles.cubeFace} ${styles.faceBottom}`}>CA · AZ</div>
                </div>
              </div>
              <div className={styles.cubeShadow} aria-hidden="true" />
            </div>

            <div className={styles.faceControls} aria-label="Explore zone cube dimensions">
              {FACES.map((face, index) => (
                <button
                  key={face}
                  type="button"
                  className={index === faceIndex ? styles.faceControlActive : ""}
                  onClick={() => setFaceIndex(index)}
                  aria-pressed={index === faceIndex}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>{face}
                </button>
              ))}
            </div>
            <div className={styles.zoneDescription}>
              <p>{activeZone.description}</p>
              <button
                type="button"
                onClick={() => setFaceIndex((faceIndex + 1) % FACES.length)}
              >
                Rotate dimension <span>↗</span>
              </button>
            </div>
          </div>
        </div>

        <div className={styles.zoneRail} aria-label="Select a service region">
          {ZONES.map((zone, index) => (
            <button
              key={zone.id}
              type="button"
              className={`${styles.zoneTile} ${index === activeIndex ? styles.zoneTileActive : ""}`}
              style={{ "--zone-image": `url(${zone.image})` } as CSSProperties}
              onClick={() => {
                activateZone(index);
                setAutoPlay(false);
              }}
              aria-pressed={index === activeIndex}
            >
              <span className={styles.tileIndex}>{String(index + 1).padStart(2, "0")}</span>
              <span className={styles.tileCopy}><strong>{zone.city}</strong><small>{zone.state}</small></span>
              <span className={styles.tileArrow}>↗</span>
            </button>
          ))}
        </div>

        <footer className={styles.footerLine}>
          <span>Licensed electrical field services</span>
          <i />
          <span>Solar &amp; BESS specialists</span>
          <i />
          <span>Southern California · Arizona</span>
        </footer>
      </div>
    </section>
  );
}
