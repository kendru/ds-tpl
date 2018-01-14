const CharStream = require('./CharStream')
const TokenStream = require('./TokenStream')
const Parser = require('./Parser')


function compileTemplate(str) {
    const tokenStream = new TokenStream(new CharStream(str))
    const parser = new Parser(tokenStream)
    const program = parser.parse()

    return function applyTemplate(data) {
        let environment = [data]
        return program.evaluate(environment)
    }
}

module.exports = compileTemplate