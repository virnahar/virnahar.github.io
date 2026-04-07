// ===== INTERACTIVE JQUERY TERMINAL — V2 =====
// Depends on: jQuery, jQuery Terminal, sounds.js (playClickSound, playKeypressSound), startup.js (showMacModal)

var _devosPageLoadTime = Date.now();

if (typeof $ !== 'undefined' && typeof $.terminal !== 'undefined') {
    try {
        if ($.terminal.xml_formatter && $.terminal.xml_formatter.tags) {
            $.terminal.xml_formatter.tags.cyan = function() { return '[[;#00ffff;]'; };
            $.terminal.xml_formatter.tags.yellow = function() { return '[[;#ffff00;]'; };
            $.terminal.xml_formatter.tags.green = function() { return '[[;#00ff00;]'; };
            $.terminal.xml_formatter.tags.blue = function() { return '[[;#5555ff;]'; };
            $.terminal.xml_formatter.tags.magenta = function() { return '[[;#ff00ff;]'; };
            $.terminal.xml_formatter.tags.white = function() { return '[[;#ffffff;]'; };
            $.terminal.xml_formatter.tags.red = function() { return '[[;#ff0000;]'; };
        }
    } catch(e) {
        console.warn('Terminal XML formatter not available:', e.message);
    }
}

function initInteractiveTerminal() {
    if (typeof $ === 'undefined' || typeof $.terminal === 'undefined') {
        console.error('jQuery Terminal not loaded');
        return;
    }

    var termElement = $('#interactive-terminal');
    if (!termElement.length) {
        console.error('Terminal element not found!');
        return;
    }

    if (termElement.data('terminal')) {
        var existingTerm = termElement.data('terminal');
        existingTerm.clear();
        existingTerm.greetings();
        return;
    }

    var directories = {
        education: [
            '',
            '[[;#ffffff;]Education]',
            '* [[;#ffff00;]Bachelor\'s Degree, Computer Science] - Jai Narain Vyas University, Jodhpur (2009 - 2012)',
            ''
        ],
        experience: [
            '',
            '[[;#ffffff;]Experience]',
            '* [[;#00ff00;]McKinsey & Company] - Senior Cloud DevOps Engineer II (Nov 2024 - Present)',
            '* [[;#00ff00;]McKinsey & Company] - Senior Cloud DevOps Engineer I (Feb 2023 - Nov 2024)',
            '* [[;#00ff00;]Accenture] - DevOps Associate Manager (Sep 2021 - Jan 2023, 1 year 5 months)',
            '* [[;#00ff00;]Mercer] - DevOps Technical Lead (Sep 2020 - Sep 2021, 1 year 1 month)',
            '* [[;#00ff00;]Mercer] - Module Lead (Sep 2018 - Sep 2020, 2 years 1 month)',
            '* [[;#00ff00;]Mercer] - Senior Software Engineer (Sep 2016 - Sep 2018, 2 years 1 month)',
            '* [[;#00ff00;]Clavax] - System Administrator → Sr. System Administrator (Mar 2014 - Sep 2016, 2 years 7 months)',
            '* [[;#00ff00;]Aannya Softwares] - System Engineer (Apr 2013 - Feb 2014, 11 months)',
            ''
        ],
        skills: [
            '',
            '[[;#ffffff;]Technical Skills]',
            '[[;#00ff00;]Cloud & Infra:]    Azure (30+ services), Kubernetes/AKS, Docker',
            '[[;#00ff00;]IaC & Config:]     Terraform, Helm, ArgoCD, KEDA',
            '[[;#00ff00;]CI/CD:]            GitHub Actions, Azure DevOps, GitLab CI',
            '[[;#00ff00;]Data & DB:]        Databricks, PostgreSQL, Redis',
            '[[;#00ff00;]Monitoring:]       Dynatrace, SonarQube, JFrog',
            '[[;#00ff00;]Languages:]        Bash, Python, Go, SQL',
            ''
        ],
        certifications: [
            '',
            '[[;#ffffff;]Certifications (14+)]',
            '✅ [[;#00ffff;]Microsoft Certified: DevOps Engineer Expert (AZ-400)]',
            '✅ [[;#00ffff;]Microsoft Certified: Azure Administrator Associate (AZ-104)]',
            '✅ [[;#00ffff;]HashiCorp Certified: Terraform Associate]',
            '✅ [[;#00ffff;]Red Hat Certified System Administrator (RHCSA)]',
            '✅ [[;#00ffff;]Databricks Certified Platform Architect]',
            '✅ [[;#00ffff;]Oracle OCI 2024 Generative AI Professional (1Z0-1127-24)]',
            '✅ [[;#00ffff;]Salesforce Certified AI Associate]',
            '✅ [[;#00ffff;]Operating Kubernetes on IBM Cloud — IBM]',
            '✅ [[;#00ffff;]Google Prompting Essentials — Google]',
            '✅ [[;#00ffff;]Databricks Generative AI Fundamentals — Databricks]',
            '✅ [[;#00ffff;]IBM Generative AI — IBM]',
            '✅ [[;#00ffff;]Oracle AI Foundations — Oracle]',
            '✅ [[;#00ffff;]Generative AI: Prompt Engineering Basics]',
            '✅ [[;#00ffff;]Microsoft Certified: Azure Fundamentals (AZ-900)]',
            ''
        ],
        projects: [
            '',
            '[[;#ffffff;]Projects & Open Source]',
            '📦 [[;#ffff00;]Terraform Modules]         - Reusable IaC modules for Azure',
            '📦 [[;#ffff00;]Jenkins Shared Library]     - Standardized CI/CD pipelines',
            '📦 [[;#ffff00;]K8s Demos]                  - Kubernetes learning resources',
            '📦 [[;#ffff00;]Python Automation]           - DevOps automation scripts',
            '📦 [[;#ffff00;]AI Portfolio Chat]           - AI-powered portfolio chatbot',
            '📦 [[;#ffff00;]Interactive Portfolio]       - This macOS-style portfolio (DevOS)',
            '📦 [[;#ffff00;]Terraform Plan Visualizer]  - Visual diff for Terraform plans',
            '📦 [[;#ffff00;]Internal Developer Portal] - Internal developer portal',
            '📦 [[;#ffff00;]MCP Server for Azure DevOps] - Model Context Protocol server',
            ''
        ]
    };

    var dirs = Object.keys(directories);
    var root = '~';
    var cwd = root;
    var user = 'vir';
    var server = 'terminal';

    // --- Tic-tac-toe AI ---

    function tttCheckWinner(board) {
        var lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
        for (var i = 0; i < lines.length; i++) {
            var a = lines[i][0], b = lines[i][1], c = lines[i][2];
            if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
        }
        if (board.every(Boolean)) return 'draw';
        return null;
    }

    function tttMinimax(board, depth, isMaximizing) {
        var w = tttCheckWinner(board);
        if (w === 'O') return 10 - depth;
        if (w === 'X') return depth - 10;
        if (w === 'draw') return 0;
        if (isMaximizing) {
            var best = -Infinity;
            for (var i = 0; i < 9; i++) {
                if (!board[i]) {
                    board[i] = 'O';
                    best = Math.max(best, tttMinimax(board, depth + 1, false));
                    board[i] = null;
                }
            }
            return best;
        }
        var best2 = Infinity;
        for (var j = 0; j < 9; j++) {
            if (!board[j]) {
                board[j] = 'X';
                best2 = Math.min(best2, tttMinimax(board, depth + 1, true));
                board[j] = null;
            }
        }
        return best2;
    }

    function tttBestMove(board) {
        var bestScore = -Infinity;
        var move = -1;
        for (var i = 0; i < 9; i++) {
            if (!board[i]) {
                board[i] = 'O';
                var score = tttMinimax(board, 0, false);
                board[i] = null;
                if (score > bestScore) {
                    bestScore = score;
                    move = i;
                }
            }
        }
        return move;
    }

    // --- DevOps fortune pool ---
    var _fortunes = [
        'A well-written Dockerfile is worth a thousand deploys.',
        'There are only two hard things in DevOps: cache invalidation, naming things, and off-by-one errors.',
        'The best incident response plan is the one you never need.',
        'If your pipeline is green, you\'re not testing enough.',
        'In the cloud, nobody can hear you `terraform destroy`.',
        'Monitoring without alerting is just watching. Alerting without runbooks is just panicking.',
        'Today\'s `kubectl apply` is tomorrow\'s post-mortem.',
        'A rolling deployment gathers no outages.',
        'Version-pin your dependencies or the dependencies will pin you.',
        'GitOps: because "I pushed to main" should be a deployment strategy, not an excuse.',
        'Automate yourself out of a job, then automate the automation.',
        'The four stages of DevOps grief: Denial, Anger, YAML, Acceptance.',
        'Infrastructure as Code: because clicking buttons in a console is not a hobby.',
        'Kubernetes: turning your one problem into a distributed systems problem since 2014.',
        'Remember: every `--force` push tells a story — usually a horror story.',
        'Shift left until you fall off the timeline.',
        'Your CI pipeline is only as strong as its weakest flaky test.',
        'A container is just a fancy process. A pod is just a fancy group of fancy processes.',
        'Treat your servers like cattle, not pets. Unless it\'s the database — that one\'s still a pet.',
        'The best time to write tests was before the deploy. The second best time is now.'
    ];

    function _scrollTerminal() {
        var el = document.querySelector('#terminal-window .window-content');
        if (el) el.scrollTop = el.scrollHeight;
        var jqTerm = document.querySelector('#interactive-terminal');
        if (jqTerm) jqTerm.scrollTop = jqTerm.scrollHeight;
        var scroller = document.querySelector('.terminal-scroller');
        if (scroller) scroller.scrollTop = scroller.scrollHeight;
    }

    function _animateLines(term, lines, delay, done) {
        var i = 0;
        function next() {
            if (i < lines.length) {
                term.echo(lines[i]);
                try { term.scroll_to_bottom(); } catch(e) {}
                _scrollTerminal();
                i++;
                setTimeout(next, delay || 40);
            } else {
                try { term.scroll_to_bottom(); } catch(e) {}
                _scrollTerminal();
                if (done) done();
            }
        }
        next();
    }

    var _logPool = {
        api: [
            '[[;#00ff00;]INFO]  [devos-api] GET /api/v1/health 200 2ms',
            '[[;#00ff00;]INFO]  [devos-api] GET /api/v1/users 200 45ms',
            '[[;#00ff00;]INFO]  [devos-api] POST /api/v1/deploy 201 1204ms',
            '[[;#ffff00;]WARN]  [devos-api] Slow query detected: 850ms on /api/v1/metrics',
            '[[;#00ff00;]INFO]  [devos-api] WebSocket connected: client_42',
            '[[;#00ff00;]INFO]  [devos-api] Cache HIT ratio: 94.2%',
            '[[;#00ff00;]INFO]  [devos-api] GET /api/v1/projects 200 12ms',
            '[[;#ffff00;]WARN]  [devos-api] Rate limit approaching: 480/500 req/min',
            '[[;#00ff00;]INFO]  [devos-api] Background job completed: cleanup_stale_sessions',
            '[[;#00ff00;]INFO]  [devos-api] Healthcheck passed ✓'
        ],
        frontend: [
            '[[;#00ffff;]INFO]  [webpack] Compiled successfully in 342ms',
            '[[;#00ffff;]INFO]  [next.js] Ready on http://localhost:3000',
            '[[;#00ffff;]INFO]  [next.js] GET / 200 in 18ms',
            '[[;#00ffff;]INFO]  [next.js] GET /projects 200 in 24ms',
            '[[;#ffff00;]WARN]  [next.js] Image optimization: 2 images not cached',
            '[[;#00ffff;]INFO]  [next.js] GET /resume 200 in 15ms',
            '[[;#00ffff;]INFO]  [hmr] Hot module replacement active',
            '[[;#00ffff;]INFO]  [next.js] Static page generated: /about'
        ],
        k8s: [
            '[[;#00ff00;]INFO]  [kube-scheduler] Successfully assigned devos/api-pod to vir-node-2',
            '[[;#00ff00;]INFO]  [kubelet] Container devos-api started',
            '[[;#00ff00;]INFO]  [kube-proxy] Syncing iptables rules',
            '[[;#ffff00;]WARN]  [kubelet] Pod devos-worker memory usage at 82%',
            '[[;#00ff00;]INFO]  [keda] Scaling devos-worker from 2 to 3 replicas (queue depth: 150)',
            '[[;#00ff00;]INFO]  [argocd] Application devos-api synced successfully',
            '[[;#00ff00;]INFO]  [cert-manager] Certificate devos-tls renewed, expires in 89 days',
            '[[;#ff0000;]ERROR] [kubelet] Liveness probe failed for devos-cache: connection refused',
            '[[;#00ff00;]INFO]  [kubelet] Container devos-cache restarted (attempt 1/3)',
            '[[;#00ff00;]INFO]  [kubelet] Liveness probe succeeded for devos-cache ✓',
            '[[;#00ff00;]INFO]  [ingress] Updated Traefik routes for devos-frontend',
            '[[;#00ff00;]INFO]  [helm] Release devos-api upgraded to chart v2.1.1'
        ],
        nginx: [
            '[[;#888;]10.0.42.5 - - "GET / HTTP/2.0" 200 4523 "-" "Mozilla/5.0"]',
            '[[;#888;]10.0.42.8 - - "GET /api/health HTTP/2.0" 200 15 "-" "kube-probe/1.28"]',
            '[[;#888;]10.0.42.12 - - "GET /assets/style.css HTTP/2.0" 304 0]',
            '[[;#888;]10.0.42.15 - - "POST /api/v1/deploy HTTP/2.0" 201 234]',
            '[[;#ffff00;]10.0.42.99 - - "GET /admin HTTP/2.0" 403 128 — blocked]',
            '[[;#888;]10.0.42.3 - - "GET /favicon.ico HTTP/2.0" 200 1150]'
        ]
    };

    function _streamLogs(term, pool, count, interval) {
        count = count || 20;
        interval = interval || 300;
        var i = 0;
        var streaming = true;
        term.echo('[[;#888;]Streaming logs... (press any key to stop)]');
        term.echo('');
        function nextLog() {
            if (!streaming || i >= count) {
                term.echo('');
                term.echo('[[;#888;]--- Log stream ended (' + i + ' lines) ---]');
                document.removeEventListener('keydown', stopStream);
                return;
            }
            var now = new Date();
            var ts = '[[;#555;]' + now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0') + ']';
            var line = pool[Math.floor(Math.random() * pool.length)];
            term.echo(ts + ' ' + line);
            try { term.scroll_to_bottom(); } catch(e) {}
            _scrollTerminal();
            i++;
            setTimeout(nextLog, interval + Math.random() * 200 - 100);
        }
        function stopStream() {
            streaming = false;
            document.removeEventListener('keydown', stopStream);
        }
        setTimeout(function() {
            document.addEventListener('keydown', stopStream);
        }, 500);
        nextLog();
    }

    var _helpCategories = {
        linux: {
            title: '🐧 Linux / Unix Commands',
            color: '#00ffff',
            commands: [
                { cmd: 'top / htop', desc: 'Live process monitor (auto-refreshes 4x)' },
                { cmd: 'ps', desc: 'Running process list' },
                { cmd: 'cat <file>', desc: 'Print file (resume.txt, skills.txt, .bashrc, .env, todo.txt)' },
                { cmd: 'find / -name', desc: 'Search filesystem (animated skill scan)' },
                { cmd: 'grep <pattern>', desc: 'Search text in virtual files' },
                { cmd: 'uname -a', desc: 'System info' },
                { cmd: 'hostname', desc: 'Machine hostname' },
                { cmd: 'pwd', desc: 'Print working directory' },
                { cmd: 'echo <text>', desc: 'Echo text back' },
                { cmd: 'history', desc: 'Last 15 commands' },
                { cmd: 'df -h', desc: 'Disk usage (creative stats)' },
                { cmd: 'free -h', desc: 'Memory info' },
                { cmd: 'ifconfig', desc: 'Network interfaces' },
                { cmd: 'ping <host>', desc: 'Ping with animated latency' },
                { cmd: 'curl <url>', desc: 'Fetch URL content' },
                { cmd: 'lsb_release', desc: 'OS release info' }
            ]
        },
        devops: {
            title: '⎈ DevOps Tools',
            color: '#00ff00',
            commands: [
                { cmd: 'docker ps', desc: 'Running containers' },
                { cmd: 'docker images', desc: 'Available images' },
                { cmd: 'docker logs <name>', desc: '🔴 LIVE streaming container logs' },
                { cmd: 'kubectl get pods', desc: 'Kubernetes pods status' },
                { cmd: 'kubectl get nodes', desc: 'Cluster nodes' },
                { cmd: 'kubectl get svc', desc: 'Services & endpoints' },
                { cmd: 'kubectl logs <pod>', desc: '🔴 LIVE streaming pod logs' },
                { cmd: 'helm list', desc: 'Deployed Helm releases' },
                { cmd: 'terraform plan', desc: 'Animated infra plan' },
                { cmd: 'terraform version', desc: 'TF version + providers' },
                { cmd: 'git log', desc: 'Commit history' },
                { cmd: 'git status', desc: 'Working tree status' },
                { cmd: 'tail -f <logfile>', desc: '🔴 LIVE tail any log file' }
            ]
        },
        brew: {
            title: '🍺 Package Managers',
            color: '#ffff00',
            commands: [
                { cmd: 'brew install <pkg>', desc: 'Install with animated progress' },
                { cmd: 'brew upgrade', desc: 'Upgrade all packages' },
                { cmd: 'pip install <pkg>', desc: 'Python package install' },
                { cmd: 'npm install', desc: 'Node.js dependencies' }
            ]
        },
        fun: {
            title: '🎉 Fun & Easter Eggs',
            color: '#ff00ff',
            commands: [
                { cmd: 'matrix', desc: 'Enter the DevOps Matrix' },
                { cmd: 'neofetch', desc: 'System info with ASCII art' },
                { cmd: 'cowsay <msg>', desc: 'ASCII cow says your message' },
                { cmd: 'sl', desc: 'Steam locomotive (typo penalty!)' },
                { cmd: 'fortune', desc: 'Random DevOps wisdom' },
                { cmd: 'coffee', desc: 'Get your caffeine fix' },
                { cmd: 'motivate', desc: 'DevOps motivation' },
                { cmd: 'joke', desc: 'Random programming joke' },
                { cmd: 'vim', desc: 'Good luck escaping...' },
                { cmd: 'sudo rm -rf /', desc: 'Try it. I dare you.' },
                { cmd: 'exit / quit', desc: 'Close the Terminal window' },
                { cmd: 'man <cmd>', desc: 'Manual page for any command' }
            ]
        },
        games: {
            title: '🎮 Terminal Games',
            color: '#ff6b9d',
            commands: [
                { cmd: 'tictactoe', desc: 'Tic-tac-toe vs minimax AI' },
                { cmd: 'kubegame', desc: 'Kubernetes chaos incident game' },
                { cmd: 'typingtest', desc: 'DevOps typing speed test' }
            ]
        },
        info: {
            title: '📋 Portfolio Info',
            color: '#0af',
            commands: [
                { cmd: 'whoami', desc: 'Who am I (typing effect)' },
                { cmd: 'about', desc: 'Full bio with career highlights' },
                { cmd: 'resume', desc: 'Brief text resume' },
                { cmd: 'experience', desc: 'Work history' },
                { cmd: 'skills', desc: 'Technical skills' },
                { cmd: 'certifications', desc: '14+ certs list' },
                { cmd: 'projects', desc: 'Open source & tools' },
                { cmd: 'education', desc: 'Degree info' },
                { cmd: 'contact', desc: 'GitHub, LinkedIn links' },
                { cmd: 'github / linkedin', desc: 'Open in new tab' },
                { cmd: 'date', desc: 'Current date & time' },
                { cmd: 'uptime', desc: 'Page session uptime' }
            ]
        }
    };

    var commands = {
        help: function(topic) {
            var term = this;

            if (topic && _helpCategories[topic]) {
                var cat = _helpCategories[topic];
                var n = cat.commands.length;
                var bar = '█'.repeat(n) + '░'.repeat(Math.max(0, 16 - n));
                var lines = [
                    '',
                    '  [[;' + cat.color + ';]┌─────────────────────────────────────────────────┐]',
                    '  [[;' + cat.color + ';]│] ' + cat.title.padEnd(46) + '[[;' + cat.color + ';]│]',
                    '  [[;' + cat.color + ';]│] [[;#888;]' + n + ' commands] [[;' + cat.color + ';]' + bar + ']' + ' '.repeat(Math.max(0, 30 - n)) + '[[;' + cat.color + ';]│]',
                    '  [[;' + cat.color + ';]└─────────────────────────────────────────────────┘]',
                    ''
                ];
                cat.commands.forEach(function(c) {
                    lines.push('  [[;' + cat.color + ';]›] [[;#fff;]' + c.cmd.padEnd(22) + '] [[;#666;]' + c.desc + ']');
                });
                lines.push('');
                lines.push('  [[;#555;]Tip: Type any command directly. Tab for autocomplete.]');
                lines.push('');
                _animateLines(term, lines, 30);
                return;
            }

            if (topic) {
                term.echo('[[;#ff6b6b;]✗ Unknown topic:] ' + topic);
                term.echo('[[;#888;]  Available: linux, devops, brew, fun, games, info]');
                return;
            }

            var lines = [
                '',
                '  [[;#fff;]╔═══════════════════════════════════════════════════╗]',
                '  [[;#fff;]║]  [[;#ffff00;]💻 DevOS Terminal]       [[;#888;]v2.0 • 50+ commands]  [[;#fff;]║]',
                '  [[;#fff;]╚═══════════════════════════════════════════════════╝]',
                '',
                '  [[;#00ffff;]▸ help linux]    🐧  [[;#888;]16 cmds] [[;#00ffff;]████████████████][[;#333;]░░░░]  [[;#555;]top ps grep ping df...]',
                '  [[;#00ff00;]▸ help devops]   ⎈   [[;#888;]13 cmds] [[;#00ff00;]█████████████][[;#333;]░░░░░░░]  [[;#555;]docker kubectl helm tf...]',
                '  [[;#ffff00;]▸ help brew]     🍺  [[;#888;] 4 cmds] [[;#ffff00;]████][[;#333;]░░░░░░░░░░░░░░░░]  [[;#555;]brew pip npm...]',
                '  [[;#ff00ff;]▸ help fun]      🎉  [[;#888;]12 cmds] [[;#ff00ff;]████████████][[;#333;]░░░░░░░░]  [[;#555;]matrix vim sudo cowsay...]',
                '  [[;#ff6b9d;]▸ help games]    🎮  [[;#888;] 3 cmds] [[;#ff6b9d;]███][[;#333;]░░░░░░░░░░░░░░░░░]  [[;#555;]tictactoe kubegame...]',
                '  [[;#0af;]▸ help info]     📋  [[;#888;]12 cmds] [[;#0af;]████████████][[;#333;]░░░░░░░░]  [[;#555;]whoami about resume...]',
                '',
                '  [[;#444;]───────────────────────────────────────────────────]',
                '  [[;#888;]⌨  Tab] autocomplete  [[;#888;]↑↓] history  [[;#888;]Esc] clear line',
                '  [[;#888;]Try:] [[;#fff;]docker ps] [[;#888;]•] [[;#fff;]kubectl get pods] [[;#888;]•] [[;#fff;]terraform plan]',
                '  [[;#888;]New:] [[;#fff;]docker logs] [[;#888;]•] [[;#fff;]kubectl logs] [[;#888;]•] [[;#fff;]tail -f]',
                ''
            ];
            _animateLines(term, lines, 45);
        },
        whoami: function() {
            var term = this;
            var text = 'Virendra Kumar | Senior Cloud DevOps Engineer II @ McKinsey & Company | 12+ years';
            var i = 0;
            var typing = setInterval(function() {
                term.set_command(text.substring(0, i));
                i++;
                if (i > text.length) {
                    clearInterval(typing);
                    term.set_command('');
                    term.echo('[[;#00ffff;]' + text + ']');
                }
            }, 20);
        },
        about: function() {
            var term = this;
            var lines = [
                '[[;#00ffff;]Virendra Kumar] - [[;#00ff00;]Senior Cloud DevOps Engineer II @ McKinsey & Company]',
                '',
                'From [[;#ffff00;]carrying CPUs across office floors] to [[;#00ff00;]leading DevOps automation at McKinsey], my journey has been all about transforming challenges into opportunities.',
                '',
                '[[;#ffffff;]12+ years of experience]',
                '',
                '[[;#ffffff;]Verified highlights:]',
                '• [[;#00ff00;]McKinsey:] Azure SaaS platform, CI/CD/AKS, $100K+ savings, SOC2, Dynatrace, 20+ interviews',
                '• [[;#00ff00;]Mercer:] 70+ apps, DevSecOps (SonarQube/ZAP/DefectDojo), ~10 mentees',
                '• [[;#00ff00;]Accenture:] Enterprise clients, team of 10, Jenkins/CloudBees, Terraform/Ansible',
                '• [[;#00ff00;]Early career:] Clavax (GitLab 30+, WHM/cPanel, Nagios/Zabbix); Aannya (Asterisk VoIP, night shifts)',
                '',
                '[[;#ff00ff;]"Debugging Life One Commit at a Time..."]'
            ];
            var i = 0;
            function echoNext() {
                if (i < lines.length) {
                    term.echo(lines[i]);
                    i++;
                    setTimeout(echoNext, 60);
                }
            }
            echoNext();
        },
        ls: function(dir) {
            if (typeof dir === 'undefined') dir = null;
            if (!dir && cwd === root) {
                this.echo(dirs.map(function(d) { return '[[;#5555ff;]' + d + ']'; }).join('  '));
            } else if (dir && directories[dir]) {
                this.echo(directories[dir].join('\n'));
            } else {
                var key = cwd.replace('~/', '');
                this.echo((directories[key] || []).join('\n') || '[[;#ff0000;]Directory not found]');
            }
        },
        cd: function(dir) {
            if (!dir || dir === '~') {
                cwd = root;
            } else if (dirs.includes(dir)) {
                cwd = '~/' + dir;
            } else {
                this.error('cd: ' + dir + ': No such directory');
            }
        },
        experience: function() {
            this.echo(directories.experience.join('\n'));
        },
        skills: function() {
            this.echo(directories.skills.join('\n'));
        },
        certifications: function() {
            this.echo(directories.certifications.join('\n'));
        },
        projects: function() {
            this.echo(directories.projects.join('\n'));
        },
        education: function() {
            this.echo(directories.education.join('\n'));
        },
        clear: function() {
            this.clear();
        },
        kubernetes: function() {
            this.echo('[[;#00ff00;]🎮 Kubernetes Fun Facts:]');
            this.echo('[[;#00ffff;]• K8s = "kate-s" (8 letters between K and s)]');
            this.echo('[[;#ffff00;]• Pods are like DevOps haiku - small & beautiful]');
            this.echo('[[;#ff00ff;]• "It worked on my machine" → Docker & K8s were born]');
        },
        terraform: function(subcmd) {
            if (subcmd === 'plan') {
                var term = this;
                var lines = [
                    '[[;#ffffff;]Refreshing Terraform state in-memory prior to plan...]',
                    '',
                    '[[;#00ff00;]+] azurerm_kubernetes_cluster.aks',
                    '[[;#00ff00;]+] azurerm_container_registry.acr',
                    '[[;#00ff00;]+] azurerm_log_analytics_workspace.logs',
                    '[[;#ffff00;]~] azurerm_resource_group.rg',
                    '',
                    '[[;#ffffff;]Plan:] [[;#00ff00;]3 to add], [[;#ffff00;]1 to change], [[;#ff0000;]0 to destroy].',
                    '',
                    '[[;#888;]───────────────────────────────────────────]',
                    '[[;#00ff00;]✓ Plan complete! Run `terraform apply` to execute.]'
                ];
                var i = 0;
                function show() {
                    if (i < lines.length) { term.echo(lines[i]); i++; setTimeout(show, 200); }
                }
                show();
            } else if (subcmd === 'version') {
                this.echo('Terraform v1.7.4');
                this.echo('on linux_arm64');
                this.echo('+ provider registry.terraform.io/hashicorp/azurerm v3.85.0');
                this.echo('+ provider registry.terraform.io/hashicorp/helm v2.12.1');
            } else {
                this.echo('[[;#00ff00;]🏗️  Terraform Wisdom:]');
                this.echo('[[;#00ffff;]• "terraform destroy" - 2 most powerful words]');
                this.echo('[[;#ffff00;]• Infrastructure as Code = Git for servers]');
                this.echo('[[;#ff00ff;]• Plan before apply, or prepare to cry!]');
            }
        },
        devops: function() {
            this.echo('[[;#00ff00;]💡 DevOps Wisdom:]');
            this.echo('[[;#00ffff;]• "It\'s not a bug, it\'s a feature" - No DevOps engineer ever]');
            this.echo('[[;#ffff00;]• "Just restart it" - Universal solution]');
        },
        coffee: function() {
            this.echo('[[;#ff0000;]☕ ERROR: Coffee not found!]');
            this.echo('[[;#00ffff;]Virendra prefers TEA! ☕]');
        },
        motivate: function() {
            var quotes = [
                'Keep calm and run kubectl get pods',
                'There is no cloud, it\'s just someone else\'s computer',
                'Automate everything!',
                'Docker: Making "it works on my machine" obsolete',
                'Debugging: Being a detective in a crime where you\'re also the murderer'
            ];
            this.echo('[[;#00ff00;]💪 ' + quotes[Math.floor(Math.random() * quotes.length)] + ']');
        },
        matrix: function() {
            var term = this;
            term.clear();
            term.echo('[[;#00ff41;]Entering the DevOps Matrix... Press any key to exit.]');

            var termEl = document.querySelector('#terminal-window .window-content') || document.querySelector('.interactive-terminal');
            if (!termEl) return;

            var matrixCanvas = document.createElement('canvas');
            matrixCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:999;';
            matrixCanvas.width = termEl.offsetWidth;
            matrixCanvas.height = termEl.offsetHeight;
            termEl.style.position = 'relative';
            termEl.appendChild(matrixCanvas);

            var mctx = matrixCanvas.getContext('2d');
            var chars = 'kubectl terraform docker helm argocd ansible keda databricks jfrog wiz sonarqube dbt redis vault flux istio ⎈☁🐳🔧📦🔒🚀📊░▒▓'.split('');
            var fontSize = 14;
            var columns = Math.floor(matrixCanvas.width / fontSize);
            var drops = new Array(columns).fill(1);
            var hues = new Array(columns).fill(0).map(function() { return Math.floor(Math.random() * 360); });

            var matrixRunning = true;

            function drawMatrix() {
                if (!matrixRunning) return;
                mctx.fillStyle = 'rgba(26, 27, 38, 0.06)';
                mctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);

                mctx.font = fontSize + 'px JetBrains Mono, monospace';

                for (var i = 0; i < drops.length; i++) {
                    var char = chars[Math.floor(Math.random() * chars.length)];
                    var brightness = Math.random() > 0.95 ? '100%' : '60%';
                    mctx.fillStyle = 'hsl(' + hues[i] + ', 80%, ' + brightness + ')';
                    mctx.fillText(char, i * fontSize, drops[i] * fontSize);

                    if (drops[i] * fontSize > matrixCanvas.height && Math.random() > 0.97) {
                        drops[i] = 0;
                        hues[i] = Math.floor(Math.random() * 360);
                    }
                    drops[i]++;
                }
                requestAnimationFrame(drawMatrix);
            }
            drawMatrix();

            var stopMatrix = function() {
                matrixRunning = false;
                matrixCanvas.remove();
                term.echo('[[;#ffd700;]⚡ Unplugged from the Matrix. Welcome back, operator.]');
                document.removeEventListener('keydown', stopMatrix);
            };
            setTimeout(function() { document.addEventListener('keydown', stopMatrix); }, 500);
        },
        joke: function() {
            var term = this;
            fetch('https://v2.jokeapi.dev/joke/Programming')
                .then(function(res) { return res.json(); })
                .then(function(data) {
                    if (data.type === 'twopart') {
                        term.echo('[[;#00ffff;]Q:] ' + data.setup);
                        term.echo('[[;#00ff00;]A:] ' + data.delivery);
                    } else {
                        term.echo('[[;#ffff00;]' + data.joke + ']');
                    }
                })
                .catch(function() {
                    term.error('[[;#ff0000;]Failed to fetch joke]');
                });
        },
        neofetch: function() {
            var art = [
                '       ___           ',
                '      /   \\          ',
                '     | ( ) |         ',
                '      \\___/          ',
                '     /|   |\\         ',
                '    / |   | \\        ',
                '   |  |   |  |       ',
                '   |__|   |__|       ',
                '                     ',
                '   virnahar          '
            ];
            var info = [
                '[[;#7dd3fc;]virnahar@devos]',
                '[[;#fca5a5;]─────────────────]',
                '[[;#fca5a5;]OS:]  [[;#86efac;]DevOS 2.0 (macOS-style)]',
                '[[;#fca5a5;]Host:]  [[;#86efac;]McKinsey & Company]',
                '[[;#fca5a5;]Kernel:]  [[;#86efac;]12+ years of DevOps]',
                '[[;#fca5a5;]Uptime:]  [[;#86efac;]Since April 2013]',
                '[[;#fca5a5;]Shell:]  [[;#86efac;]bash/python/go]',
                '[[;#fca5a5;]Resolution:]  [[;#86efac;]Multi-Cloud]',
                '[[;#fca5a5;]DE:]  [[;#86efac;]Platform Engineering]',
                '[[;#fca5a5;]WM:]  [[;#86efac;]Kubernetes (AKS)]',
                '[[;#fca5a5;]Theme:]  [[;#86efac;]Infrastructure as Code]',
                '[[;#fca5a5;]Icons:]  [[;#86efac;]☁️ Azure | 🐳 Docker | ⎈ K8s]',
                '[[;#fca5a5;]Terminal:]  [[;#86efac;]JetBrains Mono]',
                '[[;#fca5a5;]CPU:]  [[;#86efac;]Terraform @ 98% efficiency]',
                '[[;#fca5a5;]GPU:]  [[;#86efac;]ArgoCD + Helm rendering]',
                '[[;#fca5a5;]Memory:]  [[;#86efac;]14+ Certifications loaded]',
                '[[;#fca5a5;]Disk:]  [[;#86efac;]$100K+ cloud savings/year]'
            ];
            var pad = '                     ';
            for (var i = 0; i < info.length; i++) {
                var left = i < art.length ? art[i] : pad;
                this.echo('[[;#93c5fd;]' + left + '] ' + info[i]);
            }
        },
        typingtest: function() {
            var phrases = [
                'kubectl get pods -n production',
                'terraform plan -var-file=prod.tfvars',
                'docker build -t app:latest .',
                'helm upgrade --install myapp ./chart',
                'git push origin main --force-with-lease',
                'ansible-playbook deploy.yml -i inventory',
                'aws s3 sync ./dist s3://bucket-name',
                'az aks get-credentials --resource-group rg --name aks',
                'grep -r "error" /var/log/syslog | tail -20',
                'curl -s https://api.github.com/users/virnahar'
            ];
            var phrase = phrases[Math.floor(Math.random() * phrases.length)];
            var term = this;
            this.echo('[[;#ffff00;]DevOps typing test — type the line exactly, then Enter:]');
            this.echo('[[;#00ffff;]' + phrase + ']');
            var start = Date.now();
            term.read('> ', function(line) {
                var elapsedMin = (Date.now() - start) / 60000;
                var wordCount = phrase.trim().split(/\s+/).filter(Boolean).length;
                var wpm = elapsedMin > 0 ? Math.round(wordCount / elapsedMin) : 0;
                var exact = line === phrase;
                term.echo('[[;#ff6b6b;]Time:] [[;#98c379;]' + ((Date.now() - start) / 1000).toFixed(2) + 's]  [[;#ff6b6b;]WPM:] [[;#98c379;]' + wpm + ']  [[;#ff6b6b;]Exact match:] [[;#98c379;]' + (exact ? 'yes' : 'no') + ']');
                if (!exact) {
                    term.echo('[[;#ff0000;]Not quite — whitespace and characters must match the prompt exactly.]');
                }
                var msg;
                if (exact && wpm > 80) msg = '[[;#00ff00;]You\'re a DevOps speed demon!]';
                else if (exact && wpm > 50) msg = '[[;#00ff00;]Solid pipeline velocity — ship it!]';
                else if (exact && wpm > 30) msg = '[[;#ffff00;]Green build — a bit more coffee and you\'ll max those replicas.]';
                else if (exact) msg = '[[;#00ffff;]Accurate! Speed comes with practice — keep kubectl\'ing.]';
                else msg = '[[;#ff00ff;]Accuracy first: match the command, then chase the leaderboard.]';
                term.echo(msg);
            });
        },
        tictactoe: function() {
            var term = this;
            term.clear();
            var board = [null, null, null, null, null, null, null, null, null];

            function renderBoard() {
                var rows = [];
                for (var r = 0; r < 3; r++) {
                    var cells = [];
                    for (var c = 0; c < 3; c++) {
                        var i = r * 3 + c;
                        cells.push(board[i] || String(i + 1));
                    }
                    rows.push(cells.join(' | '));
                }
                term.echo(rows.join('\n'));
            }

            function finish(msg) {
                term.echo(msg);
                term.pop();
            }

            term.echo('[[;#00ff00;]Tic-tac-toe:] You are [[;#00ffff;]X], AI is [[;#ff6b6b;]O]. Enter [[;#ffff00;]1–9] to move, [[;#ffff00;]quit] or [[;#ffff00;]exit] to stop.');
            renderBoard();

            term.push(function(cmd) {
                var line = (cmd || '').trim();
                if (line === 'quit' || line === 'exit') {
                    finish('[[;#ffff00;]Game exited.]');
                    return;
                }
                var n = parseInt(line, 10);
                if (isNaN(n) || n < 1 || n > 9) {
                    term.error('Enter 1–9, quit, or exit.');
                    return;
                }
                var idx = n - 1;
                if (board[idx]) {
                    term.error('That square is taken.');
                    return;
                }
                board[idx] = 'X';
                var w = tttCheckWinner(board);
                if (w === 'X') {
                    renderBoard();
                    finish('[[;#00ff00;]You win! 🎉]');
                    return;
                }
                if (w === 'draw') {
                    finish('[[;#ffff00;]Draw — unbeatable... for now.]');
                    return;
                }
                var ai = tttBestMove(board);
                if (ai >= 0) board[ai] = 'O';
                w = tttCheckWinner(board);
                term.echo('[[;#ff6b6b;]AI played:]');
                renderBoard();
                if (w === 'O') {
                    finish('[[;#ff6b6b;]AI wins — minimax doesn\'t negotiate.]');
                    return;
                }
                if (w === 'draw') {
                    finish('[[;#ffff00;]Draw.]');
                    return;
                }
                term.echo('[[;#00ffff;]Your move (1–9):]');
            }, { prompt: 'ttt> ' });
        },
        kubegame: function() {
            var term = this;
            term.clear();
            var kubeScenarios = [
                {
                    alert: 'pod/api-server-7b4f is CrashLoopBackOff',
                    options: ['kubectl logs api-server-7b4f', 'kubectl delete pod api-server-7b4f', 'kubectl scale deployment api-server --replicas=0'],
                    best: 0, ok: 1, bad: 2,
                    explain: 'Check logs first to understand the root cause!'
                },
                {
                    alert: 'pod/worker-node-2 is OOMKilled',
                    options: ['Increase memory limits in deployment', 'Restart the node', 'Ignore it'],
                    best: 0, ok: 1, bad: 2,
                    explain: 'OOMKilled means the container exceeded its memory limit.'
                },
                {
                    alert: 'pod/frontend-app is ImagePullBackOff',
                    options: ['Check image name and registry credentials', 'Delete the deployment', 'Restart kubelet'],
                    best: 0, ok: 2, bad: 1,
                    explain: 'ImagePullBackOff usually means wrong image tag or missing pull secret.'
                },
                {
                    alert: 'pod/database-0 is Pending (no nodes available)',
                    options: ['Check node resources and scale node pool', 'Force schedule with nodeSelector', 'Delete other pods to make room'],
                    best: 0, ok: 1, bad: 2,
                    explain: 'Pending means no node has enough resources. Scale the cluster!'
                },
                {
                    alert: 'pod/cache-redis is Evicted',
                    options: ['Check disk pressure and clean up', 'Recreate the pod', 'Increase PVC size'],
                    best: 0, ok: 1, bad: 2,
                    explain: 'Eviction is usually caused by disk pressure or resource limits.'
                }
            ];
            function shuffle(arr) {
                var a = arr.slice();
                for (var i = a.length - 1; i > 0; i--) {
                    var j = Math.floor(Math.random() * (i + 1));
                    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
                }
                return a;
            }
            var rounds = shuffle(kubeScenarios);
            var score = 0;
            var lives = 3;
            var roundIndex = 0;

            function printScenario() {
                var s = rounds[roundIndex];
                term.echo('[[;#ff6b6b;]⚠️ ALERT:] [[;#ffff00;]' + s.alert + ']');
                term.echo('[[;#00ffff;]What do you do?]');
                s.options.forEach(function(opt, i) {
                    term.echo('[[;#98c379;]' + (i + 1) + ')] ' + opt);
                });
            }

            function endGame() {
                term.echo('');
                term.echo('[[;#00ff00;]Final score:] [[;#ffff00;]' + score + ']');
                if (lives <= 0) {
                    term.echo('[[;#ff0000;]SLA breached — you ran out of lives. Get some sleep before the next pager!]');
                } else if (score >= 45) {
                    term.echo('[[;#00ff00;]🏆 SRE legend — 99.9% in your veins!]');
                } else if (score >= 30) {
                    term.echo('[[;#ffff00;]Solid on-call — ship it!]');
                } else {
                    term.echo('[[;#00ffff;]Keep practicing kubectl — the cluster will test you again.]');
                }
                term.pop();
            }

            term.echo('[[;#00ff00;]🎮 KUBERNETES CHAOS GAME]');
            term.echo('[[;#ffffff;]========================]');
            term.echo('[[;#00ffff;]You\'re the on-call SRE. Pods are crashing!]');
            term.echo('[[;#00ffff;]Fix them before the SLA breaches.]');
            term.echo('');
            term.echo('[[;#98c379;]Score:] ' + score + ' [[;#ff6b6b;]| Lives:] ' + lives + ' [[;#ffff00;]| SLA:] 99.9%');
            term.echo('');
            printScenario();

            term.push(function(cmd) {
                var line = (cmd || '').trim().toLowerCase();
                if (line === 'quit' || line === 'exit') {
                    term.echo('[[;#ffff00;]Game exited.]');
                    term.pop();
                    return;
                }
                var num = parseInt(line, 10);
                if (isNaN(num) || num < 1 || num > 3) {
                    term.error('Enter 1, 2, 3, quit, or exit.');
                    return;
                }
                var choiceIdx = num - 1;
                var s = rounds[roundIndex];
                if (choiceIdx === s.best) {
                    score += 10;
                    term.echo('[[;#00ff00;]+10 Best move!]');
                } else if (choiceIdx === s.ok) {
                    score += 5;
                    term.echo('[[;#ffff00;]+5 OK — not ideal.]');
                } else if (choiceIdx === s.bad) {
                    lives -= 1;
                    term.echo('[[;#ff0000;]Bad call — -1 life]');
                }
                term.echo('[[;#98c379;]' + s.explain + ']');
                term.echo('');
                roundIndex++;
                if (lives <= 0) {
                    endGame();
                    return;
                }
                if (roundIndex >= 5) {
                    endGame();
                    return;
                }
                term.echo('[[;#98c379;]Score:] ' + score + ' [[;#ff6b6b;]| Lives:] ' + lives + ' [[;#ffff00;]| SLA:] 99.9%');
                term.echo('');
                printScenario();
            }, { prompt: 'kube> ' });
        },

        // ===== V2 NEW COMMANDS =====

        resume: function() {
            this.echo('');
            this.echo('[[;#00ffff;]╔══════════════════════════════════════════════╗]');
            this.echo('[[;#00ffff;]║]  [[;#ffffff;]VIRENDRA KUMAR — RÉSUMÉ]                   [[;#00ffff;]║]');
            this.echo('[[;#00ffff;]╚══════════════════════════════════════════════╝]');
            this.echo('');
            this.echo('[[;#fca5a5;]Title:]     [[;#86efac;]Senior Cloud DevOps Engineer II]');
            this.echo('[[;#fca5a5;]Company:]   [[;#86efac;]McKinsey & Company]');
            this.echo('[[;#fca5a5;]Years:]     [[;#86efac;]12+ years in IT / DevOps]');
            this.echo('[[;#fca5a5;]Location:]  [[;#86efac;]India]');
            this.echo('');
            this.echo('[[;#ffff00;]Key Skills:]');
            this.echo('  Azure (30+ services) · Kubernetes/AKS · Terraform · Helm · ArgoCD');
            this.echo('  GitHub Actions · Azure DevOps · GitLab CI · Databricks · Docker');
            this.echo('  Dynatrace · SonarQube · JFrog · Bash · Python · Go');
            this.echo('');
            this.echo('[[;#ffff00;]Highlights:]');
            this.echo('  • $100K+ annual cloud savings at McKinsey');
            this.echo('  • 75% faster deployments via CI/CD optimization');
            this.echo('  • SOC2 compliance');
            this.echo('  • 14+ industry certifications (Azure, Terraform, RHCSA, Databricks…)');
            this.echo('  • DevSecOps pipelines for 70+ applications at Mercer');
            this.echo('');
            this.echo('[[;#00ffff;]Type] [[;#ffff00;]experience] [[;#00ffff;]or] [[;#ffff00;]certifications] [[;#00ffff;]for more detail.]');
        },
        contact: function() {
            this.echo('');
            this.echo('[[;#ffffff;]📬 Contact Virendra Kumar]');
            this.echo('[[;#fca5a5;]─────────────────────────]');
            this.echo('[[;#86efac;]GitHub:]    https://github.com/virnahar');
            this.echo('[[;#86efac;]LinkedIn:]  https://linkedin.com/in/virnahar');
            this.echo('[[;#86efac;]Website:]   You\'re looking at it! 😎');
            this.echo('');
        },
        github: function() {
            this.echo('[[;#00ff00;]Opening GitHub → github.com/virnahar]');
            window.open('https://github.com/virnahar', '_blank');
        },
        linkedin: function() {
            this.echo('[[;#00ff00;]Opening LinkedIn → linkedin.com/in/virnahar]');
            window.open('https://linkedin.com/in/virnahar', '_blank');
        },
        date: function() {
            var now = new Date();
            this.echo('[[;#00ffff;]' + now.toLocaleString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
            }) + ']');
        },
        uptime: function() {
            var diff = Date.now() - _devosPageLoadTime;
            var secs = Math.floor(diff / 1000);
            var mins = Math.floor(secs / 60);
            var hrs  = Math.floor(mins / 60);
            secs %= 60;
            mins %= 60;
            var parts = [];
            if (hrs > 0) parts.push(hrs + 'h');
            if (mins > 0) parts.push(mins + 'm');
            parts.push(secs + 's');
            this.echo('[[;#00ffff;]DevOS uptime:] [[;#86efac;]' + parts.join(' ') + ']');
        },
        fortune: function() {
            var f = _fortunes[Math.floor(Math.random() * _fortunes.length)];
            this.echo('');
            this.echo('[[;#ffff00;]🔮 DevOps Fortune:]');
            this.echo('[[;#86efac;]  "' + f + '"]');
            this.echo('');
        },
        cowsay: function() {
            var args = Array.prototype.slice.call(arguments);
            var message = args.join(' ').trim();
            if (!message) message = 'Moo! Try: cowsay Hello World';
            var top    = ' ' + new Array(message.length + 3).join('_');
            var bottom = ' ' + new Array(message.length + 3).join('-');
            this.echo('[[;#86efac;]' + top + ']');
            this.echo('[[;#86efac;]< ' + message + ' >]');
            this.echo('[[;#86efac;]' + bottom + ']');
            this.echo('[[;#86efac;]        \\   ^__^]');
            this.echo('[[;#86efac;]         \\  (oo)\\_______]');
            this.echo('[[;#86efac;]            (__)\\       )\\/\\]');
            this.echo('[[;#86efac;]                ||----w |]');
            this.echo('[[;#86efac;]                ||     ||]');
        },
        sl: function() {
            var term = this;
            var frames = [
                [
                    '      ====        ________                ___________',
                    '  _D _|  |_______/        \\__I_I_____===__|_________|',
                    '   |(_)---  |   H\\________/ |   |        =|___ ___|',
                    '   /     |  |   H  |  |     |   |         ||_| |_||',
                    '  |      |  |   H  |__--------------------| [___] |',
                    '  | ________|___H__/__|_____/[][]~\\_______|       |',
                    '  |/ |   |-----------I_____I [][] []  D   |=======|__',
                    '  __/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__',
                    ' |/-=|___|=    ||    ||    ||    |_____/~\\___/        ',
                    '  \\_/      \\O=====O=====O=====O_/      \\_/           '
                ],
                [
                    '        ====        ________                ___________',
                    '    _D _|  |_______/        \\__I_I_____===__|_________|',
                    '     |(_)---  |   H\\________/ |   |        =|___ ___|',
                    '     /     |  |   H  |  |     |   |         ||_| |_||',
                    '    |      |  |   H  |__--------------------| [___] |',
                    '    | ________|___H__/__|_____/[][]~\\_______|       |',
                    '    |/ |   |-----------I_____I [][] []  D   |=======|__',
                    '    __/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__',
                    '   |/-=|___|=    ||    ||    ||    |_____/~\\___/        ',
                    '    \\_/      \\O=====O=====O=====O_/      \\_/           '
                ]
            ];
            var i = 0;
            var total = 6;
            function showFrame() {
                if (i >= total) {
                    term.echo('[[;#ffff00;]🚂 Choo choo! The DevOps express has arrived.]');
                    return;
                }
                var f = frames[i % 2];
                f.forEach(function(line) {
                    term.echo('[[;#93c5fd;]' + line + ']');
                });
                term.echo('');
                i++;
                setTimeout(showFrame, 350);
            }
            showFrame();
        },

        // --- Linux Basics ---
        top: function() {
            var term = this;
            var procs = [
                { pid: '1', user: 'root', cpu: '0.1', mem: '0.3', cmd: 'systemd' },
                { pid: '42', user: 'vir', cpu: '12.4', mem: '8.2', cmd: 'kubectl proxy' },
                { pid: '128', user: 'vir', cpu: '8.7', mem: '15.1', cmd: 'terraform plan' },
                { pid: '256', user: 'docker', cpu: '6.3', mem: '12.4', cmd: 'dockerd' },
                { pid: '314', user: 'vir', cpu: '4.2', mem: '3.8', cmd: 'node devos-server' },
                { pid: '512', user: 'vir', cpu: '3.1', mem: '5.6', cmd: 'helm upgrade --install' },
                { pid: '666', user: 'vir', cpu: '2.8', mem: '4.2', cmd: 'argocd app sync' },
                { pid: '789', user: 'vir', cpu: '1.5', mem: '2.1', cmd: 'dynatrace-agent' },
                { pid: '1024', user: 'redis', cpu: '0.9', mem: '1.8', cmd: 'redis-server *:6379' },
                { pid: '2048', user: 'vir', cpu: '0.4', mem: '0.7', cmd: 'sonarqube-scanner' }
            ];
            var running = true;
            var timer = null;
            function render() {
                if (!running) return;
                term.clear();
                var now = new Date();
                var cpuTotal = (35 + Math.random() * 15).toFixed(1);
                var memUsed = (5500 + Math.random() * 800).toFixed(0);
                term.echo('[[;#00ff00;]top - ' + now.toLocaleTimeString() + ' up ' + Math.floor((Date.now() - _devosPageLoadTime) / 60000) + ' min,  1 user,  load average: ' + (Math.random() * 0.3 + 0.3).toFixed(2) + ', ' + (Math.random() * 0.2 + 0.3).toFixed(2) + ', ' + (Math.random() * 0.15 + 0.3).toFixed(2) + ']');
                term.echo('[[;#00ff00;]Tasks:] [[;#fff;]10 total,] [[;#00ff00;]10 running,] [[;#fff;]0 sleeping]');
                term.echo('[[;#00ff00;]%Cpu(s):] [[;#fff;]' + cpuTotal + ' us,  2.1 sy,  0.0 ni, ' + (100 - parseFloat(cpuTotal) - 2.1).toFixed(1) + ' id,  0.3 wa]');
                term.echo('[[;#00ff00;]MiB Mem:] [[;#fff;]16384.0 total,  ' + (16384 - parseInt(memUsed)).toFixed(0) + '.0 free,  ' + memUsed + '.0 used,  2120.0 buff/cache]');
                term.echo('');
                term.echo('[[;#00ffff;]  PID USER      %CPU  %MEM  COMMAND]');
                procs.sort(function(a, b) { return parseFloat(b.cpu) - parseFloat(a.cpu); });
                procs.forEach(function(p) {
                    p.cpu = Math.max(0.1, parseFloat(p.cpu) + (Math.random() - 0.5) * 3).toFixed(1);
                    p.mem = Math.max(0.1, parseFloat(p.mem) + (Math.random() - 0.5) * 0.5).toFixed(1);
                    var cpuColor = parseFloat(p.cpu) > 8 ? '#ff6b6b' : parseFloat(p.cpu) > 4 ? '#ffff00' : '#fff';
                    term.echo('  ' + p.pid.padStart(5) + ' ' + p.user.padEnd(10) + '[[;' + cpuColor + ';]' + p.cpu.padStart(5) + ']' + p.mem.padStart(6) + '  ' + p.cmd);
                });
                term.echo('');
                term.echo('[[;#444;]Press [[;#ffff00;]Esc] or [[;#ffff00;]q] to exit — refreshing every 2s]');
                _scrollTerminal();
                timer = setTimeout(render, 2000);
            }
            function stopTop(e) {
                if (e.key === 'Escape' || e.key === 'q') {
                    running = false;
                    if (timer) clearTimeout(timer);
                    document.removeEventListener('keydown', stopTop);
                    term.echo('');
                    term.echo('[[;#00ff00;]top exited.]');
                }
            }
            document.addEventListener('keydown', stopTop);
            render();
        },
        htop: function() { this.exec('top'); },
ps: function() {
    _animateLines(this, [
        '[[;#00ffff;]  PID TTY          TIME CMD]',
        '    1 pts/0    00:00:02 bash',
        '   42 pts/0    00:12:34 kubectl',
        '  128 pts/0    00:08:45 terraform',
        '  256 pts/0    00:06:12 dockerd',
        '  314 pts/0    00:04:23 node',
        '  512 pts/0    00:03:11 helm',
        '  666 pts/0    00:02:48 argocd',
        '  789 pts/0    00:01:33 dynatrace',
        ' 1024 pts/0    00:00:55 redis-server',
        ' 9999 pts/0    00:00:00 ps'
    ], 50);
},
        cat: function(file) {
            var files = {
                'resume.txt': '[[;#ffffff;]Virendra Kumar]\n[[;#00ffff;]Senior Cloud DevOps Engineer II @ McKinsey & Company]\n12+ years | Azure, Kubernetes, Terraform, CI/CD\n\nKey: 75% faster deploys, $100K+ savings, 14+ certs\nLinks: github.com/virnahar | linkedin.com/in/virnahar',
                'skills.txt': '[[;#00ff00;]Cloud:] Azure (30+), AWS\n[[;#00ff00;]Containers:] Kubernetes, Docker, Helm, ArgoCD\n[[;#00ff00;]IaC:] Terraform, Ansible\n[[;#00ff00;]CI/CD:] GitHub Actions, Azure DevOps, GitLab CI\n[[;#00ff00;]Data:] Databricks, PostgreSQL, Redis\n[[;#00ff00;]Languages:] Bash, Python, Go, JavaScript',
                'todo.txt': '[[;#ffff00;]TODO:]\n[x] Build awesome portfolio\n[x] Add 30+ terminal commands\n[x] Impress visitors\n[ ] Take over the world\n[ ] Get 8 hours of sleep',
                '.bashrc': 'export PS1="\\u@devos:\\w$ "\nexport EDITOR=vim\nexport KUBECONFIG=~/.kube/config\nalias k="kubectl"\nalias tf="terraform"\nalias g="git"\nalias d="docker"\n\n# If you\'re reading this, you\'re a real one 🤝',
                '.env': '[[;#ff0000;]ERROR: Access denied. Nice try! 🔒]\n\nYour attempt has been logged and reported to... nobody.\nThis is a portfolio, not a real server. 😄'
            };
            if (!file) { this.echo('Usage: cat <filename>\n[[;#888;]Available: ' + Object.keys(files).join(', ') + ']'); return; }
            if (files[file]) { this.echo(files[file]); }
            else { this.error('cat: ' + file + ': No such file or directory'); }
        },
        'find': function(path, flag, pattern) {
            var term = this;
            if (!path) { this.echo('Usage: find <path> -name <pattern>'); return; }
            var results = ['/home/vir/skills/azure.skill', '/home/vir/skills/kubernetes.skill', '/home/vir/skills/terraform.skill', '/home/vir/skills/docker.skill', '/home/vir/skills/python.skill', '/home/vir/skills/github-actions.skill', '/home/vir/skills/helm.skill', '/home/vir/skills/argocd.skill', '/home/vir/certs/az-400.cert', '/home/vir/certs/terraform-associate.cert', '/home/vir/certs/rhcsa.cert', '/home/vir/certs/databricks-architect.cert', '/home/vir/projects/devos-portfolio/', '/home/vir/projects/terraform-modules/', '/home/vir/projects/ai-chat/'];
            var i = 0;
            function showNext() {
                if (i < results.length) {
                    term.echo('[[;#00ffff;]' + results[i] + ']');
                    i++;
                    setTimeout(showNext, 80);
                } else {
                    term.echo('\n[[;#888;]' + results.length + ' results found]');
                }
            }
            showNext();
        },
        'grep': function(pattern) {
            if (!pattern) { this.echo('Usage: grep <pattern> [file]'); return; }
            var matches = [
                { file: 'resume.txt', line: 'Senior Cloud [[;#ff0000;]DevOps] Engineer with 12+ years' },
                { file: 'about.md', line: 'Transforming challenges into [[;#ff0000;]opportunities]' },
                { file: 'skills.yml', line: '  cloud: Azure, AWS, [[;#ff0000;]Kubernetes]' },
                { file: '.bashrc', line: 'alias k="[[;#ff0000;]kubectl]"' },
                { file: 'career.log', line: 'McKinsey → Accenture → Mercer → Clavax → [[;#ff0000;]Aannya]' }
            ];
            var self = this;
            matches.forEach(function(m) {
                self.echo('[[;#ff00ff;]' + m.file + ':] ' + m.line);
            });
        },
        uname: function() { this.echo('DevOS 2.0.0 vir-macbook arm64 Virendra\'s Portfolio Kernel v2'); },
        hostname: function() { this.echo('devos.virnahar.github.io'); },
        pwd: function() { this.echo(cwd === root ? '/home/vir' : '/home/vir/' + cwd.replace('~/', '')); },
        echo: function() { this.echo(Array.from(arguments).join(' ')); },
        history: function() {
            var hist = this.history().data();
            var last = hist.slice(-15);
            var self = this;
            last.forEach(function(cmd, i) {
                self.echo('  ' + String(hist.length - last.length + i + 1).padStart(4) + '  ' + cmd);
            });
        },
df: function() {
    _animateLines(this, [
        '[[;#00ffff;]Filesystem      Size  Used Avail Use% Mounted on]',
        '/dev/skills      ∞    98%   ∞    [[;#00ff00;]98%] /skills',
        '/dev/experience  12Y  12Y   ∞    [[;#00ff00;] - ] /experience',
        '/dev/certs       14+  14+   ∞    [[;#00ff00;] - ] /certifications',
        '/dev/projects    10   10    ∞    [[;#ffff00;] - ] /projects',
        '/dev/ideas       ∞    42%   ∞    [[;#ffff00;]42%] /ideas',
        '/dev/coffee      ∞    99%   1%   [[;#ff0000;]99%] /energy  ⚠️  CRITICAL'
    ], 60);
},
        free: function() {
            this.echo('[[;#00ffff;]              total     used     free   shared  buff/cache]');
            this.echo('Mem:       16384Mi   5842Mi   8421Mi    512Mi   2120Mi');
            this.echo('Swap:       8192Mi      0Mi   8192Mi');
            this.echo('');
            this.echo('[[;#888;]Certifications:  14+ loaded]');
            this.echo('[[;#888;]Ideas:           unlimited]');
            this.echo('[[;#888;]Coffee buffer:   nearly full]');
        },
        ifconfig: function() {
            this.echo('[[;#00ff00;]eth0:] flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500');
            this.echo('        inet [[;#ffff00;]10.0.42.1]  netmask 255.255.255.0  broadcast 10.0.42.255');
            this.echo('        inet6 fe80::1  prefixlen 64  scopeid 0x20<link>');
            this.echo('        ether de:v0:ps:vi:r1:00  txqueuelen 1000');
            this.echo('        RX packets 12345678  bytes 1.2 GiB');
            this.echo('        TX packets 87654321  bytes 4.2 GiB');
            this.echo('');
            this.echo('[[;#00ff00;]docker0:] flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500');
            this.echo('        inet [[;#ffff00;]172.17.0.1]  netmask 255.255.0.0');
        },
        ping: function(host) {
            var term = this;
            host = host || 'virnahar.github.io';
            term.echo('PING ' + host + ' (185.199.108.153): 56 data bytes');
            var count = 0;
            function doPing() {
                if (count >= 5) {
                    term.echo('\n--- ' + host + ' ping statistics ---');
                    term.echo('5 packets transmitted, 5 received, 0% packet loss');
                    term.echo('rtt min/avg/max = 2.1/4.8/8.3 ms');
                    return;
                }
                var ms = (2 + Math.random() * 8).toFixed(1);
                term.echo('64 bytes from ' + host + ': icmp_seq=' + count + ' ttl=57 time=[[;#00ff00;]' + ms + ' ms]');
                count++;
                setTimeout(doPing, 800);
            }
            doPing();
        },
        curl: function(url) {
            if (!url) { this.echo('Usage: curl <url>'); return; }
            if (url.includes('virnahar')) {
                this.echo('[[;#00ff00;]<!DOCTYPE html>]');
                this.echo('[[;#00ffff;]<title>]Virendra Kumar — DevOS[[;#00ffff;]</title>]');
                this.echo('[[;#888;]<!-- Sr. Cloud DevOps Engineer II @ McKinsey -->]');
                this.echo('[[;#888;]<!-- 12+ years | Azure | K8s | Terraform -->]');
                this.echo('[[;#888;]<!-- Built with ❤️ and way too much CSS -->]');
            } else {
                this.echo('[[;#888;]HTTP/1.1 200 OK]\n[[;#888;]Content-Type: text/html]\n\n<h1>Hello from ' + url + '</h1>');
            }
        },
        lsb_release: function() {
            this.echo('Distributor ID: DevOS');
            this.echo('Description:    Virendra\'s DevOS 2.0');
            this.echo('Release:        2.0');
            this.echo('Codename:       virendra');
        },

        // --- DevOps Commands ---
tail: function(flag, file) {
    var term = this;
    if (flag === '-f' || flag === '-F') {
        var pool = file && file.includes('nginx') ? _logPool.nginx : file && file.includes('api') ? _logPool.api : _logPool.k8s;
        _streamLogs(term, pool, 25, 250);
    } else {
        term.echo('Usage: tail -f <logfile>');
        term.echo('[[;#888;]Examples: tail -f /var/log/nginx.log | tail -f /var/log/api.log | tail -f /var/log/k8s.log]');
    }
},
docker: function(subcmd, arg2) {
    if (subcmd === 'logs') {
        var container = arg2 || 'devos-api';
        var pool = container.includes('frontend') ? _logPool.frontend : container.includes('nginx') || container.includes('proxy') ? _logPool.nginx : _logPool.api;
        this.echo('[[;#00ffff;]Streaming logs for container:] [[;#fff;]' + container + ']');
        _streamLogs(this, pool, 20, 280);
        return;
    }
    if (subcmd === 'ps') {
        _animateLines(this, [
            '[[;#00ffff;]CONTAINER ID   IMAGE                    STATUS          PORTS                    NAMES]',
            'a1b2c3d4e5f6   devos-frontend:latest    [[;#00ff00;]Up 2 hours]      0.0.0.0:3000->3000/tcp   devos-frontend',
            'f6e5d4c3b2a1   devos-api:latest         [[;#00ff00;]Up 2 hours]      0.0.0.0:8000->8000/tcp   devos-api',
            '1a2b3c4d5e6f   redis:7-alpine           [[;#00ff00;]Up 2 hours]      6379/tcp                 devos-redis',
            '6f5e4d3c2b1a   nginx:1.25-alpine        [[;#00ff00;]Up 2 hours]      0.0.0.0:443->443/tcp     devos-proxy',
            'abcdef123456   prom/prometheus:latest    [[;#00ff00;]Up 2 hours]      9090/tcp                 devos-monitor'
        ], 60);
    } else if (subcmd === 'images') {
        _animateLines(this, [
            '[[;#00ffff;]REPOSITORY               TAG       SIZE]',
            'devos-frontend           latest    142MB',
            'devos-api                latest    89MB',
            'redis                    7-alpine  28MB',
            'nginx                    1.25      42MB',
            'prom/prometheus          latest    234MB',
            'grafana/grafana          latest    367MB'
        ], 60);
    } else {
        this.echo('Usage: docker ps | docker images | docker logs <container>');
    }
},
kubectl: function(subcmd, arg2, arg3) {
    if (subcmd === 'logs') {
        var pod = arg2 || 'devos-api';
        this.echo('[[;#00ffff;]Streaming logs for pod:] [[;#fff;]' + pod + ']');
        _streamLogs(this, _logPool.k8s, 25, 300);
        return;
    }
    if (subcmd === 'get' && arg2 === 'pods') {
        _animateLines(this, [
            '[[;#00ffff;]NAME                              READY   STATUS    RESTARTS   AGE]',
            'devos-api-7b4f9d8c6-x2k9p        1/1     [[;#00ff00;]Running]   0          2h',
            'devos-frontend-5c8d7f4b2-m3n7q    1/1     [[;#00ff00;]Running]   0          2h',
            'devos-worker-6a9e3c1d8-p4r8s      1/1     [[;#00ff00;]Running]   0          45m',
            'redis-master-0                     1/1     [[;#00ff00;]Running]   0          2h',
            'prometheus-server-0                1/1     [[;#00ff00;]Running]   0          2h'
        ], 70);
    } else if (subcmd === 'get' && arg2 === 'nodes') {
        _animateLines(this, [
            '[[;#00ffff;]NAME           STATUS   ROLES    AGE   VERSION]',
            'vir-node-1     [[;#00ff00;]Ready]    master   42d   v1.28.4',
            'vir-node-2     [[;#00ff00;]Ready]    worker   42d   v1.28.4',
            'vir-node-3     [[;#00ff00;]Ready]    worker   42d   v1.28.4'
        ], 80);
    } else if (subcmd === 'get' && arg2 === 'svc') {
        _animateLines(this, [
            '[[;#00ffff;]NAME              TYPE           CLUSTER-IP     EXTERNAL-IP    PORT(S)]',
            'kubernetes        ClusterIP      10.0.0.1       <none>         443/TCP',
            'devos-api         LoadBalancer   10.0.42.10     20.42.1.100    8000:31234/TCP',
            'devos-frontend    LoadBalancer   10.0.42.11     20.42.1.101    3000:31235/TCP',
            'redis-master      ClusterIP      10.0.42.20     <none>         6379/TCP'
        ], 70);
    } else {
        this.echo('Usage: kubectl get pods | kubectl get nodes | kubectl get svc | kubectl logs <pod>');
    }
},
helm: function(subcmd) {
    if (subcmd === 'list') {
        _animateLines(this, [
            '[[;#00ffff;]NAME            NAMESPACE   REVISION  STATUS    CHART              APP VERSION]',
            'devos-api       production  12        [[;#00ff00;]deployed]  devos-api-2.1.0    2.1.0',
            'devos-frontend  production  8         [[;#00ff00;]deployed]  devos-fe-2.0.3     2.0.3',
            'redis           production  3         [[;#00ff00;]deployed]  redis-18.4.0       7.2.4',
            'prometheus      monitoring  5         [[;#00ff00;]deployed]  prometheus-25.8.0  2.48.0'
        ], 70);
    } else {
        this.echo('Usage: helm list');
    }
},
git: function(subcmd) {
    if (subcmd === 'log') {
        _animateLines(this, [
            '[[;#ffff00;]commit a1b2c3d] [[;#00ff00;](HEAD -> main, origin/main)]',
            'Author: Virendra Kumar <virnahar>',
            'Date:   today',
            '    [[;#fff;]feat: add 48 terminal commands for real shell feel]',
            '',
            '[[;#ffff00;]commit d4e5f6g]',
            '    [[;#fff;]feat: glassmorphism + macOS Ventura control center]',
            '',
            '[[;#ffff00;]commit h7i8j9k]',
            '    [[;#fff;]feat: code editor with AI chat panel + file browser]',
            '',
            '[[;#ffff00;]commit l0m1n2o]',
            '    [[;#fff;]feat: DevOS V2 — modular JS/CSS architecture]',
            '',
            '[[;#ffff00;]commit p3q4r5s]',
            '    [[;#fff;]init: DevOS V1 — 11,800 lines of pure vanilla madness]'
        ], 50);
    } else if (subcmd === 'status') {
                this.echo('On branch [[;#00ff00;]main]');
                this.echo('Your branch is up to date with \'origin/main\'.');
                this.echo('');
                this.echo('nothing to commit, working tree clean ✨');
            } else {
                this.echo('Usage: git log | git status');
            }
        },

        // --- Package Managers ---
        brew: function(subcmd, pkg) {
            var term = this;
            if (subcmd === 'install' && pkg) {
                var steps = [
                    '==> [[;#00ff00;]Downloading ' + pkg + '...]',
                    '######################################## 100.0%',
                    '==> [[;#00ffff;]Installing ' + pkg + '...]',
                    '==> [[;#00ffff;]Pouring ' + pkg + '--latest.arm64_sonoma.bottle.tar.gz...]',
                    '🍺  /opt/homebrew/Cellar/' + pkg + '/latest: 42 files, 12.3MB',
                    '[[;#00ff00;]✓ ' + pkg + ' installed successfully!]'
                ];
                var i = 0;
                function showStep() {
                    if (i < steps.length) { term.echo(steps[i]); i++; setTimeout(showStep, 400); }
                }
                showStep();
            } else if (subcmd === 'upgrade') {
                var pkgs = ['terraform 1.7.3 → 1.7.4', 'kubectl 1.28.3 → 1.28.4', 'helm 3.13.2 → 3.14.0', 'argocd 2.9.3 → 2.10.0', 'python 3.12.1 → 3.12.2'];
                term.echo('==> [[;#00ffff;]Upgrading ' + pkgs.length + ' outdated packages:]');
                var i = 0;
                function upgNext() {
                    if (i < pkgs.length) { term.echo('  [[;#00ff00;]✓] ' + pkgs[i]); i++; setTimeout(upgNext, 300); }
                    else { term.echo('\n🍺 [[;#00ff00;]All packages upgraded!]'); }
                }
                upgNext();
            } else {
                term.echo('Usage: brew install <package> | brew upgrade');
            }
        },
        pip: function(subcmd, pkg) {
            var term = this;
            if (subcmd === 'install' && pkg) {
                term.echo('Collecting ' + pkg + '...');
                setTimeout(function() { term.echo('Downloading ' + pkg + '-latest.whl (4.2 MB)'); }, 300);
                setTimeout(function() { term.echo('Installing collected packages: ' + pkg); }, 600);
                setTimeout(function() { term.echo('[[;#00ff00;]Successfully installed ' + pkg + '-latest]'); }, 900);
            } else {
                term.echo('Usage: pip install <package>');
            }
        },
        npm: function(subcmd) {
            var term = this;
            if (subcmd === 'install') {
                var steps = ['[[;#888;]npm warn deprecated some-old-pkg@1.0.0]', '[[;#888;]npm warn deprecated another-pkg@2.3.1]'];
                var i = 0;
                function npmStep() {
                    if (i < steps.length) { term.echo(steps[i]); i++; setTimeout(npmStep, 400); }
                    else {
                        term.echo('');
                        term.echo('added [[;#00ff00;]847 packages] in 6.2s');
                        term.echo('');
                        term.echo('[[;#ffff00;]147] packages are looking for funding');
                        term.echo('  run `npm fund` for details');
                    }
                }
                npmStep();
            } else {
                term.echo('Usage: npm install');
            }
        },

        // --- Easter Eggs ---
        sudo: function() {
            this.echo('[[;#ff0000;]Permission denied.] Nice try! 😄');
            this.echo('[[;#888;]This portfolio is protected by SOC2 compliance... sort of.]');
            this.echo('[[;#888;]Your attempt has been logged and reported to nobody.]');
        },
        vim: function() {
            this.echo('[[;#00ff00;]~]');
            this.echo('[[;#00ff00;]~] You\'ve entered vim.');
            this.echo('[[;#00ff00;]~]');
            this.echo('[[;#ffff00;]~] Press Escape... just kidding, you\'ll never leave 😈]');
            this.echo('[[;#00ff00;]~]');
            this.echo('[[;#888;]~] (Type any command to "escape". You\'re welcome.)]');
        },
        nano: function() {
            this.echo('[[;#ffffff;]  GNU nano 7.2          New Buffer]');
            this.echo('');
            this.echo('  Just use vim. Or better yet, VS Code. 😏');
            this.echo('');
            this.echo('[[;#000;#ffffff;]  ^X Exit  ^O Write  ^W Search]');
        },
        'exit': function() {
            this.echo('[[;#888;]Closing Terminal…]');
            if (typeof window.closeTerminalWindowFromShell === 'function') {
                window.closeTerminalWindowFromShell();
            }
        },
        'quit': function() {
            this.echo('[[;#888;]Closing Terminal…]');
            if (typeof window.closeTerminalWindowFromShell === 'function') {
                window.closeTerminalWindowFromShell();
            }
        },
        rm: function() {
            this.echo('[[;#ff0000;]rm: refusing to remove \'/\' — nice try!] 🛡️');
            this.echo('[[;#888;]DevOS is immutable infrastructure. Everything is cattle, not pets.]');
        },
        'apt': function(subcmd) {
            this.echo('[[;#ffff00;]This is macOS, not Ubuntu!] 🍎');
            this.echo('[[;#888;]Try: brew install <package>]');
        },
        'yum': function() {
            this.echo('[[;#ffff00;]This is macOS, not CentOS!] 🍎');
            this.echo('[[;#888;]Try: brew install <package>]');
        },
        'man': function(cmd) {
            if (!cmd) { this.echo('What manual page do you want?\nUsage: man <command>'); return; }
            this.echo('[[;#ffffff;]' + cmd.toUpperCase() + '(1)] — DevOS Manual');
            this.echo('');
            this.echo('[[;#ffff00;]NAME]');
            this.echo('    ' + cmd + ' — a command in Virendra\'s DevOS terminal');
            this.echo('');
            this.echo('[[;#ffff00;]DESCRIPTION]');
            this.echo('    This is a portfolio terminal, not a real shell.');
            this.echo('    But we appreciate your thoroughness! 🤓');
            this.echo('');
            this.echo('[[;#ffff00;]SEE ALSO]');
            this.echo('    help(1), about(1), whoami(1)');
        }
    };

    var term = $('#interactive-terminal').terminal(commands, {
        greetings: '[[;#00ffff;]\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557\n\u2551   \uD83D\uDCBB Virendra Kumar\'s DevOS Terminal \uD83D\uDE80   \u2551\n\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D]\n\n[[;#ffff00;]Type \'help\' to see available commands]\n[[;#00ff00;]Type \'whoami\' to learn about me]\n[[;#ff00ff;]Type \'ls\' to explore directories]\n\n',
        prompt: function() {
            return '[[;#00ff00;]' + user + '@' + server + ']:[[;#5555ff;]' + cwd + ']$ ';
        },
        checkArity: false,
        completion: function(string) {
            return ['help','whoami','about','ls','cd','experience','skills','certifications','projects','education','clear','joke','kubernetes','terraform','devops','coffee','motivate','matrix','neofetch','typingtest','tictactoe','kubegame','resume','contact','github','linkedin','date','uptime','fortune','cowsay','sl','top','htop','ps','cat','find','grep','uname','hostname','pwd','echo','history','df','free','ifconfig','ping','curl','lsb_release','docker','kubectl','helm','git','brew','pip','npm','sudo','vim','nano','exit','quit','rm','apt','yum','man','tail'];
        },
        onBeforeCommand: function() {
            playClickSound();
        },
        onAfterCommand: function() {
            _scrollTerminal();
        },
        keypress: function() {
            playKeypressSound();
        }
    });

    term.on('keypress', function() {
        playKeypressSound();
    });

    // Fix mouse wheel scrolling — jQuery Terminal sometimes blocks native scroll
    setTimeout(function() {
        var termEl = document.querySelector('#interactive-terminal .terminal');
        var scroller = document.querySelector('#interactive-terminal .terminal-scroller') || termEl;
        if (scroller) {
            scroller.addEventListener('wheel', function(e) {
                scroller.scrollTop += e.deltaY;
            }, { passive: true });
        }
    }, 500);
}
