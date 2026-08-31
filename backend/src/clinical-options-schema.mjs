export const clinicalOptionsSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'case_summary',
    'urgency',
    'diagnostic_options',
    'management_options',
    'questions_to_resolve',
    'physician_selection_required',
    'final_decision_owner',
    'limitations'
  ],
  properties: {
    case_summary: { type: 'string', minLength: 1, maxLength: 1200 },
    urgency: {
      type: 'object',
      additionalProperties: false,
      required: ['level', 'rationale', 'evidence_chunk_ids'],
      properties: {
        level: {
          type: 'string',
          enum: ['routine', 'accelerated', 'same_day', 'emergency', 'uncertain']
        },
        rationale: { type: 'string', minLength: 1, maxLength: 1200 },
        evidence_chunk_ids: {
          type: 'array',
          items: { type: 'string', maxLength: 120 },
          uniqueItems: true,
          maxItems: 12
        }
      }
    },
    diagnostic_options: {
      type: 'array',
      minItems: 2,
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'id', 'label', 'support_level', 'supporting_facts',
          'against_or_missing_facts', 'tests_to_discriminate',
          'evidence_chunk_ids', 'selected'
        ],
        properties: {
          id: { type: 'string', pattern: '^[a-z0-9_-]{2,80}$' },
          label: { type: 'string', minLength: 2, maxLength: 180 },
          support_level: {
            type: 'string',
            enum: ['strong', 'moderate', 'weak', 'insufficient']
          },
          supporting_facts: {
            type: 'array',
            items: { type: 'string', maxLength: 400 },
            maxItems: 10
          },
          against_or_missing_facts: {
            type: 'array',
            items: { type: 'string', maxLength: 400 },
            maxItems: 10
          },
          tests_to_discriminate: {
            type: 'array',
            items: { type: 'string', maxLength: 500 },
            maxItems: 10
          },
          evidence_chunk_ids: {
            type: 'array',
            items: { type: 'string', maxLength: 120 },
            uniqueItems: true,
            maxItems: 12
          },
          selected: { type: 'boolean', const: false }
        }
      }
    },
    management_options: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'id', 'label', 'applies_to_diagnostic_option_ids', 'rationale',
          'components', 'monitoring', 'risks_and_constraints',
          'evidence_chunk_ids', 'selected', 'physician_selection_required'
        ],
        properties: {
          id: { type: 'string', pattern: '^[a-z0-9_-]{2,80}$' },
          label: { type: 'string', minLength: 2, maxLength: 220 },
          applies_to_diagnostic_option_ids: {
            type: 'array',
            items: { type: 'string', maxLength: 80 },
            uniqueItems: true,
            maxItems: 5
          },
          rationale: { type: 'string', minLength: 1, maxLength: 1600 },
          components: {
            type: 'array',
            maxItems: 12,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['intervention', 'regimen', 'duration', 'status'],
              properties: {
                intervention: { type: 'string', minLength: 1, maxLength: 500 },
                regimen: { type: ['string', 'null'], maxLength: 500 },
                duration: { type: ['string', 'null'], maxLength: 300 },
                status: {
                  type: 'string',
                  enum: ['source_supported', 'requires_local_label_check', 'insufficient_source_detail']
                }
              }
            }
          },
          monitoring: {
            type: 'array',
            items: { type: 'string', maxLength: 500 },
            maxItems: 12
          },
          risks_and_constraints: {
            type: 'array',
            items: { type: 'string', maxLength: 500 },
            maxItems: 15
          },
          evidence_chunk_ids: {
            type: 'array',
            items: { type: 'string', maxLength: 120 },
            uniqueItems: true,
            maxItems: 12
          },
          selected: { type: 'boolean', const: false },
          physician_selection_required: { type: 'boolean', const: true }
        }
      }
    },
    questions_to_resolve: {
      type: 'array',
      items: { type: 'string', maxLength: 500 },
      maxItems: 15
    },
    physician_selection_required: { type: 'boolean', const: true },
    final_decision_owner: { type: 'string', const: 'physician' },
    limitations: {
      type: 'array',
      items: { type: 'string', maxLength: 600 },
      maxItems: 15
    }
  }
};
