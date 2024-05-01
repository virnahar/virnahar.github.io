"use strict";
const font = 'Small';

figlet.defaults({ fontPath: 'https://unpkg.com/figlet/fonts/' });
figlet.preloadFonts([font], ready);
// JS for interactive keyboard fun...
const $key = (key) => (document.querySelector(`kbd[data-key='${key}'], kbd[data-alt='${key}']`));
const codeToElement = {
    'CapsLock': $key('caps'),
    'Space': $key('space'),
    'Backslash': document.getElementById('backslash'),
    'Quote': document.getElementById('quote'),
    'ShiftLeft': $key('lshift'),
    'ShiftRight': $key('rshift'),
    'ControlLeft': $key('lctrl'),
    'ControlRight': $key('rctrl'),
    'AltLeft': $key('lalt'),
    'AltRight': $key('ralt'),
    'MetaLeft': $key('lwin'),
    'MetaRight': $key('rwin'),
};
window.addEventListener('keydown', (e) => {
    const el = codeToElement[e.code] || $key(e.key.toLowerCase());
    if (el) {
        el.classList.add('pressed');
        //e.preventDefault();
    }
});
window.addEventListener('keyup', (e) => {
    const el = codeToElement[e.code] || $key(e.key.toLowerCase());
    if (el) {
        el.classList.remove('pressed');
        //e.preventDefault();
    }
});



const formatter = new Intl.ListFormat('en', {
  style: 'long',
  type: 'conjunction',
});

const directories = {
    education: [
        '',
        '<white>education</white>',

        '* Jai Narain Vyas University, Jodhpur <yellow>"Computer Science"</yellow> 2009-2012',
        ''
    ],
    experience: [
        '',
        '<white>Experience</white>',
        '* McKinsey',
        '* Accenture',
        '* Mercer',
        '* Clavax',
        '* Aannya',
        ''
    ],
    certificates: [
        '',
        '<white>Certifications</white>',
        [
            
            ['HashiCorp Certified: Terraform Associate (002)','https://www.credly.com/badges/08416e49-f55e-4551-85d4-13df9d04da69/linked_in_profile', 'Terraform'],
            ['Microsoft Certified: Azure Administrator Associate','https://learn.microsoft.com/en-gb/users/virnahar/credentials/bf6f8402f36e7822', 'Azure'],
            ['Microsoft Certified: DevOps Engineer Expert','https://learn.microsoft.com/en-gb/users/virnahar/credentials/45c29597434c0726', 'Azure DevOps'],
            ['AWS Certified Solutions Architect – Associate','https://www.credly.com/badges/01f63fb4-48dc-45b1-afc9-ca0fb0fd1c34', 'AWS'],

        ].map(([name, url, description = '']) => {
            return `* <a href="${url}">${name}</a> &mdash; <white>${description}</white>`;
        }),
        ''
    ].flat(),
    skills: [
        '',
        '<white>Languages</white>',

        [
            'Python',
            'SQL',
            'Bash'
        ].map(lang => `* <yellow>${lang}</yellow>`),
        '',
        '<white>Cloud</white>',
        [
            'Azure',
            'AWS',
        ].map(lib => `* <green>${lib}</green>`),
        '',
        '<white>Tools</white>',
        [
            'Docker',
            'Kubernetes',
            'Terraform',
            'Jenkins',
            'Azure DevOps',
            'GitHub',
            'GitLab',
            'Bitbucket',
            'Jira',
            'Confluence',
            'Ansible',
            'Databricks',
            'git',
            'GNU/Linux',
            'Dynatrace',
            'Splunk',
            'ELK'
        ].map(lib => `* <blue>${lib}</blue>`),
        ''
    ].flat()
};

const dirs = Object.keys(directories);

const root = '~';
let cwd = root;

const user = 'guest';
const server = 'virnahar.github.io';

function prompt() {
    return `<green>${user}@${server}</green>:<blue>${cwd}</blue>$ `;
}

function print_dirs() {
     term.echo(dirs.map(dir => {
         return `<blue class="directory">${dir}</blue>`;
     }).join('\n'));
}

const commands = {
    help() {
        term.echo(`List of available commands: ${help}`);
    },
    whoami() {
        const message = "Virendra Kumar is a seasoned DevOps Architect with a passion for driving technical evolution and fostering innovation. With humble beginnings as a System Administrator, Virendra's journey reflects a remarkable transformation from traditional system operations to cutting-edge DevOps methodologies.Throughout his career, Virendra has honed his expertise in system architecture, cloud technologies, and automation, leveraging his deep understanding of both legacy systems and modern cloud infrastructures. From carrying CPUs across office floors to architecting scalable cloud solutions, his journey embodies the adaptability and resilience required in today's ever-changing tech landscape.Currently, as a DevOps Architect, Virendra is at the forefront of revolutionizing software development practices. His work focuses on driving cost optimization, harnessing the power of AI for intelligent automation, and building high-performing teams that thrive on innovation.With a keen eye for emerging technologies and a commitment to continuous learning, Virendra remains dedicated to pushing the boundaries of what's possible in DevOps. By leveraging tools such as Kubernetes, Docker, Terraform, Jenkins, Azure DevOps, GitHub, GitLab, Bitbucket, Jira, Confluence, Ansible, AWS, Azure, and Databricks, he empowers organizations to achieve greater efficiency, scalability, and resilience in their digital transformation journey.Beyond technical expertise, Virendra is passionate about creating a culture of collaboration and excellence within his teams. He believes that great teams are the cornerstone of success, and he strives to foster an environment where creativity flourishes and individuals are empowered to reach their full potential."
        this.echo(message, {typing: true, delay: 10});
    },
    ls(dir = null) {
        if (dir) {
            if (dir.startsWith('~/')) {
                const path = dir.substring(2);
                const dirs = path.split('/');
                if (dirs.length > 1) {
                    this.error('Invalid directory');
                } else {
                    const dir = dirs[0];
                    this.echo(directories[dir].join('\n'));
                }
            } else if (cwd === root) {
                if (dir in directories) {
                    this.echo(directories[dir].join('\n'));
                } else {
                    this.error('Invalid directory');
                }
            } else if (dir === '..') {
                print_dirs();
            } else {
                this.error('Invalid directory');
            }
        } else if (cwd === root) {
           print_dirs();
        } else {
            const dir = cwd.substring(2);
            this.echo(directories[dir].join('\n'));
        }
    },
    // Mckinsey() {
    //     this.echo("Mckinsey is a leading provider of tech solutions. During my time there, I worked on several key projects and learned a lot about cloud technologies.");
    // },
    // Accenture() {
    //     this.echo("At Accenture, I had the opportunity to work with a team of highly skilled professionals. I was involved in several large-scale projects and gained valuable experience in system architecture.");
    // },
    // Mercer() {
    //     this.echo("Mercer is a tech giant and working there was a great experience. I was part of the DevOps team and worked on several innovative projects.");
    // },
    // Clavax() {
    //     this.echo("During my time at Clavax, I honed my skills in automation and cloud technologies. I was part of a team that was responsible for maintaining the company's cloud infrastructure.");
    // },
    // Aanaya() {
    //     this.echo("Aanaya is a startup with a focus on AI. I was part of the team that built the company's AI platform from the ground up.");
    // },
    async joke() {
        // we use programming jokes so it fit better developer portfolio
        const res = await fetch('https://v2.jokeapi.dev/joke/Programming');
        const data = await res.json();
        (async () => {
            if (data.type == 'twopart') {
                // we set clear the prompt to don't have any
                // flashing between animations
                const prompt = this.get_prompt();
                this.set_prompt('');
                // as said before in every function, passed directly
                // to terminal, you can use `this` object
                // to reference terminal instance
                await this.echo(`Q: ${data.setup}`, {
                    delay: 50,
                    typing: true
                });
                await this.echo(`A: ${data.delivery}`, {
                    delay: 50,
                    typing: true
                });
                // we restore the prompt
                this.set_prompt(prompt);
            } else if (data.type === 'single') {
                await this.echo(data.joke, {
                    delay: 50,
                    typing: true
                });
            }
        })();
    },
    cd(dir = null) {
        if (dir === null || (dir === '..' && cwd !== root)) {
            cwd = root;
        } else if (dir.startsWith('~/') && dirs.includes(dir.substring(2))) {
            cwd = dir;
        } else if (dirs.includes(dir)) {
            cwd = root + '/' + dir;
        } else {
            this.error('Wrong directory');
        }
    },
    echo(...args) {
        if (args.length > 0) {
            term.echo(args.join(' '));
        }
    },
    credits() {
        return [
            '',
            '<white>Used libraries:</white>',
            '* <a href="https://terminal.jcubic.pl">jQuery Terminal</a>',
            '* <a href="https://github.com/patorjk/figlet.js/">Figlet.js</a>',
            '* <a href="https://github.com/jcubic/isomorphic-lolcat">Isomorphic Lolcat</a>',
            '* <a href="https://jokeapi.dev/">Joke API</a>',
            ''
        ].join('\n');
    },
};

const command_list = Object.keys(commands);
const formatted_list = command_list.map(cmd => `<white class="command">${cmd}</white>`)
const help = formatter.format(formatted_list);

const re = new RegExp(`^\s*(${command_list.join('|')})(\s?.*)`);

$.terminal.new_formatter([re, function(_, command, args) {
    return `<white class="command">${command}</white><aquamarine>${args}</aquamarine>`;
}]);

$.terminal.xml_formatter.tags.blue = (attrs) => {
    return `[[;#55F;;${attrs.class}]`;
};
$.terminal.xml_formatter.tags.green = (attrs) => {
    return `[[;#44D544;]`;
};

const term = $('.term').terminal(commands, {
    greetings: false,
    checkArity: false,
    completion(string) {
        // in every function we can use this to reference term object
        const { name, rest } = $.terminal.parse_command(this.get_command());
        if (['cd', 'ls'].includes(name)) {
            if (rest.startsWith('~/')) {
                return dirs.map(dir => `~/${dir}`);
            }
            if (cwd === root) {
                return dirs;
            }
        }
        return Object.keys(commands);
    },
    prompt,
    onCommandNotFound: function(cmd) {
        this.echo(`[[;#F00;]Oops! The command '${cmd}' doesn't exist. But hey, nobody's perfect! \n You can say 'help' anytime for help on commands.`);
    }
});

term.pause();

term.on('click', '.command', function() {
   const command = $(this).text();
   term.exec(command, { typing: true, delay: 50 });
});

term.on('click', '.directory', function() {
    const dir = $(this).text();
    term.exec(`cd ~/${dir}`, { typing: true, delay: 50 });
});

function ready() {
    const seed = rand(256);
    term.echo(() => rainbow(render('Virendra Kumar'), seed));
    // term.echo('<white>Welcome to my Portfolio</white>\n');
    term.echo('\n')
    term.echo('Hey Welcome! Type "help" if you want to unravel the mystery that is me and learn how we can have a fun chat!', {
        delay: 15,
        typing: true
    });
    term.resume();
}

function rainbow(string, seed) {
    return lolcat.rainbow(function(char, color) {
        char = $.terminal.escape_brackets(char);
        return `[[;${hex(color)};]${char}]`;
    }, string, seed).join('\n');
}

function rand(max) {
    return Math.floor(Math.random() * (max + 1));
}

function render(text) {
    const cols = term.cols();
    return trim(figlet.textSync(text, {
        font: font,
        width: cols,
        whitespaceBreak: true
    }));
}

function trim(str) {
    return str.replace(/[\n\s]+$/, '');
}

function hex(color) {
    return '#' + [color.red, color.green, color.blue].map(n => {
        return n.toString(16).padStart(2, '0');
    }).join('');
}

// github('jcubic/jquery.terminal');



// var term = $('.term').terminal(function (cmd) {
//     this.echo('Your command was [[b;#fff;]' +
//         $.terminal.escape_brackets(cmd)
//         + ']');
// }, {
//     greetings: 'Terminal Demo by [[!;;;;https://jcubic.pl]Jakub Jankiewicz] (based on [[!;;;;https://codepen.io/32bitkid/pen/LKZzMR]James Holmes Pen])\n'
// });
const get_key = (function () {
    const key_mapping = {
        'SPACEBAR': ' ',
        'UP': 'ARROWUP',
        'DOWN': 'ARROWDOWN',
        'LEFT': 'ARROWLEFT',
        'RIGHT': 'ARROWRIGHT',
        'DEL': 'DELETE',
        'MULTIPLY': '*',
        'DIVIDE': '/',
        'SUBTRACT': '-',
        'ADD': '+'
    };
    return function get_key(e) {
        if (e.key) {
            var key = e.key.toUpperCase();
            if (key_mapping[key]) {
                key = key_mapping[key];
            }
            if (key === 'CONTROL') {
                return 'CTRL';
            }
            else {
                var combo = [];
                if (e.ctrlKey) {
                    combo.push('CTRL');
                }
                if (e.metaKey && key !== 'META') {
                    combo.push('META');
                }
                if (e.shiftKey && key !== 'SHIFT') {
                    combo.push('SHIFT');
                }
                if (e.altKey && key !== 'ALT') {
                    combo.push('ALT');
                }
                if (combo.length && key === ' ') {
                    key = 'SPACEBAR';
                }
                if (e.key) {
                    combo.push(key);
                }
                return combo.join('+');
            }
        }
    };
})();
$('kbd').on('mouseup', function (e) {
    var kbd = $(this);
    var control = ['caps', 'alt', 'lshift', 'rshift',
        'lctrl', 'lwin', 'lalt', 'rctrl', 'rwin',
        'ralt'];
    // numbers in data are parsed by jQuery
    e.key = String(kbd.data('key'));
    var key = get_key(e);
    setTimeout(() => term.focus(), 0);
    if ((key.match(/\+/) && !key.match(/^SHIFT\+.$/)) ||
        ['BACKSPACE', 'ENTER'].includes(key)) {
        term.invoke_key(key);
    }
    else if (key === 'SPACE') {
        term.insert(' ');
    }
    else if (!control.includes(e.key)) {
        if (e.shiftKey) {
            var alt = kbd.data('alt');
            if (alt) {
                term.insert(alt);
            }
            else {
                term.insert(e.key.toUpperCase());
            }
        }
        else {
            term.insert(e.key);
        }
    }
    
});

