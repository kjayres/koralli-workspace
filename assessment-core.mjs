const MAX_QUESTION = 2_000;
const MAX_SOURCE = 30_000;
const MAX_SOURCE_TOTAL = 80_000;
const SOURCE_ID = /^source-[1-9][0-9]*$/;
const FINDING_ID = /^finding-[1-9][0-9]*$/;
const VERDICTS = ['supported', 'not-supported', 'insufficient-evidence'];
const STATUSES = ['supported', 'contradicted', 'unknown'];
const whitespace = text => text.replace(/\s+/gu, ' ').trim();

function record(value, label, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  if (keys && Object.keys(value).some(key => !keys.includes(key))) throw new Error(`${label} contains an unexpected field.`);
}

function text(value, label, limit, trim = true) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be non-empty text.`);
  if (value.length > limit) throw new Error(`${label} exceeds the ${limit.toLocaleString('en-GB')}-character limit.`);
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value)) throw new Error(`${label} contains an unsupported control character.`);
  return trim ? value.trim() : value;
}

function list(value, label, minimum, maximum) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) throw new Error(`${label} must contain ${minimum} to ${maximum} items.`);
  return value;
}

function sourcesFrom(input) {
  const ids = new Set();
  let total = 0;
  return list(input, 'Sources', 1, 8).map((source, index) => {
    const label = `Source ${index + 1}`;
    record(source, label);
    const id = text(source.id, `${label} ID`, 32, false);
    if (!SOURCE_ID.test(id)) throw new Error(`${label} ID must use the form source-N with a positive integer.`);
    if (ids.has(id)) throw new Error('Source IDs must be unique.');
    ids.add(id);
    const name = text(source.name, `${label} name`, 255);
    const sourceText = text(source.text, `${label} text`, MAX_SOURCE, false);
    total += sourceText.length;
    if (total > MAX_SOURCE_TOTAL) throw new Error('Combined source text exceeds the 80,000-character limit.');
    return { id, name, text: sourceText };
  });
}

export function validateInput(input) {
  record(input, 'Assessment input');
  return {
    question: text(input.question, 'Question', MAX_QUESTION),
    sources: sourcesFrom(input.sources)
  };
}

// Checks output structure and quotation provenance. It cannot establish that a claim is true.
export function validateAssessment(assessment, sources) {
  record(assessment, 'Assessment', ['verdict', 'summary', 'findings', 'missingChecks', 'nextSteps']);
  const sourceById = new Map(sourcesFrom(sources).map(source => [source.id, whitespace(source.text)]));
  if (!VERDICTS.includes(assessment.verdict)) throw new Error('Assessment verdict is invalid.');
  const summary = text(assessment.summary, 'Assessment summary', 4_000);
  const findingIds = new Set();
  const findings = list(assessment.findings, 'Findings', 1, 24).map((finding, index) => {
    const label = `Finding ${index + 1}`;
    record(finding, label, ['id', 'title', 'status', 'detail', 'citations']);
    const id = text(finding.id, `${label} ID`, 32, false);
    if (!FINDING_ID.test(id)) throw new Error(`${label} ID must use the form finding-N with a positive integer.`);
    if (findingIds.has(id)) throw new Error('Finding IDs must be unique.');
    findingIds.add(id);
    if (!STATUSES.includes(finding.status)) throw new Error(`${label} status is invalid.`);
    const title = text(finding.title, `${label} title`, 200);
    const detail = text(finding.detail, `${label} detail`, 4_000);
    const citations = list(finding.citations, `${label} citations`, finding.status === 'unknown' ? 0 : 1, 8).map((citation, citationIndex) => {
      const citationLabel = `${label} citation ${citationIndex + 1}`;
      record(citation, citationLabel, ['sourceId', 'quote']);
      const sourceId = text(citation.sourceId, `${citationLabel} source ID`, 32, false);
      if (!sourceById.has(sourceId)) throw new Error(`${citationLabel} references an unknown source.`);
      const quote = text(citation.quote, `${citationLabel} quotation`, 3_000, false);
      if (!sourceById.get(sourceId).includes(whitespace(quote))) throw new Error(`${citationLabel} does not match its source text.`);
      return { sourceId, quote };
    });
    return { id, title, status: finding.status, detail, citations };
  });
  const checklist = (value, label) => list(value, label, 0, 16).map((entry, index) => text(entry, `${label} item ${index + 1}`, 1_500));
  return {
    verdict: assessment.verdict,
    summary,
    findings,
    missingChecks: checklist(assessment.missingChecks, 'Missing checks'),
    nextSteps: checklist(assessment.nextSteps, 'Next steps')
  };
}

export const ASSESSMENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verdict', 'summary', 'findings', 'missingChecks', 'nextSteps'],
  properties: {
    verdict: { type: 'string', enum: VERDICTS },
    summary: { type: 'string', minLength: 1, maxLength: 4_000 },
    findings: {
      type: 'array', minItems: 1, maxItems: 24,
      items: {
        type: 'object', additionalProperties: false,
        required: ['id', 'title', 'status', 'detail', 'citations'],
        properties: {
          id: { type: 'string', pattern: '^finding-[1-9][0-9]*$', maxLength: 32 },
          title: { type: 'string', minLength: 1, maxLength: 200 },
          status: { type: 'string', enum: STATUSES },
          detail: { type: 'string', minLength: 1, maxLength: 4_000 },
          citations: {
            type: 'array', minItems: 0, maxItems: 8,
            items: {
              type: 'object', additionalProperties: false, required: ['sourceId', 'quote'],
              properties: {
                sourceId: { type: 'string', pattern: '^source-[1-9][0-9]*$', maxLength: 32 },
                quote: { type: 'string', minLength: 1, maxLength: 3_000 }
              }
            }
          }
        }
      }
    },
    missingChecks: { type: 'array', minItems: 0, maxItems: 16, items: { type: 'string', minLength: 1, maxLength: 1_500 } },
    nextSteps: { type: 'array', minItems: 0, maxItems: 16, items: { type: 'string', minLength: 1, maxLength: 1_500 } }
  }
};
