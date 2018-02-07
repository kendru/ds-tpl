const Parser = require('./Parser')


function compileTemplate(str, partials = {}) {
    const program = Parser.forString(str)
        .withPartials(partials)
        .parse()

    return function applyTemplate(data) {
        let environment = [data]
        return program.evaluate(environment)
    }
}

module.exports = compileTemplate