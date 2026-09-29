// ---------- scroll reveal ----------
const revealTargets = document.querySelectorAll('.publication, .latest-news, .timeline-section, .projects-section');
if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });
    revealTargets.forEach((el) => observer.observe(el));
} else {
    revealTargets.forEach((el) => el.classList.add('in-view'));
}

// ---------- BibTeX toggles ----------
document.querySelectorAll('.bib-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
        const el = document.getElementById(btn.dataset.target);
        el.hidden = !el.hidden;
    });
});


// ---------- sky: sakura at night; sakura, green leaves and bubbles on a summer day ----------
(function sky() {
    const root = document.documentElement;
    const back = document.getElementById('sky-back');
    const front = document.getElementById('sky-front');
    const toggle = document.querySelector('.petal-toggle');
    const themeToggle = document.querySelector('.theme-toggle');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctxB = back.getContext('2d');
    const ctxF = front.getContext('2d');

    // petal tints from the card: sakura pinks plus the pale moonlit white petals
    const SAKURA = [
        ['#fde9ee', '#f0b3c4'],
        ['#fbe0e8', '#e8a3b7'],
        ['#fff4f7', '#f4c6d3'],
        ['#f1f4f9', '#cfd8e5'],
    ];
    // fresh summer greens
    const LEAVES = [
        ['#c8e9a0', '#6fae6a'],
        ['#dcefa4', '#8cc57a'],
        ['#a8d88e', '#3f7d4a'],
        ['#e9f2a6', '#a9c95a'],
    ];
    // brighter, sunlit sakura for the daytime
    const DAY_SAKURA = [
        ['#ffe6e9', '#f59aa8'],
        ['#ffd9de', '#f28b9b'],
        ['#fff2f4', '#f7b5bf'],
        ['#ffffff', '#fbd3d9'],
    ];

    let W = 0, H = 0, DPR = 1;
    let petalsBack = [], petalsFront = [], stars = [], motes = [], streaks = [], bubbles = [];
    let wind = 0, windTarget = 0, t = 0;
    let theme = root.dataset.theme === 'day' ? 'day' : 'night';
    let dayMix = theme === 'day' ? 1 : 0; // eases 0 (night) → 1 (day) for the sky details
    const mouse = { x: -9999, y: -9999, vx: 0 };
    let running = true;
    let rafId = 0;
    const loop = () => { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(frame); };

    const rand = (a, b) => a + Math.random() * (b - a);
    const pick = (arr) => arr[(Math.random() * arr.length) | 0];

    function resize() {
        DPR = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth;
        H = window.innerHeight;
        [back, front].forEach((c) => {
            c.width = W * DPR;
            c.height = H * DPR;
        });
        ctxB.setTransform(DPR, 0, 0, DPR, 0, 0);
        ctxF.setTransform(DPR, 0, 0, DPR, 0, 0);
        makeStars();
        makeMotes();
    }

    function makePetal(isFront, x, y) {
        let kind = 'sakura', tint = pick(SAKURA), size = isFront ? rand(14, 22) : rand(7, 14);
        if (theme === 'day') {
            if (Math.random() < 0.5) {
                kind = 'leaf';
                tint = pick(LEAVES);
                size = isFront ? rand(18, 26) : rand(10, 17);
            } else {
                tint = pick(DAY_SAKURA);
            }
        }
        return {
            kind, tint, size,
            x: x ?? rand(-50, W + 50),
            y: y ?? rand(-H, -10),
            vy: rand(0.35, 0.9) * (isFront ? 1.4 : 1),
            vx: rand(-0.2, 0.35),
            sway: rand(0.4, 1.3),
            swayFreq: rand(0.008, 0.02),
            phase: rand(0, Math.PI * 2),
            rot: rand(0, Math.PI * 2),
            vrot: rand(-0.02, 0.02),
            flip: rand(0, Math.PI * 2),
            vflip: rand(0.01, 0.04),
            alpha: isFront ? rand(0.75, 0.95) : rand(0.55, 0.9),
            kick: 0,
        };
    }

    function makeStars() {
        const n = Math.round((W * H) / 26000);
        stars = Array.from({ length: n }, () => ({
            x: rand(0, W),
            y: rand(0, H * 0.75),
            r: rand(0.6, 1.8),
            twinkle: rand(0.01, 0.035),
            phase: rand(0, Math.PI * 2),
            spark: Math.random() < 0.18, // a few four-point gold stars
            gold: Math.random() < 0.5,
        }));
    }

    // floating specks of sunlight
    function makeMotes() {
        const n = Math.round((W * H) / 45000);
        motes = Array.from({ length: n }, () => ({
            x: rand(0, W),
            y: rand(0, H),
            r: rand(1.5, 4),
            vy: -rand(0.05, 0.25),
            vx: rand(-0.1, 0.1),
            twinkle: rand(0.01, 0.03),
            phase: rand(0, Math.PI * 2),
        }));
    }

    // soap bubbles drifting up through the sunlight
    function makeBubble(y) {
        const big = Math.random() < 0.28;
        return {
            x: rand(0, W),
            y: y ?? H + rand(20, 200),
            r: big ? rand(16, 38) : rand(4, 13),
            vy: -rand(0.25, 0.7),
            phase: rand(0, Math.PI * 2),
            hue: rand(0, 360),
            pop: 0,
        };
    }

    function stepBubble(b) {
        if (b.pop) {
            b.pop += 1 / 18;
            if (b.pop >= 1) Object.assign(b, makeBubble());
            return;
        }
        b.y += b.vy;
        b.x += Math.sin(t * 0.012 + b.phase) * 0.35 + wind * 0.3;
        b.hue += 0.4;
        const dx = b.x - mouse.x, dy = b.y - mouse.y;
        if (dayMix > 0.5 && dx * dx + dy * dy < (b.r + 6) * (b.r + 6)) b.pop = 0.001;
        if (b.y < -b.r - 20 || b.x < -60 || b.x > W + 60) Object.assign(b, makeBubble());
    }

    function drawBubble(ctx, b, fade) {
        const { x, y, r } = b;
        if (b.pop) {
            const k = b.pop;
            ctx.globalAlpha = (1 - k) * fade;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(x, y, r * (1 + k * 0.5), 0, Math.PI * 2);
            ctx.setLineDash([2, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
            return;
        }
        ctx.globalAlpha = fade;
        const body = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
        body.addColorStop(0, 'rgba(255, 255, 255, 0.04)');
        body.addColorStop(0.72, 'rgba(255, 255, 255, 0.08)');
        body.addColorStop(0.92, 'rgba(255, 255, 255, 0.4)');
        body.addColorStop(1, 'rgba(255, 255, 255, 0.75)');
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();

        // iridescent rim
        const rim = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
        rim.addColorStop(0, `hsla(${b.hue}, 90%, 82%, 0.7)`);
        rim.addColorStop(0.5, `hsla(${b.hue + 120}, 90%, 85%, 0.5)`);
        rim.addColorStop(1, `hsla(${b.hue + 240}, 90%, 82%, 0.7)`);
        ctx.strokeStyle = rim;
        ctx.lineWidth = Math.max(1, r * 0.06);
        ctx.stroke();

        // highlights
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.ellipse(x - r * 0.42, y - r * 0.42, r * 0.2, r * 0.1, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = Math.max(0.8, r * 0.05);
        ctx.beginPath();
        ctx.arc(x, y, r * 0.78, Math.PI * 0.1, Math.PI * 0.4);
        ctx.stroke();
    }

    // a sakura petal: rounded teardrop with the signature notch at the tip
    function sakuraPath(ctx, s) {
        const w = s * 0.62, h = s;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.5);
        ctx.bezierCurveTo(-w * 0.95, h * 0.15, -w * 0.75, -h * 0.5, -w * 0.18, -h * 0.5);
        ctx.lineTo(0, -h * 0.34);
        ctx.lineTo(w * 0.18, -h * 0.5);
        ctx.bezierCurveTo(w * 0.75, -h * 0.5, w * 0.95, h * 0.15, 0, h * 0.5);
        ctx.closePath();
    }

    function leafPath(ctx, s) {
        const w = s * 0.42, h = s;
        ctx.beginPath();
        ctx.moveTo(0, -h * 0.5);
        ctx.bezierCurveTo(w, -h * 0.25, w * 0.8, h * 0.3, 0, h * 0.5);
        ctx.bezierCurveTo(-w * 0.8, h * 0.3, -w, -h * 0.25, 0, -h * 0.5);
        ctx.closePath();
    }

    function drawPetal(ctx, p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        // squash on one axis to fake the petal tumbling in 3D
        ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(p.flip)));
        ctx.globalAlpha = p.alpha;
        const s = p.size;

        const g = ctx.createLinearGradient(0, -s / 2, 0, s / 2);
        g.addColorStop(0, p.tint[0]);
        g.addColorStop(1, p.tint[1]);
        if (p.kind === 'leaf') leafPath(ctx, s);
        else sakuraPath(ctx, s);
        ctx.fillStyle = g;
        ctx.fill();

        // center vein (leaves get a stem too)
        ctx.globalAlpha = p.alpha * (p.kind === 'leaf' ? 0.55 : 0.35);
        ctx.strokeStyle = p.kind === 'leaf' ? '#eef7dc' : '#ffffff';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, s * (p.kind === 'leaf' ? 0.62 : 0.42));
        ctx.lineTo(0, -s * (p.kind === 'leaf' ? 0.4 : 0.2));
        ctx.stroke();
        ctx.restore();
    }

    function drawStar(ctx, s, fade) {
        const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.twinkle * 4 + s.phase));
        ctx.globalAlpha = a * 0.9 * fade;
        ctx.fillStyle = s.gold ? '#f3e3ae' : '#ffffff';
        if (s.spark) {
            const r = s.r * 3.2;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y - r);
            ctx.quadraticCurveTo(s.x, s.y, s.x + r, s.y);
            ctx.quadraticCurveTo(s.x, s.y, s.x, s.y + r);
            ctx.quadraticCurveTo(s.x, s.y, s.x - r, s.y);
            ctx.quadraticCurveTo(s.x, s.y, s.x, s.y - r);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawMote(ctx, m, fade) {
        const a = (0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * m.twinkle * 4 + m.phase))) * fade;
        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 3);
        g.addColorStop(0, `rgba(255, 252, 225, ${0.95 * a})`);
        g.addColorStop(0.35, `rgba(255, 240, 160, ${0.45 * a})`);
        g.addColorStop(1, 'rgba(255, 240, 160, 0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r * 3, 0, Math.PI * 2);
        ctx.fill();
    }

    function stepMote(m) {
        m.x += m.vx + wind * 0.3;
        m.y += m.vy;
        if (m.y < -10) { m.y = H + 10; m.x = rand(0, W); }
        if (m.x < -10) m.x = W + 10;
        if (m.x > W + 10) m.x = -10;
    }

    // the golden diagonal light streaks from the card
    function maybeStreak() {
        if (streaks.length < 2 && Math.random() < 0.004 * (1 - dayMix)) {
            streaks.push({ x: rand(W * 0.2, W), y: rand(0, H * 0.35), len: rand(60, 140), life: 0, max: rand(50, 80) });
        }
    }

    function drawStreak(ctx, s) {
        const k = s.life / s.max;
        const alpha = Math.sin(k * Math.PI) * 0.8;
        const dx = -s.len * 0.8, dy = s.len * 0.55;
        const ox = -k * 90, oy = k * 62;
        const g = ctx.createLinearGradient(s.x + ox, s.y + oy, s.x + ox + dx, s.y + oy + dy);
        g.addColorStop(0, 'rgba(255, 246, 216, 0)');
        g.addColorStop(0.5, `rgba(255, 240, 196, ${alpha})`);
        g.addColorStop(1, 'rgba(255, 246, 216, 0)');
        ctx.globalAlpha = 1;
        ctx.strokeStyle = g;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(s.x + ox, s.y + oy);
        ctx.lineTo(s.x + ox + dx, s.y + oy + dy);
        ctx.stroke();
    }

    function step(p) {
        p.x += p.vx + wind + Math.sin(t * p.swayFreq + p.phase) * p.sway * 0.6 + p.kick;
        p.y += p.vy;
        p.rot += p.vrot + wind * 0.01;
        p.flip += p.vflip;
        p.kick *= 0.95;

        // cursor breeze: nearby petals are nudged away in the mouse direction
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 110 * 110) {
            const f = (1 - Math.sqrt(d2) / 110) * 0.6;
            p.kick += mouse.vx * 0.04 + Math.sign(dx || 1) * f;
            p.y += (dy > 0 ? 1 : -1) * f * 0.6;
        }
    }

    function recycle(list, isFront) {
        for (let i = 0; i < list.length; i++) {
            const p = list[i];
            if (p.y > H + 40 || p.x < -80 || p.x > W + 80) {
                if (p.burst) {
                    list.splice(i--, 1);
                } else {
                    list[i] = makePetal(isFront, rand(-50, W + 50), rand(-60, -10));
                }
            }
        }
    }

    function counts() {
        const area = W * H;
        return {
            back: Math.max(18, Math.min(60, Math.round(area / 30000))),
            front: Math.max(3, Math.min(9, Math.round(area / 180000))),
        };
    }

    // spread across the screen on load; above the top edge when the theme changes
    function populate(fromTop) {
        const n = counts();
        const y = () => (fromTop ? rand(-H * 0.9, -10) : rand(-H, H));
        petalsBack = Array.from({ length: n.back }, () => makePetal(false, undefined, y()));
        petalsFront = Array.from({ length: n.front }, () => makePetal(true, undefined, y()));
        if (!bubbles.length) {
            const nb = Math.max(10, Math.min(26, Math.round((W * H) / 60000)));
            bubbles = Array.from({ length: nb }, () => makeBubble(rand(0, H)));
        }
    }

    function drawSkyDetails(ctx) {
        if (dayMix < 0.999) stars.forEach((s) => drawStar(ctx, s, 1 - dayMix));
        if (dayMix > 0.001) motes.forEach((m) => drawMote(ctx, m, dayMix));
    }

    function frame() {
        if (!running) return;
        t++;
        if (t % 240 === 0) windTarget = rand(-0.5, 0.8);
        wind += (windTarget - wind) * 0.005;
        mouse.vx *= 0.9;
        dayMix += ((theme === 'day' ? 1 : 0) - dayMix) * 0.03;

        ctxB.clearRect(0, 0, W, H);
        ctxF.clearRect(0, 0, W, H);

        motes.forEach(stepMote);
        drawSkyDetails(ctxB);
        maybeStreak();
        streaks = streaks.filter((s) => ++s.life < s.max);
        streaks.forEach((s) => drawStreak(ctxB, s));

        bubbles.forEach(stepBubble);
        if (dayMix > 0.01) bubbles.forEach((b) => drawBubble(b.r > 20 ? ctxF : ctxB, b, dayMix));

        petalsBack.forEach((p) => { step(p); drawPetal(ctxB, p); });
        petalsFront.forEach((p) => { step(p); drawPetal(ctxF, p); });
        recycle(petalsBack, false);
        recycle(petalsFront, true);

        ctxB.globalAlpha = 1;
        ctxF.globalAlpha = 1;

        rafId = requestAnimationFrame(frame);
    }

    // a still scene: stars or sun motes, bubbles, and a few resting petals
    function drawStill() {
        dayMix = theme === 'day' ? 1 : 0;
        ctxB.clearRect(0, 0, W, H);
        ctxF.clearRect(0, 0, W, H);
        drawSkyDetails(ctxB);
        if (theme === 'day') bubbles.filter((b) => !b.pop).forEach((b) => drawBubble(b.r > 20 ? ctxF : ctxB, b, 1));
        petalsBack.filter((p) => p.y > 0 && p.y < H).slice(0, 14).forEach((p) => drawPetal(ctxB, p));
        ctxB.globalAlpha = 1;
        ctxF.globalAlpha = 1;
    }

    function burst(x, y) {
        for (let i = 0; i < 14; i++) {
            const p = makePetal(Math.random() < 0.3, x, y);
            const a = rand(0, Math.PI * 2), sp = rand(1, 3.5);
            p.kick = Math.cos(a) * sp;
            p.vy = Math.abs(p.vy) + Math.sin(a) * 0.6;
            p.burst = true;
            (p.size > 15 ? petalsFront : petalsBack).push(p);
        }
    }

    function updatePetalLabel() {
        toggle.setAttribute('aria-pressed', String(running));
        toggle.querySelector('.petal-toggle-icon').textContent = theme === 'day' ? '🍃' : '🌸';
        toggle.querySelector('.petal-toggle-label').textContent = running ? 'Petals on' : 'Petals off';
        toggle.title = running ? 'Pause falling petals' : 'Let the petals fall';
    }

    function setRunning(on) {
        running = on;
        updatePetalLabel();
        try { localStorage.setItem('petals', on ? 'on' : 'off'); } catch (e) { /* storage unavailable */ }
        if (on) loop();
        else { cancelAnimationFrame(rafId); drawStill(); }
    }

    function setTheme(next, animate) {
        theme = next;
        root.dataset.theme = next;
        const day = next === 'day';
        themeToggle.setAttribute('aria-checked', String(day));
        themeToggle.title = day ? 'Switch to cherry-blossom night' : 'Switch to summer daylight';
        updatePetalLabel();
        if (!animate) return;

        try { localStorage.setItem('theme', next); } catch (e) { /* storage unavailable */ }
        // ease page colors over, then drop the helper class
        root.classList.add('theme-anim');
        clearTimeout(setTheme.timer);
        setTheme.timer = setTimeout(() => root.classList.remove('theme-anim'), 800);

        // the old petals finish their fall while the new season drifts in from above
        const old = petalsBack.concat(petalsFront);
        old.forEach((p) => { p.burst = true; });
        const oldBack = petalsBack, oldFront = petalsFront;
        populate(running);
        if (running) {
            petalsBack = oldBack.concat(petalsBack);
            petalsFront = oldFront.concat(petalsFront);
        } else {
            drawStill();
        }
    }

    resize();
    populate(false);
    setTheme(theme, false);

    let saved = null;
    try { saved = localStorage.getItem('petals'); } catch (e) { /* storage unavailable */ }
    const startOn = saved ? saved === 'on' : !reduceMotion;

    window.addEventListener('resize', () => {
        resize();
        if (!running) drawStill();
    });
    window.addEventListener('pointermove', (e) => {
        mouse.vx = e.clientX - (mouse.x < -1000 ? e.clientX : mouse.x);
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    document.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
    document.addEventListener('click', (e) => {
        if (running && !e.target.closest('a, button, pre')) burst(e.clientX, e.clientY);
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { running = false; cancelAnimationFrame(rafId); }
        else if (toggle.getAttribute('aria-pressed') === 'true') { running = true; loop(); }
    });
    toggle.addEventListener('click', () => setRunning(!running));
    themeToggle.addEventListener('click', () => setTheme(theme === 'day' ? 'night' : 'day', true));

    setRunning(startOn);
})();

// ---------- wind-chime menu ----------
(function windChimes() {
    const chimes = [...document.querySelectorAll('.chime')];
    if (!chimes.length) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // a soft glass "ting": a bright fundamental plus an inharmonic bell partial
    let audio = null;
    const unlock = () => {
        if (!audio) {
            try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audio = null; }
        }
        if (audio && audio.state === 'suspended') audio.resume();
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);

    function ting(freq, strength) {
        if (!audio || audio.state !== 'running') return;
        const now = audio.currentTime;
        const out = audio.createGain();
        out.gain.setValueAtTime(0, now);
        out.gain.linearRampToValueAtTime(0.06 * strength, now + 0.005);
        out.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
        out.connect(audio.destination);
        [[1, 1], [2.76, 0.35], [5.4, 0.12]].forEach(([mult, level]) => {
            const osc = audio.createOscillator();
            const g = audio.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq * mult;
            g.gain.value = level;
            osc.connect(g).connect(out);
            osc.start(now);
            osc.stop(now + 2.3);
        });
    }

    const state = chimes.map((el, i) => ({
        el,
        strip: el.querySelector('.chime-strip'),
        spec: el.querySelector('.bell-spec'),
        note: parseFloat(el.dataset.note) || 1200,
        a: 0, v: 0,   // chime angle / velocity (radians, per frame)
        s: 0, sv: 0,  // strip angle relative to the bell
        seed: i * 1.7,
        inside: false,
        ready: false,
        lastTing: 0,
    }));

    // let the drop-in entrance finish before the physics takes over the transform
    state.forEach((c) => {
        const takeOver = () => {
            if (c.ready) return;
            c.el.style.animation = 'none';
            c.ready = true;
        };
        c.el.addEventListener('animationend', takeOver, { once: true });
        setTimeout(takeOver, 2200); // in case the animation never reports its end
    });

    function strike(c, force) {
        const now = performance.now();
        if (now - c.lastTing > 250) {
            ting(c.note, Math.min(1, 0.4 + Math.abs(force) * 40));
            c.lastTing = now;
        }
    }

    let px = null, pvx = 0;
    window.addEventListener('pointermove', (e) => {
        pvx = px === null ? 0 : e.clientX - px;
        px = e.clientX;
        state.forEach((c) => {
            const r = c.el.getBoundingClientRect();
            const hit = e.clientX > r.left - 6 && e.clientX < r.right + 6 && e.clientY > r.top + r.height * 0.3 && e.clientY < r.bottom + 6;
            if (hit && Math.abs(pvx) > 0.5) {
                const push = Math.max(-0.03, Math.min(0.03, pvx * 0.0012));
                c.v += push;
                c.sv += push * 2.2;
                if (!c.inside && Math.abs(pvx) > 3) strike(c, push);
            }
            c.inside = hit;
        });
    }, { passive: true });

    chimes.forEach((el, i) => {
        el.addEventListener('click', () => {
            unlock();
            const c = state[i];
            c.v += (Math.random() < 0.5 ? -1 : 1) * 0.025;
            c.sv += c.v * 2;
            // the context may only just have resumed; ring a moment later
            setTimeout(() => ting(c.note, 1), audio && audio.state === 'running' ? 0 : 60);
        });
    });

    if (reduceMotion) return;

    let t = 0, visible = true, raf = 0;
    function frame() {
        t++;
        state.forEach((c) => {
            // a gentle, uneven breeze
            const gust = Math.sin(t * 0.013 + c.seed) * 0.00022 + Math.sin(t * 0.0047 + c.seed * 2.3) * 0.00016;
            const acc = -0.0035 * c.a - 0.018 * c.v + gust;
            c.v += acc;
            c.a += c.v;
            // the paper strip trails behind the bell and flutters a little more
            const sacc = -0.012 * c.s - 0.05 * c.sv - acc * 1.8 + gust * 2.5;
            c.sv += sacc;
            c.s += c.sv;
            if (c.ready) c.el.style.transform = `rotate(${c.a}rad)`;
            // counter-rotate the glints so they stay facing the moon / sun
            if (c.ready) c.spec.setAttribute('transform', `rotate(${(-c.a * 180) / Math.PI} 50 50)`);
            c.strip.style.transform = `rotate(${c.s}rad)`;
        });
        raf = visible && !document.hidden ? requestAnimationFrame(frame) : 0;
    }

    const hero = document.querySelector('.hero');
    new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(frame);
    }).observe(hero);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && visible && !raf) raf = requestAnimationFrame(frame);
    });
})();
