(function () {
  "use strict";

  const currentScript = document.currentScript;
  const componentBase = currentScript
    ? new URL(".", currentScript.src).href
    : "components/territory/";
  const asset = (file) => `${componentBase}images/${file}`;

  const zones = [
    {
      city: "Los Angeles",
      state: "California",
      kicker: "Urban power systems",
      description: "High-demand commercial, industrial, solar, BESS, and residential electrical support across Greater Los Angeles.",
      image: "los-angeles.webp",
      services: ["Industrial", "Commercial", "Solar & BESS", "Residential"],
      coordinates: "34.0522° N  ·  118.2437° W",
      response: "Regional dispatch",
      x: 27,
      y: 37,
    },
    {
      city: "San Diego",
      state: "California",
      kicker: "Coastal energy corridor",
      description: "Responsive electrical service for commercial facilities, residences, clean-energy assets, and complex field work.",
      image: "san-diego.webp",
      services: ["Industrial", "Commercial", "Solar & BESS", "Residential"],
      coordinates: "32.7157° N  ·  117.1611° W",
      response: "24/7 availability",
      x: 34,
      y: 73,
    },
    {
      city: "Coachella Valley",
      state: "California",
      kicker: "Desert energy systems",
      description: "Specialized field support for solar, battery storage, industrial facilities, commercial sites, and maintenance programs.",
      image: "coachella-valley.webp",
      services: ["Solar & BESS", "Industrial", "Commercial", "Maintenance"],
      coordinates: "33.6803° N  ·  116.1739° W",
      response: "Desert-ready crews",
      x: 56,
      y: 48,
    },
    {
      city: "Imperial Valley",
      state: "California",
      kicker: "Home-field expertise",
      description: "Local electrical expertise for utility-scale renewable energy, agricultural operations, businesses, and homes.",
      image: "imperial-valley.webp",
      services: ["Industrial", "Commercial", "Solar & BESS", "Residential", "Maintenance"],
      coordinates: "32.7920° N  ·  115.5631° W",
      response: "Local team",
      x: 63,
      y: 83,
    },
    {
      city: "Yuma",
      state: "Arizona",
      kicker: "Cross-border power corridor",
      description: "Industrial, commercial, renewable-energy, and maintenance coverage across the lower Colorado River region.",
      image: "yuma-az.webp",
      services: ["Industrial", "Commercial", "Solar & BESS", "Maintenance"],
      coordinates: "32.6927° N  ·  114.6277° W",
      response: "Fast regional response",
      x: 84,
      y: 59,
    },
  ];

  const boltIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13.4 1 4.8 13.1h6.4L10.4 23l8.8-13h-6.5L13.4 1Z"></path>
    </svg>`;

  const globeIcon = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9"></circle>
      <path d="M3.5 9h17M3.5 15h17M12 3c2.4 2.5 3.5 5.5 3.5 9S14.4 18.5 12 21M12 3C9.6 5.5 8.5 8.5 8.5 12S9.6 18.5 12 21"></path>
    </svg>`;

  const arrowIcon = `
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M3 10h13M11 5l5 5-5 5"></path>
    </svg>`;

  function initializeTerritory() {
    const mount = document.getElementById("blue-bear-territory");
    if (!mount) {
      console.warn("Blue Bear Territory: add <div id=\"blue-bear-territory\"></div> where the section should appear.");
      return;
    }

    const pins = zones.map((zone, index) => `
      <button type="button" class="bbt-pin" data-zone="${index}" style="left:${zone.x}%;top:${zone.y}%" aria-label="Explore ${zone.city}" aria-pressed="false">
        <span class="bbt-pinPulse"></span>
        <span class="bbt-pinCore">${boltIcon}</span>
        <span class="bbt-pinLabel">${zone.city}</span>
      </button>`).join("");

    const tiles = zones.map((zone, index) => `
      <button type="button" class="bbt-zoneTile" data-zone="${index}" style="--zone-image:url('${asset(zone.image)}')" aria-pressed="false">
        <span class="bbt-tileIndex">${String(index + 1).padStart(2, "0")}</span>
        <span class="bbt-tileCopy"><strong>${zone.city}</strong><small>${zone.state}</small></span>
        <span class="bbt-tileArrow">↗</span>
      </button>`).join("");

    mount.innerHTML = `
      <section class="bbt-territory" aria-labelledby="bbt-territory-title">
        <div class="bbt-aurora" aria-hidden="true"></div>
        <div class="bbt-grid" aria-hidden="true"></div>
        <div class="bbt-shell">
          <header class="bbt-heading">
            <div>
              <div class="bbt-eyebrow"><span class="bbt-eyebrowIcon">${globeIcon}</span>Blue Bear Electric · Service Territory</div>
              <h1 id="bbt-territory-title">Power where the <span>work leads.</span></h1>
            </div>
            <p>Five power corridors. One field-tested team. Explore each region through our interactive 4D territory system.</p>
          </header>

          <div class="bbt-metrics" aria-label="Service territory highlights">
            <div class="bbt-metricLead">${globeIcon}<span><strong>500+ miles</strong><small>connected coverage</small></span></div>
            <div class="bbt-metric"><strong>05</strong><span>Major<br>regions</span></div>
            <div class="bbt-metric"><strong>24/7</strong><span>Field<br>availability</span></div>
            <div class="bbt-metric"><strong>Fast</strong><span>Regional<br>response</span></div>
            <a class="bbt-metricCta" href="tel:+17605409527">Dispatch a crew ${arrowIcon}</a>
          </div>

          <div class="bbt-stage">
            <div class="bbt-stageGlow" aria-hidden="true"></div>
            <div class="bbt-mapColumn">
              <div class="bbt-mapMeta"><span>Live coverage topology</span><span class="bbt-live"><i></i>05 zones online</span></div>
              <div class="bbt-mapFrame">
                <img src="${asset("service-territory-map.webp")}" alt="Blue Bear Electric service territory across Southern California and Arizona" draggable="false">
                <div class="bbt-mapShade" aria-hidden="true"></div>
                <div class="bbt-scanLine" aria-hidden="true"></div>
                ${pins}
                <div class="bbt-mapLegend"><span>CA</span><i></i><span>AZ</span><small>Industrial · Commercial · Renewable</small></div>
              </div>
            </div>

            <div class="bbt-zoneColumn">
              <div class="bbt-zoneTopline">
                <div><span class="bbt-zoneNumber"></span><strong class="bbt-zoneName"></strong></div>
                <button type="button" class="bbt-autoButton" aria-pressed="true"><i class="bbt-playing"></i><span>Auto orbit</span></button>
              </div>

              <div class="bbt-cubeViewport">
                <div class="bbt-cubeTilt">
                  <div class="bbt-cube" style="--face-turn:0deg" aria-live="polite">
                    <div class="bbt-cubeFace bbt-faceFront">
                      <img class="bbt-zoneImage" src="" alt="" draggable="false">
                      <div class="bbt-imageVeil"></div>
                      <div class="bbt-faceNumber"></div>
                      <div class="bbt-faceCopy"><span class="bbt-zoneState"></span><h2 class="bbt-cubeCity"></h2><p class="bbt-zoneKicker"></p></div>
                    </div>
                    <div class="bbt-cubeFace bbt-faceRight">
                      <span class="bbt-faceTag">Capabilities</span><h3>Built for complex power.</h3><ul class="bbt-services"></ul><div class="bbt-trace" aria-hidden="true"></div>
                    </div>
                    <div class="bbt-cubeFace bbt-faceBack">
                      <span class="bbt-faceTag">Coverage intelligence</span><h3 class="bbt-coordinates"></h3><p class="bbt-backDescription"></p><div class="bbt-coverageRing" aria-hidden="true"><span>500+</span><small>miles</small></div>
                    </div>
                    <div class="bbt-cubeFace bbt-faceLeft">
                      <span class="bbt-faceTag">Rapid dispatch</span><h3 class="bbt-response"></h3><p>Tell us what is happening. We will align the right electrical capability to the work.</p><a href="tel:+17605409527">Call (760) 540-9527 ${arrowIcon}</a>
                    </div>
                    <div class="bbt-cubeFace bbt-faceTop">${boltIcon}<strong>Blue Bear Electric</strong></div>
                    <div class="bbt-cubeFace bbt-faceBottom">CA · AZ</div>
                  </div>
                </div>
                <div class="bbt-cubeShadow" aria-hidden="true"></div>
              </div>

              <div class="bbt-faceControls" aria-label="Explore zone cube dimensions">
                <button type="button" data-face="0" aria-pressed="true"><span>01</span>Environment</button>
                <button type="button" data-face="1" aria-pressed="false"><span>02</span>Capabilities</button>
                <button type="button" data-face="2" aria-pressed="false"><span>03</span>Coverage</button>
                <button type="button" data-face="3" aria-pressed="false"><span>04</span>Dispatch</button>
              </div>
              <div class="bbt-zoneDescription"><p></p><button type="button" class="bbt-rotateButton">Rotate dimension <span>↗</span></button></div>
            </div>
          </div>

          <div class="bbt-zoneRail" aria-label="Select a service region">${tiles}</div>
          <footer class="bbt-footerLine"><span>Licensed electrical field services</span><i></i><span>Solar &amp; BESS specialists</span><i></i><span>Southern California · Arizona</span></footer>
        </div>
      </section>`;

    const stage = mount.querySelector(".bbt-stage");
    const cube = mount.querySelector(".bbt-cube");
    const autoButton = mount.querySelector(".bbt-autoButton");
    let activeIndex = 3;
    let faceIndex = 0;
    let autoPlay = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let timer = null;

    function setText(selector, value) {
      const element = mount.querySelector(selector);
      if (element) element.textContent = value;
    }

    function renderFace() {
      cube.style.setProperty("--face-turn", `${faceIndex * -90}deg`);
      mount.querySelectorAll("[data-face]").forEach((button) => {
        const selected = Number(button.dataset.face) === faceIndex;
        button.classList.toggle("bbt-faceControlActive", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
    }

    function renderZone(index) {
      activeIndex = index;
      faceIndex = 0;
      const zone = zones[index];
      setText(".bbt-zoneNumber", `Zone ${String(index + 1).padStart(2, "0")}`);
      setText(".bbt-zoneName", zone.city);
      setText(".bbt-faceNumber", String(index + 1).padStart(2, "0"));
      setText(".bbt-zoneState", zone.state);
      setText(".bbt-cubeCity", zone.city);
      setText(".bbt-zoneKicker", zone.kicker);
      setText(".bbt-coordinates", zone.coordinates);
      setText(".bbt-backDescription", zone.description);
      setText(".bbt-response", zone.response);
      setText(".bbt-zoneDescription p", zone.description);
      mount.querySelector(".bbt-zoneImage").src = asset(zone.image);
      mount.querySelector(".bbt-services").innerHTML = zone.services.map((service) => `<li>${service}</li>`).join("");
      mount.querySelectorAll("[data-zone]").forEach((button) => {
        const selected = Number(button.dataset.zone) === index;
        button.classList.toggle("bbt-pinActive", selected && button.classList.contains("bbt-pin"));
        button.classList.toggle("bbt-zoneTileActive", selected && button.classList.contains("bbt-zoneTile"));
        button.setAttribute("aria-pressed", String(selected));
      });
      renderFace();
    }

    function renderAuto() {
      autoButton.setAttribute("aria-pressed", String(autoPlay));
      autoButton.querySelector("i").classList.toggle("bbt-playing", autoPlay);
      autoButton.querySelector("span").textContent = autoPlay ? "Auto orbit" : "Manual orbit";
      if (timer) window.clearInterval(timer);
      timer = autoPlay ? window.setInterval(() => renderZone((activeIndex + 1) % zones.length), 6500) : null;
    }

    mount.addEventListener("click", (event) => {
      const zoneButton = event.target.closest("[data-zone]");
      if (zoneButton && mount.contains(zoneButton)) {
        renderZone(Number(zoneButton.dataset.zone));
        autoPlay = false;
        renderAuto();
        return;
      }
      const faceButton = event.target.closest("[data-face]");
      if (faceButton && mount.contains(faceButton)) {
        faceIndex = Number(faceButton.dataset.face);
        renderFace();
      }
    });

    mount.querySelector(".bbt-rotateButton").addEventListener("click", () => {
      faceIndex = (faceIndex + 1) % 4;
      renderFace();
    });

    autoButton.addEventListener("click", () => {
      autoPlay = !autoPlay;
      renderAuto();
    });

    stage.addEventListener("pointerenter", () => {
      if (autoPlay) {
        autoPlay = false;
        renderAuto();
      }
    });

    stage.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      const rect = stage.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      stage.style.setProperty("--pointer-x", `${x * 13}deg`);
      stage.style.setProperty("--pointer-y", `${y * -9 - 7}deg`);
      stage.style.setProperty("--glow-x", `${(x + 0.5) * 100}%`);
      stage.style.setProperty("--glow-y", `${(y + 0.5) * 100}%`);
    });

    stage.addEventListener("pointerleave", () => {
      stage.style.setProperty("--pointer-x", "-13deg");
      stage.style.setProperty("--pointer-y", "-7deg");
      stage.style.setProperty("--glow-x", "64%");
      stage.style.setProperty("--glow-y", "38%");
    });

    renderZone(activeIndex);
    renderAuto();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeTerritory, { once: true });
  } else {
    initializeTerritory();
  }
})();
