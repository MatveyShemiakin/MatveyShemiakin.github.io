export const clinicalFactsSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'laterality',
    'course',
    'onset',
    'symptoms',
    'examination',
    'procedures',
    'suspected_diagnoses',
    'red_flags',
    'negated_facts',
    'source_confidence'
  ],
  properties: {
    laterality: {
      type: ['string', 'null'],
      enum: ['unilateral', 'bilateral', 'asymmetric', null]
    },
    course: {
      type: ['string', 'null'],
      enum: ['first', 'recurrent', 'chronic', null]
    },
    onset: {
      type: ['string', 'null'],
      enum: ['hours', 'days', 'weeks', 'months', 'chronic', null]
    },
    symptoms: {
      type: 'array',
      items: {
        type: 'string',
        enum: [
          'pain', 'photophobia', 'redness', 'itching', 'dryness',
          'foreign_body_sensation', 'tearing', 'flashes', 'floaters',
          'field_defect', 'halos', 'distortion', 'diplopia',
          'vision_loss', 'headache', 'nausea'
        ]
      },
      uniqueItems: true
    },
    examination: {
      type: 'object',
      additionalProperties: false,
      required: [
        'visual_acuity_reduced', 'iop_mm_hg', 'iop_state',
        'anterior_chamber_cells', 'hypopyon', 'synechiae',
        'corneal_infiltrate', 'epithelial_defect', 'vitritis',
        'retinal_tear', 'retinal_detachment'
      ],
      properties: {
        visual_acuity_reduced: { type: ['boolean', 'null'] },
        iop_mm_hg: { type: ['number', 'null'], minimum: 0, maximum: 100 },
        iop_state: {
          type: ['string', 'null'],
          enum: ['low', 'normal', 'high', null]
        },
        anterior_chamber_cells: { type: ['string', 'null'] },
        hypopyon: { type: ['boolean', 'null'] },
        synechiae: { type: ['boolean', 'null'] },
        corneal_infiltrate: { type: ['boolean', 'null'] },
        epithelial_defect: { type: ['boolean', 'null'] },
        vitritis: { type: ['boolean', 'null'] },
        retinal_tear: { type: ['boolean', 'null'] },
        retinal_detachment: { type: ['boolean', 'null'] }
      }
    },
    procedures: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['recent_cataract_surgery', 'recent_eye_surgery', 'recent_injection']
      },
      uniqueItems: true
    },
    suspected_diagnoses: {
      type: 'array',
      items: { type: 'string', maxLength: 120 },
      maxItems: 6
    },
    red_flags: {
      type: 'array',
      items: { type: 'string', maxLength: 160 },
      maxItems: 10
    },
    negated_facts: {
      type: 'array',
      items: { type: 'string', maxLength: 120 },
      maxItems: 20
    },
    source_confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1
    }
  }
};

export function emptyClinicalFacts() {
  return {
    laterality: null,
    course: null,
    onset: null,
    symptoms: [],
    examination: {
      visual_acuity_reduced: null,
      iop_mm_hg: null,
      iop_state: null,
      anterior_chamber_cells: null,
      hypopyon: null,
      synechiae: null,
      corneal_infiltrate: null,
      epithelial_defect: null,
      vitritis: null,
      retinal_tear: null,
      retinal_detachment: null
    },
    procedures: [],
    suspected_diagnoses: [],
    red_flags: [],
    negated_facts: [],
    source_confidence: 0
  };
}
