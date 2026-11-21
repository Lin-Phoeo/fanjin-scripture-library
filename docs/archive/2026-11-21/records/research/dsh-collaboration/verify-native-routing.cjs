// Offline checks of exact pure functions from the installed 0.2.2-rc.5 bundle.
// Does not import or boot DSH, connect to a model, or inspect user settings.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const raw = execFileSync(process.execPath, [path.join(__dirname, 'read-public-package.cjs'), '@deepseek-ai/dsh-tool-subagent/lib/index.js'], {encoding:'utf8'});
const { source, content } = JSON.parse(raw);
const start = content.indexOf('function modelRouteKey(');
const end = content.indexOf('async function preflightChildLlmRoute(');
assert.ok(start > 0 && end > start);
const scope = {};
vm.runInNewContext(content.slice(start, end) + '\nthis.api={requestedAgentOptions,assertAllowedModelRoutes};', scope, { timeout:1000 });
const { requestedAgentOptions: merge, assertAllowedModelRoutes: validate } = scope.api;
const parent = {provider:'route-a',model:'model-a',reasoningEffort:'high'};
const configured = {provider:'route-b',model:'model-b',reasoningEffort:'medium',maxTokens:2048};
const policy = {routes:[{provider:'route-a',model:'model-a'},{provider:'route-b',model:'model-b'}]};
const results = [];
function check(name, fn) { fn(); results.push({name,passed:true}); }
check('No override preserves configured static route and budget', () => assert.equal(merge(configured,{},false,undefined,parent), configured));
check('Disabled dynamic selection rejects explicit route', () => assert.throws(() => merge(configured,{provider:'route-a',model:'model-a'},false,policy,parent), /disabled/));
check('Provider-only selection rejects before adapter lookup', () => assert.throws(() => merge(configured,{provider:'route-a'},true,policy,parent), /supplied together/));
check('Effort-only selection rejects before adapter lookup', () => assert.throws(() => merge(configured,{reasoning_effort:'high'},true,policy,parent), /requires both/));
check('Session without recorded policy rejects another route', () => assert.throws(() => merge(undefined,{provider:'route-b',model:'model-b'},true,undefined,parent), /not allowed/));
check('Session without policy accepts current parent route and clears old effort', () => {const value=merge(configured,{provider:'route-a',model:'model-a'},true,undefined,parent);assert.equal(value.provider,'route-a');assert.equal(value.reasoningEffort,undefined);assert.equal(value.maxTokens,2048);});
check('Exact allowlist rejects an unlisted model on allowed provider', () => assert.throws(() => merge(undefined,{provider:'route-b',model:'other-model'},true,policy,parent), /not allowed/));
check('Exact allowlist accepts allowed route and clears configured effort', () => {const value=merge(configured,{provider:'route-b',model:'model-b'},true,policy,parent);assert.equal(value.model,'model-b');assert.equal(value.reasoningEffort,undefined);assert.equal(value.maxTokens,2048);});
check('Duplicate routes reject', () => assert.throws(() => validate([policy.routes[0],policy.routes[0]]), /repeats route/));
check('Empty provider or model rejects', () => assert.throws(() => validate([{provider:'route-a',model:''}]), /non-empty/));
const report = {source,packageVersion:'0.2.2-rc.5',method:'Exact pure helper source extracted into isolated Node vm; no DSH boot, network, model request, or user configuration access.',limitations:['No adapter preflight or live sessions tested.','Explicit nonempty reasoning effort success path is not tested because it calls an imported branded-type constructor.','This verifies bundled code, not which version the running Host resolved.'],passed:results.length,results};
fs.writeFileSync(path.join(__dirname,'native-routing-verification.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
