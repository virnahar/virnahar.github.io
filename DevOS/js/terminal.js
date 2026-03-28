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

    var commands = {
        help: function() {
            this.echo('[[;#ffff00;]Available commands:]');
            this.echo('  help, whoami, about, ls, cd, experience, skills, certifications, projects, education, clear, joke');
            this.echo('');
            this.echo('[[;#00ff00;]🎮 Fun commands:]');
            this.echo('  kubernetes, terraform, devops, coffee, motivate, matrix, neofetch, typingtest, tictactoe, kubegame');
            this.echo('');
            this.echo('[[;#00ffff;]🆕 V2 commands:]');
            this.echo('  resume, contact, github, linkedin, date, uptime, fortune, cowsay <msg>, sl');
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
        terraform: function() {
            this.echo('[[;#00ff00;]🏗️  Terraform Wisdom:]');
            this.echo('[[;#00ffff;]• "terraform destroy" - 2 most powerful words]');
            this.echo('[[;#ffff00;]• Infrastructure as Code = Git for servers]');
            this.echo('[[;#ff00ff;]• Plan before apply, or prepare to cry!]');
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
        }
    };

    var term = $('#interactive-terminal').terminal(commands, {
        greetings: '[[;#00ffff;]\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557\n\u2551   \uD83D\uDCBB Virendra Kumar\'s DevOS Terminal \uD83D\uDE80   \u2551\n\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D]\n\n[[;#ffff00;]Type \'help\' to see available commands]\n[[;#00ff00;]Type \'whoami\' to learn about me]\n[[;#ff00ff;]Type \'ls\' to explore directories]\n\n',
        prompt: function() {
            return '[[;#00ff00;]' + user + '@' + server + ']:[[;#5555ff;]' + cwd + ']$ ';
        },
        checkArity: false,
        completion: function(string) {
            return Object.keys(commands);
        },
        onBeforeCommand: function() {
            playClickSound();
        },
        keypress: function() {
            playKeypressSound();
        }
    });

    term.on('keypress', function() {
        playKeypressSound();
    });
}
