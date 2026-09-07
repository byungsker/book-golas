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
const expectedRequiredEntryCount = 86;
const allowedStates = new Set('ready loading empty error unauthorized consent-required quota offline validation permission-denied unsupported conflict stale running paused disabled'.split(' '));
const allowedErrorStates = new Set(
  (
    'error invalid-credentials email-not-confirmed rate-limit consent-declined already-registered password-too-short invalid-email expired-link invalid-callback replayed-callback password-mismatch network-error external-unavailable invalid-input forbidden not-found invalid-query provider-denied provider-error recommendation-error ' +
    'limit-reached save-failed invalid-date-range invalid-month invalid-page content-unavailable session-expired invalid-nickname resend-rate-limit session-save-failed session-clear-failed update-failed record-not-found not-enough-records not-enough-history not-enough-data history-load-failed copy-failed delete-failed ai-error review-load-failed draft-restore-failed generation-error ' +
    'source-not-found ocr-error initialization-failed render-failed upload-failed permission-denied offline unsupported stale conflict sync-failed server-validation invalid-return invalid-link invalid-url reauth-required'
  ).trim().split(/\s+/),
);
const expectedTopLevelLocks = {
  schemaVersion: 1,
  issue: 416,
  planFooter: 'Plan: .omo/plans/bookgolas-web-app-parity.md',
  locales: ['ko', 'en'],
  defaultLocale: 'ko',
  localePrefix: 'as-needed',
  parityBaseline: 'online-core',
  fullParityGate: 'blocked-by-evidence',
  requiredNativeCapabilities: ['iOS widget', 'Siri/App Shortcuts', 'native push', 'camera', 'share sheet', 'subscriptions'],
};
const supportedFixtures = new Set('second-json-ledger invalid-top-level-lock invalid-state invalid-error-state missing-review-editor missing-disposition duplicate-url missing-error-state complete-without-owner'.split(' '));
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

if (fixture === 'second-json-ledger') {
  documentText += '\n```json\n{}\n```\n';
}

const ledgerBlocks = [...documentText.matchAll(/```json\s*\r?\n([\s\S]*?)\r?\n```/gi)];
let ledger = null;
if (ledgerBlocks.length !== 1) {
  addError(`The parity matrix must contain exactly one fenced JSON ledger; found ${ledgerBlocks.length}.`);
} else {
  try {
    ledger = JSON.parse(ledgerBlocks[0][1]);
  } catch (error) {
    addError(`The fenced ledger is not valid JSON: ${error.message}`);
  }
}

if (ledger && (typeof ledger !== 'object' || Array.isArray(ledger))) {
  addError('The fenced ledger must be a JSON object.');
}

if (ledger && typeof ledger === 'object' && !Array.isArray(ledger)) {
  if (fixture === 'invalid-top-level-lock') {
    ledger.parityBaseline = 'full-parity';
  }
  Object.entries(expectedTopLevelLocks).forEach(([key, expectedValue]) => {
    if (!Object.hasOwn(ledger, key)) {
      addError(`The ledger is missing top-level decision lock ${key}.`);
    } else if (JSON.stringify(ledger[key]) !== JSON.stringify(expectedValue)) {
      addError(`Top-level decision lock ${key} must equal ${JSON.stringify(expectedValue)}; received ${JSON.stringify(ledger[key])}.`);
    }
  });
}

if (ledger && !Array.isArray(ledger.entries)) {
  addError('The ledger must expose an entries array.');
}

if (ledger && Array.isArray(ledger.entries)) {
  ledger.entries = ledger.entries.map((entry) => ({ ...entry }));
  if (fixture === 'invalid-state' && ledger.entries[0]) {
    ledger.entries[0].states = [...ledger.entries[0].states, 'invalid-state'];
  }
  if (fixture === 'invalid-error-state' && ledger.entries[0]) {
    ledger.entries[0].errorStates = [...ledger.entries[0].errorStates, 'invalid-error-state'];
  }
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
  if (fixture && !supportedFixtures.has(fixture)) {
    addError(`Unknown fixture: ${fixture}`);
  }

  const seenIds = new Map();
  const seenUrls = new Map();
  const entryIds = new Set();
  const manifestIds = new Set(requiredEntryIds);

  if (requiredEntryIds.length !== expectedRequiredEntryCount) {
    addError(`The required-entry manifest must contain exactly ${expectedRequiredEntryCount} IDs; found ${requiredEntryIds.length}.`);
  }
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
    } else {
      entry.states.forEach((state) => {
        if (!allowedStates.has(state)) {
          addError(`${label} has unsupported state ${JSON.stringify(state)}; allowed states are ${[...allowedStates].join(', ')}.`);
        }
      });
    }
    if (!Array.isArray(entry?.errorStates) || !entry.errorStates.includes('error')) {
      addError(`${label} is missing an error-state entry.`);
    } else {
      entry.errorStates.forEach((errorState) => {
        if (!allowedErrorStates.has(errorState)) {
          addError(`${label} has unsupported error state ${JSON.stringify(errorState)}; allowed error states are ${[...allowedErrorStates].join(', ')}.`);
        }
      });
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
