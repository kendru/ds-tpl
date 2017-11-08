class CharStream {

    constructor(str) {
        this.str = str
        this.i = 0
        this.line = 1
        this.col = 0
    }

    peek(n = 0) {
        return this.str.charAt(this.i + n)
    }

    next() {
        const c = this.str.charAt(this.i++)
        if (c === '\n') {
            this.line++
            this.col = 0
        } else {
            this.col++
        }

        return c
    }

    panic(msg) {
        throw new Error(`${msg} (${this.line}:${this.col})`)
    }

    get isEnd() {
        return this.peek() === ''
    }
}

module.exports = CharStream