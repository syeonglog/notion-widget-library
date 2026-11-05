
(() => {
  "use strict";

  const canvas = document.getElementById("tank");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const tank = document.querySelector(".aquarium");
  const feedBtn = document.getElementById("feedBtn");
  const settingsBtn = document.getElementById("settingsBtn");
  const settingsPanel = document.getElementById("settingsPanel");
  const colorsEl = document.getElementById("colorSettings");
  const countEl = document.getElementById("fishCount");

  /* ============================
     COLORS & STORAGE
  ============================ */

  const palette = {
    Pink: "#EAB7A2",
    Yellow: "#F4D8A3",
    Purple: "#C6B6D7",
    Mint: "#A9CDC3",
    Peach: "#F1C5A8",
    Blue: "#AECBD9"
  };

  const defaults = [
    "Pink", "Yellow", "Purple", "Mint", "Peach"
  ];

  const storageKey = "my-little-aquarium-v1";

  let saved = {};

  try {
    saved = JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch (_) {
    // Storage unavailable
  }

  let count = Number.isInteger(saved.count)
    ? Math.max(1, Math.min(5, saved.count))
    : 3;

  let selected = Array.from(
    { length: 5 },
    (_, i) => palette[saved.colors?.[i]]
      ? saved.colors[i]
      : defaults[i]
  );

  const save = () => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ count, colors: selected })
      );
    } catch (_) {}
  };

  /* ============================
     VARIABLES
  ============================ */

  let w = 0;
  let h = 0;
  let dpr = 1;

  let fish = [];
  let bubbles = [];
  let pellets = [];
  let sparkles = [];

  let feeding = false;
  let visible = true;
  let raf = 0;
  let lastTime = 0;
  let clock = 0;
  let bubbleDelay = 0;

  const rand = (a, b) =>
    a + Math.random() * (b - a);

  const clamp = (v, a, b) =>
    Math.max(a, Math.min(b, v));

  const ground = () => h - 17;

  /* ============================
     FISH CREATION
  ============================ */

  function createFish(i) {
    const margin = 23;

    return {
      x: rand(
        margin,
        Math.max(margin + 1, w - margin)
      ),
      y: rand(
        35,
        Math.max(36, ground() - 30)
      ),

      vx: rand(-14, 14) || 8,
      vy: rand(-4, 4),

      heading: Math.random() < 0.5 ? -1 : 1,

      size: rand(10.5, 13.5),
      phase: rand(0, Math.PI * 2),
      turnTimer: rand(1, 4),

      targetY: rand(
        32,
        Math.max(33, ground() - 25)
      ),

      color: selected[i],
      shape: i % 5,
      reaction: 0
    };
  }

  function syncFish() {
    while (fish.length < count) {
      fish.push(createFish(fish.length));
    }

    fish.length = count;

    fish.forEach((f, i) => {
      f.color = selected[i];
    });

    countEl.textContent = count;

    document.getElementById("decrease").disabled =
      count === 1;

    document.getElementById("increase").disabled =
      count === 5;

    renderColors();
  }

  /* ============================
     COLOR SETTINGS
  ============================ */

  function renderColors() {
    colorsEl.replaceChildren();

    fish.forEach((f, i) => {
      const label = document.createElement("label");
      label.textContent = `${i + 1}`;

      const select = document.createElement("select");

      select.setAttribute(
        "aria-label",
        `Fish ${i + 1} color`
      );

      for (const name of Object.keys(palette)) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        select.append(option);
      }

      select.value = selected[i];

      select.addEventListener("change", () => {
        selected[i] = select.value;
        f.color = select.value;
        save();
      });

      label.append(select);
      colorsEl.append(label);
    });
  }

  /* ============================
     CANVAS RESIZE
  ============================ */

  function resize() {
    const rect = tank.getBoundingClientRect();

    const oldW = w || rect.width;
    const oldH = h || rect.height;

    w = Math.max(1, rect.width);
    h = Math.max(1, rect.height);

    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    fish.forEach(f => {
      f.x = clamp(
        f.x * w / oldW,
        20,
        Math.max(20, w - 20)
      );

      f.y = clamp(
        f.y * h / oldH,
        22,
        Math.max(22, ground() - 12)
      );
    });
  }

  /* ============================
     FEEDING
  ============================ */

  function startFeed() {
    if (feeding || !fish.length) return;

    feeding = true;
    feedBtn.disabled = true;

    pellets = fish.map((_, i) => ({
      x: clamp(
        w * (i + 1) / (fish.length + 1) + rand(-12, 12),
        18,
        w - 18
      ),
      y: -rand(5, 48),
      vy: rand(15, 22),
      owner: i,
      done: false
    }));
  }

  function finishFeed() {
    feeding = false;
    pellets = [];
    feedBtn.disabled = false;
  }

  /* ============================
     ANIMATION UPDATE
  ============================ */

  function update(dt) {
    clock += dt;
    bubbleDelay -= dt;

    /* BUBBLES */

    if (bubbleDelay <= 0 && bubbles.length < 16) {
      bubbles.push({
        x: rand(12, w - 12),
        y: ground() + 2,
        r: rand(1.5, 3.8),
        speed: rand(10, 22),
        phase: rand(0, 7),
        age: 0
      });

      bubbleDelay = rand(0.45, 1.1);
    }

    bubbles = bubbles.filter(b => b.y > -8);

    for (const b of bubbles) {
      b.age += dt;
      b.y -= b.speed * dt;
    }

    /* FALLING FOOD */

    for (const p of pellets) {
      if (!p.done) {
        p.y = Math.min(
          ground() - 12,
          p.y + p.vy * dt
        );
      }
    }

    /* FISH MOVEMENT */

    fish.forEach((f, i) => {
      f.phase += dt * 6;
      f.reaction = Math.max(0, f.reaction - dt);
      f.turnTimer -= dt;

      const p = feeding ? pellets[i] : null;

      let desiredX;
      let desiredY;
      let speed;

      if (p && !p.done) {
        desiredX = p.x - f.heading * 5;

        desiredY = clamp(
          p.y + 3,
          21,
          ground() - 13
        );

        speed = 27;

        if (
          p.y > 13 &&
          Math.hypot(f.x - p.x, f.y - p.y) < f.size * 0.95
        ) {
          p.done = true;
          f.reaction = 1.1;

          sparkles.push({
            x: f.x,
            y: f.y - 13,
            age: 0,
            life: 0.85
          });
        }
      } else {
        if (f.turnTimer <= 0) {
          f.turnTimer = rand(2, 5);

          f.targetY = rand(
            26,
            Math.max(27, ground() - 22)
          );
        }

        desiredX = f.x + (f.vx >= 0 ? 65 : -65);

        desiredY =
          f.targetY +
          Math.sin(clock * 0.8 + i * 2) * 7;

        speed = 8 + i * 1.7;
      }

      const dx = desiredX - f.x;
      const dy = desiredY - f.y;

      let targetVX = clamp(
        dx * 1.4,
        -speed,
        speed
      );

      let targetVY = clamp(
        dy * 1.2,
        -speed * 0.55,
        speed * 0.55
      );

      const minX = f.size * 1.8;
      const maxX = Math.max(
        minX + 1,
        w - f.size * 1.8
      );

      if (f.x < minX + 6) {
        targetVX = Math.max(
          7,
          Math.abs(targetVX)
        );
      }

      if (f.x > maxX - 6) {
        targetVX = -Math.max(
          7,
          Math.abs(targetVX)
        );
      }

      const blend = 1 - Math.exp(-dt * 1.8);

      f.vx += (targetVX - f.vx) * blend;
      f.vy += (targetVY - f.vy) * blend;

      f.x = clamp(
        f.x + f.vx * dt,
        minX,
        maxX
      );

      f.y = clamp(
        f.y + f.vy * dt,
        23,
        Math.max(24, ground() - 12)
      );

      if (Math.abs(f.vx) > 1.2) {
        f.heading = f.vx > 0 ? 1 : -1;
      }
    });

    sparkles = sparkles.filter(
      s => s.age < s.life
    );

    sparkles.forEach(s => {
      s.age += dt;
    });

    if (
      feeding &&
      pellets.every(p => p.done)
    ) {
      finishFeed();
    }
  }

  /* ============================
     SEAWEED
  ============================ */

  function seaweed(x, base, height, phase) {
    ctx.save();
    ctx.lineCap = "round";

    for (let i = 0; i < 3; i++) {
      const x0 = x + (i - 1) * 7;
      const hh = height * (0.77 + i * 0.1);

      const sway =
        Math.sin(clock * 0.7 + phase + i * 0.6) * 7;

      ctx.beginPath();
      ctx.moveTo(x0, base);

      ctx.bezierCurveTo(
        x0 - 8,
        base - hh * 0.35,
        x0 + sway + 7,
        base - hh * 0.7,
        x0 + sway,
        base - hh
      );

      ctx.strokeStyle =
        i === 1 ? "#AFCFC4" : "#BAD7CD";

      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 4.8 - i * 0.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  /* ============================
     CORAL
  ============================ */

  function coral(x, y, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.lineCap = "round";

    const stems = [
      [-10, -10, -15, -27],
      [-10, -10, -5, -23],
      [0, 0, -3, -31],
      [0, -15, 10, -28],
      [9, 0, 15, -21],
      [9, -10, 20, -17]
    ];

    ctx.strokeStyle = "#DFB6AF";
    ctx.lineWidth = 4.5;
    ctx.globalAlpha = 0.78;

    for (const [x1, y1, x2, y2] of stems) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);

      ctx.quadraticCurveTo(
        (x1 + x2) / 2 + 3,
        (y1 + y2) / 2,
        x2,
        y2
      );

      ctx.stroke();
    }

    ctx.restore();
  }

  /* ============================
     SHELL
  ============================ */

  function shell(x, y, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    ctx.fillStyle = "#F3E4D9";
    ctx.strokeStyle = "#D7BFB6";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(-12, 0);

    ctx.bezierCurveTo(
      -17, -14, -8, -19, 0, -16
    );

    ctx.bezierCurveTo(
      9, -21, 17, -11, 12, 0
    );

    ctx.quadraticCurveTo(0, 5, -12, 0);
    ctx.fill();
    ctx.stroke();

    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 1);

      ctx.lineTo(
        i * 4,
        -13 + Math.abs(i) * 2
      );

      ctx.stroke();
    }

    ctx.restore();
  }

  /* ============================
     TREASURE CHEST
  ============================ */

  function treasure(x, y) {
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = "#D7BBA1";
    ctx.strokeStyle = "#A88D78";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.roundRect(-14, -12, 28, 13, 3);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-13, -12);
    ctx.quadraticCurveTo(0, -25, 13, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#F6E7B3";
    ctx.fillRect(-2, -13, 4, 7);

    ctx.restore();
  }

  /* ============================
     PEBBLES
  ============================ */

  function pebble(x, y, rx, ry, color) {
    ctx.fillStyle = color;
    ctx.beginPath();

    ctx.ellipse(
      x, y,
      rx, ry,
      0, 0,
      Math.PI * 2
    );

    ctx.fill();
  }

  /* ============================
     DRAW FISH — 5 SHAPES
  ============================ */

  function drawFish(f) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(f.heading, 1);

    const s = f.size;
    const tail = Math.sin(f.phase) * 0.18;
    const shape = f.shape;

    const forms = [
      [1.05, 0.76],
      [0.9, 1.02],
      [1.36, 0.55],
      [0.92, 0.72],
      [1.18, 0.65]
    ];

    const [rx, ry] = forms[shape];

    ctx.fillStyle = palette[f.color];
    ctx.strokeStyle = "#8A77702a";
    ctx.lineWidth = 0.7;

    /* TAIL */

    ctx.beginPath();
    ctx.moveTo(-s * rx * 0.75, 0);

    if (shape === 3) {
      ctx.quadraticCurveTo(
        -s * 2,
        -s * (1.15 + tail),
        -s * 1.8,
        -s * 0.1
      );

      ctx.quadraticCurveTo(
        -s * 2,
        s * (1.15 - tail),
        -s * rx * 0.75,
        0
      );
    } else if (shape === 1) {
      ctx.lineTo(
        -s * 1.5,
        -s * (0.82 + tail)
      );

      ctx.quadraticCurveTo(
        -s * 1.33,
        0,
        -s * 1.5,
        s * (0.82 - tail)
      );
    } else {
      ctx.lineTo(
        -s * 1.75,
        -s * (0.58 + tail)
      );

      ctx.quadraticCurveTo(
        -s * 1.44,
        0,
        -s * 1.75,
        s * (0.58 - tail)
      );
    }

    ctx.closePath();
    ctx.fill();

    /* BODY */

    ctx.beginPath();

    ctx.ellipse(
      0, 0,
      s * rx,
      s * ry,
      0, 0,
      Math.PI * 2
    );

    ctx.fill();
    ctx.stroke();

    /* STRIPES */

    if (shape === 4) {
      ctx.save();

      ctx.beginPath();

      ctx.ellipse(
        0, 0,
        s * rx,
        s * ry,
        0, 0,
        Math.PI * 2
      );

      ctx.clip();
      ctx.fillStyle = "#ffffff77";

      for (
        let x = -s * 0.52;
        x < s * 0.7;
        x += s * 0.53
      ) {
        ctx.fillRect(x, -s, 3, s * 2);
      }

      ctx.restore();
    }

    /* HIGHLIGHT */

    ctx.fillStyle = "#ffffff77";
    ctx.beginPath();

    ctx.ellipse(
      s * 0.1,
      -s * ry * 0.42,
      s * 0.46,
      s * 0.12,
      -0.2,
      0,
      Math.PI * 2
    );

    ctx.fill();

    /* DORSAL FIN */

    ctx.fillStyle = palette[f.color];
    ctx.globalAlpha = 0.82;

    ctx.beginPath();
    ctx.moveTo(-s * 0.3, -s * ry * 0.78);

    ctx.quadraticCurveTo(
      0,
      -s * (shape === 1 ? 1.45 : 1.1),
      s * 0.38,
      -s * ry * 0.8
    );

    ctx.closePath();
    ctx.fill();

    /* SIDE FIN */

    ctx.beginPath();

    ctx.ellipse(
      -s * 0.18,
      s * 0.23,
      s * 0.35,
      s * 0.15,
      Math.sin(f.phase) * 0.22,
      0,
      Math.PI * 2
    );

    ctx.fill();

    /* EYES */

    ctx.globalAlpha = 1;
    ctx.fillStyle = "#64534d";

    ctx.beginPath();
    ctx.arc(
      s * rx * 0.58,
      -s * 0.15,
      1.5,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(
      s * rx * 0.68,
      -s * 0.31,
      0.8,
      0,
      Math.PI * 2
    );
    ctx.fill();

    /* BLUSH */

    if (shape === 1) {
      ctx.fillStyle = "#D9938E88";
      ctx.beginPath();

      ctx.arc(
        s * 0.52,
        s * 0.25,
        2.6,
        0,
        Math.PI * 2
      );

      ctx.fill();
    }

    /* EATING HEART */

    if (f.reaction > 0) {
      ctx.globalAlpha = Math.min(
        1,
        f.reaction * 2
      );

      ctx.fillStyle = "#b68588";
      ctx.font = "12px sans-serif";
      ctx.fillText("♡", -3, -s * 1.25);
    }

    ctx.restore();
  }

  /* ============================
     SUNSET AQUARIUM RENDER
  ============================ */

  function render() {
    ctx.clearRect(0, 0, w, h);

    /* CORAL-PINK WATER GRADIENT */

    const light = ctx.createLinearGradient(
      0, 0, w * 0.18, h
    );

    light.addColorStop(0, "#FBE2D3");
    light.addColorStop(0.32, "#F7D5CE");
    light.addColorStop(0.72, "#F2C9CA");
    light.addColorStop(1, "#EABFC1");

    ctx.fillStyle = light;
    ctx.fillRect(0, 0, w, h);

    /* SOFT SUN GLOW */

    const sunX = w * 0.72;
    const sunY = -h * 0.12;

    const glow = ctx.createRadialGradient(
      sunX, sunY, 2,
      sunX, sunY, w * 0.7
    );

    glow.addColorStop(0, "#FFF9DCB0");
    glow.addColorStop(0.3, "#FFF2D766");
    glow.addColorStop(1, "#FFF2D700");

    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    /* MOVING SUNLIGHT RAYS */

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    const sway =
      Math.sin(clock * 0.28) * w * 0.017;

    for (let i = 0; i < 5; i++) {
      const start =
        sunX + (i - 2) * w * 0.075 + sway;

      const end =
        start + (i - 2) * w * 0.115;

      const ray = ctx.createLinearGradient(
        0, 0, 0, h
      );

      ray.addColorStop(0, "#FFF8E46A");
      ray.addColorStop(0.55, "#FFF6E72B");
      ray.addColorStop(1, "#FFF8E400");

      ctx.fillStyle = ray;

      ctx.beginPath();

      ctx.moveTo(start - w * 0.018, 0);
      ctx.lineTo(start + w * 0.018, 0);
      ctx.lineTo(end + w * 0.11, h);
      ctx.lineTo(end - w * 0.11, h);

      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();

    /* SUN REFLECTIONS */

    ctx.strokeStyle = "#FFF8E680";
    ctx.lineWidth = 1.2;

    for (let i = 0; i < 7; i++) {
      const x =
        w * (0.35 + i * 0.082) +
        Math.sin(clock * 0.4 + i) * 4;

      const y =
        23 + (i % 3) * 13 +
        Math.sin(clock * 0.6 + i) * 2;

      ctx.beginPath();

      ctx.ellipse(
        x, y,
        w * 0.025,
        1.6,
        -0.14,
        0,
        Math.PI * 2
      );

      ctx.stroke();
    }

    /* WATER SURFACE */

    ctx.strokeStyle = "#FFF9EDB0";
    ctx.lineWidth = 1.4;
    ctx.beginPath();

    for (let x = 0; x <= w; x += 4) {
      const y =
        11 + Math.sin(x * 0.043 + clock * 0.55) * 1.6;

      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    /* SAND */

    ctx.fillStyle = "#e8dfcc";
    ctx.beginPath();
    ctx.moveTo(0, ground());

    for (let x = 0; x <= w + 5; x += 5) {
      ctx.lineTo(
        x,
        ground() + Math.sin(x * 0.035) * 2.5
      );
    }

    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();

    /* SAND DETAILS */

    ctx.fillStyle = "#d3c6b2aa";

    for (let i = 0; i < 12; i++) {
      const x = (i * 0.618 % 1) * w;
      const y = ground() + 6 + (i % 3) * 3;

      ctx.beginPath();

      ctx.arc(
        x, y,
        randSeed(i),
        0,
        Math.PI * 2
      );

      ctx.fill();
    }

    /* PEBBLES */

    pebble(
      w * 0.06,
      ground() + 5,
      13, 6,
      "#C9C7BE"
    );

    pebble(
      w * 0.23,
      ground() + 4,
      10, 5,
      "#D9C9B9"
    );

    pebble(
      w * 0.64,
      ground() + 5,
      16, 7,
      "#C3CDC8"
    );

    pebble(
      w * 0.95,
      ground() + 4,
      11, 5,
      "#D9C8C2"
    );

    /* SEAWEED */

    seaweed(
      w * 0.12,
      ground() + 3,
      38,
      0
    );

    seaweed(
      w * 0.78,
      ground() + 3,
      43,
      2
    );

    /* CORAL */

    coral(
      w * 0.35,
      ground() + 2,
      w < 250 ? 0.65 : 0.85
    );

    /* SHELL */

    shell(
      w * 0.55,
      ground() + 2,
      0.8
    );

    /* ADDITIONAL DECORATIONS */

    if (w > 280) {
      seaweed(
        w * 0.92,
        ground() + 2,
        28,
        4
      );

      treasure(
        w * 0.87,
        ground() + 2
      );
    }

    /* BUBBLES */

    for (const b of bubbles) {
      ctx.beginPath();

      ctx.arc(
        b.x + Math.sin(b.age * 2 + b.phase) * 4,
        b.y,
        b.r,
        0,
        Math.PI * 2
      );

      ctx.strokeStyle = "#ffffffa8";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    /* FOOD */

    for (const p of pellets) {
      if (p.done) continue;

      ctx.fillStyle = "#aa8e78";
      ctx.beginPath();

      ctx.arc(
        p.x,
        p.y,
        2.3,
        0,
        Math.PI * 2
      );

      ctx.fill();
    }

    /* FISH */

    fish.forEach(drawFish);

    /* SPARKLES */

    for (const s of sparkles) {
      ctx.globalAlpha = Math.max(
        0,
        1 - s.age / s.life
      );

      ctx.fillStyle = "#fff";
      ctx.font = "12px sans-serif";

      ctx.fillText(
        "✧",
        s.x,
        s.y - s.age * 9
      );
    }

    ctx.globalAlpha = 1;
  }

  function randSeed(i) {
    return 0.5 + (i % 3) * 0.25;
  }

  /* ============================
     ANIMATION LOOP
  ============================ */

  function frame(timestamp) {
    raf = 0;

    if (!visible || document.hidden) return;

    const dt = lastTime
      ? Math.min(
          (timestamp - lastTime) / 1000,
          0.05
        )
      : 0;

    lastTime = timestamp;

    update(dt);
    render();

    raf = requestAnimationFrame(frame);
  }

  function resume() {
    if (!visible || document.hidden || raf) return;

    lastTime = 0;
    raf = requestAnimationFrame(frame);
  }

  function pause() {
    if (raf) {
      cancelAnimationFrame(raf);
    }

    raf = 0;
    lastTime = 0;
  }

  /* ============================
     PERFORMANCE
  ============================ */

  document.addEventListener(
    "visibilitychange",
    () => document.hidden ? pause() : resume()
  );

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      entries => {
        visible = entries[0].isIntersecting;

        if (visible) {
          resume();
        } else {
          pause();
        }
      },
      { threshold: 0 }
    ).observe(tank);
  }

  if ("ResizeObserver" in window) {
    new ResizeObserver(resize).observe(tank);
  } else {
    window.addEventListener("resize", resize);
  }

  /* ============================
     BUTTON EVENTS
  ============================ */

  feedBtn.addEventListener("click", startFeed);

  function toggleSettings(open) {
    settingsPanel.hidden = !open;

    settingsBtn.setAttribute(
      "aria-expanded",
      String(open)
    );
  }

  settingsBtn.addEventListener(
    "click",
    () => toggleSettings(settingsPanel.hidden)
  );

  document
    .getElementById("closeSettings")
    .addEventListener(
      "click",
      () => toggleSettings(false)
    );

  document
    .getElementById("decrease")
    .addEventListener("click", () => {
      count = Math.max(1, count - 1);
      syncFish();
      save();
    });

  document
    .getElementById("increase")
    .addEventListener("click", () => {
      count = Math.min(5, count + 1);
      syncFish();
      save();
    });

  /* ============================
     INITIALIZE
  ============================ */

  resize();
  syncFish();
  resume();
})();
