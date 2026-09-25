document.addEventListener('DOMContentLoaded', () => {
    const $ = (s, r = document) => r.querySelector(s);
    const $$ = (s, r = document) => [...r.querySelectorAll(s)];
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const pad = n => String(n).padStart(2, '0');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ease = 'cubic-bezier(.7,0,.2,1)';

    // ---- Scroll-scrubbed motion (the Minecraft page's language) ----
    // Everything below is tied to scroll position, not played once: it assembles as you scroll
    // down and comes apart the same way on the way back up.
    // Positions are measured once (offsetTop ignores transforms) and re-measured on resize,
    // so the per-frame loop only writes styles; no layout reads, which is what kept fast
    // flings on phones from stuttering.
    const docPos = el => { let x = 0, y = 0; for (let e = el; e; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; } return { x, y }; };
    const easeOut = t => 1 - (1 - t) ** 3;
    // child i of n gets its own slice of the progress, so groups ripple instead of moving as one block
    const slice = (p, i, n, spread) => n < 2 ? p : clamp((p - (i / (n - 1)) * spread) / (1 - spread), 0, 1);

    const splitText = (el, mode) => {
        const out = [];
        const walk = node => [...node.childNodes].forEach(n => {
            if (n.nodeType === 1) return walk(n);
            if (n.nodeType !== 3 || !n.textContent.trim()) return;
            const frag = document.createDocumentFragment();
            const parts = mode === 'letters' ? [...n.textContent] : n.textContent.split(/(\s+)/);
            parts.forEach(part => {
                if (!part) return;
                if (/^\s+$/.test(part)) return frag.append(part);
                const sp = document.createElement('span');
                sp.className = 'bit';
                sp.textContent = part;
                frag.append(sp);
                out.push(sp);
            });
            n.replaceWith(frag);
        });
        if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', el.textContent.trim().replace(/\s+/g, ' '));
        walk(el);
        return out;
    };

    const LETTER_DIRS = [[-60, 0, -25], [0, 70, 18], [60, 0, 25], [0, -70, -18]];
    const TILE_DIRS = [[-80, 0, -6], [0, 90, 4], [80, 0, 6], [0, -90, -4]];
    const items = [];
    const add = (el, apply, start = 0.9, end = 0.4) => items.push({ el, apply, start, end, p: -1, s: 0 });

    if (!reduce) {
        $$('[data-scrub]').forEach(el => {
            const kind = el.dataset.scrub;
            if (kind === 'letters') {
                const bits = splitText(el, 'letters');
                add(el, e => bits.forEach((b, i) => {
                    const q = easeOut(slice(e, i, bits.length, 0.45)), k = 1 - q, [dx, dy, r] = LETTER_DIRS[i % 4];
                    b.style.opacity = q;
                    b.style.transform = `translate3d(${dx * k}px,${dy * k}px,0) rotate(${r * k}deg) scale(${1 + k})`;
                }), 0.95, 0.45);
            } else if (kind === 'words') {
                const bits = splitText(el, 'words');
                add(el, e => bits.forEach((b, i) => {
                    const q = easeOut(slice(e, i, bits.length, 0.6)), k = 1 - q;
                    b.style.opacity = q;
                    b.style.transform = `translate3d(0,${k * 0.9}em,0) rotate(${k * 6}deg)`;
                }), 0.95, 0.5);
            } else if (kind === 'photo') {
                // the artist's picture: slides in from the left while its frame un-zooms
                const img = el.querySelector('img');
                add(el, e => {
                    const q = easeOut(e), k = 1 - q;
                    el.style.opacity = q;
                    el.style.transform = `translate3d(${-160 * k}px,0,0) rotate(${-4 * k}deg) scale(${0.9 + 0.1 * q})`;
                    img.style.scale = 1 + 0.35 * k;
                }, 0.95, 0.35);
            } else {
                // slide-l / slide-r / up: whole block glides in; "drift-*" moves without fading
                // (for wrappers whose children already fade, so opacities don't multiply)
                const fade = !kind.startsWith('drift');
                const dx = kind.endsWith('-l') ? -140 : kind.endsWith('-r') ? 140 : 0, dy = dx ? 0 : 50;
                add(el, e => {
                    const q = easeOut(e), k = 1 - q;
                    if (fade) el.style.opacity = q;
                    el.style.transform = `translate3d(${dx * k}px,${dy * k}px,0)`;
                });
            }
        });

        // tiles: each from its own side (cycled by index, like GalleryTile), tilted in 3D, while the
        // artwork inside un-zooms; tiles further right start a touch later so each row lands in a wave
        $$('.tile').forEach((el, i) => {
            const [dx, dy, r] = TILE_DIRS[i % 4], img = el.querySelector('img');
            add(el, e => {
                const q = easeOut(e), k = 1 - q;
                el.style.opacity = Math.min(1, q * 1.6);
                el.style.transform = `perspective(1000px) translate3d(${dx * k}px,${dy * k}px,0) rotateX(${(dy / 90) * -22 * k}deg) rotateY(${(dx / 80) * 22 * k}deg) rotate(${r * k}deg) scale(${0.82 + 0.18 * q})`;
                img.style.scale = 1 + 0.3 * k;
            }, 0.98, 0.58);
        });
    }

    // floating pencils: spring physics so they react to scroll speed, the mouse position, and get
    // nudged away (and spun) when the cursor or a finger comes close; plus a slow idle sway
    const pencils = reduce ? [] : $$('.pencil').map((el, i) => ({
        el, speed: +el.dataset.speed, rot: parseFloat(el.style.getPropertyValue('--rot')),
        dur: parseFloat(el.style.getPropertyValue('--dur')) || 6, phase: i * 1.7,
        x: 0, y: 0, vx: 0, vy: 0, a: 0, va: 0, cx: 0, cy: 0, w: 0,
    }));

    let vh = innerHeight, vw = innerWidth;
    const measure = () => {
        if (innerWidth !== vw || !items.measured) vh = innerHeight; // ignore phone URL-bar height jitter
        vw = innerWidth;
        items.forEach(it => { it.top = docPos(it.el).y; it.h = it.el.offsetHeight; });
        pencils.forEach(p => { const d = docPos(p.el); p.w = p.el.offsetWidth; p.cx = d.x + p.w / 2; p.cy = d.y + p.el.offsetHeight / 2; });
        items.measured = true;
    };
    measure();
    let remeasure = false;
    const queue = () => { remeasure = true; };
    addEventListener('resize', queue);
    addEventListener('load', queue);
    new ResizeObserver(queue).observe(document.body);

    let mx = -1e4, my = -1e4, mnx = 0, mny = 0;
    addEventListener('pointermove', e => {
        mx = e.clientX; my = e.clientY;
        if (e.pointerType === 'mouse') { mnx = mx / vw - 0.5; mny = my / vh - 0.5; }
    }, { passive: true });
    addEventListener('pointerdown', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
    // a lifted finger shouldn't keep pushing pencils away
    const lift = e => { if (e.pointerType !== 'mouse') mx = my = -1e4; };
    addEventListener('pointerup', lift, { passive: true });
    addEventListener('pointercancel', lift, { passive: true });

    const heroTitle = $('.hero-title');
    const progress = $('.progress'), header = $('.site-header');
    let lastY = scrollY, prevY = scrollY, vel = 0, last = performance.now();

    // ponytail: rAF runs every frame for the page's life; gate on scroll events if battery use ever matters
    (function tick(now) {
        if (remeasure) { remeasure = false; measure(); }
        const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
        last = now;
        const y = scrollY;
        vel += ((y - prevY) / dt - vel) * 0.2; // smoothed scroll speed, px/s
        prevY = y;

        const follow = 1 - Math.exp(-dt * 11); // frame-rate independent smoothing (~gsap scrub 0.4)
        items.forEach(it => {
            const rel = it.top - y;
            const t = clamp((vh * it.start - rel) / (vh * (it.start - it.end)), 0, 1);
            // off screen: jump straight to the answer so nothing is caught mid-flight when it scrolls in
            const off = rel > vh * 1.3 || rel + it.h < -vh * 0.3;
            if (it.p < 0 || off) it.s = t; else it.s += (t - it.s) * follow;
            if (Math.abs(t - it.s) < 0.0005) it.s = t;
            if (it.s !== it.p) { it.p = it.s; it.apply(it.p); }
        });

        const T = now / 1000;
        pencils.forEach(p => {
            const sy = p.cy - y; // resting centre on screen
            const tx = mnx * -120 * p.speed;
            const ty = (sy - vh / 2) * -p.speed + mny * -120 * p.speed;
            // spring toward the parallax target
            p.vx += ((tx - p.x) * 40 - p.vx * 9) * dt;
            p.vy += ((ty - p.y) * 40 - p.vy * 9) * dt;
            // cursor / finger pushes the pencil away and gives it a spin
            const dx = p.cx + p.x - mx, dy = sy + p.y - my, d = Math.hypot(dx, dy), R = p.w * 0.9 + 60;
            if (d < R && d > 0) {
                const f = (1 - d / R) * 2600;
                p.vx += (dx / d) * f * dt; p.vy += (dy / d) * f * dt;
                p.va += (dx * dy > 0 ? 1 : -1) * f * 0.12 * dt;
            }
            p.x += p.vx * dt; p.y += p.vy * dt;
            // angle: idle sway + tilt from scroll speed, sprung so it overshoots and settles
            const ta = Math.sin(T * (6.28 / p.dur) + p.phase) * 5 + clamp(vel * 0.012, -25, 25);
            p.va += ((ta - p.a) * 30 - p.va * 6) * dt;
            p.a += p.va * dt;
            p.el.style.translate = `${p.x.toFixed(1)}px ${p.y.toFixed(1)}px`;
            p.el.style.rotate = `${(p.rot + p.a).toFixed(2)}deg`;
        });

        const doc = document.documentElement.scrollHeight - vh;
        progress.style.transform = `scaleX(${doc > 0 ? y / doc : 0})`;
        // header slides away while scrolling down, comes back on scroll up
        if (Math.abs(y - lastY) > 4) {
            header.classList.toggle('away', y > lastY && y > 200);
            lastY = y;
        }
        if (heroTitle && !reduce && y < vh * 1.2) {
            const p = y / vh;
            heroTitle.style.transform = `translate3d(0,${p * -14}vh,0)`;
            heroTitle.style.opacity = 1 - p * 0.9;
        }
        requestAnimationFrame(tick);
    })(performance.now());

    // ---- Cursor follower ----
    if (matchMedia('(pointer: fine)').matches && !reduce) {
        const c = document.createElement('div');
        c.className = 'cursor';
        document.body.append(c);
        let mx = -100, my = -100, cx = mx, cy = my;
        addEventListener('pointermove', e => {
            mx = e.clientX; my = e.clientY;
        });
        (function follow() {
            cx += (mx - cx) * 0.2; cy += (my - cy) * 0.2;
            c.style.transform = `translate3d(${cx}px,${cy}px,0)`;
            requestAnimationFrame(follow);
        })();
    }

    // ---- Lightbox: zoom from thumbnail, swipe, arrows, keys, double-click zoom, thumbnail strip ----
    const thumbs = $$('[data-lb]');
    if (!thumbs.length) return;

    const lb = document.createElement('div');
    lb.className = 'lb';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Artwork viewer');
    lb.innerHTML = `
        <div class="lb-bg"></div>
        <div class="lb-stage"><img class="lb-img" alt="" draggable="false"></div>
        <div class="lb-top"><span class="lb-count"></span><button class="lb-close">Close &times;</button></div>
        <button class="lb-nav lb-prev" aria-label="Previous">&larr;</button>
        <button class="lb-nav lb-next" aria-label="Next">&rarr;</button>
        <div class="lb-strip">${thumbs.map(t =>
            `<button aria-label="${t.alt}"><img src="${t.getAttribute('src')}" alt="" loading="lazy"></button>`).join('')}</div>`;
    document.body.append(lb);

    const img = $('.lb-img', lb), stage = $('.lb-stage', lb), closeBtn = $('.lb-close', lb);
    const strip = $$('.lb-strip button', lb);
    let i = 0, zoom = 1, px = 0, py = 0, busy = false, lastFocus = null;

    const setT = () => { img.style.transform = `translate(${px}px,${py}px) scale(${zoom})`; };
    const resetZoom = () => { zoom = 1; px = py = 0; img.classList.remove('zoomed'); setT(); };
    const isOpen = () => lb.classList.contains('open');

    // transform that puts the viewer image exactly over a thumbnail box
    const from = box => {
        const a = box.getBoundingClientRect(), b = img.getBoundingClientRect();
        return `translate(${a.left + a.width / 2 - b.left - b.width / 2}px,${a.top + a.height / 2 - b.top - b.height / 2}px) scale(${a.width / b.width})`;
    };

    const show = async n => {
        i = (n + thumbs.length) % thumbs.length;
        img.src = thumbs[i].getAttribute('src');
        img.alt = thumbs[i].alt;
        $('.lb-count', lb).textContent = `${pad(i + 1)} / ${pad(thumbs.length)}`;
        strip.forEach((b, k) => b.classList.toggle('on', k === i));
        strip[i].scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
        resetZoom();
        await img.decode().catch(() => {});
    };

    const open = async n => {
        lastFocus = document.activeElement;
        await show(n);
        lb.classList.add('open');
        document.documentElement.classList.add('lb-lock');
        if (!reduce) img.animate([{ transform: from(thumbs[i].parentElement) }, { transform: 'none' }], { duration: 750, easing: ease });
        closeBtn.focus({ preventScroll: true });
    };

    const close = () => {
        if (!isOpen()) return;
        const box = thumbs[i].parentElement;
        const start = img.style.transform;
        resetZoom();
        const r = box.getBoundingClientRect();
        const visible = r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
        lb.classList.remove('open');
        document.documentElement.classList.remove('lb-lock');
        if (!reduce) {
            const a = img.animate(visible
                ? [{ transform: start }, { transform: from(box) }]
                : [{ transform: start, opacity: 1 }, { transform: 'scale(.92)', opacity: 0 }],
                { duration: 650, easing: ease, fill: 'forwards' });
            a.finished.then(() => a.cancel());
        }
        lastFocus?.focus({ preventScroll: true });
    };

    const go = async d => {
        if (busy || !d) return;
        busy = true;
        if (!reduce) {
            await img.animate([{ transform: img.style.transform, opacity: img.style.opacity || 1 },
                { transform: `translateX(${-Math.sign(d) * 90}px)`, opacity: 0 }],
                { duration: 220, easing: 'ease-in', fill: 'forwards' }).finished;
        }
        await show(i + d);
        img.style.opacity = '';
        img.getAnimations().forEach(a => a.cancel());
        if (!reduce) {
            img.animate([{ transform: `translateX(${Math.sign(d) * 90}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
                { duration: 480, easing: 'cubic-bezier(.16,1,.3,1)' });
        }
        busy = false;
    };

    thumbs.forEach((t, k) => {
        const box = t.parentElement;
        box.tabIndex = 0;
        box.setAttribute('role', 'button');
        box.setAttribute('aria-label', `Open ${t.alt}`);
        box.addEventListener('click', () => open(k));
        box.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(k); }
        });
    });
    strip.forEach((b, k) => b.addEventListener('click', () => go(k - i)));
    $('.lb-prev', lb).addEventListener('click', () => go(-1));
    $('.lb-next', lb).addEventListener('click', () => go(1));
    closeBtn.addEventListener('click', close);

    document.addEventListener('keydown', e => {
        if (!isOpen()) return;
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowRight') go(1);
        else if (e.key === 'ArrowLeft') go(-1);
    });
    document.addEventListener('focusin', e => {
        if (isOpen() && !lb.contains(e.target)) closeBtn.focus();
    });

    // zoom so the point (cx, cy) on screen stays under the finger / cursor
    const zoomAt = (z, cx, cy) => {
        const r = img.getBoundingClientRect();
        const ox = cx - (r.left + r.width / 2), oy = cy - (r.top + r.height / 2);
        const k = z / zoom;
        px += ox * (1 - k); py += oy * (1 - k);
        zoom = z;
        if (zoom <= 1.01) return resetZoom();
        img.classList.add('zoomed');
        setT();
    };

    // Gestures (mouse + touch through pointer events):
    //  one finger: swipe left/right = next/prev, swipe down = close, pan when zoomed
    //  two fingers: pinch zoom;  double-tap / double-click: zoom in/out;  tap backdrop: close
    const pts = new Map();
    let drag = null, pinch = null, lastTap = 0;
    stage.addEventListener('pointerdown', e => {
        if (e.button) return;
        stage.setPointerCapture(e.pointerId);
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pts.size === 2) {
            const [a, b] = [...pts.values()];
            pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom };
            drag = null;
        } else if (pts.size === 1) {
            drag = { x: e.clientX, y: e.clientY, px, py, moved: false, onImg: e.target === img, axis: null };
        }
    });
    stage.addEventListener('pointermove', e => {
        if (!pts.has(e.pointerId)) return;
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pinch && pts.size === 2) {
            const [a, b] = [...pts.values()];
            lb.classList.add('dragging');
            zoomAt(clamp(pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, 1, 5), (a.x + b.x) / 2, (a.y + b.y) / 2);
            return;
        }
        if (!drag) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) < 8) return;
        drag.moved = true;
        lb.classList.add('dragging');
        if (zoom > 1) { px = drag.px + dx; py = drag.py + dy; setT(); return; }
        drag.axis ??= Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (drag.axis === 'x') { px = dx; py = 0; img.style.opacity = 1 - Math.min(Math.abs(dx) / 700, 0.5); }
        else { px = 0; py = Math.max(0, dy); $('.lb-bg', lb).style.opacity = 1 - Math.min(py / 400, 0.6); }
        setT();
    });
    const endDrag = e => {
        if (!pts.delete(e.pointerId)) return;
        lb.classList.remove('dragging');
        if (pinch) { if (pts.size < 2) pinch = null; if (zoom <= 1.05) resetZoom(); return; }
        const d = drag;
        drag = null;
        if (!d) return;
        $('.lb-bg', lb).style.opacity = '';
        if (!d.moved) {
            if (e.type !== 'pointerup') return;
            const now = e.timeStamp;
            if (d.onImg && now - lastTap < 300) { lastTap = 0; zoom > 1 ? resetZoom() : zoomAt(2.5, e.clientX, e.clientY); }
            else if (d.onImg) lastTap = now;
            else close();
            return;
        }
        if (zoom > 1) return;
        const dx = e.clientX - d.x, dy = e.clientY - d.y;
        if (d.axis === 'x' && Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
        else if (d.axis === 'y' && dy > 110) close();
        else { px = py = 0; img.style.opacity = ''; setT(); }
    };
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
});
