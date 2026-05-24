/**
 * FEES Clinical Data & Therapy Suggestion Engine
 * Evidence-based recommendations for speech-language pathologists
 */

const FEES_DATA = {

  /* ── Penetration-Aspiration Scale (Rosenbek et al., 1996) ── */
  PAScale: {
    1: { label: "No entry", description: "Material does not enter the airway", severity: "normal" },
    2: { label: "Penetration – cleared", description: "Material enters above cords, ejected", severity: "mild" },
    3: { label: "Penetration – not cleared", description: "Material remains above cords, no response", severity: "mild" },
    4: { label: "Penetration to cords – cleared", description: "Material contacts cords, ejected", severity: "moderate" },
    5: { label: "Penetration to cords – not cleared", description: "Material contacts cords, remains", severity: "moderate" },
    6: { label: "Aspiration – cough response", description: "Material enters below cords, coughed out", severity: "moderate" },
    7: { label: "Aspiration – no cough", description: "Material below cords, response attempted", severity: "severe" },
    8: { label: "Silent aspiration", description: "Material below cords, no response", severity: "severe" }
  },

  /* ── IDDSI Framework ── */
  IDDSILiquid: {
    0: { name: "Thin", color: "#ffffff", description: "Water, juice, tea, coffee" },
    1: { name: "Slightly Thick", color: "#f0f0f0", description: "Flows like water but slightly slow" },
    2: { name: "Mildly Thick", color: "#ffb3ba", description: "Thicker than water, clear spoon trail" },
    3: { name: "Liquidised / Moderately Thick", color: "#ffdfba", description: "Smooth, pourable, no lumps" },
    4: { name: "Pureed / Extremely Thick", color: "#ffffba", description: "Can be piped, holds shape" }
  },

  IDDSIFood: {
    3: { name: "Liquidised", color: "#ffdfba", description: "Smooth, no lumps, requires no chewing" },
    4: { name: "Pureed", color: "#ffffba", description: "Soft, moist, no chewing required" },
    5: { name: "Minced & Moist", color: "#baffc9", description: "Small soft pieces, minimal chewing" },
    6: { name: "Soft & Bite-Sized", color: "#bae1ff", description: "Tender, moist, can be mashed" },
    7: { name: "Regular", color: "#e8baff", description: "Normal diet, all textures" }
  },

  /* ── Secretion Rating Scale ── */
  secretionScale: {
    1: { label: "1 – Normal", description: "No secretions visible or trace secretions on vocal folds only", severity: "normal" },
    2: { label: "2 – Mild", description: "Secretions in pyriform sinuses or valleculae, but cleared spontaneously", severity: "mild" },
    3: { label: "3 – Moderate", description: "Secretions pooling in pharynx, not spontaneously cleared", severity: "moderate" },
    4: { label: "4 – Severe", description: "Copious secretions in airway with transglottic aspiration", severity: "severe" }
  },

  /* ── Residue Severity ── */
  residueSeverity: {
    "none":    { label: "None", severity: "normal" },
    "coating": { label: "Coating only", severity: "mild" },
    "partial": { label: "Partial filling", severity: "moderate" },
    "full":    { label: "Full filling", severity: "severe" }
  },

  /* ── Compensatory Strategies ── */
  strategies: [
    { id: "chin_tuck", name: "Chin Tuck / Head Flexion", description: "Widens valleculae, narrows airway entrance" },
    { id: "head_turn_left", name: "Head Turn Left", description: "Closes ipsilateral pyriform sinus, directs bolus to stronger side" },
    { id: "head_turn_right", name: "Head Turn Right", description: "Closes ipsilateral pyriform sinus, directs bolus to stronger side" },
    { id: "head_back", name: "Head Back / Tilt", description: "Uses gravity to assist bolus through oral cavity" },
    { id: "effortful_swallow", name: "Effortful Swallow", description: "Increases tongue base retraction and pharyngeal pressure" },
    { id: "mendelsohn", name: "Mendelsohn Maneuver", description: "Prolongs laryngeal elevation and cricopharyngeal opening" },
    { id: "supraglottic", name: "Supraglottic Swallow", description: "Voluntary airway closure before/during swallow" },
    { id: "super_supraglottic", name: "Super-supraglottic Swallow", description: "More forceful VF adduction, for reduced airway closure" },
    { id: "multiple_swallows", name: "Multiple Swallows", description: "Clears residue via successive swallows" },
    { id: "liquid_wash", name: "Liquid Wash", description: "Uses liquid to clear solid residue" },
    { id: "alternating", name: "Alternating Consistencies", description: "Alternates solids and liquids to clear residue" }
  ],

  /* ── Therapy Exercises (evidence-based) ── */
  therapyExercises: {
    shaker: {
      name: "Shaker Exercise (Head Raising)",
      icon: "💪",
      indication: "Reduced cricopharyngeal opening, post-swallow residue in pyriform sinuses, reduced laryngeal elevation",
      description: "Strengthens suprahyoid muscles to improve laryngeal elevation and UES opening",
      protocol: "Supine head raises: 3 sustained (60 sec) + 30 repetitions, 3x/day"
    },
    effortful: {
      name: "Effortful Swallow Exercise",
      icon: "🔄",
      indication: "Reduced tongue base retraction, pharyngeal residue in valleculae",
      description: "Improves tongue base posterior movement and pharyngeal constriction",
      protocol: "Swallow as hard as possible; 3 sets of 10 daily"
    },
    mendelsohn: {
      name: "Mendelsohn Maneuver Training",
      icon: "⬆️",
      indication: "Reduced laryngeal elevation / excursion, cricopharyngeal dysfunction",
      description: "Volitional prolongation of laryngeal elevation to extend UES opening time",
      protocol: "During swallow, hold larynx at peak elevation 2-3 seconds; 3 sets of 10 daily"
    },
    masako: {
      name: "Masako / Tongue-Hold Maneuver",
      icon: "👅",
      indication: "Reduced posterior pharyngeal wall motion, delayed swallow initiation",
      description: "Strengthens base of tongue and posterior pharyngeal wall contact",
      protocol: "Swallow while tongue tip held between front teeth; 3 sets of 10 daily"
    },
    thermal_tactile: {
      name: "Thermal-Tactile Application (TTA)",
      icon: "🌡️",
      indication: "Delayed oral/pharyngeal swallow initiation",
      description: "Cold stimulation heightens sensory awareness and speeds swallow trigger",
      protocol: "Cold laryngeal mirror stroked on anterior faucial pillars before swallow; 10-15 min sessions"
    },
    vitalstim: {
      name: "Neuromuscular Electrical Stimulation (NMES)",
      icon: "⚡",
      indication: "Reduced laryngeal elevation, pharyngeal weakness, post-stroke dysphagia",
      description: "Electrical stimulation of swallowing musculature to improve strength/coordination",
      protocol: "Applied to anterior neck with simultaneous swallow exercises; per certified clinician protocol"
    },
    cough_training: {
      name: "Cough Reflex Training",
      icon: "🫁",
      indication: "Silent aspiration, reduced cough reflex, decreased laryngeal sensitivity",
      description: "Improves airway protective mechanisms and reflexive cough strength",
      protocol: "Citric acid inhalation + voluntary cough practice; 3 sets of 10 strong coughs daily"
    },
    lax_vox: {
      name: "Lax Vox / Vocal Function Exercises",
      icon: "🎵",
      indication: "Reduced vocal fold adduction/abduction, poor airway protection during swallow",
      description: "Water resistance exercises to improve laryngeal muscle strength and coordination",
      protocol: "Phonating 'oo' through tube submerged in water; 4 sets of 4 daily"
    },
    biofeedback: {
      name: "FEES Biofeedback Therapy",
      icon: "🖥️",
      indication: "Patient able to self-monitor; difficulty modifying swallow technique",
      description: "Real-time endoscopic visualization to coach compensatory strategy use",
      protocol: "3-5 sessions using FEES feedback; clinician-guided maneuver training"
    },
    oromotor: {
      name: "Oromotor Strengthening",
      icon: "🦷",
      indication: "Reduced tongue strength, oral residue, poor bolus control",
      description: "Tongue and lip exercises to improve oral phase of swallowing",
      protocol: "Iowa Oral Performance Instrument (IOPI) or tongue depressor exercises; 3x/day"
    }
  }
};

/* ══════════════════════════════════════════════════════
   THERAPY SUGGESTION ENGINE
   Maps clinical FEES findings → recommended therapies
   ══════════════════════════════════════════════════════ */

function generateTherapySuggestions(formData) {
  const suggestions = [];
  const findings = analyzeFEESFindings(formData);
  const diets = determineDietRecommendations(formData);

  /* ── Finding-based recommendations ── */
  if (findings.silentAspiration) {
    suggestions.push({
      priority: "CRITICAL",
      finding: "Silent Aspiration Detected (PAS 8)",
      therapies: [
        FEES_DATA.therapyExercises.cough_training,
        FEES_DATA.therapyExercises.biofeedback
      ],
      immediateAction: "Restrict all oral intake pending further evaluation. Consider NGT/PEG assessment. Refer to pulmonology."
    });
  }

  if (findings.aspiration) {
    suggestions.push({
      priority: "HIGH",
      finding: "Aspiration with Cough Response (PAS 6-7)",
      therapies: [
        FEES_DATA.therapyExercises.cough_training,
        FEES_DATA.therapyExercises.vitalstim
      ],
      compensatoryStrategies: ["Supraglottic swallow", "Super-supraglottic swallow"],
      immediateAction: "Dietary modification required. Modify consistencies per IDDSI recommendations."
    });
  }

  if (findings.penetration) {
    suggestions.push({
      priority: "MODERATE",
      finding: "Laryngeal Penetration (PAS 2-5)",
      therapies: [
        FEES_DATA.therapyExercises.mendelsohn,
        FEES_DATA.therapyExercises.lax_vox
      ],
      compensatoryStrategies: ["Chin tuck", "Supraglottic swallow"],
      dietModification: "May trial with modified textures and close monitoring"
    });
  }

  if (findings.vallecularResidue) {
    suggestions.push({
      priority: "MODERATE",
      finding: "Vallecular Residue — Reduced Tongue Base Retraction",
      therapies: [
        FEES_DATA.therapyExercises.effortful,
        FEES_DATA.therapyExercises.masako,
        FEES_DATA.therapyExercises.oromotor
      ],
      compensatoryStrategies: ["Effortful swallow", "Multiple swallows", "Chin tuck"]
    });
  }

  if (findings.pyriformResidue) {
    suggestions.push({
      priority: "MODERATE",
      finding: "Pyriform Sinus Residue — Reduced Laryngeal Elevation / UES Dysfunction",
      therapies: [
        FEES_DATA.therapyExercises.shaker,
        FEES_DATA.therapyExercises.mendelsohn
      ],
      compensatoryStrategies: ["Head turn to affected side", "Mendelsohn maneuver", "Multiple swallows"]
    });
  }

  if (findings.delayedInitiation) {
    suggestions.push({
      priority: "MODERATE",
      finding: "Delayed Pharyngeal Swallow Initiation",
      therapies: [
        FEES_DATA.therapyExercises.thermal_tactile,
        FEES_DATA.therapyExercises.masako,
        FEES_DATA.therapyExercises.biofeedback
      ],
      compensatoryStrategies: ["Supraglottic swallow", "Smaller bolus volumes", "Alternating consistencies"]
    });
  }

  if (findings.reducedLaryngealElevation) {
    suggestions.push({
      priority: "MODERATE",
      finding: "Reduced Laryngeal Elevation",
      therapies: [
        FEES_DATA.therapyExercises.shaker,
        FEES_DATA.therapyExercises.mendelsohn,
        FEES_DATA.therapyExercises.vitalstim
      ],
      compensatoryStrategies: ["Mendelsohn maneuver", "Head back posture (if airway protection adequate)"]
    });
  }

  if (findings.reducedVFClosure) {
    suggestions.push({
      priority: "HIGH",
      finding: "Reduced Vocal Fold Closure / Airway Protection",
      therapies: [
        FEES_DATA.therapyExercises.lax_vox,
        FEES_DATA.therapyExercises.vitalstim
      ],
      compensatoryStrategies: ["Super-supraglottic swallow", "Supraglottic swallow"]
    });
  }

  if (findings.poorSecretions) {
    suggestions.push({
      priority: "MODERATE",
      finding: "Impaired Secretion Management (Rating ≥ 3)",
      therapies: [
        FEES_DATA.therapyExercises.cough_training
      ],
      compensatoryStrategies: ["Frequent throat clearing", "Saline nebulisation before meals", "Upright positioning 90°"]
    });
  }

  if (findings.reducedTongueBase) {
    suggestions.push({
      priority: "LOW",
      finding: "Reduced Base of Tongue Retraction",
      therapies: [
        FEES_DATA.therapyExercises.effortful,
        FEES_DATA.therapyExercises.oromotor,
        FEES_DATA.therapyExercises.masako
      ],
      compensatoryStrategies: ["Effortful swallow maneuver", "Tongue resistance exercises"]
    });
  }

  return { suggestions, diets, findings };
}

function analyzeFEESFindings(formData) {
  const trials = formData.swallowTrials || [];
  const preSwallow = formData.preSwallow || {};
  const therapeutic = formData.therapeutic || {};

  const maxPAS = trials.reduce((max, t) => Math.max(max, parseInt(t.pasScore) || 0), 0);
  const hasResidue = (loc) => trials.some(t => (t.residueLocations || []).includes(loc) && t.residueSeverity !== 'none' && t.residueSeverity);

  return {
    silentAspiration: maxPAS === 8,
    aspiration: maxPAS >= 6 && maxPAS <= 7,
    penetration: maxPAS >= 2 && maxPAS <= 5,
    vallecularResidue: hasResidue('valleculae'),
    pyriformResidue: hasResidue('pyriform'),
    postCricoidResidue: hasResidue('post_cricoid'),
    pharyngealWallResidue: hasResidue('pharyngeal_walls'),
    delayedInitiation: trials.some(t => t.swallowInitiation === 'delayed'),
    reducedLaryngealElevation: preSwallow.laryngealElevation === 'reduced' || preSwallow.laryngealElevation === 'absent',
    reducedVFClosure: preSwallow.vfClosure === 'incomplete' || preSwallow.vocalFoldMobilityLeft !== 'normal' || preSwallow.vocalFoldMobilityRight !== 'normal',
    poorSecretions: parseInt(preSwallow.secretionRating) >= 3,
    reducedTongueBase: preSwallow.tongueBaseRetraction === 'reduced' || preSwallow.tongueBaseRetraction === 'absent',
    maxPAS
  };
}

function determineDietRecommendations(formData) {
  const trials = formData.swallowTrials || [];
  const therapeutic = formData.therapeutic || {};

  // Determine safest liquid consistency that is tolerated
  const consistencyResults = {};
  trials.forEach(t => {
    const c = t.consistency;
    const pas = parseInt(t.pasScore) || 1;
    if (c) {
      if (!consistencyResults[c]) consistencyResults[c] = [];
      consistencyResults[c].push(pas);
    }
  });

  const getSafeConsistencies = () => {
    const safe = [];
    const order = ['thin', 'nectar', 'honey', 'puree', 'soft', 'regular'];
    order.forEach(c => {
      const scores = consistencyResults[c];
      if (scores) {
        const maxPAS = Math.max(...scores);
        if (maxPAS <= 2) safe.push({ consistency: c, safe: true, pasMax: maxPAS });
        else safe.push({ consistency: c, safe: false, pasMax: maxPAS });
      }
    });
    return safe;
  };

  // Determine recommended liquid IDDSI level
  let liquidIDDSI = 0;
  const findings = analyzeFEESFindings(formData);
  if (findings.silentAspiration) liquidIDDSI = 4;
  else if (findings.aspiration) liquidIDDSI = consistencyResults['nectar'] ? 2 : 3;
  else if (findings.penetration) liquidIDDSI = 2;

  // Determine recommended food IDDSI level
  let foodIDDSI = 7;
  const hasPhysicalResidue = findings.vallecularResidue || findings.pyriformResidue;
  if (findings.silentAspiration) foodIDDSI = 4;
  else if (hasPhysicalResidue) foodIDDSI = 5;
  else if (findings.penetration) foodIDDSI = 6;

  // Consider manual override from therapeutic recommendations
  if (therapeutic.recommendedLiquidIDDSI !== undefined && therapeutic.recommendedLiquidIDDSI !== '') {
    liquidIDDSI = parseInt(therapeutic.recommendedLiquidIDDSI);
  }
  if (therapeutic.recommendedFoodIDDSI !== undefined && therapeutic.recommendedFoodIDDSI !== '') {
    foodIDDSI = parseInt(therapeutic.recommendedFoodIDDSI);
  }

  return {
    liquid: { level: liquidIDDSI, ...FEES_DATA.IDDSILiquid[liquidIDDSI] },
    food: { level: foodIDDSI, ...FEES_DATA.IDDSIFood[foodIDDSI] },
    safeConsistencies: getSafeConsistencies()
  };
}
