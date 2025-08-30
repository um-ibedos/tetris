'use strict';
class Game {
    COLOR_LIST = [[64, 64, 64], [90, 230, 230], [220, 220, 30], [180, 90, 220], [30, 210, 50], [220, 20, 50], [70, 110, 240], [240, 140, 20]];
    TETRIMINOS = new Proxy([], {
        get: (_, prop) => new Proxy([
            [], //ダミー
            [
                '    ',
                '####',
                '    ',
                '    '
            ], [
                '##',
                '##'
            ], [
                ' # ',
                '###',
                '   '
            ], [
                ' ##',
                '## ',
                '   '
            ], [
                '## ',
                ' ##',
                '   '
            ], [
                '#  ',
                '###',
                '   '
            ], [
                '  #',
                '###',
                '   '
            ]
        ][prop], {
            get: (t, p) => {
                for (p = abs(p | 0) % 4; p--; t = t.map((e, i) => [...e].map((_, l) => t[e.length - l - 1][i]).join``));
                return t.map(e => (prop - 2 ? '' : ' ') + e);
            }
        })
    });
    OFFSET = new Proxy([], {
        get: (_, p) => p - 1 ? [
            [
                [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]
            ],
            [
                [0, 0], [1, 0], [1, -1], [0, 2], [1, 2]
            ],
            [
                [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]
            ],
            [
                [0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]
            ]
        ] : [
            [
                [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]
            ],
            [
                [0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]
            ],
            [
                [0, 0], [3, 0], [-3, 0], [3, -1], [-3, -1]
            ],
            [
                [0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]
            ]
        ]
    });
    DEFAULT_POSITION = {
        x: 3,
        y: 20
    };
    DEFAULT_LOCK_DELAY = 30 - 1;
    DEFAULT_STEP_COUNT = 15 - 1;
    DRAW_COUNT = 60;
    def_startLevel = 1;
    def_DAS = 11 - 1;
    def_ARR = 2 - 1;
    def_lineClear = 16;
    def_HOLD = true;
    def_ghost = true;
    def_endless = false;
    def_NEXTnumber = 5;
    def_keyList = {
        move_right: 39,
        move_left: 37,
        rotate_right: 38,
        rotate_left: 90,
        soft_drop: 40,
        hard_drop: 32,
        hold: 67
    };
    get defaultG() {
        return (0.8 - ((this.level - 1) * 7e-3)) ** (1 - this.level) / 60;
    }
    constructor() {
        this.field = [...Array(40)].map(_ => Array(10).fill(0));
        this.nextList = [];
        ({ x: this.x, y: this.y } = this.DEFAULT_POSITION);
        this.rotation = 0;
        this.stepCount = this.DEFAULT_STEP_COUNT;
        this.lowestPoint = this.y;
        this.lockDelay = this.DEFAULT_LOCK_DELAY;
        this.lastMotionIsRotation = false;
        this.lastSRStype = 0;
        this.T_spin = 0;
        this.REN = -1;
        this.BTB = false;
        this.Score = 0;
        this.putCount = 0;
        this.lineCount = 0;
        this.holdList = {
            enabled: true,
            content: 0
        };
        this.set = 2;
        this.AREcount = -1;
        this.outputStrings = this.drawStrings = '';
        this.drawCounter = this.DRAW_COUNT;
        let cookie = {};
        document.cookie.split('; ').map(e => e.split('=')).map(e => cookie[e[0]] = e[1]);
        this.keyList = {};
        for (let k of ['startLevel', 'NEXTnumber', 'lineClear', 'DAS', 'ARR']) this[k] = +(cookie[k] ?? this['def_' + k]);
        for (let k of ['HOLD', 'ghost', 'endless']) this[k] = (cookie[k] ?? this['def_' + k] + '') == 'true';
        for (let k of Object.keys(this.def_keyList)) this.keyList[k] = +(cookie[k] ? cookie[k].split(',').map((e, i, a) => i ? KEY_CODE_LIST[a[0]] == '' && (KEY_CODE_LIST[a[0]] = decodeURIComponent(e)) : e)[0] : this.def_keyList[k]);
        this.level = this.startLevel;
        this.DAScount = this.DAS;
        this.ARRcount = this.ARR;
    }
    addNext() {
        let array = [1, 2, 3, 4, 5, 6, 7];
        for (let j, i = 7; i--; [array[i], array[j]] = [array[j], array[i]])j = random() * (i + 1) | 0;
        this.nextList.push(...array);
    };
    drawMino(type, x, y, rotation, ghost = false) {
        type = type % 8 | 0;
        x = round(x);
        y = round(y);
        rotation = rotation % 4 | 0;
        const mino = (s = 0) => this.TETRIMINOS[type][rotation].forEach((e, i) => [...e].forEach((e, l) => e == '#' && y + s - i < 20 && square(240 + (x + l) * 40, (20 - y + i - s) * 40, 40)));
        if (this.ghost && ghost && type) {
            let s = 0;
            while (this.checkWall(type, x, y + s, rotation)) s--;
            fill(...this.COLOR_LIST[type], 100);
            mino(s + 1);
        }
        fill(...this.COLOR_LIST[type]);
        mino();
    };
    checkWall(type, x, y, rotation) {
        type = type % 8 | 0;
        x = round(x);
        y = round(y);
        rotation = max((4 + rotation) % 4, rotation % 4) | 0;
        return !!this.TETRIMINOS[type][rotation].every((e, i) => [...e].every((e, l) => e != '#' || e == '#' && x + l >= 0 && x + l < 10 && y - i >= 0 && !this.field[y - i][x + l]));
    };
    minoSet() {
        this.AREcount = 0;
        if (!this.TETRIMINOS[this.nextList[0]][this.rotation].some((e, i) => [...e].some(e => e == '#' && round(this.y) - i < 20))) {
            this.modeChange('game_over');
            return;
        }
        this.TETRIMINOS[this.nextList[0]][this.rotation].forEach((e, i) => [...e].forEach((e, l) => e == '#' && (this.field[round(this.y) - i][round(this.x) + l] = this.nextList[0])));
        if (this.nextList[0] == 3 && this.lastMotionIsRotation) {
            const corner = [
                '# #',
                '   ',
                '# #'
            ].flatMap((e, i) => [...e].filter((e, l) => (this.field[round(this.y) - i]?.[round(this.x) + l] ?? true) && e == '#')).length;
            if (corner == 3) {
                let t = [
                    '   ',
                    '   ',
                    '# #'
                ];
                for (let p = this.rotation; p--; t = t.map((e, i) => [...e].map((_, l) => t[2 - l][i]).join``));
                this.T_spin = (-1) ** (this.lastSRStype - 4 && t.flatMap((e, i) => [...e].filter((e, l) => (this.field[round(this.y) - i]?.[round(this.x) + l] ?? true) && e == '#')).length == 2);
            } else this.T_spin = 1 * (corner == 4);
        } else this.T_spin = 0;
        if (this.T_spin) [this.outputStrings, this.drawCounter] = [(~this.T_spin ? '' : 'Mini ') + 'T-spin ', this.DRAW_COUNT];

        if (this.field.filter(e => e.includes(0)).length != 40) {
            if (!this.T_spin) this.outputStrings = '';
            const oldLineCount = this.lineCount;
            this.field = this.field.filter(e => e.includes(0));
            this.lineCount += 40 - this.field.length;
            this.field.push(...[...Array(40 - this.field.length)].map(_ => Array(10).fill(0)));
            this.level += (this.lineCount / 10 | 0) - (oldLineCount / 10 | 0);
            this.level = this.level > 115 ? 115 : this.level;
            this.REN++;
            this.Score += ((this.lineCount - oldLineCount) * 2e2 - 1e2 + ((this.lineCount - oldLineCount) * 2e2 + 1e2) * !!(this.T_spin && ~this.T_spin) + (~this.T_spin ? this.T_spin ? 4e2 : 0 : 1e2)) * this.level * 1.5 ** (this.BTB && !!(this.lineCount - oldLineCount == 4 || this.T_spin)) + ([8e2, 0x4b0, 0x708, 2e3][this.lineCount - oldLineCount - 1] + 0x4b0 * (this.BTB && this.lineCount - oldLineCount == 4)) * this.level * !this.field.some(e => e.some(e => e)) + 0o62 * this.REN * this.level;
            this.outputStrings += this.T_spin ? [, 'Single\n', 'Double\n', 'Triple\n'][this.lineCount - oldLineCount] : this.lineCount - oldLineCount < 4 ? '' : 'TETRIS\n';
            this.REN && (this.outputStrings += this.REN + 'REN\n');
            this.BTB && (this.lineCount - oldLineCount == 4 || this.T_spin) && (this.outputStrings += 'Back To Back\n');
            this.field.some(e => e.some(e => e)) || (this.outputStrings += 'Perfect Clear!\n');
            this.BTB = this.lineCount - oldLineCount == 4 || this.T_spin;
            this.AREcount += (this.lineClear - this.set) * this.field.some(e => e.some(e => e));
        } else {
            this.REN = -1;
            this.Score += (~this.T_spin ? this.T_spin ? 4e2 : 0 : 1e2) * this.level;
        } //Line Clear
        if (this.outputStrings) [this.drawStrings, this.drawCounter] = [this.outputStrings, this.DRAW_COUNT];
        this.outputStrings = '';

        this.AREcount += this.set;
        this.nextList[0] = 0;
        this.holdList.enabled = false;

    };
    rotateMino(deg) {
        const nextdeg = max((4 + this.rotation + deg) % 4, (this.rotation + deg) % 4);
        this.lastSRStype = this.OFFSET[this.nextList[0]][this.rotation].findIndex((e, i) => {
            if (this.checkWall(this.nextList[0], this.x + e[0] - this.OFFSET[this.nextList[0]][nextdeg][i][0], this.y + e[1] - this.OFFSET[this.nextList[0]][nextdeg][i][1], nextdeg)) {
                this.x += e[0] - this.OFFSET[this.nextList[0]][nextdeg][i][0];
                this.y += e[1] - this.OFFSET[this.nextList[0]][nextdeg][i][1];
                this.rotation = nextdeg;
                this.lastMotionIsRotation = true;
                this.lock();
                return true;
            }
        });
    };
    modeChange(mode) {
        if (selectAll('div[id]').find(e => e.elt.id == mode)) this.mode = mode;
        else return;
        selectAll('div[id]').forEach(e => e.hide());
        select('#' + mode).show();
        switch (mode) {
            case 'playing': {
                this.startTime = millis();
                this.field = [...Array(40)].map(_ => Array(10).fill(0));
                this.nextList = [];
                ({ x: this.x, y: this.y } = this.DEFAULT_POSITION);
                this.rotation = 0;
                this.level = this.startLevel;
                this.stepCount = this.DEFAULT_STEP_COUNT;
                this.lowestPoint = this.y;
                this.lockDelay = this.DEFAULT_LOCK_DELAY;
                this.DAScount = this.DAS;
                this.ARRcount = this.ARR;
                this.lastMotionIsRotation = false;
                this.lastSRStype = 0;
                this.T_spin = 0;
                this.REN = -1;
                this.BTB = false;
                this.Score = 0;
                this.putCount = 0;
                this.lineCount = 0;
                this.holdList = {
                    enabled: true,
                    content: 0
                };
                this.set = 2;
                this.AREcount = -1;
                this.outputStrings = this.drawStrings = '';
                this.drawCounter = this.DRAW_COUNT;
                this.addNext();
                this.addNext();
                break;
            }
            case 'game_setting': {
                background(64);
                [this.level, this.NEXTnumber, this.lineClear, this.DAS, this.ARR].forEach((e, i) => selectAll('#game_setting [type=number]')[i].elt.value = e);
                [this.ghost, this.HOLD, this.endless].forEach((e, i) => selectAll('#game_setting [type=checkbox]')[i].elt.checked = e);
                break;
            }
            case 'operation_setting': {
                background(64);
                Object.keys(this.keyList).forEach(e => self[e].removeAttribute('edited', self[e].innerText = KEY_CODE_LIST[this.keyList[e]]));
                break;
            }
            case 'title': {
                background(64);
            }
        }
    };
    lock() {
        this.stepCount > 0 ? [this.lockDelay, this.stepCount] = [this.DEFAULT_LOCK_DELAY, this.stepCount - 1] : (this.checkWall(this.nextList[0], this.x, this.y - 1, this.rotation) || this.minoSet());
    };
}
const KEY_CODE_LIST = {
    8: ' ',
    37: '←',
    38: '↑',
    39: '→',
    40: '↓',
    48: '0',
    49: '1',
    50: '2',
    51: '3',
    52: '4',
    53: '5',
    54: '6',
    55: '7',
    56: '8',
    57: '9',
    32: 'Space',
    65: 'A',
    66: 'B',
    67: 'C',
    68: 'D',
    69: 'E',
    70: 'F',
    71: 'G',
    72: 'H',
    73: 'I',
    74: 'J',
    75: 'K',
    76: 'L',
    77: 'M',
    78: 'N',
    79: 'O',
    80: 'P',
    81: 'Q',
    82: 'R',
    83: 'S',
    84: 'T',
    85: 'U',
    86: 'V',
    87: 'W',
    88: 'X',
    89: 'Y',
    90: 'Z',
    186: '',
    187: '',
    188: '',
    189: '',
    190: '',
    191: '',
    192: '',
    219: '',
    220: '',
    221: '',
    222: '',
    226: ''
};
const canvas0 = new Game;
function setup() {
    frameRate(60);
    createCanvas(880, 880);
    stroke(105);
    selectAll('#title button').forEach((e, i) => e.mouseClicked(_ => canvas0.modeChange(['playing', 'game_setting', 'operation_setting'][i])));
    selectAll('#game_setting [id]').forEach(e => e.input(e => e.target.setAttribute('edited', 0)));
    selectAll('#game_setting button').forEach((e, i) => e.mouseClicked([
        _ => {
            [canvas0.def_startLevel, canvas0.def_NEXTnumber, canvas0.def_lineClear, canvas0.def_DAS, canvas0.def_ARR].forEach((e, i) => {
                if (selectAll('#game_setting [type=number]')[i].elt.value != e) selectAll('#game_setting [type=number]')[i].elt.setAttribute('edited', 0);
                selectAll('#game_setting [type=number]')[i].elt.value = e;
            });
            [canvas0.def_ghost, canvas0.def_HOLD, canvas0.def_endless].forEach((e, i) => {
                if (selectAll('#game_setting [type=checkbox]')[i].elt.checked != e) selectAll('#game_setting [type=checkbox]')[i].elt.setAttribute('edited', 0);
                selectAll('#game_setting [type=checkbox]')[i].elt.checked = e;
            });
        }, _ => {
            if (select(':invalid')) {
                select(':invalid').elt.focus();
                return;
            }
            selectAll('#game_setting [type=number]').forEach((e, i) => {
                e.elt.removeAttribute('edited');
                canvas0[['startLevel', 'NEXTnumber', 'lineClear', 'DAS', 'ARR'][i]] = +e.elt.value;
                document.cookie = ['startLevel', 'NEXTnumber', 'lineClear', 'DAS', 'ARR'][i] + '=' + e.elt.value;
            });
            selectAll('#game_setting [type=checkbox]').forEach((e, i) => {
                e.elt.removeAttribute('edited');
                canvas0[['ghost', 'HOLD', 'endless'][i]] = e.elt.checked;
                document.cookie = ['ghost', 'HOLD', 'endless'][i] + '=' + e.elt.checked;
            });
        }, _ => canvas0.modeChange('title')
    ][i]));
    selectAll('#operation_setting button').forEach((e, i) => e.mouseClicked([
        _ => {
            Object.keys(canvas0.def_keyList).forEach(e => {
                if (self[e].innerText != KEY_CODE_LIST[canvas0.def_keyList[e]]) self[e].setAttribute('edited', 0);
                self[e].innerText = KEY_CODE_LIST[canvas0.def_keyList[e]];
            });
        }, _ => {
            selectAll('#operation_setting [id]').forEach(e => e.elt.removeAttribute('edited', canvas0.keyList[e.elt.id] = +Object.keys(KEY_CODE_LIST).find(k => {
                if (KEY_CODE_LIST[k] == e.elt.innerText) {
                    document.cookie = e.elt.id + '=' + k + ',' + encodeURIComponent(e.elt.innerText);
                    return true;
                }
            })));
        }, _ => canvas0.modeChange('title')
    ][i]));
    selectAll('.popup button').forEach(e => e.mouseClicked(_ => canvas0.modeChange('title')));
    canvas0.modeChange('game_setting');
    canvas0.modeChange('operation_setting');
    canvas0.modeChange('title');
}
/**キーが押された時の処理 */
function keyPressed(e) {
    switch (canvas0.mode) {
        case 'playing': {
            e.preventDefault();
            switch (keyCode) {
                case canvas0.keyList.hard_drop: {
                    if (canvas0.nextList[0]) {
                        let oldy = canvas0.y;
                        while (canvas0.checkWall(canvas0.nextList[0], canvas0.x, canvas0.y, canvas0.rotation)) canvas0.y--;
                        canvas0.y++;
                        oldy == canvas0.y || (canvas0.lastMotionIsRotation = false);
                        canvas0.Score += (oldy - canvas0.y) * 2;
                        canvas0.minoSet();
                    }
                    break;
                }
                case canvas0.keyList.move_left: {
                    if (canvas0.checkWall(canvas0.nextList[0], canvas0.x - 1, canvas0.y, canvas0.rotation)) {
                        canvas0.x--;
                        canvas0.lastMotionIsRotation = false;
                        canvas0.lock();
                        canvas0.DAScount = canvas0.DAS;
                        canvas0.ARRcount = canvas0.ARR;
                    }
                    break;
                }
                case canvas0.keyList.move_right: {
                    if (canvas0.checkWall(canvas0.nextList[0], canvas0.x + 1, canvas0.y, canvas0.rotation)) {
                        canvas0.x++;
                        canvas0.lastMotionIsRotation = false;
                        canvas0.lock();
                        canvas0.DAScount = canvas0.DAS;
                        canvas0.ARRcount = canvas0.ARR;
                    }
                    break;
                }
                case canvas0.keyList.rotate_right: {
                    canvas0.rotateMino(1);
                    break;
                }
                case canvas0.keyList.rotate_left: {
                    canvas0.rotateMino(-1);
                    break;
                }
                case canvas0.keyList.hold: {
                    if (canvas0.holdList.enabled && canvas0.HOLD) {
                        ({ x: canvas0.x, y: canvas0.y } = canvas0.DEFAULT_POSITION);
                        canvas0.rotation = 0;
                        canvas0.lowestPoint = canvas0.y;
                        canvas0.lockDelay = canvas0.DEFAULT_LOCK_DELAY;
                        canvas0.stepCount = canvas0.DEFAULT_STEP_COUNT;
                        if (canvas0.holdList.content) [canvas0.holdList.content, canvas0.nextList[0]] = [canvas0.nextList[0], canvas0.holdList.content];
                        else {
                            canvas0.holdList.content = canvas0.nextList[0];
                            canvas0.putCount++;
                            canvas0.nextList.shift();
                            canvas0.putCount %= 7;
                            canvas0.putCount || canvas0.addNext();
                        }
                        canvas0.holdList.enabled = false;
                    }
                }
           }
            canvas0.rotation = max((4 + canvas0.rotation) % 4, canvas0.rotation % 4) | 0;
            break;
        }
        case 'operation_setting': {
            keyIsDown(16) || KEY_CODE_LIST[keyCode] == '' && (KEY_CODE_LIST[keyCode] = key.toLocaleUpperCase());
            keyIsDown(16) || keyCode && select('#operation_setting label:focus [id]') && KEY_CODE_LIST[keyCode] && selectAll('#operation_setting [id]').every(e => e.elt.innerText != KEY_CODE_LIST[keyCode]) && select('#operation_setting label:focus [id]').elt.setAttribute('edited', select('#operation_setting label:focus [id]').elt.innerText = KEY_CODE_LIST[keyCode]);
        }
    }
}
/**setup関数の処理が終了したのちに繰り返し実行される関数 */
function draw() {
    frameRate(60);
    switch (canvas0.mode) {
        case 'playing': {
            background(64);
            /**ソフトドロップの影響を考慮した重力（Line/60F）*/
            let G = canvas0.defaultG * 20 ** keyIsDown(canvas0.keyList.soft_drop);
            /**フィールドとすでに設置されたミノの描画　*/
            for (let i = 200; i--; square(240 + i % 10 * 40, 40 + (i / 10 | 0) * 40, 40))fill(...canvas0.COLOR_LIST[canvas0.field[19 - (i / 10 | 0)][i % 10]]);
            /**操作しているミノの描画 */
            canvas0.drawMino(canvas0.nextList[0], canvas0.x, canvas0.y, canvas0.rotation, true);
            /**操作しているミノが埋まっていたらゲームオーバーにする */
            /**落下処理 */
            if (round(canvas0.y) - round(canvas0.y - G)) {
                let g = -1;
                for (; canvas0.nextList[0] && canvas0.checkWall(canvas0.nextList[0], canvas0.x, canvas0.y + g, canvas0.rotation); g--);
                g++;
                canvas0.Score += (round(canvas0.y - G) - round(canvas0.y) > g ? round(canvas0.y) - round(canvas0.y - G) : -g) * keyIsDown(canvas0.keyList.soft_drop);
                canvas0.y -= round(canvas0.y - G) - round(canvas0.y) > g ? G : -g;
                canvas0.lastMotionIsRotation &&= g == 0;
            } else canvas0.y -= G;
            /**ミノの固定 */
            if (round(canvas0.y) < canvas0.lowestPoint) {
                canvas0.lowestPoint = round(canvas0.y);
                canvas0.stepCount = canvas0.DEFAULT_STEP_COUNT;
            }
            if (!canvas0.checkWall(canvas0.nextList[0], canvas0.x, canvas0.y - 1, canvas0.rotation)) {
                canvas0.y = round(canvas0.y);
                canvas0.lockDelay--;
                canvas0.lockDelay <= 0 && canvas0.minoSet();
            }
            /**DAS */
            if (keyIsDown(canvas0.keyList.move_left) || keyIsDown(canvas0.keyList.move_right)) if (canvas0.DAScount) canvas0.DAScount--;
            else if (canvas0.ARRcount) canvas0.ARRcount--;
            else {
                keyIsDown(canvas0.keyList.move_left) && canvas0.checkWall(canvas0.nextList[0], canvas0.x - 1, canvas0.y, canvas0.rotation) && canvas0.lock(canvas0.x--);
                keyIsDown(canvas0.keyList.move_right) && canvas0.checkWall(canvas0.nextList[0], canvas0.x + 1, canvas0.y, canvas0.rotation) && canvas0.lock(canvas0.x++);
                canvas0.ARRcount = canvas0.ARR;
            }
            else canvas0.DAScount = canvas0.DAS;
            fill(255);
            textFont('Menlo');
            textSize(40);
            text('HOLD', 60, 60);
            canvas0.drawMino(canvas0.holdList.content, -5, 18, 0);
            canvas0.NEXTnumber = canvas0.NEXTnumber * (canvas0.NEXTnumber >= 0);
            fill(255);
            text('NEXT', 700, 60);
            /**ネクストの表示 */
            for (let numberofnext = canvas0.NEXTnumber; numberofnext--; canvas0.drawMino(canvas0.nextList[numberofnext + 1], 11, 18 - numberofnext * 3, 0));
            let time = millis() - canvas0.startTime | 0;
            fill(255);
            textFont('Arial');
            textSize(20);
            text(`Score:  ${canvas0.Score}
Level: ${canvas0.level}
Lines: ${canvas0.lineCount}
Time: ${time / 3600000 | 0}:${time / 60000 % 60 | 0}:${((time / 1000 % 60) * 100 | 0) / 100}`, 60, 460);
            text(canvas0.drawStrings, 10, 760);
            canvas0.drawCounter && canvas0.drawCounter--;
            canvas0.drawCounter < 1 && ([canvas0.drawStrings, canvas0.outputStrings] = ['', '']);
            canvas0.AREcount--;
            if (!canvas0.AREcount) {
                ({ x: canvas0.x, y: canvas0.y } = canvas0.DEFAULT_POSITION);
                canvas0.rotation = 0;
                canvas0.holdList.enabled = true;
                canvas0.nextList.shift();
                canvas0.putCount++;
                canvas0.putCount % 7 || canvas0.addNext();
                canvas0.stepCount = canvas0.DEFAULT_STEP_COUNT;
                canvas0.lowestPoint = canvas0.y;
                canvas0.lockDelay = canvas0.DEFAULT_LOCK_DELAY;
            } //ミノの出現遅延
            if (!canvas0.checkWall(canvas0.nextList[0], canvas0.x, canvas0.y, canvas0.rotation)) {
                canvas0.modeChange('game_over');
                return;
            } //ゲームオーバー
            canvas0.lineCount >= 150 && !canvas0.endless && canvas0.modeChange('game_clear'); //ゲームクリア
            break;
        }
    }
}