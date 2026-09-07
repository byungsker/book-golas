import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { requiredEntryIds } from './parity-required-entry-manifest.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const documentPath = path.resolve(scriptDirectory, '../docs/consumer-parity-matrix.md');
const requiredEntryFields = [
  'id',
  'kind',
  'nativeSurface',
  'nativeAction',
  'canonicalUrl',
  'webComponent',
  'browserEquivalent',
  'disposition',
  'parity',
  'status',
  'dataOwner',
  'evidenceOwner',
  'states',
  'errorStates',
];
const allowedKinds = new Set(['route', 'screen', 'modal', 'sheet', 'action', 'state', 'capability']);
const allowedDispositions = new Set([
  'browser-equivalent',
  'planned',
  'disabled',
  'unavailable',
  'blocked-by-evidence',
]);
const allowedParity = new Set(['online-core', 'full-parity', 'native-only']);
const allowedStatus = new Set(['planned', 'blocked', 'disabled', 'unavailable', 'not-started']);
const fixtureIndex = process.argv.indexOf('--fixture');
const fixture = fixtureIndex === -1 ? null : process.argv[fixtureIndex + 1];
const errors = [];

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function addError(message) {
  errors.push(message);
}

if (fixtureIndex !== -1 && !fixture) {
  addError('A fixture name is required after --fixture.');
}

let documentText = '';
try {
  documentText = fs.readFileSync(documentPath, 'utf8');
} catch (error) {
  addError(`Cannot read ${documentPath}: ${error.message}`);
}

const ledgerBlock = documentText.match(/```json\s*\r?\n([\s\S]*?)\r?\n```/);
let ledger = null;
if (!ledgerBlock) {
  addError('The parity matrix must contain one fenced JSON ledger.');
} else {
  try {
    ledger = JSON.parse(ledgerBlock[1]);
  } catch (error) {
    addError(`The fenced ledger is not valid JSON: ${error.message}`);
  }
}

if (ledger && !Array.isArray(ledger.entries)) {
  addError('The ledger must expose an entries array.');
}

if (ledger && Array.isArray(ledger.entries)) {
  ledger.entries = ledger.entries.map((entry) => ({ ...entry }));
  if (fixture === 'missing-review-editor') {
    ledger.entries = ledger.entries.filter((entry) => entry?.id !== 'review-editor');
  }
  if (fixture === 'missing-disposition' && ledger.entries[0]) {
    ledger.entries[0].disposition = '';
  }
  if (fixture === 'duplicate-url' && ledger.entries.length > 1) {
    ledger.entries[1].canonicalUrl = ledger.entries[0].canonicalUrl;
  }
  if (fixture === 'missing-error-state' && ledger.entries[0]) {
    ledger.entries[0].errorStates = [];
  }
  if (fixture === 'complete-without-owner' && ledger.entries[0]) {
    ledger.entries[0].status = 'complete';
    ledger.entries[0].dataOwner = '';
    ledger.entries[0].evidenceOwner = '';
  }
  if (fixture && !new Set([
    'missing-review-editor',
    'missing-disposition',
    'duplicate-url',
    'missing-error-state',
    'complete-without-owner',
  ]).has(fixture)) {
    addError(`Unknown fixture: ${fixture}`);
  }

  const seenIds = new Map();
  const seenUrls = new Map();
  const entryIds = new Set();
  const manifestIds = new Set(requiredEntryIds);

  if (manifestIds.size !== requiredEntryIds.length) {
    addError('The required-entry manifest contains duplicate IDs.');
  }

  ledger.entries.forEach((entry, index) => {
    const label = `entries[${index}]`;
    entryIds.add(entry?.id);
    requiredEntryFields.forEach((field) => {
      if (!(field in (entry || {}))) {
        addError(`${label} is missing ${field}.`);
      }
    });
    if (!hasText(entry?.id)) {
      addError(`${label} has an empty id.`);
    } else if (seenIds.has(entry.id)) {
      addError(`${label} duplicates id ${entry.id} from entries[${seenIds.get(entry.id)}].`);
    } else {
      seenIds.set(entry.id, index);
    }
    if (!allowedKinds.has(entry?.kind)) {
      addError(`${label} has unsupported kind ${String(entry?.kind)}.`);
    }
    if (!hasText(entry?.nativeSurface)) {
      addError(`${label} has no native surface.`);
    }
    if (!hasText(entry?.nativeAction)) {
      addError(`${label} has no native action.`);
    }
    if (!hasText(entry?.canonicalUrl)) {
      addError(`${label} has no canonical URL.`);
    } else if (seenUrls.has(entry.canonicalUrl)) {
      addError(`${label} duplicates canonical URL ${entry.canonicalUrl} from entries[${seenUrls.get(entry.canonicalUrl)}].`);
    } else {
      seenUrls.set(entry.canonicalUrl, index);
    }
    if (!hasText(entry?.webComponent)) {
      addError(`${label} has no Web component or explicit unavailability.`);
    }
    if (!hasText(entry?.browserEquivalent)) {
      addError(`${label} has no browser equivalent or explicit unavailability.`);
    }
    if (!allowedDispositions.has(entry?.disposition)) {
      addError(`${label} has no valid disposition.`);
    }
    if (!allowedParity.has(entry?.parity)) {
      addError(`${label} has unsupported parity scope ${String(entry?.parity)}.`);
    }
    if (!allowedStatus.has(entry?.status) && entry?.status !== 'complete') {
      addError(`${label} has unsupported status ${String(entry?.status)}.`);
    }
    if (!Array.isArray(entry?.states) || entry.states.length === 0) {
      addError(`${label} has no state disposition.`);
    }
    if (!Array.isArray(entry?.errorStates) || !entry.errorStates.includes('error')) {
      addError(`${label} is missing an error-state entry.`);
    }
    if (entry?.status === 'complete' && (!hasText(entry.dataOwner) || !hasText(entry.evidenceOwner))) {
      addError(`${label} is marked complete without both dataOwner and evidenceOwner.`);
    }
    if (!hasText(entry?.dataOwner)) {
      addError(`${label} has no data/evidence owner.`);
    }
    if (!hasText(entry?.evidenceOwner)) {
      addError(`${label} has no QA evidence owner.`);
    }
  });

  requiredEntryIds.forEach((id) => {
    if (!entryIds.has(id)) {
      addError(`Required parity ledger entry is missing: ${id}.`);
    }
  });
  [...entryIds]
    .filter((id) => hasText(id) && !manifestIds.has(id))
    .forEach((id) => addError(`Ledger entry is missing from the required-entry manifest: ${id}.`));
}

if (errors.length > 0) {
  process.stderr.write(`Parity matrix FAILED:\n${errors.map((error) => `- ${error}`).join('\n')}\n`);
  process.exitCode = 1;
} else {
  const routeCount = ledger.entries.filter((entry) => entry.kind === 'route').length;
  const stateCount = ledger.entries.filter((entry) => entry.kind === 'state').length;
  process.stdout.write(`Parity matrix OK: ${ledger.entries.length} entries, ${routeCount} routes, ${stateCount} state entries.\n`);
}
