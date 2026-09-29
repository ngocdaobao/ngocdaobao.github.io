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

// ---------- falling sakura + night sky ----------
(function sakuraSky() {
    const back = document.getElementById('sky-back');
    const front = document.getElementById('sky-front');
    const toggle = document.querySelector('.petal-toggle');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctxB = back.getContext('2d');
    const ctxF = front.getContext('2d');

    // petal tints from the card: sakura pinks plus the pale moonlit white petals
    const TINTS = [
        ['#fde9ee', '#f0b3c4'],
        ['#fbe0e8', '#e8a3b7'],
        ['#fff4f7', '#f4c6d3'],
        ['#f1f4f9', '#cfd8e5'],
    ];

    let W = 0, H = 0, DPR = 1;
    let petalsBack = [], petalsFront = [], stars = [], streaks = [];
    let wind = 0, windTarget = 0, t = 0;
    const mouse = { x: -9999, y: -9999, vx: 0 };
    let running = true;
    let rafId = 0;
    const loop = () => { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(frame); };

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
    }

    const rand = (a, b) => a + Math.random() * (b - a);

    function makePetal(front, x, y) {
        const size = front ? rand(14, 22) : rand(7, 14);
        return {
            x: x ?? rand(-50, W + 50),
            y: y ?? rand(-H, -10),
            size,
            vy: rand(0.35, 0.9) * (front ? 1.4 : 1),
            vx: rand(-0.2, 0.35),
            sway: rand(0.4, 1.3),
            swayFreq: rand(0.008, 0.02),
            phase: rand(0, Math.PI * 2),
            rot: rand(0, Math.PI * 2),
            vrot: rand(-0.02, 0.02),
            flip: rand(0, Math.PI * 2),
            vflip: rand(0.01, 0.04),
            tint: TINTS[(Math.random() * TINTS.length) | 0],
            alpha: front ? rand(0.75, 0.95) : rand(0.55, 0.9),
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

    // a sakura petal: rounded teardrop with the signature notch at the tip
    function petalPath(ctx, s) {
        const w = s * 0.62, h = s;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.5);
        ctx.bezierCurveTo(-w * 0.95, h * 0.15, -w * 0.75, -h * 0.5, -w * 0.18, -h * 0.5);
        ctx.lineTo(0, -h * 0.34);
        ctx.lineTo(w * 0.18, -h * 0.5);
        ctx.bezierCurveTo(w * 0.75, -h * 0.5, w * 0.95, h * 0.15, 0, h * 0.5);
        ctx.closePath();
    }

    function drawPetal(ctx, p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        // squash on one axis to fake the petal tumbling in 3D
        ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(p.flip)));
        ctx.globalAlpha = p.alpha;
        const g = ctx.createLinearGradient(0, -p.size / 2, 0, p.size / 2);
        g.addColorStop(0, p.tint[0]);
        g.addColorStop(1, p.tint[1]);
        petalPath(ctx, p.size);
        ctx.fillStyle = g;
        ctx.fill();
        // faint center vein
        ctx.globalAlpha = p.alpha * 0.35;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, p.size * 0.42);
        ctx.lineTo(0, -p.size * 0.2);
        ctx.stroke();
        ctx.restore();
    }

    function drawStar(ctx, s) {
        const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.twinkle * 4 + s.phase));
        ctx.globalAlpha = a * 0.9;
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

    // the golden diagonal light streaks from the card
    function maybeStreak() {
        if (streaks.length < 2 && Math.random() < 0.004) {
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

    function recycle(list, front) {
        for (let i = 0; i < list.length; i++) {
            const p = list[i];
            if (p.y > H + 40 || p.x < -80 || p.x > W + 80) {
                if (p.burst) {
                    list.splice(i--, 1);
                } else {
                    list[i] = makePetal(front, rand(-50, W + 50), rand(-60, -10));
                }
            }
        }
    }

    function populate() {
        const area = W * H;
        const nBack = Math.max(18, Math.min(60, Math.round(area / 30000)));
        const nFront = Math.max(3, Math.min(9, Math.round(area / 180000)));
        petalsBack = Array.from({ length: nBack }, () => makePetal(false, undefined, rand(-H, H)));
        petalsFront = Array.from({ length: nFront }, () => makePetal(true, undefined, rand(-H, H)));
    }

    function frame() {
        if (!running) return;
        t++;
        if (t % 240 === 0) windTarget = rand(-0.5, 0.8);
        wind += (windTarget - wind) * 0.005;
        mouse.vx *= 0.9;

        ctxB.clearRect(0, 0, W, H);
        ctxF.clearRect(0, 0, W, H);

        stars.forEach((s) => drawStar(ctxB, s));
        maybeStreak();
        streaks = streaks.filter((s) => ++s.life < s.max);
        streaks.forEach((s) => drawStreak(ctxB, s));

        petalsBack.forEach((p) => { step(p); drawPetal(ctxB, p); });
        petalsFront.forEach((p) => { step(p); drawPetal(ctxF, p); });
        recycle(petalsBack, false);
        recycle(petalsFront, true);
        ctxB.globalAlpha = 1;

        rafId = requestAnimationFrame(frame);
    }

    // a still scene: stars plus a few resting petals
    function drawStill() {
        ctxB.clearRect(0, 0, W, H);
        ctxF.clearRect(0, 0, W, H);
        stars.forEach((s) => drawStar(ctxB, s));
        petalsBack.slice(0, 14).forEach((p) => drawPetal(ctxB, p));
        ctxB.globalAlpha = 1;
    }

    function burst(x, y) {
        for (let i = 0; i < 14; i++) {
            const p = makePetal(Math.random() < 0.3, x, y);
            const a = rand(0, Math.PI * 2), sp = rand(1, 3.5);
            p.kick = Math.cos(a) * sp;
            p.vy = Math.abs(p.vy) + Math.sin(a) * 0.6;
            p.burst = true;
            (p.size > 13 ? petalsFront : petalsBack).push(p);
        }
    }

    function setRunning(on) {
        running = on;
        toggle.setAttribute('aria-pressed', String(on));
        toggle.querySelector('.petal-toggle-label').textContent = on ? 'Petals on' : 'Petals off';
        toggle.title = on ? 'Pause falling petals' : 'Let the petals fall';
        try { localStorage.setItem('petals', on ? 'on' : 'off'); } catch (e) { /* storage unavailable */ }
        if (on) loop();
        else { cancelAnimationFrame(rafId); drawStill(); }
    }

    resize();
    populate();

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
        if (document.hidden) running = false;
        else if (toggle.getAttribute('aria-pressed') === 'true') { running = true; loop(); }
    });
    toggle.addEventListener('click', () => setRunning(!running));

    setRunning(startOn);
})();
