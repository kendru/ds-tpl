# ds-tpl

Dead-simple, fast text templates.

Mustache-style templates that perform only interpolation. No logic, no filtering,
no extra features. Is it fast? Yes.

### Usage

```
const compileTemplate = require('ds-tpl');

const tpl = compileTemplate('Hello, {{world}}');
const data = { world: 'Earth' };

console.log(tpl(data)); // Logs: "Hello, Earth"
```
