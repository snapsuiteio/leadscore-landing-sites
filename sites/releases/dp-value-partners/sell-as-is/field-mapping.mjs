/** Reusable mapping for an existing website's controls and a published LeadScore schema. */
export function validateFieldMapping(config, fields, mapping) {
  const targets = new Set();
  for (const source of fields) {
    const target = mapping[source.id] || source.id;
    const field = config.fields.find(candidate => candidate.id === target);
    if (!field || targets.has(target) || field.type !== source.type ||
      (source.options && JSON.stringify(field.options) !== JSON.stringify(source.options))) {
      throw Error('The website fields no longer match the published form.');
    }
    targets.add(target);
  }
  for (const field of config.fields) if (field.required && !targets.has(field.id)) {
    throw Error('The website is missing a required published form field.');
  }
  return mapping;
}
export function mapAnswers(answers, mapping) {
  return Object.fromEntries(Object.entries(answers).map(([key, value]) => [mapping[key] || key, value]));
}
