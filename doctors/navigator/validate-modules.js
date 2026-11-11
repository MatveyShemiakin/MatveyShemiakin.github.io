const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('doctors/navigator/modules.js', 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const modules = sandbox.window.CLINICAL_MODULES;
if (!modules || typeof modules !== 'object') throw new Error('CLINICAL_MODULES is missing');

const entries = Object.entries(modules);
if (entries.length < 7) throw new Error(`Expected at least 7 modules, found ${entries.length}`);

const ids = new Set();
for (const [key, module] of entries) {
  if (!module.id || module.id !== key) throw new Error(`Invalid id for module ${key}`);
  if (ids.has(module.id)) throw new Error(`Duplicate module id: ${module.id}`);
  ids.add(module.id);
  if (!module.title || !module.shortTitle || !module.description) throw new Error(`Missing metadata for ${key}`);
  if (!Array.isArray(module.keywords) || module.keywords.length === 0) throw new Error(`Missing keywords for ${key}`);
  if (!Array.isArray(module.redFlags) || !module.redFlags.some(([id]) => id === 'none')) throw new Error(`Red flags must include none for ${key}`);
  if (!Array.isArray(module.steps) || module.steps.length === 0) throw new Error(`Missing steps for ${key}`);

  const stepIds = new Set();
  for (const step of module.steps) {
    if (!step.id || stepIds.has(step.id)) throw new Error(`Invalid or duplicate step in ${key}`);
    stepIds.add(step.id);
    if (!step.prompt || !['single', 'multi', 'form'].includes(step.type)) throw new Error(`Invalid step ${step.id} in ${key}`);
    if (step.type === 'form' && (!Array.isArray(step.fields) || step.fields.length === 0)) throw new Error(`Form step ${step.id} has no fields`);
    if (step.type !== 'form' && (!Array.isArray(step.options) || step.options.length === 0)) throw new Error(`Option step ${step.id} has no options`);
  }
}

console.log(`Validated ${entries.length} clinical modules`);
