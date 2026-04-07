// ===== PLAYABLE GAMES — V2 =====
// Depends on: sounds.js (playGameClickSound, playGameWinSound, playGameLoseSound)
// All functions in global scope for script-tag loading.

// --- Web Audio micro-tones (subtle, non-annoying) ---

function _gamePlayTone(freq1, freq2, duration, type) {
    try {
        var ctx = window.audioContext || window._gameAudioCtx;
        if (!ctx) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            window._gameAudioCtx = ctx;
        }
        var gain = ctx.createGain();
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        var osc = ctx.createOscillator();
        osc.type = type || 'sine';
        osc.frequency.setValueAtTime(freq1, ctx.currentTime);
        if (freq2) {
            osc.frequency.linearRampToValueAtTime(freq2, ctx.currentTime + duration * 0.6);
        }
        osc.connect(gain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    } catch (e) {}
}

function _gameToneCardMatch() {
    _gamePlayTone(523, 659, 0.18, 'sine');
}

function _gameToneMineClick() {
    _gamePlayTone(1200, null, 0.04, 'square');
}

function _gameToneMineHit() {
    _gamePlayTone(120, 60, 0.35, 'sawtooth');
}

function _gameToneWhackPop() {
    _gamePlayTone(800, 1200, 0.1, 'sine');
}

// --- Helpers ---

function getGamesContent() {
    return document.querySelector('#games-window .games-content');
}

function createGameOverlay(title) {
    var container = getGamesContent();
    if (!container) return null;
    var existing = container.querySelector('.game-overlay');
    if (existing) existing.remove();
    var overlay = document.createElement('div');
    overlay.className = 'game-overlay';
    var backBtn = document.createElement('button');
    backBtn.className = 'game-back-btn';
    backBtn.innerHTML = '← Back';
    backBtn.onclick = function() { overlay.remove(); };
    overlay.appendChild(backBtn);
    var h = document.createElement('div');
    h.className = 'game-title';
    h.textContent = title;
    overlay.appendChild(h);
    container.appendChild(overlay);
    return overlay;
}

// --- Memory Card Match ---

function openCardMatch() {
    var overlay = createGameOverlay('🃏 Memory Card Match');
    var emojis = ['⎈','☁','🐳','🔧','📦','🔒','🚀','📊'];
    var cards = emojis.concat(emojis);
    cards.sort(function() { return Math.random() - 0.5; });

    var moves = 0, matched = 0, first = null, second = null, locked = false;
    var startTime = Date.now();

    var stats = document.createElement('div');
    stats.className = 'game-stats';
    stats.innerHTML = '<span id="cm-moves">Moves: 0</span><span id="cm-time">Time: 0s</span>';
    overlay.appendChild(stats);

    var timer = setInterval(function() {
        var el = document.getElementById('cm-time');
        if (el) el.textContent = 'Time: ' + Math.floor((Date.now() - startTime) / 1000) + 's';
    }, 1000);

    var grid = document.createElement('div');
    grid.className = 'card-match-grid';
    overlay.appendChild(grid);

    cards.forEach(function(emoji, i) {
        var card = document.createElement('div');
        card.className = 'match-card';
        card.textContent = emoji;
        card.dataset.idx = i;
        card.onclick = function() { flipCard(card, emoji); };
        grid.appendChild(card);
    });

    function flipCard(card, emoji) {
        if (locked || card.classList.contains('flipped') || card.classList.contains('matched')) return;
        card.classList.add('flipped');
        playGameClickSound();
        if (!first) { first = card; return; }
        second = card;
        moves++;
        document.getElementById('cm-moves').textContent = 'Moves: ' + moves;
        locked = true;
        if (first.textContent === second.textContent) {
            first.classList.add('matched');
            second.classList.add('matched');
            matched++;
            _gameToneCardMatch();
            playGameWinSound();
            first = null; second = null; locked = false;
            if (matched === 8) {
                clearInterval(timer);
                var secs = Math.floor((Date.now() - startTime) / 1000);
                var win = document.createElement('div');
                win.className = 'game-win-msg';
                win.textContent = '🎉 You Win! ' + moves + ' moves in ' + secs + 's';
                overlay.appendChild(win);
                playGameWinSound();
            }
        } else {
            setTimeout(function() {
                first.classList.remove('flipped');
                second.classList.remove('flipped');
                first = null; second = null; locked = false;
            }, 700);
        }
    }

    overlay.querySelector('.game-back-btn').onclick = function() { clearInterval(timer); overlay.remove(); };
}

// --- Minesweeper ---

function openMinesweeper() {
    var overlay = createGameOverlay('💣 Minesweeper');
    var ROWS = 8, COLS = 8, MINES = 10;
    var board = [], revealed = [], flagged = [], gameOver = false, cellsRevealed = 0;
    var safe = ROWS * COLS - MINES;

    var stats = document.createElement('div');
    stats.className = 'game-stats';
    stats.innerHTML = '<span id="ms-mines">Mines: ' + MINES + '</span><span id="ms-status">Playing...</span>';
    overlay.appendChild(stats);

    board = Array.from({ length: ROWS }, function() { return Array(COLS).fill(0); });
    revealed = Array.from({ length: ROWS }, function() { return Array(COLS).fill(false); });
    flagged = Array.from({ length: ROWS }, function() { return Array(COLS).fill(false); });

    var placed = 0;
    while (placed < MINES) {
        var r = Math.floor(Math.random() * ROWS), c = Math.floor(Math.random() * COLS);
        if (board[r][c] !== -1) { board[r][c] = -1; placed++; }
    }
    for (var r2 = 0; r2 < ROWS; r2++) {
        for (var c2 = 0; c2 < COLS; c2++) {
            if (board[r2][c2] === -1) continue;
            var count = 0;
            for (var dr = -1; dr <= 1; dr++) {
                for (var dc = -1; dc <= 1; dc++) {
                    var nr = r2 + dr, nc = c2 + dc;
                    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === -1) count++;
                }
            }
            board[r2][c2] = count;
        }
    }

    var grid = document.createElement('div');
    grid.className = 'minesweeper-grid';
    overlay.appendChild(grid);

    var cells = [];
    for (var ri = 0; ri < ROWS; ri++) {
        cells[ri] = [];
        for (var ci = 0; ci < COLS; ci++) {
            var cell = document.createElement('div');
            cell.className = 'mine-cell';
            (function(rr, cc) {
                cell.onclick = function() { revealCell(rr, cc); };
                cell.oncontextmenu = function(e) { e.preventDefault(); toggleFlag(rr, cc); };
            })(ri, ci);
            grid.appendChild(cell);
            cells[ri][ci] = cell;
        }
    }

    function revealCell(r, c) {
        if (gameOver || revealed[r][c] || flagged[r][c]) return;
        revealed[r][c] = true;
        cellsRevealed++;
        var cell = cells[r][c];
        cell.classList.add('revealed');
        _gameToneMineClick();
        if (board[r][c] === -1) {
            cell.classList.add('mine-hit');
            cell.textContent = '💥';
            _gameToneMineHit();
            playGameLoseSound();
            endGame(false);
            return;
        }
        if (board[r][c] > 0) {
            cell.textContent = board[r][c];
            cell.dataset.adj = board[r][c];
        } else {
            for (var dr = -1; dr <= 1; dr++) {
                for (var dc = -1; dc <= 1; dc++) {
                    var nr2 = r + dr, nc2 = c + dc;
                    if (nr2 >= 0 && nr2 < ROWS && nc2 >= 0 && nc2 < COLS && !revealed[nr2][nc2]) revealCell(nr2, nc2);
                }
            }
        }
        if (cellsRevealed === safe) {
            playGameWinSound();
            endGame(true);
        }
    }

    function toggleFlag(r, c) {
        if (gameOver || revealed[r][c]) return;
        flagged[r][c] = !flagged[r][c];
        cells[r][c].classList.toggle('flagged');
        playGameClickSound();
    }

    function endGame(won) {
        gameOver = true;
        document.getElementById('ms-status').textContent = won ? '🎉 You Win!' : '💥 Game Over';
        if (!won) {
            for (var r = 0; r < ROWS; r++) {
                for (var c = 0; c < COLS; c++) {
                    if (board[r][c] === -1 && !revealed[r][c]) {
                        cells[r][c].classList.add('revealed');
                        cells[r][c].textContent = '💣';
                    }
                }
            }
        }
    }
}

// --- Whack-a-Pod ---

function openWhackAPod() {
    var overlay = createGameOverlay('⎈ Whack-a-Pod');
    var score = 0, timeLeft = 30, gameActive = true, podTimer = null, clockTimer = null;

    var stats = document.createElement('div');
    stats.className = 'game-stats';
    stats.innerHTML = '<span id="wp-score">Score: 0</span><span id="wp-time">Time: 30s</span>';
    overlay.appendChild(stats);

    var grid = document.createElement('div');
    grid.className = 'whack-grid';
    overlay.appendChild(grid);

    var holes = [];
    for (var i = 0; i < 9; i++) {
        var hole = document.createElement('div');
        hole.className = 'whack-hole';
        (function(idx) {
            hole.onclick = function() { whack(idx); };
        })(i);
        grid.appendChild(hole);
        holes.push(hole);
    }

    function spawnPod() {
        if (!gameActive) return;
        holes.forEach(function(h) { h.textContent = ''; h.className = 'whack-hole'; });
        var idx = Math.floor(Math.random() * 9);
        var isBad = Math.random() < 0.25;
        holes[idx].textContent = isBad ? '💀' : '⎈';
        holes[idx].classList.add(isBad ? 'bad-pod' : 'pod-up');
        holes[idx].dataset.type = isBad ? 'bad' : 'good';
        var speed = Math.max(500, 1000 - (30 - timeLeft) * 15);
        podTimer = setTimeout(spawnPod, speed);
    }

    function whack(idx) {
        if (!gameActive) return;
        var hole = holes[idx];
        if (!hole.classList.contains('pod-up') && !hole.classList.contains('bad-pod')) return;
        if (hole.dataset.type === 'good') {
            score += 10;
            hole.textContent = '✅';
            _gameToneWhackPop();
            playGameClickSound();
        } else {
            score -= 5;
            hole.textContent = '❌';
            playGameLoseSound();
        }
        hole.className = 'whack-hole';
        document.getElementById('wp-score').textContent = 'Score: ' + score;
    }

    clockTimer = setInterval(function() {
        timeLeft--;
        document.getElementById('wp-time').textContent = 'Time: ' + timeLeft + 's';
        if (timeLeft <= 0) {
            gameActive = false;
            clearInterval(clockTimer);
            clearTimeout(podTimer);
            holes.forEach(function(h) { h.textContent = ''; h.className = 'whack-hole'; });
            var msg = document.createElement('div');
            msg.className = 'game-win-msg';
            msg.textContent = '⏱ Time\'s up! Final Score: ' + score;
            overlay.appendChild(msg);
            if (score >= 50) playGameWinSound();
            else playGameLoseSound();
        }
    }, 1000);

    spawnPod();

    overlay.querySelector('.game-back-btn').onclick = function() {
        gameActive = false;
        clearInterval(clockTimer);
        clearTimeout(podTimer);
        overlay.remove();
    };
}

// --- DevOps Quiz ---

function openDevOpsQuiz() {
    var overlay = createGameOverlay('🧠 DevOps Quiz');
    var questions = [
        { q: 'What does KEDA stand for?', o: ['Kubernetes Event-Driven Autoscaling', 'Kubernetes Extended Deployment Agent', 'Kube Elastic Data Adapter', 'Kubernetes Endpoint Discovery API'], a: 0 },
        { q: 'Which tool is commonly used for GitOps?', o: ['Jenkins', 'ArgoCD', 'Nagios', 'Grafana'], a: 1 },
        { q: 'What port does HTTPS use by default?', o: ['80', '8080', '443', '22'], a: 2 },
        { q: 'Terraform state can be stored in?', o: ['Only local files', 'Backend (S3, Azure Blob, etc.)', 'Git repository only', 'Docker volumes'], a: 1 },
        { q: 'What does SRE stand for?', o: ['Software Release Engineering', 'System Resource Evaluation', 'Site Reliability Engineering', 'Scalable Runtime Environment'], a: 2 },
        { q: 'Docker images are stored in?', o: ['Docker Daemon', 'Container Registry', 'Kubernetes etcd', 'Build Server'], a: 1 },
        { q: 'Helm is a package manager for?', o: ['Docker', 'Terraform', 'Kubernetes', 'Ansible'], a: 2 },
        { q: 'What does CI/CD stand for?', o: ['Container Integration / Container Delivery', 'Continuous Integration / Continuous Delivery', 'Code Inspection / Code Deployment', 'Cloud Infrastructure / Cloud Deployment'], a: 1 },
        { q: 'Which protocol does kubectl use to communicate?', o: ['SSH', 'gRPC', 'HTTPS (REST API)', 'WebSocket'], a: 2 },
        { q: 'SOC2 is related to?', o: ['Container Orchestration', 'Security Compliance', 'Network Monitoring', 'Load Balancing'], a: 1 }
    ];

    var current = 0, score = 0;

    var wrapper = document.createElement('div');
    overlay.appendChild(wrapper);

    function renderQuestion() {
        var q = questions[current];
        wrapper.innerHTML = '';
        var prog = document.createElement('div');
        prog.className = 'quiz-progress';
        prog.textContent = 'Question ' + (current + 1) + ' of ' + questions.length;
        wrapper.appendChild(prog);
        var qEl = document.createElement('div');
        qEl.className = 'quiz-question';
        qEl.textContent = q.q;
        wrapper.appendChild(qEl);
        var opts = document.createElement('div');
        opts.className = 'quiz-options';
        wrapper.appendChild(opts);
        q.o.forEach(function(opt, i) {
            var btn = document.createElement('button');
            btn.className = 'quiz-option';
            btn.textContent = opt;
            btn.onclick = function() { pickAnswer(i, btn, opts); };
            opts.appendChild(btn);
        });
    }

    function pickAnswer(idx, btn, opts) {
        var q = questions[current];
        var buttons = opts.querySelectorAll('.quiz-option');
        buttons.forEach(function(b) { b.classList.add('picked'); b.style.pointerEvents = 'none'; });
        if (idx === q.a) {
            btn.classList.add('correct');
            score++;
            playGameWinSound();
        } else {
            btn.classList.add('wrong');
            buttons[q.a].classList.add('correct');
            playGameLoseSound();
        }
        var next = document.createElement('button');
        next.className = 'quiz-next-btn';
        next.textContent = current < questions.length - 1 ? 'Next →' : 'See Results';
        next.onclick = function() {
            current++;
            if (current < questions.length) renderQuestion();
            else showResult();
        };
        wrapper.appendChild(next);
    }

    function showResult() {
        wrapper.innerHTML = '';
        var res = document.createElement('div');
        res.className = 'quiz-result';
        var emoji = score >= 8 ? '🏆' : score >= 5 ? '👏' : '📚';
        var msg = score >= 8 ? 'DevOps Master!' : score >= 5 ? 'Not bad!' : 'Keep learning!';
        res.innerHTML = '<h2>' + emoji + ' ' + msg + '</h2><div class="score-big">' + score + '/' + questions.length + '</div><p>You got ' + score + ' out of ' + questions.length + ' correct</p>';
        var retry = document.createElement('button');
        retry.className = 'quiz-next-btn';
        retry.textContent = '🔄 Try Again';
        retry.style.marginTop = '20px';
        retry.onclick = function() { current = 0; score = 0; renderQuestion(); };
        res.appendChild(retry);
        wrapper.appendChild(res);
        if (score >= 8) playGameWinSound();
        else if (score < 5) playGameLoseSound();
    }

    renderQuestion();
}

// --- Reaction Test ---

function openReactionTest() {
    var overlay = createGameOverlay('⚡ Reaction Test');
    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:80%;text-align:center;';
    overlay.appendChild(wrapper);

    var state = 'waiting';
    var startTime = 0;
    var times = [];

    var box = document.createElement('div');
    box.style.cssText = 'width:280px;height:280px;border-radius:20px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:600;cursor:pointer;transition:all 0.3s ease;user-select:none;margin:20px auto;';
    var info = document.createElement('div');
    info.style.cssText = 'font-size:14px;color:#888;margin-top:16px;';

    function setWaiting() {
        state = 'waiting';
        box.style.background = '#e74c3c';
        box.style.color = '#fff';
        box.textContent = 'Wait for green...';
        info.textContent = 'Round ' + (times.length + 1) + ' of 5';
        var delay = 1500 + Math.random() * 3000;
        setTimeout(function() {
            if (state !== 'waiting') return;
            state = 'ready';
            box.style.background = '#2ecc71';
            box.textContent = 'CLICK NOW!';
            startTime = performance.now();
        }, delay);
    }

    box.addEventListener('click', function() {
        if (state === 'waiting') {
            box.style.background = '#f39c12';
            box.textContent = 'Too early! Click to retry';
            state = 'early';
            playGameLoseSound();
        } else if (state === 'early') {
            setWaiting();
        } else if (state === 'ready') {
            var ms = Math.round(performance.now() - startTime);
            times.push(ms);
            box.style.background = '#3498db';
            box.style.color = '#fff';
            box.textContent = ms + ' ms';
            state = 'done';
            playGameClickSound();
            if (times.length >= 5) {
                var avg = Math.round(times.reduce(function(a, b) { return a + b; }) / times.length);
                var best = Math.min.apply(null, times);
                var grade = avg < 200 ? '🏆 Lightning!' : avg < 300 ? '⚡ Fast!' : avg < 400 ? '👍 Good' : '🐢 Keep practicing';
                info.innerHTML = '<strong>Average: ' + avg + 'ms</strong> | Best: ' + best + 'ms<br>' + grade + '<br><br><button onclick="openReactionTest()" style="padding:8px 16px;border-radius:8px;border:none;background:#007aff;color:#fff;cursor:pointer;">Play Again</button>';
                if (avg < 300) playGameWinSound();
            } else {
                info.textContent = 'Round ' + times.length + '/5 — Click to continue';
                state = 'next';
            }
        } else if (state === 'next' || state === 'done') {
            if (times.length < 5) setWaiting();
        }
    });

    wrapper.appendChild(box);
    wrapper.appendChild(info);
    setWaiting();
}

// --- Emoji Catcher ---

function openEmojiCatcher() {
    var overlay = createGameOverlay('🎯 Emoji Catcher');
    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;width:100%;height:calc(100% - 80px);overflow:hidden;border-radius:12px;background:rgba(0,0,0,0.03);';

    var statsEl = document.createElement('div');
    statsEl.style.cssText = 'text-align:center;padding:12px;font-size:16px;font-weight:600;';
    overlay.appendChild(statsEl);
    overlay.appendChild(wrapper);

    var devopsEmojis = ['⎈', '☁', '🐳', '🔧', '📦', '🔒', '🚀', '📊', '⚙️', '🛡️'];
    var badEmojis = ['💀', '🐛', '💣'];
    var score = 0;
    var timeLeft = 25;
    var spawnSpeed = 1200;

    function updateStats() {
        statsEl.textContent = '🎯 Score: ' + score + '  |  ⏱️ Time: ' + timeLeft + 's';
    }
    updateStats();

    function spawnEmoji() {
        if (timeLeft <= 0) return;
        var isBad = Math.random() < 0.2;
        var emoji = isBad ? badEmojis[Math.floor(Math.random() * badEmojis.length)] : devopsEmojis[Math.floor(Math.random() * devopsEmojis.length)];

        var el = document.createElement('div');
        var x = 10 + Math.random() * 80;
        var size = 32 + Math.random() * 20;
        el.textContent = emoji;
        el.style.cssText = 'position:absolute;font-size:' + size + 'px;left:' + x + '%;top:-50px;cursor:pointer;transition:none;user-select:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.2));z-index:1;';

        el.addEventListener('click', function() {
            if (isBad) {
                score = Math.max(0, score - 3);
                el.style.transform = 'scale(1.5)';
                el.style.opacity = '0';
                el.textContent = '💥';
                playGameLoseSound();
            } else {
                score += 1;
                el.style.transform = 'scale(1.5)';
                el.style.opacity = '0';
                el.textContent = '✨';
                playGameClickSound();
            }
            updateStats();
            setTimeout(function() { el.remove(); }, 200);
        });

        wrapper.appendChild(el);

        var y = -50;
        var fallSpeed = 1.5 + Math.random() * 2;
        var drift = (Math.random() - 0.5) * 0.5;
        function fall() {
            if (timeLeft <= 0) { el.remove(); return; }
            y += fallSpeed;
            var currentX = parseFloat(el.style.left) + drift;
            el.style.top = y + 'px';
            el.style.left = currentX + '%';
            if (y > wrapper.offsetHeight + 50) {
                el.remove();
            } else {
                requestAnimationFrame(fall);
            }
        }
        requestAnimationFrame(fall);
    }

    var spawnInterval = setInterval(function() {
        if (timeLeft <= 0) return;
        spawnEmoji();
        if (Math.random() > 0.5) spawnEmoji();
    }, spawnSpeed);

    var timerInterval = setInterval(function() {
        timeLeft--;
        updateStats();
        if (timeLeft <= 10) spawnSpeed = 800;
        if (timeLeft <= 5) spawnSpeed = 500;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            clearInterval(spawnInterval);
            wrapper.innerHTML = '';
            var result = document.createElement('div');
            result.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;';
            var grade = score >= 20 ? '🏆 DevOps Master!' : score >= 12 ? '⚡ Great!' : score >= 6 ? '👍 Not bad!' : '📚 Try again!';
            result.innerHTML = '<div style="font-size:48px;margin-bottom:16px;">🎯</div><h2>Final Score: ' + score + '</h2><p style="font-size:18px;margin:8px 0;">' + grade + '</p><button onclick="openEmojiCatcher()" style="margin-top:16px;padding:10px 20px;border-radius:10px;border:none;background:#007aff;color:#fff;font-size:15px;cursor:pointer;">Play Again</button>';
            wrapper.appendChild(result);
            if (score >= 12) playGameWinSound();
            else playGameLoseSound();
        }
    }, 1000);

    overlay._cleanup = function() { clearInterval(timerInterval); clearInterval(spawnInterval); };
}

// --- Color Guess ---

function openColorGuess() {
    var overlay = createGameOverlay('🎨 Color Guess');
    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;padding:20px;';
    overlay.appendChild(wrapper);

    var score = 0;
    var round = 0;
    var totalRounds = 8;

    function randomHex() {
        return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    }

    function generateRound() {
        wrapper.innerHTML = '';
        round++;
        if (round > totalRounds) {
            var grade = score >= 7 ? '🏆 Color Expert!' : score >= 5 ? '🎨 Good eye!' : score >= 3 ? '👀 Keep trying!' : '😅 Practice more!';
            wrapper.innerHTML = '<div style="font-size:48px;margin:20px;">🎨</div><h2>Score: ' + score + '/' + totalRounds + '</h2><p style="font-size:18px;margin:8px;">' + grade + '</p><button onclick="openColorGuess()" style="margin-top:16px;padding:10px 20px;border-radius:10px;border:none;background:#007aff;color:#fff;font-size:15px;cursor:pointer;">Play Again</button>';
            if (score >= 6) playGameWinSound();
            else if (score <= 3) playGameLoseSound();
            return;
        }

        var correctColor = randomHex();
        var options = [correctColor];
        while (options.length < 4) {
            var fake = randomHex();
            if (options.indexOf(fake) === -1) options.push(fake);
        }
        options.sort(function() { return Math.random() - 0.5; });

        var infoEl = document.createElement('div');
        infoEl.style.cssText = 'text-align:center;margin-bottom:16px;font-size:14px;color:#888;';
        infoEl.textContent = 'Round ' + round + '/' + totalRounds + '  |  Score: ' + score;
        wrapper.appendChild(infoEl);

        var colorBox = document.createElement('div');
        colorBox.style.cssText = 'width:200px;height:200px;border-radius:16px;background:' + correctColor + ';margin:16px auto;box-shadow:0 8px 24px rgba(0,0,0,0.15);';
        wrapper.appendChild(colorBox);

        var q = document.createElement('p');
        q.style.cssText = 'text-align:center;font-size:16px;font-weight:600;margin:16px 0;';
        q.textContent = 'What hex color is this?';
        wrapper.appendChild(q);

        var gridEl = document.createElement('div');
        gridEl.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:320px;width:100%;';

        options.forEach(function(opt) {
            var btn = document.createElement('button');
            btn.textContent = opt.toUpperCase();
            btn.style.cssText = 'padding:14px;border-radius:10px;border:2px solid #ddd;background:#fff;font-size:15px;font-weight:600;font-family:monospace;cursor:pointer;transition:all 0.2s ease;';
            btn.addEventListener('click', function() {
                gridEl.querySelectorAll('button').forEach(function(b) { b.style.pointerEvents = 'none'; });
                if (opt === correctColor) {
                    score++;
                    btn.style.background = '#34c759';
                    btn.style.color = '#fff';
                    btn.style.borderColor = '#34c759';
                    playGameWinSound();
                } else {
                    btn.style.background = '#ff3b30';
                    btn.style.color = '#fff';
                    btn.style.borderColor = '#ff3b30';
                    playGameLoseSound();
                    gridEl.querySelectorAll('button').forEach(function(b) {
                        if (b.textContent === correctColor.toUpperCase()) {
                            b.style.background = '#34c759';
                            b.style.color = '#fff';
                            b.style.borderColor = '#34c759';
                        }
                    });
                }
                setTimeout(generateRound, 1000);
            });
            gridEl.appendChild(btn);
        });

        wrapper.appendChild(gridEl);
    }

    generateRound();
}
