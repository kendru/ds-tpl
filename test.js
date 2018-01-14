const compileTemplate = require('./src/index')

const tpl = compileTemplate(
`The first planet's name is: {{planets.0.name}}. All of them are:{% for planets as planet %}
    - {{planet.name}}{% end %}`
);
const planets = [
    { name: 'Mercury' },
    { name: 'Venus' },
    { name: 'Earth' },
    { name: 'Mars' },
    { name: 'Jupiter' },
    { name: 'Saturn' },
    { name: 'Uranus' },
    { name: 'Neptune' }
];

console.log(tpl({ planets }));