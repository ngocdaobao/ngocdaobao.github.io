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


// ---------- sky: sakura at night; sakura and green leaves in the blossom pavilion ----------
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
    // brighter, coral-pink blossoms of the sunlit pavilion
    const DAY_SAKURA = [
        ['#ffe6e9', '#f59aa8'],
        ['#ffd9de', '#f28b9b'],
        ['#fff2f4', '#f7b5bf'],
        ['#ffffff', '#fbd3d9'],
    ];

    let W = 0, H = 0, DPR = 1;
    let petalsBack = [], petalsFront = [], stars = [], motes = [], streaks = [];
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
            if (Math.random() < 0.4) {
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

        petalsBack.forEach((p) => { step(p); drawPetal(ctxB, p); });
        petalsFront.forEach((p) => { step(p); drawPetal(ctxF, p); });
        recycle(petalsBack, false);
        recycle(petalsFront, true);

        ctxB.globalAlpha = 1;
        ctxF.globalAlpha = 1;

        rafId = requestAnimationFrame(frame);
    }

    // a still scene: stars or sun motes and a few resting petals
    function drawStill() {
        dayMix = theme === 'day' ? 1 : 0;
        ctxB.clearRect(0, 0, W, H);
        ctxF.clearRect(0, 0, W, H);
        drawSkyDetails(ctxB);
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
        themeToggle.title = day ? 'Switch to cherry-blossom night' : 'Switch to the sunlit blossom pavilion';
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
