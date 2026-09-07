(() => {
    const $ = id => document.getElementById(id);

    function randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    // ===================== AUDIO =====================
    let audioCtx;
    function ensureAudio() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    function playTone(freq, dur, type) {
        try {
            ensureAudio();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type || 'square';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + dur);
        } catch (e) {}
    }
    const sfx = {
        jump: () => playTone(400, 0.1),
        correct: () => { playTone(523, 0.1); setTimeout(() => playTone(659, 0.1), 100); setTimeout(() => playTone(784, 0.15), 200); },
        wrong: () => playTone(200, 0.3, 'sawtooth'),
        coin: () => playTone(880, 0.08),
        levelUp: () => { playTone(523, 0.1); setTimeout(() => playTone(659, 0.1), 120); setTimeout(() => playTone(784, 0.1), 240); setTimeout(() => playTone(1047, 0.2), 360); },
        fall: () => playTone(150, 0.4, 'sawtooth'),
    };

    // ===================== STATE =====================
    let gameState = 'menu';
    let canvas, ctx;
    let W, H;
    let score = 0;
    let hints = 3;
    let currentLevel = 1;
    let timeLeft = 60;
    let timerInterval;
    let animFrame;

    let player;
    const GRAVITY = 0.6;
    const JUMP_FORCE = -14;
    const MOVE_SPEED = 5;
    let cameraX = 0;
    let cameraY = 0;
    let platforms = [];
    let coins = [];
    let flagX = 0;
    let finishY = 0;
    let particles = [];
    let pendingQuestion = null;
    let currentQuestion = null;

    // ===================== DOM =====================
    const screens = {
        menu: $('menu-screen'),
        settings: $('settings-screen'),
        records: $('records-screen'),
        game: $('game-screen')
    };
    const modals = {
        question: $('question-modal'),
        levelComplete: $('level-complete-modal'),
        gameOver: $('game-over-modal')
    };

    function showScreen(name) {
        Object.values(screens).forEach(s => s.classList.add('hidden'));
        Object.values(modals).forEach(m => m.classList.add('hidden'));
        if (screens[name]) screens[name].classList.remove('hidden');
    }

    // ===================== VPR 5 КЛАСС ЗАДАЧИ =====================
    function generateVPRQuestion(progress) {
        const p = Math.min(progress, 1);
        let a, b, answer, text;

        if (p < 0.25) {
            const types = ['add2', 'add3', 'sub2', 'sub3'];
            const type = types[randInt(0, types.length - 1)];
            switch (type) {
                case 'add2':
                    a = randInt(10, 99);
                    b = randInt(10, 99);
                    answer = a + b;
                    text = `${a} + ${b}`;
                    break;
                case 'add3':
                    a = randInt(100, 999);
                    b = randInt(10, 99);
                    answer = a + b;
                    text = `${a} + ${b}`;
                    break;
                case 'sub2':
                    a = randInt(50, 99);
                    b = randInt(10, a);
                    answer = a - b;
                    text = `${a} - ${b}`;
                    break;
                case 'sub3':
                    a = randInt(200, 999);
                    b = randInt(10, 99);
                    answer = a - b;
                    text = `${a} - ${b}`;
                    break;
            }
        } else if (p < 0.5) {
            const types = ['add2', 'sub2', 'add3', 'sub3', 'mul1'];
            const type = types[randInt(0, types.length - 1)];
            switch (type) {
                case 'add2':
                    a = randInt(10, 99);
                    b = randInt(10, 99);
                    answer = a + b;
                    text = `${a} + ${b}`;
                    break;
                case 'sub2':
                    a = randInt(50, 99);
                    b = randInt(10, a);
                    answer = a - b;
                    text = `${a} - ${b}`;
                    break;
                case 'add3':
                    a = randInt(100, 999);
                    b = randInt(10, 99);
                    answer = a + b;
                    text = `${a} + ${b}`;
                    break;
                case 'sub3':
                    a = randInt(200, 999);
                    b = randInt(10, 99);
                    answer = a - b;
                    text = `${a} - ${b}`;
                    break;
                case 'mul1':
                    a = randInt(2, 9);
                    b = randInt(2, 9);
                    answer = a * b;
                    text = `${a} × ${b}`;
                    break;
            }
        } else if (p < 0.75) {
            const types = ['mul1', 'mul2', 'div1', 'add3', 'sub3'];
            const type = types[randInt(0, types.length - 1)];
            switch (type) {
                case 'mul1':
                    a = randInt(2, 9);
                    b = randInt(2, 9);
                    answer = a * b;
                    text = `${a} × ${b}`;
                    break;
                case 'mul2':
                    a = randInt(10, 25);
                    b = randInt(2, 9);
                    answer = a * b;
                    text = `${a} × ${b}`;
                    break;
                case 'div1':
                    b = randInt(2, 9);
                    answer = randInt(2, 9);
                    a = b * answer;
                    text = `${a} ÷ ${b}`;
                    break;
                case 'add3':
                    a = randInt(100, 999);
                    b = randInt(10, 99);
                    answer = a + b;
                    text = `${a} + ${b}`;
                    break;
                case 'sub3':
                    a = randInt(300, 999);
                    b = randInt(10, 99);
                    answer = a - b;
                    text = `${a} - ${b}`;
                    break;
            }
        } else {
            const types = ['mul2', 'div2', 'order', 'div1', 'mul1'];
            const type = types[randInt(0, types.length - 1)];
            switch (type) {
                case 'mul2':
                    a = randInt(10, 50);
                    b = randInt(2, 9);
                    answer = a * b;
                    text = `${a} × ${b}`;
                    break;
                case 'div2':
                    b = randInt(2, 12);
                    answer = randInt(2, 12);
                    a = b * answer;
                    text = `${a} ÷ ${b}`;
                    break;
                case 'div1':
                    b = randInt(2, 9);
                    answer = randInt(2, 9);
                    a = b * answer;
                    text = `${a} ÷ ${b}`;
                    break;
                case 'order':
                    a = randInt(2, 12);
                    b = randInt(2, 12);
                    const c = randInt(1, 10);
                    answer = a * b + c;
                    text = `${a} × ${b} + ${c}`;
                    break;
                case 'mul1':
                    a = randInt(3, 12);
                    b = randInt(3, 12);
                    answer = a * b;
                    text = `${a} × ${b}`;
                    break;
            }
        }

        return { text, answer };
    }

    function generateOptions(answer) {
        const opts = new Set([answer]);
        let attempts = 0;
        while (opts.size < 4 && attempts < 100) {
            attempts++;
            const range = Math.max(5, Math.abs(answer) + 5);
            const offset = randInt(1, range);
            const sign = Math.random() < 0.5 ? -1 : 1;
            let fake = answer + sign * offset;
            if (fake < 0) fake = answer + offset;
            if (fake !== answer) opts.add(fake);
        }
        let fallback = 1;
        while (opts.size < 4) {
            if (answer + fallback !== answer) opts.add(answer + fallback);
            if (answer - fallback >= 0 && answer - fallback !== answer) opts.add(answer - fallback);
            fallback++;
        }
        return Array.from(opts);
    }

    function openQuestionModal(question, resolve) {
        gameState = 'question';
        currentQuestion = question;
        const q = question;
        $('question-text').textContent = q.text + ' = ?';
        const grid = $('answers-grid');
        grid.innerHTML = '';

        q.answers.forEach(val => {
            const btn = document.createElement('button');
            btn.textContent = val;
            btn.onclick = () => {
                if (btn.disabled) return;
                if (val === q.answer) {
                    btn.classList.add('correct');
                    sfx.correct();
                    score += 10;
                    updateHUD();
                    grid.querySelectorAll('button').forEach(b => b.disabled = true);
                    setTimeout(() => {
                        modals.question.classList.add('hidden');
                        currentQuestion = null;
                        gameState = 'playing';
                        resolve(true);
                    }, 500);
                } else {
                    btn.classList.add('wrong');
                    btn.disabled = true;
                    sfx.wrong();
                    score = Math.max(0, score - 5);
                    updateHUD();
                }
            };
            grid.appendChild(btn);
        });

        modals.question.classList.remove('hidden');
    }

    // ===================== LEVEL =====================
    function generateLevel(level) {
        platforms = [];
        coins = [];
        particles = [];
        pendingQuestion = null;
        currentQuestion = null;

        const platCount = 10 + level * 2;
        const levelWidth = 300 + platCount * 280;
        const deathY = H + 50;

        flagX = levelWidth - 100;
        finishY = H / 2;

        // Start platform
        platforms.push({
            x: -50, y: H - 120, w: 180, h: 18,
            color: '#4CAF50', hasQuestion: false, _answered: true, isStart: true
        });

        // Question platforms — every one, no ground
        const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A78BFA', '#F97316', '#06B6D4', '#EC4899', '#84CC16'];
        let lastX = 130;
        for (let i = 0; i < platCount; i++) {
            const progress = i / (platCount - 1);
            // Max jump ~200px horizontal, keep gap safe at 80-140
            const gap = randInt(70, 140);
            const x = lastX + gap;
            const w = randInt(120, 200);
            // Vertical difference max ~120px (jump height ~160px)
            const prevY = platforms.length > 0 ? platforms[platforms.length - 1].y : H - 120;
            const minY = Math.max(80, prevY - 120);
            const maxY = Math.min(H - 100, prevY + 80);
            const y = randInt(minY, maxY);

            platforms.push({
                x, y, w, h: 18,
                color: colors[i % colors.length],
                hasQuestion: true,
                _answered: false,
                questionProgress: progress,
            });
            lastX = x + w;
        }

        // Finish platform
        platforms.push({
            x: flagX - 60, y: H - 160, w: 140, h: 18,
            color: '#4CAF50', hasQuestion: false, _answered: true, isFinish: true
        });

        // Coins
        for (let i = 0; i < 3 + level * 2; i++) {
            coins.push({
                x: randInt(200, levelWidth - 200),
                y: randInt(100, H - 150),
                r: 12,
                collected: false,
                bobOffset: Math.random() * Math.PI * 2,
            });
        }

        player = {
            x: 50, y: H - 120 - 50,
            w: 36, h: 44,
            vx: 0, vy: 0,
            onGround: false,
            facing: 1,
            frameTimer: 0,
        };

        cameraX = 0;
        cameraY = 0;
    }

    // ===================== DRAWING =====================
    function drawBackground() {
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#87CEEB');
        grad.addColorStop(0.7, '#B8E4F9');
        grad.addColorStop(1, '#E8F5E9');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        for (let i = 0; i < 5; i++) {
            const cx = (i * 400 + 100 - cameraX * 0.3) % (W + 200) - 100;
            drawCloud(cx, 60 + i * 30, 40 + i * 10);
        }

        // Danger zone at bottom
        const dangerGrad = ctx.createLinearGradient(0, H - 40, 0, H);
        dangerGrad.addColorStop(0, 'rgba(255,0,0,0)');
        dangerGrad.addColorStop(1, 'rgba(255,0,0,0.3)');
        ctx.fillStyle = dangerGrad;
        ctx.fillRect(0, H - 40, W, 40);
    }

    function drawCloud(x, y, size) {
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.arc(x + size * 0.7, y - size * 0.2, size * 0.7, 0, Math.PI * 2);
        ctx.arc(x - size * 0.6, y + size * 0.1, size * 0.6, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawPlatforms() {
        platforms.forEach(p => {
            const sx = p.x - cameraX;
            const sy = p.y - cameraY;
            if (sx + p.w < -100 || sx > W + 100) return;

            ctx.fillStyle = p.color;
            roundRect(sx, sy, p.w, p.h, 6);
            ctx.fill();

            if (p.isStart) {
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('СТАРТ', sx + p.w / 2, sy - 8);
            }

            if (p.isFinish) {
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('ФИНИШ', sx + p.w / 2, sy - 8);
            }

            if (p.hasQuestion && !p._answered) {
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 16px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('?', sx + p.w / 2, sy - 10);
            }

            if (p._answered && p.hasQuestion) {
                ctx.fillStyle = '#4CAF50';
                ctx.font = 'bold 16px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('✓', sx + p.w / 2, sy - 10);
            }
        });
    }

    function drawCoins() {
        const t = Date.now() / 500;
        coins.forEach(c => {
            if (c.collected) return;
            const sx = c.x - cameraX;
            const sy = c.y - cameraY;
            if (sx < -20 || sx > W + 20) return;
            const bob = Math.sin(t + c.bobOffset) * 4;
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(sx, sy + bob, c.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFA000';
            ctx.beginPath();
            ctx.arc(sx, sy + bob, c.r * 0.6, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function drawFlag() {
        const sx = flagX - cameraX + 60;
        const sy = H - 160 - cameraY;
        if (sx < -50 || sx > W + 50) return;
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(sx - 3, sy - 80, 6, 80);
        ctx.fillStyle = '#FF4444';
        ctx.beginPath();
        ctx.moveTo(sx + 3, sy - 80);
        ctx.lineTo(sx + 40, sy - 65);
        ctx.lineTo(sx + 3, sy - 50);
        ctx.closePath();
        ctx.fill();
    }

    function drawPlayer() {
        if (!player) return;
        const sx = player.x - cameraX;
        const sy = player.y - cameraY;

        ctx.save();
        ctx.translate(sx + player.w / 2, sy + player.h / 2);
        ctx.scale(player.facing, 1);

        // Body
        ctx.fillStyle = '#FF6B6B';
        roundRect(-player.w / 2, -player.h / 2 + 10, player.w, player.h - 10, 8);
        ctx.fill();

        // Head
        ctx.fillStyle = '#FFDAA0';
        ctx.beginPath();
        ctx.arc(0, -player.h / 2 + 8, 14, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(-5, -player.h / 2 + 6, 3, 0, Math.PI * 2);
        ctx.arc(5, -player.h / 2 + 6, 3, 0, Math.PI * 2);
        ctx.fill();

        // Smile
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, -player.h / 2 + 8, 6, 0.1, Math.PI - 0.1);
        ctx.stroke();

        // Legs
        if (!player.onGround) {
            ctx.fillStyle = '#E05555';
            ctx.fillRect(-8, player.h / 2 - 4, 6, 8);
            ctx.fillRect(4, player.h / 2 - 4, 6, 8);
        } else if (Math.abs(player.vx) > 0.5) {
            const legAngle = Math.sin(player.frameTimer * 0.3) * 0.4;
            ctx.save();
            ctx.translate(-4, player.h / 2);
            ctx.rotate(legAngle);
            ctx.fillStyle = '#E05555';
            ctx.fillRect(-3, 0, 6, 10);
            ctx.restore();
            ctx.save();
            ctx.translate(4, player.h / 2);
            ctx.rotate(-legAngle);
            ctx.fillStyle = '#E05555';
            ctx.fillRect(-3, 0, 6, 10);
            ctx.restore();
        }
        ctx.restore();
    }

    function drawParticles() {
        particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x - cameraX, p.y - cameraY, p.r, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    function roundRect(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    // ===================== PARTICLES =====================
    function spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 1) * 6,
                r: Math.random() * 4 + 2,
                life: 1,
                color,
            });
        }
    }

    function updateParticles() {
        particles = particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15;
            p.life -= 0.025;
            return p.life > 0;
        });
    }

    // ===================== INPUT =====================
    const keys = {};
    document.addEventListener('keydown', e => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space', 'KeyA', 'KeyD', 'KeyW'].includes(e.code)) {
            keys[e.code] = true;
            e.preventDefault();
        }
    });
    document.addEventListener('keyup', e => { keys[e.code] = false; });

    let mobileLeft = false, mobileRight = false, mobileJump = false;

    function setupMobileButton(id, onDown, onUp) {
        const btn = $(id);
        if (!btn) return;
        btn.addEventListener('touchstart', e => { e.preventDefault(); onDown(); }, { passive: false });
        btn.addEventListener('touchend', e => { e.preventDefault(); onUp(); }, { passive: false });
        btn.addEventListener('mousedown', onDown);
        btn.addEventListener('mouseup', onUp);
        btn.addEventListener('mouseleave', onUp);
    }

    setupMobileButton('btn-left', () => mobileLeft = true, () => mobileLeft = false);
    setupMobileButton('btn-right', () => mobileRight = true, () => mobileRight = false);
    setupMobileButton('btn-jump', () => mobileJump = true, () => mobileJump = false);

    let touchStartX, touchStartY;
    function initCanvasInput() {
        canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: false });

        canvas.addEventListener('touchend', e => {
            if (touchStartX === undefined) return;
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            if (dy < -40 && Math.abs(dx) < 60) {
                if (player && player.onGround && gameState === 'playing') {
                    player.vy = JUMP_FORCE;
                    player.onGround = false;
                    sfx.jump();
                }
            }
            touchStartX = undefined;
        }, { passive: false });
    }

    // ===================== RESPAWN =====================
    function respawnPlayer() {
        gameOver();
    }

    // ===================== PHYSICS =====================
    function updatePlayer() {
        if (!player) return;

        const left = keys['ArrowLeft'] || keys['KeyA'] || mobileLeft;
        const right = keys['ArrowRight'] || keys['KeyD'] || mobileRight;
        const jump = keys['ArrowUp'] || keys['KeyW'] || keys['Space'] || mobileJump;

        if (left) { player.vx = -MOVE_SPEED; player.facing = -1; }
        else if (right) { player.vx = MOVE_SPEED; player.facing = 1; }
        else { player.vx *= 0.7; }

        if (jump && player.onGround) {
            player.vy = JUMP_FORCE;
            player.onGround = false;
            sfx.jump();
        }

        player.vy += GRAVITY;
        player.x += player.vx;
        player.y += player.vy;

        if (Math.abs(player.vx) > 0.5) player.frameTimer++;

        // Collision — iterate all platforms, only land on top
        player.onGround = false;
        for (let i = 0; i < platforms.length; i++) {
            const p = platforms[i];
            const prevBottom = player.y + player.h - player.vy;
            const curBottom = player.y + player.h;

            if (player.x + player.w > p.x && player.x < p.x + p.w) {
                if (curBottom >= p.y && prevBottom <= p.y + 10 && player.vy >= 0) {
                    player.y = p.y - player.h;
                    player.vy = 0;
                    player.onGround = true;

                    if (p.hasQuestion && !p._answered && !pendingQuestion) {
                        pendingQuestion = p;
                        const progress = p.questionProgress || 0;
                        const q = generateVPRQuestion(progress);
                        const answers = generateOptions(q.answer);
                        shuffleArray(answers);
                        openQuestionModal({ text: q.text, answer: q.answer, answers }, ok => {
                            if (ok) {
                                p._answered = true;
                                spawnParticles(p.x + p.w / 2, p.y, '#4CAF50', 12);
                            }
                            pendingQuestion = null;
                        });
                    }
                    break;
                }
            }
        }

        // Coins
        coins.forEach(c => {
            if (c.collected) return;
            const dx = (player.x + player.w / 2) - c.x;
            const dy = (player.y + player.h / 2) - c.y;
            if (Math.sqrt(dx * dx + dy * dy) < c.r + 18) {
                c.collected = true;
                score += 5;
                sfx.coin();
                spawnParticles(c.x, c.y, '#FFD700', 8);
                updateHUD();
            }
        });

        // Fall off into death zone
        if (player.y > H + 80) {
            sfx.fall();
            respawnPlayer();
        }

        player.x = Math.max(0, player.x);

        // Finish
        if (player.x >= flagX - 20) {
            levelComplete();
        }

        // Camera follows player
        const targetCamX = player.x - W / 3;
        cameraX += (targetCamX - cameraX) * 0.1;
        if (cameraX < 0) cameraX = 0;

        // Camera Y — keep player in upper half
        const targetCamY = player.y - H / 3;
        cameraY += (targetCamY - cameraY) * 0.08;
        if (cameraY < -100) cameraY = -100;
        if (cameraY > 100) cameraY = 100;
    }

    // ===================== GAME LOOP =====================
    function gameLoop() {
        if (gameState === 'playing') {
            updatePlayer();
        }
        updateParticles();

        if (ctx) {
            ctx.clearRect(0, 0, W, H);
            drawBackground();
            drawPlatforms();
            drawCoins();
            drawFlag();
            drawParticles();
            drawPlayer();
        }

        animFrame = requestAnimationFrame(gameLoop);
    }

    // ===================== HUD =====================
    function updateHUD() {
        $('hud-level').textContent = `Ур. ${currentLevel}`;
        $('hud-score').textContent = score;
        $('hud-time').textContent = timeLeft;
        $('hud-hint').textContent = `x${hints}`;
        if (player && flagX > 0) {
            const progress = Math.min(100, Math.floor((player.x / flagX) * 100));
            $('hud-progress').textContent = `${progress}%`;
        }
    }

    // ===================== TIMER =====================
    function startTimer() {
        clearInterval(timerInterval);
        timeLeft = 120 + currentLevel * 20;
        updateHUD();
        timerInterval = setInterval(() => {
            if (gameState !== 'playing') return;
            timeLeft--;
            updateHUD();
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                gameOver();
            }
        }, 1000);
    }

    // ===================== LEVEL COMPLETE =====================
    function levelComplete() {
        if (gameState !== 'playing') return;
        clearInterval(timerInterval);
        sfx.levelUp();
        gameState = 'levelComplete';
        $('level-score').textContent = `Очки: ${score}`;
        $('level-time').textContent = `Время: ${timeLeft}с`;
        modals.levelComplete.classList.remove('hidden');
    }

    // ===================== GAME OVER =====================
    function gameOver() {
        clearInterval(timerInterval);
        gameState = 'gameOver';
        currentQuestion = null;
        sfx.fall();
        saveRecord(score);
        $('final-score').textContent = `Итого: ${score} очков`;
        modals.gameOver.classList.remove('hidden');
    }

    // ===================== RECORDS =====================
    function saveRecord(s) {
        const records = JSON.parse(localStorage.getItem('mathPlatformerRecords') || '[]');
        records.push({ score: s, date: new Date().toLocaleDateString(), level: currentLevel });
        records.sort((a, b) => b.score - a.score);
        localStorage.setItem('mathPlatformerRecords', JSON.stringify(records.slice(0, 10)));
    }

    function showRecords() {
        const records = JSON.parse(localStorage.getItem('mathPlatformerRecords') || '[]');
        const list = $('records-list');
        list.innerHTML = '';
        if (records.length === 0) {
            list.innerHTML = '<p style="color:white;opacity:0.7">Пока нет рекордов</p>';
            return;
        }
        records.forEach((r, i) => {
            const div = document.createElement('div');
            div.className = 'record-item';
            div.innerHTML = `<span>#${i + 1} — Ур. ${r.level}</span><span>${r.score} очков — ${r.date}</span>`;
            list.appendChild(div);
        });
    }

    // ===================== START / RESIZE =====================
    function resize() {
        canvas = $('gameCanvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }

    function startGame() {
        score = 0;
        hints = 3;
        currentLevel = 1;
        pendingQuestion = null;
        currentQuestion = null;
        showScreen('game');
        resize();
        generateLevel(currentLevel);
        startTimer();
        gameState = 'playing';
        if (!animFrame) gameLoop();
    }

    function nextLevel() {
        currentLevel++;
        pendingQuestion = null;
        currentQuestion = null;
        modals.levelComplete.classList.add('hidden');
        resize();
        generateLevel(currentLevel);
        startTimer();
        gameState = 'playing';
    }

    window.addEventListener('resize', () => {
        if (gameState === 'playing' || gameState === 'question') resize();
    });

    // ===================== EVENTS =====================
    $('btn-play').onclick = () => startGame();
    $('btn-settings').onclick = () => showScreen('settings');
    $('btn-records').onclick = () => { showRecords(); showScreen('records'); };
    $('btn-settings-back').onclick = () => showScreen('menu');
    $('btn-records-back').onclick = () => showScreen('menu');
    $('btn-next-level').onclick = () => nextLevel();
    $('btn-retry').onclick = () => { modals.gameOver.classList.add('hidden'); startGame(); };
    $('btn-menu').onclick = () => {
        clearInterval(timerInterval);
        gameState = 'menu';
        modals.gameOver.classList.add('hidden');
        showScreen('menu');
    };
    $('btn-hint').onclick = () => {
        if (gameState === 'question' && hints > 0 && currentQuestion) {
            const grid = $('answers-grid');
            hints--;
            const btns = grid.querySelectorAll('button:not([disabled])');
            const wrongBtns = Array.from(btns).filter(b => parseInt(b.textContent) !== currentQuestion.answer);
            if (wrongBtns.length > 0) {
                wrongBtns[0].classList.add('wrong');
                wrongBtns[0].disabled = true;
            }
            updateHUD();
        }
    };

    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
    });

    document.querySelectorAll('.op-btn').forEach(btn => {
        btn.onclick = () => {
            btn.classList.toggle('active');
        };
    });

    canvas = $('gameCanvas');
    initCanvasInput();
    showScreen('menu');
    gameLoop();
})();
