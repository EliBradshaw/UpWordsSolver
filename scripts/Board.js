import WordLookup from "./WordLookup.js";

export default class Board {
    static WIDTH = 10;
    static HEIGHT = 10;
    static fastMode = false;
    constructor() {
        for (let i = 0; i < Board.WIDTH; i++) {
            this[i] = new Array(Board.HEIGHT);
            for (let j = 0; j < Board.HEIGHT; j++)
                this[i][j] = {
                    letter: null,
                    count: 0
                };
        }
        this.scoreOne = 0;
        this.scoreTwo = 0;
        this.comCache = [];
    }

    removeQuestionMarks(word) {
        while (word[word.length - 1] == '?')
            word = word.slice(0, -1);
        return word;
    }

    canWordBePlayedHere(x, y, dx, dy, word) {
        function isCoordInWord(bx, by, dx, dy, word, cx, cy) {
            let xrow = (cx >= bx && cx <= bx + dx*word.length);
            let yrow = (cy >= by && cy <= by + dy*word.length);
            if (xrow && yrow)
                return true;
            return false;
        }
        function wordHere(x, y, ox, oy) {
            return word[x - ox || y - oy] && word[x - ox || y - oy] != '?';
        }
        let ruleTwo = false;
        // Conditions for words no being allowed here:
        // 1 Not being a word.
        // 2 Has to be played off another word. *
        // * or one of the four center squares
        // 3 Making a previously made word not a word anymore.
        // 4 Covering an already existing word completely.
        // 5 No gaps.
        // Letters can be laid on top of each other up to 5 times.

        // Rule #1 & half of #3
        let letters = "";
        let nonWordLetterCount = 0;
        let isCoveringWord = true;
        let [ox, oy] = [x, y];
        while (this[x - dx] && this[x - dx][y - dy]?.letter) {
            x -= dx;
            y -= dy;
        }
        while (word[x - ox || y - oy] || (this[x] && this[x][y]?.letter)) {
            if (!this[x] || !this[x][y]) {
                if (word[x - ox || y - oy] == '?')
                    return false; // Rule #5
                break;
            }
            letters += wordHere(x, y, ox, oy) ? word[x - ox || y - oy] : this[x][y].letter;
            if (this[x][y].letter) {
                nonWordLetterCount++;
                ruleTwo = true;
            }
            if (this[x][y].letter && !wordHere(x, y, ox, oy))
                isCoveringWord = false;
            if (this[x][y].count == 5 && wordHere(x, y, ox, oy))
                return false;
            if (this[x][y].letter == word[x - ox || y - oy])
                return false;
            x += dx;
            y += dy;
        }
        [x, y] = [ox, oy];
        if (isCoveringWord && nonWordLetterCount != 0)
            return false; // Due to rule #4
        if (!WordLookup.isWord(letters))
            return false;
        // Rule #2 & other half of #3
        for (let i = 0; i < word.length; i++) {
            if (word[i] == '?')
                continue;
            [ox, oy] = [x, y];
            x += dx*i;
            y += dy*i;
            // Back up on to the first letter of the crossword
            while (this[x - dy] && this[x - dy][y - dx]?.letter) {
                x -= dy;
                y -= dx;
            }
            // Check if the crossword is a word
            letters = "";
            let [sx, sy] = [x, y];
            let isc = false;
            while ((isc = isCoordInWord(ox, oy, dx, dy, word, x, y)) || (this[x] && this[x][y]?.letter)) {
                // Check if should be letter from word instead
                letters += isc && word[i] != '?' ? word[i] : this[x][y].letter;
                x += dy;
                y += dx;
            }
            [x, y] = [ox, oy];
            // Check if the crossword is just apart of the original word
            if (letters?.length > 1) {
                if (!WordLookup.isWord(letters))
                    return false;
                ruleTwo = true;
            }
        }
        let wl = word.length;
        if (x + dx*wl >= Board.WIDTH/2 - 1 && Board.WIDTH/2 >= x && 
            y + dy*wl >= Board.HEIGHT/2 && Board.HEIGHT/2 >= y)
            ruleTwo = true;
        if (!ruleTwo)
            return false;
        // Rule #4
        for (let i = 0; i < word.length; i++) {
            [ox, oy] = [x, y];
            if (word[i] == '?')
                break;
            let length = 0;
            while (this[x] && this[x][y]?.letter) {
                x += dx;
                y += dy;
                if (word[length] == '?')
                    break;
                length++;
            }
            if (length == word.length)
                return false;
            [x, y] = [ox, oy];
        }
        return true;
    }

    copy() {
        let cpy = [];
        for (let i = 0; i < Board.WIDTH; i++) {
            cpy[i] = new Array(Board.HEIGHT);
            for (let j = 0; j < Board.HEIGHT; j++)
                cpy[i][j] = {
                    letter: this[i][j].letter,
                    count: this[i][j].count
                };
        }
        return {cpy, scoreOne: this.scoreOne, scoreTwo: this.scoreTwo};
    }

    restore(save) {
        for (let i = 0; i < Board.WIDTH; i++)
            for (let j = 0; j < Board.HEIGHT; j++)
                this[i][j] = save.cpy[i][j];
    }

    decodePattern(pattern, letters) {
        return this.removeQuestionMarks(pattern.split("").map(a=>letters[Number(a)]).join(""));
    }

    addTo(previousPattern, letters) {
        let newPattern = previousPattern.split("").map(Number);
        let i = previousPattern.length - 1;
        letters = letters.split('').map((a, i) => i);
        let stop = 0;
        carryLoop:
        while (true) {
            let cur = letters.indexOf(newPattern[i]);
            let co = 1;
            let nex;
            if (stop++ > 1000 || i <= -1)
                return null;
            while (true) {
                nex = letters[cur+co];
                co++;
                if (!nex) {
                    newPattern[i] = 0;
                    i--;
                    continue carryLoop;
                }
                let loc = newPattern.indexOf(nex);
                if (nex != 0 && (loc == i || loc == -1)) 
                    break;
            }
            newPattern[i] = nex;
            break;
        }
        return newPattern.join("");
    }

    generateComCache(letters) {
        let com = "1000000" + (Board.fastMode ? "" : "0");
        while (com) {
            this.comCache.push(com);
            com = this.addTo(com, letters);
        }
    }
      
    generateCombinations(x, y) {
        let letters = '?' + document.getElementById("letters").value;
        let workingCombinations = [];
        for (let i = 0; i < 2; i++) {
            let [dx, dy] = [i==1, i==0].map(Number);
            for (let com of this.comCache) {
                if (this.canWordBePlayedHere(x, y, dx, dy, this.decodePattern(com, letters))) {
                    workingCombinations.push({x, y, dx, dy, com: this.decodePattern(com, letters)});
                } 
            }
        }

        return workingCombinations;
    }

    scoreCombinations(x, y) {
        let combinations = this.generateCombinations(x, y);
        return combinations.map(comb => {
            let bef = this.copy();
            let suc = this.putWord(comb.x, comb.y, comb.dx, comb.dy, comb.com);
            let val = this.scoreCombination(comb, false);
            this.restore(bef);
            if (!suc)
                return [null, -1];
            return [comb, val];
        }).sort((a, b) => b[1] - a[1]);
    }

    async sleep(time) {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, time);
        })
    }

    async searchAllSquares() {
        let letters = '?' + document.getElementById("letters").value;
        this.comCache = [];
        this.generateComCache(letters);
        let totalEstimations = 0;
        let accumalatedEst = 0;
        let best = {comb: {com: null}, val: -1};
        for (let i = 0; i < Board.WIDTH; i++)
            for (let j = 0; j < Board.HEIGHT; j++) {
                let start = performance.now();
                let scc = this.scoreCombinations(i, j);
                let delta = performance.now() - start;
                totalEstimations *= accumalatedEst;
                accumalatedEst += 1;
                totalEstimations += delta;
                totalEstimations /= accumalatedEst;
                let ms = Math.floor((Board.WIDTH*Board.HEIGHT-(i*Board.WIDTH+j)) * totalEstimations);
                let s = Math.floor(ms/1000);
                let m = Math.floor(s/60);
                //console.clear();

                await this.sleep(0);
                let ip = document.getElementById("innerPercentage");
                ip.innerText = `${Math.round((i*Board.WIDTH+j+1)/(Board.WIDTH*Board.HEIGHT*0.01))}%`;
                ip.style.width = `${(i*Board.WIDTH+j+1)/(Board.WIDTH*Board.HEIGHT*0.01)}%`;

                if (best.comb.com)
                    document.getElementById("word").innerText = 
                    `Word: ${best.comb.com}\nPoints: ${best.val}\nAt: row-${best.comb.x+1}, column-${best.comb.y+1}\nGoing: ${best.comb.dx ? "down" : "right"}`;
                document.getElementById("time").innerText = `Est. time remaining: ${m}m ${(Math.round((ms%60000)/100)/10)}s`;
                if (scc.length == 0)
                    continue;
                let newc = scc[0];
                if (newc[1] > best.val)
                    best = {comb: newc[0], val: newc[1]};
            }
        return best.comb;
    }

    playCombination(comb) {
        this.putWord(comb.x, comb.y, comb.dx, comb.dy, comb.com);
    }

    scoreCombination(comb, doScore = true) {
        return this.scoreWord(comb.x, comb.y, comb.dx, comb.dy, comb.com, true, doScore);
    }

    scoreWord(x, y, dx, dy, word, oneTurn, doScore = true) {
        let score = this.scoreWordDirection(x, y, dx, dy);
        if (word.split('?').join('').length == 7)
            score += 20;
        for (let i = 0; i < word.length; i++)
            if (word[i] != '?')
                score += this.scoreWordDirection(x + dx*i, y + dy*i, dy, dx);
        if (!doScore)
            return score;
        if (oneTurn)
            this.scoreOne += score;
        else
            this.scoreTwo += score;
    }

    scoreWordDirection(x, y, dx, dy) {
        let value = 0;
        let isOnes = true;
        let wordLength = 0;
        let count;
        // makes sure it is at beginning of word
        while (this[x - dx] && this[x - dx][y - dy]?.letter) {
            x -= dx;
            y -= dy;
        }
        while (this[x] && this[x][y]?.letter) {
            count = this[x][y].count;
            if (count > 1)
                isOnes = false;
            value += count;
            x += dx;
            y += dy;
            wordLength++;
        }
        return value * (isOnes*1 + 1) * (wordLength>1);
    }

    putWord(x, y, dx, dy, word) {
        for (let i = 0; i < word.length; i++) {
            if (word[i] == '?')
                continue;
            if (!this[x+dx*i] || !this[x+dx*i][y+dy*i])
                return false;
            this[x+dx*i][y+dy*i].letter = word[i];
            this[x+dx*i][y+dy*i].count++;
        }
        return true;
    }
}