/* ===================================================
   NBI EndoReport — app.js
   Core application logic, assessment engine, PDF generation
   Based on: IPCL/Ni Classification, ELS Classification,
   WHO OPMD Grading, International Journal Evidence
   =================================================== */

'use strict';

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
const state = {
  currentSection: 1,
  lesions: [],        // WL lesion objects
  nbiLesions: [],     // NBI assessment per lesion
  lesionCounter: 0,
  riskScore: 0,
  riskFactors: [],
  assessment: null
};

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Set today's date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('examDate').value = today;
  
  const dobInput = document.getElementById('patientDob');
  if (dobInput) dobInput.max = today;

  // Title Case on blur for all text inputs
  document.querySelectorAll('input[type="text"], textarea').forEach(el => {
    el.addEventListener('blur', function() {
      if (!this.value) return;
      const oldVal = this.value;
      // Capitalise first letter of each word
      const newVal = this.value.replace(/\b\w/g, char => char.toUpperCase());
      if (oldVal !== newVal) {
        this.value = newVal;
        this.classList.add('title-cased');
        setTimeout(() => this.classList.remove('title-cased'), 500);
        updatePreview();
      }
    });
  });

  // Wire up checkbox-cards for risk factors
  document.querySelectorAll('.checkbox-card input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      cb.closest('.checkbox-card').classList.toggle('checked', cb.checked);
      updateRiskProfile();
    });
  });

  updatePreview();
  showToast('Welcome — begin by filling in patient details', 'info');
});

// ─────────────────────────────────────────────
//  NAVIGATION
// ─────────────────────────────────────────────
function goToSection(n) {
  const current = document.querySelector('.form-section.active');
  if (current) current.classList.remove('active');

  const target = document.getElementById(`section${n}`);
  if (target) target.classList.add('active');

  // Update step indicators
  document.querySelectorAll('.step').forEach((s, i) => {
    s.classList.remove('active', 'completed');
    if (i + 1 === n) s.classList.add('active');
    else if (i + 1 < n) s.classList.add('completed');
  });

  state.currentSection = n;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function nextSection(n) {
  if (n < 6) goToSection(n + 1);
  if (n + 1 === 4) syncNBILesions();
  if (n + 1 === 5) computeAssessment();
  if (n + 1 === 6) renderFinalReport();
}

function prevSection(n) {
  if (n > 1) goToSection(n - 1);
}

function newReport() {
  if (!confirm('Start a new report? All current data will be cleared.')) return;
  location.reload();
}

// ─────────────────────────────────────────────
//  LESION MANAGEMENT (White Light)
// ─────────────────────────────────────────────
function addLesion() {
  state.lesionCounter++;
  const id = state.lesionCounter;
  const noMsg = document.getElementById('noLesionsMsg');
  if (noMsg) noMsg.style.display = 'none';

  const template = document.getElementById('lesionTemplate');
  const clone = template.content.cloneNode(true);

  // Replace placeholder IDs
  clone.querySelector('.lesion-card').id = `lesion-${id}`;
  clone.querySelector('.lesion-num-text').textContent = id;
  clone.querySelector('[onclick*="removeLesion"]').setAttribute('onclick', `removeLesion(${id})`);

  document.getElementById('lesionsContainer').appendChild(clone);

  state.lesions.push({ id, data: {} });
  updatePreview();
  showToast(`Lesion ${id} added`, 'success');
}

function removeLesion(id) {
  const card = document.getElementById(`lesion-${id}`);
  if (card) {
    card.style.opacity = '0';
    card.style.transform = 'translateY(-10px)';
    card.style.transition = 'all 0.25s';
    setTimeout(() => card.remove(), 250);
  }
  state.lesions = state.lesions.filter(l => l.id !== id);

  // Also remove corresponding NBI card
  const nbiCard = document.getElementById(`nbi-${id}`);
  if (nbiCard) {
    nbiCard.style.opacity = '0';
    setTimeout(() => nbiCard.remove(), 250);
  }
  state.nbiLesions = state.nbiLesions.filter(l => l.id !== id);

  if (state.lesions.length === 0) {
    const noMsg = document.getElementById('noLesionsMsg');
    if (noMsg) noMsg.style.display = 'flex';
  }
  updatePreview();
}

// ─────────────────────────────────────────────
//  NBI LESION SYNC
// ─────────────────────────────────────────────
function syncNBILesions() {
  const container = document.getElementById('nbiLesionsContainer');
  const hint = document.getElementById('nbiLesionHint');

  // Gather all lesion cards currently in DOM
  const lesionCards = document.querySelectorAll('.lesion-card');

  if (lesionCards.length === 0) {
    if (hint) hint.textContent = 'No WL lesions documented. Add lesions in Step 3.';
    return;
  }

  if (hint) hint.style.display = 'none';

  lesionCards.forEach(card => {
    const idAttr = card.id; // lesion-N
    const id = idAttr.replace('lesion-', '');
    if (document.getElementById(`nbi-${id}`)) return; // already synced

    const siteEl = card.querySelector('.lesion-site');
    const site = siteEl ? siteEl.value || `Lesion ${id}` : `Lesion ${id}`;

    const template = document.getElementById('nbiLesionTemplate');
    const clone = template.content.cloneNode(true);

    // Replace placeholder text
    const html = clone.querySelector('.nbi-lesion-card');
    html.id = `nbi-${id}`;
    html.querySelector('.nbi-site-label').textContent = site;
    html.querySelector('.nbi-badge-area').id = `nbi-badge-${id}`;

    // Fix select IDs and onchange
    const ipclSelect = html.querySelector('.nbi-ipcl');
    ipclSelect.id = `nbi-ipcl-${id}`;
    ipclSelect.setAttribute('onchange', `updateNBIBadge('${id}'); updatePreview()`);

    const elsSelect = html.querySelector('.nbi-els');
    elsSelect.id = `nbi-els-${id}`;

    container.appendChild(html);
    state.nbiLesions.push({ id });
  });
}

function updateNBIBadge(id) {
  const select = document.getElementById(`nbi-ipcl-${id}`);
  const badgeArea = document.getElementById(`nbi-badge-${id}`);
  if (!select || !badgeArea) return;

  const val = select.value;
  const map = {
    '0':  { cls: 'badge-grey',   label: 'Type 0 – Indeterminate' },
    'I':  { cls: 'badge-green',  label: 'Type I – Benign' },
    'II': { cls: 'badge-blue',   label: 'Type II – Inflammatory' },
    'III':{ cls: 'badge-yellow', label: 'Type III – Premalignant' },
    'IV': { cls: 'badge-orange', label: 'Type IV – High Dysplasia' },
    'Va': { cls: 'badge-red',    label: 'Type Va – Early SCC' },
    'Vb': { cls: 'badge-red',    label: 'Type Vb – Invasive SCC' },
    'Vc': { cls: 'badge-red',    label: 'Type Vc – Advanced SCC' },
  };

  if (val && map[val]) {
    badgeArea.innerHTML = `<span class="badge ${map[val].cls}">${map[val].label}</span>`;
  } else {
    badgeArea.innerHTML = '';
  }
}

// ─────────────────────────────────────────────
//  REFERENCE TABS
// ─────────────────────────────────────────────
function showRefTab(tab) {
  ['ipcl', 'els', 'who'].forEach(t => {
    document.getElementById(`ref-${t}`).classList.toggle('hidden', t !== tab);
    document.getElementById(`tab-${t}`).classList.toggle('active', t === tab);
  });
}

// ─────────────────────────────────────────────
//  RISK PROFILE UPDATE
// ─────────────────────────────────────────────
function updateRiskProfile() {
  state.riskFactors = [];
  if (document.getElementById('rfTobacco')?.checked)   state.riskFactors.push('Tobacco use');
  if (document.getElementById('rfAlcohol')?.checked)   state.riskFactors.push('Alcohol use');
  if (document.getElementById('rfBetel')?.checked)     state.riskFactors.push('Betel nut / Pan use');
  if (document.getElementById('rfHpv')?.checked)       state.riskFactors.push('HPV positive');
  if (document.getElementById('rfGerd')?.checked)      state.riskFactors.push('GERD / LPR');
  if (document.getElementById('rfImmunocomp')?.checked) state.riskFactors.push('Immunocompromised');
  if (document.getElementById('rfPrevCancer')?.checked) state.riskFactors.push('Prior head & neck cancer');
  if (document.getElementById('rfOsmf')?.checked)      state.riskFactors.push('Oral submucous fibrosis (OSMF)');
  updatePreview();
}

// ─────────────────────────────────────────────
//  AUTOMATED ASSESSMENT ENGINE
//  Based on:
//    - Takano/Ni IPCL scoring
//    - ELS classification
//    - WHO OPMD risk criteria
//    - Clinical risk factor weighting
//    - Anatomical site high-risk scoring
// ─────────────────────────────────────────────
function computeAssessment() {
  const ipclScores = { '': 0, '0': 1, 'I': 0, 'II': 1, 'III': 3, 'IV': 5, 'Va': 7, 'Vb': 9, 'Vc': 10 };
  const elsScores  = { 'NA': 0, 'LVC': 0, 'PVC-NA': 4, 'PVC-WA': 8 };

  const HIGH_RISK_SITES = [
    'tongue – right lateral', 'tongue – left lateral', 'tongue – ventral',
    'floor of mouth', 'base of tongue', 'soft palate', 'retromolar trigone',
    'true vocal cord', 'pyriform sinus', 'post-cricoid', 'epiglottis'
  ];

  const HIGH_RISK_TYPES = ['erythroplakia', 'erythroleukoplakia', 'proliferative verrucous'];

  let totalIPCLScore = 0;
  let highestIPCL = '';
  let highestIPCLScore = 0;
  let perLesionResults = [];

  // Collect all NBI lesion cards
  const nbiCards = document.querySelectorAll('.nbi-lesion-card');

  nbiCards.forEach(card => {
    const id = card.id.replace('nbi-', '');
    const wlCard = document.getElementById(`lesion-${id}`);

    const ipclEl = card.querySelector('.nbi-ipcl');
    const elsEl  = card.querySelector('.nbi-els');
    const impEl  = card.querySelector('.nbi-impression');
    const siteLabel = card.querySelector('.nbi-site-label');

    const ipcl = ipclEl ? ipclEl.value : '';
    const els  = elsEl  ? elsEl.value  : 'NA';
    const impression = impEl ? impEl.value : '';
    const site = siteLabel ? siteLabel.textContent : `Lesion ${id}`;

    // WL data
    let lesionType = '';
    let lesionSize = '';
    let lesionColor = '';
    let lesionSurface = '';
    let lesionBorders = '';

    if (wlCard) {
      lesionType    = wlCard.querySelector('.lesion-type')?.value || '';
      lesionSize    = wlCard.querySelector('.lesion-size')?.value || '';
      lesionColor   = wlCard.querySelector('.lesion-color')?.value || '';
      lesionSurface = wlCard.querySelector('.lesion-surface')?.value || '';
      lesionBorders = wlCard.querySelector('.lesion-borders')?.value || '';
    }

    let score = ipclScores[ipcl] || 0;
    score += (elsScores[els] || 0) * 0.5; // ELS contributes at 50%

    // Site risk modifier
    const siteLower = site.toLowerCase();
    const siteHighRisk = HIGH_RISK_SITES.some(s => siteLower.includes(s));
    if (siteHighRisk) score += 2;

    // Lesion type risk modifier
    const typeLower = lesionType.toLowerCase();
    const typeHighRisk = HIGH_RISK_TYPES.some(t => typeLower.includes(t));
    if (typeHighRisk) score += 2;

    // Color modifier
    if (lesionColor === 'Red' || lesionColor === 'Mixed red-white') score += 1.5;

    // Surface modifier
    if (lesionSurface === 'Ulcerated' || lesionSurface === 'Friable') score += 1.5;
    if (lesionSurface === 'Verrucous / warty') score += 1;

    // Border modifier
    if (lesionBorders === 'Ill-defined' || lesionBorders === 'Irregular') score += 1;

    if ((ipclScores[ipcl] || 0) > highestIPCLScore) {
      highestIPCLScore = ipclScores[ipcl] || 0;
      highestIPCL = ipcl;
    }

    totalIPCLScore += score;

    perLesionResults.push({
      id, site, ipcl, els, score: Math.min(score, 10),
      lesionType, lesionSize, lesionColor, lesionSurface, lesionBorders,
      impression
    });
  });

  // If no NBI cards, try to use WL data for basic scoring
  if (nbiCards.length === 0) {
    document.querySelectorAll('.lesion-card').forEach(card => {
      const id = card.id.replace('lesion-', '');
      const lesionType = card.querySelector('.lesion-type')?.value || '';
      const site = card.querySelector('.lesion-site')?.value || `Lesion ${id}`;
      const lesionColor = card.querySelector('.lesion-color')?.value || '';
      let score = 0;
      if (lesionType.includes('erythroplakia') || lesionType.includes('Erythroplakia')) score += 5;
      if (lesionType.includes('non-homogeneous')) score += 3;
      if (lesionType.includes('Proliferative')) score += 6;
      if (lesionColor === 'Red' || lesionColor === 'Mixed red-white') score += 2;
      perLesionResults.push({
        id, site, ipcl: '', els: 'NA', score, lesionType, lesionSize: '', lesionColor, lesionSurface: '', lesionBorders: '', impression: ''
      });
    });
  }

  // Risk factor weighting
  let rfScore = 0;
  rfScore += state.riskFactors.includes('Tobacco use') ? 3 : 0;
  rfScore += state.riskFactors.includes('Alcohol use') ? 2 : 0;
  rfScore += state.riskFactors.includes('Betel nut / Pan use') ? 3 : 0;
  rfScore += state.riskFactors.includes('HPV positive') ? 2 : 0;
  rfScore += state.riskFactors.includes('Immunocompromised') ? 2 : 0;
  rfScore += state.riskFactors.includes('Prior head & neck cancer') ? 3 : 0;
  rfScore += state.riskFactors.includes('Oral submucous fibrosis (OSMF)') ? 2 : 0;
  rfScore = Math.min(rfScore, 8); // cap

  const maxLesionScore = perLesionResults.length > 0
    ? Math.max(...perLesionResults.map(l => l.score))
    : 0;

  const rawScore = (maxLesionScore * 0.65) + (rfScore * 0.35);
  state.riskScore = Math.min(Math.round(rawScore * 10) / 10, 10);

  let riskLevel, riskColor, riskIcon;
  if (state.riskScore < 2)       { riskLevel = 'Very Low';   riskColor = '#10b981'; riskIcon = '✅'; }
  else if (state.riskScore < 4)  { riskLevel = 'Low';        riskColor = '#34d399'; riskIcon = '🟢'; }
  else if (state.riskScore < 6)  { riskLevel = 'Moderate';   riskColor = '#f59e0b'; riskIcon = '🟡'; }
  else if (state.riskScore < 8)  { riskLevel = 'High';       riskColor = '#f97316'; riskIcon = '🟠'; }
  else                           { riskLevel = 'Very High';  riskColor = '#ef4444'; riskIcon = '🔴'; }

  state.assessment = {
    riskScore: state.riskScore,
    riskLevel,
    riskColor,
    riskIcon,
    highestIPCL: highestIPCL || 'Not classified',
    perLesionResults,
    rfScore,
    recommendations: generateRecommendations(riskLevel, highestIPCL, perLesionResults, state.riskFactors),
    followUp: generateFollowUp(riskLevel, highestIPCL)
  };

  renderAssessmentDashboard();
}

// ─────────────────────────────────────────────
//  RECOMMENDATION ENGINE
// ─────────────────────────────────────────────
function generateRecommendations(riskLevel, highestIPCL, lesions, rfs) {
  const recs = [];

  // Biopsy recommendations based on IPCL type
  const hasTypeIII  = lesions.some(l => l.ipcl === 'III');
  const hasTypeIV   = lesions.some(l => l.ipcl === 'IV');
  const hasTypeV    = lesions.some(l => l.ipcl === 'Va' || l.ipcl === 'Vb' || l.ipcl === 'Vc');
  const hasTypeII   = lesions.some(l => l.ipcl === 'II');
  const hasPVC_WA   = lesions.some(l => l.els === 'PVC-WA');
  const hasPVC_NA   = lesions.some(l => l.els === 'PVC-NA');
  const hasErythroplakia = lesions.some(l =>
    l.lesionType.toLowerCase().includes('erythroplakia') ||
    l.lesionColor === 'Red' || l.lesionColor === 'Mixed red-white');
  const hasPVL = lesions.some(l => l.lesionType.toLowerCase().includes('proliferative'));

  if (hasTypeV || hasPVC_WA) {
    recs.push({
      priority: 'urgent',
      icon: '🔴',
      title: 'URGENT: Histopathological Biopsy Required',
      body: `NBI demonstrates ${hasTypeV ? 'Type V IPCL pattern' : 'PVC-WA pattern'} indicating highly suspicious vascularity consistent with invasive or pre-invasive squamous cell carcinoma. Prompt incisional biopsy under optimal visualisation (microlaryngoscopy/MLB if laryngeal) is mandatory. Do not delay. Refer to head & neck oncology MDT.`
    });
    recs.push({
      priority: 'urgent',
      icon: '⚕️',
      title: 'Urgent MDT Referral',
      body: 'Refer immediately to Head & Neck Cancer Multidisciplinary Team (MDT). Includes head & neck surgery, radiation oncology, medical oncology, and radiologic imaging (contrast-enhanced CT/MRI of head, neck, and chest) to complete staging workup.'
    });
    recs.push({
      priority: 'urgent',
      icon: '📷',
      title: 'Imaging Staging Workup',
      body: 'Order contrast-enhanced CT of head, neck, and chest (or MRI if preferred) to assess nodal status, deep tissue invasion, and distant metastasis. Consider PET-CT for high-grade lesions.'
    });
  } else if (hasTypeIV || hasPVC_NA || hasPVL) {
    recs.push({
      priority: 'important',
      icon: '🟠',
      title: 'Biopsy Strongly Recommended',
      body: `IPCL ${hasTypeIV ? 'Type IV' : ''} ${hasPVC_NA ? '/ PVC-NA' : ''} pattern indicates high-grade epithelial dysplasia or carcinoma in situ. Targeted incisional biopsy from the most vascular area under NBI guidance is strongly recommended. If PVL suspected, map biopsy from multiple sites.`
    });
    recs.push({
      priority: 'important',
      icon: '🏥',
      title: 'Specialist Head & Neck Referral',
      body: 'Refer to head & neck surgery / oral & maxillofacial surgery for assessment and management planning. Consider surgical excision if biopsy confirms high-grade dysplasia or CIS.'
    });
  } else if (hasTypeIII || hasErythroplakia) {
    recs.push({
      priority: 'important',
      icon: '🟡',
      title: 'Biopsy Recommended',
      body: `NBI Type III pattern / erythematous component indicates moderate dysplasia probability. Targeted biopsy is recommended to obtain histopathological confirmation. Guide biopsy toward most tortuous vascular area.`
    });
    recs.push({
      priority: 'routine',
      icon: '🔬',
      title: 'Histopathology & WHO Grading',
      body: 'Submit biopsy for histopathological grading per WHO 2022 Head & Neck Tumour classification. Request: H&E staining, p53/Ki-67 IHC if moderate-severe dysplasia on routine staining.'
    });
  } else if (hasTypeII) {
    recs.push({
      priority: 'routine',
      icon: '👁️',
      title: 'Consider Biopsy / Close Surveillance',
      body: 'Type II IPCL pattern suggests inflammatory/reactive change. Biopsy recommended if lesion persists >3 weeks after elimination of local irritants (tobacco cessation, dental trauma correction). NBI surveillance in 6–8 weeks post-elimination of risk factors.'
    });
  } else {
    recs.push({
      priority: 'monitor',
      icon: '✅',
      title: 'Surveillance with Risk Factor Modification',
      body: 'NBI pattern suggests benign/inflammatory aetiology. Eliminate all identifiable risk factors (tobacco, alcohol, betel, GERD treatment). Reassess in 3–6 months. Biopsy any area showing colour change, surface change, or growth.'
    });
  }

  // Risk factor specific recommendations
  if (rfs.includes('Tobacco use') || rfs.includes('Alcohol use') || rfs.includes('Betel nut / Pan use')) {
    recs.push({
      priority: 'important',
      icon: '🚭',
      title: 'Mandatory Cessation Counselling',
      body: 'Tobacco cessation is strongly advised and is the single most important risk-reduction intervention. Refer to cessation clinic. Combined tobacco + alcohol use increases oral cancer risk 30-fold. Advise complete elimination of betel nut / pan masala. Document cessation counselling provided.'
    });
  }

  if (rfs.includes('HPV positive')) {
    recs.push({
      priority: 'routine',
      icon: '🧬',
      title: 'HPV-Specific Workup',
      body: 'HPV-positive status: Ensure p16 IHC testing on biopsy specimen. HPV-related oropharyngeal carcinoma has distinct biology and improved prognosis. Consider HPV genotyping. Counsel regarding vaccination of close contacts.'
    });
  }

  if (rfs.includes('Oral submucous fibrosis (OSMF)')) {
    recs.push({
      priority: 'important',
      icon: '🔗',
      title: 'OSMF Staging & Management',
      body: 'Oral submucous fibrosis carries 7–13% lifetime risk of OSCC. Stage OSMF severity (Khanna & Andrade classification). NBI surveillance every 3–6 months. Advise complete cessation of areca nut. Consider submucosal corticosteroid/hyaluronidase injections for trismus management.'
    });
  }

  if (rfs.includes('Prior head & neck cancer')) {
    recs.push({
      priority: 'important',
      icon: '♻️',
      title: 'Second Primary Tumour Surveillance',
      body: 'Prior head & neck cancer history necessitates vigilant surveillance. Field cancerization principle — entire upper aerodigestive tract mucosa at risk. Upper endoscopy / panendoscopy to exclude synchronous/metachronous lesions. Follow NCCN head & neck cancer surveillance guidelines.'
    });
  }

  // General recommendations
  recs.push({
    priority: 'monitor',
    icon: '📋',
    title: 'Patient Education & Documentation',
    body: 'Provide patient with written information on their diagnosis, risk factors, and warning signs requiring immediate review (rapid growth, pain, dysphagia, dyspnoea, bleeding, neck swelling). Document full photographic record with NBI images. Cross-reference with previous examinations.'
  });

  recs.push({
    priority: 'monitor',
    icon: '🍎',
    title: 'Lifestyle & Nutrition',
    body: 'Encourage Mediterranean-type diet rich in antioxidants. Ensure adequate vitamin A, C, E intake. Maintain good oral hygiene. Remove sharp dental edges/ill-fitting dentures. Ensure appropriate dental review.'
  });

  return recs;
}

// ─────────────────────────────────────────────
//  FOLLOW-UP PROTOCOL GENERATOR
// ─────────────────────────────────────────────
function generateFollowUp(riskLevel, highestIPCL) {
  const hasTypeV = ['Va', 'Vb', 'Vc'].includes(highestIPCL);
  const hasTypeIV = highestIPCL === 'IV';
  const hasTypeIII = highestIPCL === 'III';

  if (hasTypeV) {
    return [
      { period: 'Immediate (within 1–2 weeks)', action: 'Urgent biopsy, MDT referral, imaging staging. No delay in workup.', color: '#ef4444', icon: '🔴' },
      { period: '1 Month post-treatment', action: 'Treatment response assessment, wound check, pathology review.', color: '#f97316', icon: '🟠' },
      { period: '3 Monthly (Year 1–2)', action: 'NBI surveillance of operative site + entire mucosa (field cancerization). Clinical examination.', color: '#f59e0b', icon: '🟡' },
      { period: '6 Monthly (Year 3–5)', action: 'NBI endoscopy, voice/swallowing assessment, clinical review.', color: '#10b981', icon: '🟢' },
      { period: 'Annual (>5 Years)', action: 'Annual NBI endoscopy, clinical examination, imaging if indicated.', color: '#6366f1', icon: '🔵' },
    ];
  } else if (hasTypeIV) {
    return [
      { period: 'Within 2–4 weeks', action: 'Biopsy result review, surgical planning for excision/ablation if confirmed high-grade dysplasia or CIS.', color: '#f97316', icon: '🟠' },
      { period: '6–8 Weeks post-excision', action: 'Wound healing assessment, NBI examination of margins.', color: '#f59e0b', icon: '🟡' },
      { period: '3 Monthly (Year 1–2)', action: 'NBI surveillance, full mucosal examination. Photograph and map any new lesions.', color: '#f59e0b', icon: '🟡' },
      { period: '6 Monthly (Year 3–5)', action: 'NBI endoscopy, risk factor reassessment, dietary advice.', color: '#10b981', icon: '🟢' },
      { period: 'Annual (>5 Years)', action: 'Annual review, NBI if clinically indicated.', color: '#6366f1', icon: '🔵' },
    ];
  } else if (hasTypeIII) {
    return [
      { period: '2–4 Weeks', action: 'Biopsy result review. If moderate dysplasia confirmed: plan excision/ablation. If mild: enhanced surveillance.', color: '#f59e0b', icon: '🟡' },
      { period: '3 Months post-biopsy', action: 'Clinical review + NBI. Reassess site. Check for recurrence/progression.', color: '#f59e0b', icon: '🟡' },
      { period: '6 Monthly (Year 1–2)', action: 'NBI surveillance, clinical assessment. Biopsy any area of progression.', color: '#10b981', icon: '🟢' },
      { period: 'Annual (Year 3+)', action: 'Annual NBI review. Indefinite surveillance given premalignant history.', color: '#6366f1', icon: '🔵' },
    ];
  } else {
    return [
      { period: '6–8 Weeks', action: 'Eliminate risk factors (tobacco/alcohol cessation). Reassess lesion — biopsy if persistent.', color: '#f59e0b', icon: '🟡' },
      { period: '3–6 Months', action: 'NBI review. If resolved → annual review. If unchanged → biopsy + specialist referral.', color: '#10b981', icon: '🟢' },
      { period: 'Annual Review', action: 'Annual clinical + NBI surveillance. Monitor for lesion development given risk factor profile.', color: '#6366f1', icon: '🔵' },
    ];
  }
}

// ─────────────────────────────────────────────
//  RENDER ASSESSMENT DASHBOARD
// ─────────────────────────────────────────────
function renderAssessmentDashboard() {
  if (!state.assessment) return;
  const a = state.assessment;

  // Gauge animation
  const gaugeCircumference = 251.3;
  const fillPct = a.riskScore / 10;
  const dashOffset = gaugeCircumference * (1 - fillPct);

  const fill = document.getElementById('gaugeFill');
  const needle = document.getElementById('gaugeNeedle');
  const scoreText = document.getElementById('gaugeScoreText');

  if (fill) {
    setTimeout(() => {
      fill.style.strokeDashoffset = dashOffset;
      fill.style.stroke = a.riskColor;
    }, 100);
  }

  if (needle) {
    const angle = -90 + (fillPct * 180);
    setTimeout(() => {
      needle.style.transform = `rotate(${angle}deg)`;
    }, 100);
  }

  if (scoreText) scoreText.textContent = a.riskScore.toFixed(1);

  // Risk cards
  const levelText = document.getElementById('riskLevelText');
  if (levelText) {
    levelText.textContent = a.riskLevel;
    levelText.style.color = a.riskColor;
  }

  const ipclText = document.getElementById('highestIPCL');
  if (ipclText) ipclText.textContent = a.highestIPCL || 'Not assessed';

  const factorCount = document.getElementById('riskFactorCount');
  if (factorCount) factorCount.textContent = state.riskFactors.length;

  const lesionCountEl = document.getElementById('lesionCount');
  if (lesionCountEl) lesionCountEl.textContent = a.perLesionResults.length;

  // Per-lesion cards
  const perContainer = document.getElementById('perLesionCards');
  if (perContainer) {
    perContainer.innerHTML = '';
    a.perLesionResults.forEach(l => {
      const card = document.createElement('div');
      card.className = 'per-lesion-assess-card';

      const riskPct = Math.min((l.score / 10) * 100, 100);
      const fillColor = l.score < 3 ? '#10b981' : l.score < 5 ? '#f59e0b' : l.score < 7 ? '#f97316' : '#ef4444';
      const riskLabel = l.score < 3 ? 'Low' : l.score < 5 ? 'Moderate' : l.score < 7 ? 'High' : 'Very High';

      const ipclLabel = l.ipcl
        ? `IPCL Type ${l.ipcl}`
        : 'IPCL not classified';

      const elsLabel = (l.els && l.els !== 'NA') ? ` · ELS: ${l.els}` : '';

      card.innerHTML = `
        <div class="pla-header">
          <div>
            <div class="pla-site">${l.site}</div>
            <div class="pla-ipcl">${ipclLabel}${elsLabel}</div>
          </div>
          <div>
            <span class="badge" style="background:${fillColor}22;color:${fillColor};border:1px solid ${fillColor}44">${riskLabel} Risk · ${l.score.toFixed(1)}/10</span>
          </div>
        </div>
        <div class="pla-risk-bar">
          <div class="pla-risk-fill" style="width:${riskPct}%;background:linear-gradient(90deg,${fillColor}88,${fillColor})"></div>
        </div>
        <div class="pla-details">
          <div class="pla-detail-item">
            <div class="pla-detail-label">Lesion Type</div>
            <div class="pla-detail-value">${l.lesionType || '—'}</div>
          </div>
          <div class="pla-detail-item">
            <div class="pla-detail-label">Colour / Size</div>
            <div class="pla-detail-value">${l.lesionColor || '—'} · ${l.lesionSize || '—'}</div>
          </div>
          <div class="pla-detail-item">
            <div class="pla-detail-label">Surface / Borders</div>
            <div class="pla-detail-value">${l.lesionSurface || '—'} / ${l.lesionBorders || '—'}</div>
          </div>
        </div>
        ${l.impression ? `<div style="margin-top:10px;font-size:12px;color:var(--text-muted);font-style:italic;padding:8px;background:rgba(255,255,255,0.02);border-radius:6px;border-left:3px solid var(--accent-violet)">${l.impression}</div>` : ''}
      `;

      perContainer.appendChild(card);
      // Trigger bar animation
      setTimeout(() => {
        const bar = card.querySelector('.pla-risk-fill');
        if (bar) bar.style.transition = 'width 1s cubic-bezier(0.4,0,0.2,1)';
      }, 50);
    });
  }

  // Recommendations
  const recContainer = document.getElementById('recommendationsContainer');
  if (recContainer) {
    recContainer.innerHTML = '';
    a.recommendations.forEach(rec => {
      const card = document.createElement('div');
      card.className = `rec-card ${rec.priority}`;
      card.innerHTML = `
        <div class="rec-card-icon">${rec.icon}</div>
        <div class="rec-card-title">${rec.title}</div>
        <div class="rec-card-body">${rec.body}</div>
      `;
      recContainer.appendChild(card);
    });
  }

  // Follow-up timeline
  const fuContainer = document.getElementById('followUpProtocol');
  if (fuContainer) {
    fuContainer.innerHTML = '';
    a.followUp.forEach(item => {
      const el = document.createElement('div');
      el.className = 'timeline-item';
      el.innerHTML = `
        <div class="timeline-dot" style="background:${item.color}22;border:2px solid ${item.color}">${item.icon}</div>
        <div class="timeline-content">
          <div class="timeline-period">${item.period}</div>
          <div class="timeline-action">${item.action}</div>
        </div>
      `;
      fuContainer.appendChild(el);
    });
  }
}

// ─────────────────────────────────────────────
//  LIVE PREVIEW UPDATE
// ─────────────────────────────────────────────
function updatePreview() {
  const name = v('patientName') || '—';
  const id   = v('patientId') || '—';
  const age  = v('patientAge') || '—';
  const gender = v('patientGender') || '—';
  const date = formatDate(v('examDate')) || '—';
  const doctor = v('reportingDoctor') || '—';
  const ref = v('referringDoctor') || '—';
  const inst = v('institution') || '—';
  const indication = v('clinicalIndication') || '—';

  const lesionCards = document.querySelectorAll('.lesion-card');
  let lesionLines = '';
  lesionCards.forEach((card, i) => {
    const site = card.querySelector('.lesion-site')?.value || '—';
    const type = card.querySelector('.lesion-type')?.value || '—';
    const size = card.querySelector('.lesion-size')?.value || '—';
    lesionLines += `<div class="preview-row"><span class="preview-label">L${i+1}:</span><span class="preview-value">${site} · ${type} · ${size}</span></div>`;
  });

  const nbiCards = document.querySelectorAll('.nbi-lesion-card');
  let nbiLines = '';
  nbiCards.forEach((card, i) => {
    const ipclEl = card.querySelector('.nbi-ipcl');
    const siteEl = card.querySelector('.nbi-site-label');
    const ipcl = ipclEl ? (ipclEl.value ? `Type ${ipclEl.value}` : '—') : '—';
    const site = siteEl ? siteEl.textContent : `L${i+1}`;
    nbiLines += `<div class="preview-row"><span class="preview-label">${site}:</span><span class="preview-value">IPCL ${ipcl}</span></div>`;
  });

  const rfList = state.riskFactors.length > 0
    ? state.riskFactors.map(r => `<span class="badge badge-orange" style="font-size:10px;padding:2px 7px;margin:1px">${r}</span>`).join(' ')
    : '<span style="color:var(--text-muted)">None identified</span>';

  const riskScoreDisplay = state.assessment
    ? `<span style="color:${state.assessment.riskColor};font-weight:700">${state.assessment.riskLevel} (${state.assessment.riskScore}/10)</span>`
    : '<span style="color:var(--text-muted)">Not computed yet</span>';

  const previewHTML = `
    <div class="preview-section">
      <div class="preview-section-title">Patient</div>
      <div class="preview-row"><span class="preview-label">Name:</span><span class="preview-value">${name}</span></div>
      <div class="preview-row"><span class="preview-label">ID:</span><span class="preview-value">${id}</span></div>
      <div class="preview-row"><span class="preview-label">Age/Sex:</span><span class="preview-value">${age} yrs · ${gender}</span></div>
      <div class="preview-row"><span class="preview-label">Date:</span><span class="preview-value">${date}</span></div>
      <div class="preview-row"><span class="preview-label">By:</span><span class="preview-value">Dr ${doctor}</span></div>
      <div class="preview-row"><span class="preview-label">Ref:</span><span class="preview-value">${ref}</span></div>
      <div class="preview-row"><span class="preview-label">Inst:</span><span class="preview-value">${inst}</span></div>
    </div>
    <div class="preview-section">
      <div class="preview-section-title">Clinical Indication</div>
      <div class="preview-value" style="font-size:11px;line-height:1.5">${indication}</div>
    </div>
    <div class="preview-section">
      <div class="preview-section-title">Risk Factors</div>
      <div style="line-height:2">${rfList}</div>
    </div>
    ${lesionLines ? `<div class="preview-section"><div class="preview-section-title">WL Lesions (${lesionCards.length})</div>${lesionLines}</div>` : ''}
    ${nbiLines ? `<div class="preview-section"><div class="preview-section-title">NBI Classification</div>${nbiLines}</div>` : ''}
    <div class="preview-section">
      <div class="preview-section-title">Risk Assessment</div>
      <div>${riskScoreDisplay}</div>
    </div>
  `;

  const previewContent = document.getElementById('previewContent');
  if (previewContent) {
    if (name !== '—' || lesionCards.length > 0) {
      previewContent.innerHTML = previewHTML;
    }
  }
}

// ─────────────────────────────────────────────
//  FINAL REPORT RENDERER
// ─────────────────────────────────────────────
function renderFinalReport() {
  computeAssessment();
  const a = state.assessment;
  if (!a) return;

  const name     = v('patientName') || 'Not specified';
  const patId    = v('patientId') || 'N/A';
  const age      = v('patientAge') || '—';
  const gender   = v('patientGender') || '—';
  const date     = formatDate(v('examDate')) || '—';
  const doctor   = v('reportingDoctor') || '—';
  const refDoc   = v('referringDoctor') || '—';
  const inst     = v('institution') || '—';
  const scope    = v('endoscopeType') || '—';
  const nbiSys   = v('nbiSystem') || '—';
  const mag      = v('magnification') || '—';
  const anaes    = v('anesthesia') || '—';
  const imgQual  = v('imageQuality') || '—';
  const indication = v('clinicalIndication') || '—';
  const prevHist   = v('previousHistory') || '—';
  const wlComments = v('wlComments') || '—';
  const nbiOverall = v('nbiOverallImpression') || '—';
  const nbiLimits  = v('nbiLimitations') || '—';
  const clinAssess = v('clinicianAssessment') || '—';
  const diffDx     = v('differentialDiagnosis') || '—';
  const mdtNote    = v('mdtDiscussion') || '—';
  const fieldCancer = v('fieldCancerization') || '—';
  const limitingFx  = v('limitingFactors') || '—';

  // Gather anatomy examined
  const anatChecked = [];
  document.querySelectorAll('.toggle-item input:checked').forEach(cb => {
    const label = cb.nextElementSibling;
    if (label) anatChecked.push(label.textContent.trim());
  });

  // Build WL lesion table rows
  let wlRows = '';
  document.querySelectorAll('.lesion-card').forEach((card, i) => {
    const site = card.querySelector('.lesion-site')?.value || '—';
    const type = card.querySelector('.lesion-type')?.value || '—';
    const size = card.querySelector('.lesion-size')?.value || '—';
    const color = card.querySelector('.lesion-color')?.value || '—';
    const surface = card.querySelector('.lesion-surface')?.value || '—';
    const borders = card.querySelector('.lesion-borders')?.value || '—';
    const induction = card.querySelector('.lesion-induration')?.value || '—';
    const wldesc = card.querySelector('.lesion-wldesc')?.value || '';

    wlRows += `<tr>
      <td style="font-weight:600;color:#1e3a8a">${i+1}</td>
      <td>${site}</td>
      <td>${type}</td>
      <td>${size}</td>
      <td>${color}</td>
      <td>${surface}</td>
      <td>${borders}</td>
      <td>${induction}</td>
    </tr>`;
    if (wldesc) {
      wlRows += `<tr><td colspan="8" style="font-style:italic;color:#64748b;font-size:11px;padding:4px 12px">${wldesc}</td></tr>`;
    }
  });

  // Build NBI table rows
  let nbiRows = '';
  document.querySelectorAll('.nbi-lesion-card').forEach((card, i) => {
    const site = card.querySelector('.nbi-site-label')?.textContent || `Lesion ${i+1}`;
    const ipcl = card.querySelector('.nbi-ipcl')?.value || '—';
    const els  = card.querySelector('.nbi-els')?.value || '—';
    const vessel = card.querySelector('.nbi-vessel')?.value || '—';
    const demarcation = card.querySelector('.nbi-demarcation')?.value || '—';
    const umbrella = card.querySelector('.nbi-umbrella')?.value || '—';
    const impression = card.querySelector('.nbi-impression')?.value || '—';

    const ipclRisk = getIPCLRiskColor(ipcl);
    nbiRows += `<tr>
      <td style="font-weight:600;color:#1e3a8a">${i+1}</td>
      <td>${site}</td>
      <td><span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;background:${ipclRisk.bg};color:${ipclRisk.text};border:1px solid ${ipclRisk.border}">Type ${ipcl}</span></td>
      <td>${els}</td>
      <td>${vessel}</td>
      <td>${demarcation}</td>
      <td style="font-style:italic;font-size:11px">${impression}</td>
    </tr>`;
  });

  // Per-lesion assessment rows
  let perLesionAssessRows = '';
  a.perLesionResults.forEach((l, i) => {
    const riskColor = l.score < 3 ? '#10b981' : l.score < 5 ? '#d97706' : l.score < 7 ? '#ea580c' : '#dc2626';
    const riskLabel = l.score < 3 ? 'Low' : l.score < 5 ? 'Moderate' : l.score < 7 ? 'High' : 'Very High';
    perLesionAssessRows += `<tr>
      <td style="font-weight:600">${i+1}</td>
      <td>${l.site}</td>
      <td>${l.ipcl ? `Type ${l.ipcl}` : '—'}</td>
      <td><span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;background:${riskColor}22;color:${riskColor};border:1px solid ${riskColor}44">${riskLabel}</span></td>
      <td>${l.score.toFixed(1)}/10</td>
    </tr>`;
  });

  // Risk box colour class
  const riskBoxClass = a.riskLevel === 'Very Low' || a.riskLevel === 'Low' ? 'low'
    : a.riskLevel === 'Moderate' ? 'moderate'
    : a.riskLevel === 'High' ? 'high' : 'very-high';

  const riskTextColor = a.riskLevel === 'Very Low' || a.riskLevel === 'Low' ? '#065f46'
    : a.riskLevel === 'Moderate' ? '#92400e'
    : a.riskLevel === 'High' ? '#9a3412' : '#991b1b';

  // Recommendation list
  let recHTML = '<ul class="rec-list">';
  a.recommendations.forEach(rec => {
    recHTML += `<li class="${rec.priority}">${rec.icon} <span><strong>${rec.title}:</strong> ${rec.body}</span></li>`;
  });
  recHTML += '</ul>';

  // Follow-up list
  let fuHTML = '<table class="report-table"><thead><tr><th>Time Point</th><th>Recommended Action</th></tr></thead><tbody>';
  a.followUp.forEach(item => {
    fuHTML += `<tr><td style="font-weight:600;white-space:nowrap">${item.icon} ${item.period}</td><td>${item.action}</td></tr>`;
  });
  fuHTML += '</tbody></table>';

  const rfDisplay = state.riskFactors.length > 0
    ? state.riskFactors.map(r => `<span style="display:inline-block;background:#f1f5f9;border:1px solid #e2e8f0;color:#475569;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;margin:2px">${r}</span>`).join(' ')
    : 'None identified';

  const anatDisplay = anatChecked.length > 0 ? anatChecked.join(', ') : 'Full upper aerodigestive tract';

  const reportHTML = `
    <div class="report-header-block">
      <div class="report-logo-row">
        <div>
          <div class="report-title-main">🔬 NBI Endoscopy Report</div>
          <div class="report-subtitle-main">Narrow Band Imaging Assessment — Oral Cavity · Oropharynx · Larynx</div>
          <div style="margin-top:6px;font-size:11px;opacity:0.5">Classification systems: Ni/IPCL · European Laryngological Society (ELS) · WHO 2022 OPMD</div>
        </div>
        <div style="text-align:right;font-size:11px;opacity:0.7">
          <div>Report Date: ${date}</div>
          <div>Report No: NBI-${patId.replace(/[^a-zA-Z0-9]/g,'')}-${Date.now().toString().slice(-6)}</div>
          <div style="margin-top:4px;font-size:18px">${a.riskIcon}</div>
        </div>
      </div>
      <div class="report-meta-grid">
        <div class="report-meta-item">
          <div class="report-meta-label">Patient Name</div>
          <div class="report-meta-value">${name}</div>
        </div>
        <div class="report-meta-item">
          <div class="report-meta-label">Age / Gender</div>
          <div class="report-meta-value">${age} years · ${gender}</div>
        </div>
        <div class="report-meta-item">
          <div class="report-meta-label">Patient ID / MRN</div>
          <div class="report-meta-value">${patId}</div>
        </div>
        <div class="report-meta-item">
          <div class="report-meta-label">Examination Date</div>
          <div class="report-meta-value">${date}</div>
        </div>
        <div class="report-meta-item">
          <div class="report-meta-label">Reporting Endoscopist</div>
          <div class="report-meta-value">Dr. ${doctor}</div>
        </div>
        <div class="report-meta-item">
          <div class="report-meta-label">Referring Clinician</div>
          <div class="report-meta-value">${refDoc}</div>
        </div>
      </div>
    </div>

    <div class="report-body">

      <!-- CLINICAL BACKGROUND -->
      <div class="report-section-block">
        <div class="report-section-heading">1. Clinical Background & Indication</div>
        <table class="report-table">
          <tr><th width="200">Clinical Indication</th><td>${indication}</td></tr>
          <tr><th>Previous History</th><td>${prevHist}</td></tr>
          <tr><th>Risk Factors</th><td>${rfDisplay}</td></tr>
          <tr><th>Institution</th><td>${inst}</td></tr>
        </table>
      </div>

      <!-- PROCEDURE -->
      <div class="report-section-block">
        <div class="report-section-heading">2. Procedure Details</div>
        <table class="report-table">
          <tr><th width="200">Endoscope Type</th><td>${scope}</td><th width="200">NBI System</th><td>${nbiSys}</td></tr>
          <tr><th>Magnification</th><td>${mag}</td><th>Anaesthesia / Setting</th><td>${anaes}</td></tr>
          <tr><th>Image Quality</th><td>${imgQual}</td><th>Limiting Factors</th><td>${limitingFx}</td></tr>
          <tr><th colspan="1">Anatomical Coverage</th><td colspan="3">${anatDisplay}</td></tr>
        </table>
      </div>

      <!-- WHITE LIGHT FINDINGS -->
      <div class="report-section-block">
        <div class="report-section-heading">3. White Light Endoscopy (WLE) Findings</div>
        ${wlRows ? `
        <table class="report-table">
          <thead>
            <tr>
              <th>#</th><th>Site / Location</th><th>Lesion Type</th><th>Size</th>
              <th>Colour</th><th>Surface</th><th>Borders</th><th>Induration</th>
            </tr>
          </thead>
          <tbody>${wlRows}</tbody>
        </table>` : '<p style="color:#94a3b8;font-size:12px;font-style:italic">No lesions documented under white light endoscopy.</p>'}
        <table class="report-table" style="margin-top:10px">
          <tr><th width="240">General Mucosal Appearance</th><td>${v('normalMucosa') || '—'}</td></tr>
          <tr><th>Field Cancerization Assessment</th><td>${fieldCancer}</td></tr>
          ${wlComments !== '—' ? `<tr><th>Additional Observations</th><td>${wlComments}</td></tr>` : ''}
        </table>
      </div>

      <!-- NBI FINDINGS -->
      <div class="report-section-block">
        <div class="report-section-heading">4. Narrow Band Imaging (NBI) Vascular Pattern Analysis</div>

        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;margin-bottom:14px;font-size:11px;color:#1e40af">
          <strong>Classification Reference:</strong>
          Ni/IPCL Classification (Ni et al., 2019 updated system): Type 0–I: Benign/non-specific · Type II: Inflammatory · Type III: Mild-moderate dysplasia · Type IV: Severe dysplasia/CIS · Type Va/Vb/Vc: Invasive SCC.
          ELS Classification (Piazza et al., European Laryngological Society): LVC: Benign · PVC-NA: Papilloma/Low-grade SIN · PVC-WA: High-grade SIN/SCC.
          Referenced from: Ni XG et al. (2019) Laryngoscope; Piazza C et al. (2014) Eur Arch Otorhinolaryngol.
        </div>

        ${nbiRows ? `
        <table class="report-table">
          <thead>
            <tr><th>#</th><th>Site</th><th>IPCL/Ni Type</th><th>ELS Class</th><th>Vessel Morphology</th><th>Demarcation</th><th>NBI Impression</th></tr>
          </thead>
          <tbody>${nbiRows}</tbody>
        </table>` : '<p style="color:#94a3b8;font-size:12px;font-style:italic">NBI classification not completed for individual lesions.</p>'}

        <table class="report-table" style="margin-top:10px">
          <tr><th width="240">Overall NBI Impression</th><td>${nbiOverall}</td></tr>
          ${nbiLimits !== '—' ? `<tr><th>NBI Limitations</th><td><em>${nbiLimits}</em></td></tr>` : ''}
        </table>
      </div>

      <!-- RISK ASSESSMENT -->
      <div class="report-section-block">
        <div class="report-section-heading">5. Automated Severity & Risk Assessment</div>

        <div class="risk-box ${riskBoxClass}">
          <div class="risk-box-icon">${a.riskIcon}</div>
          <div class="risk-box-content">
            <div class="risk-box-level" style="color:${riskTextColor}">${a.riskLevel} Risk — Score: ${a.riskScore}/10</div>
            <div class="risk-box-desc">
              Composite score: NBI pattern (65%) + Clinical risk factors (35%).
              Highest IPCL Type: ${a.highestIPCL} · Risk factors: ${state.riskFactors.length}.
            </div>
          </div>
        </div>

        ${perLesionAssessRows ? `
        <div style="margin-bottom:14px">
          <div style="font-size:12px;font-weight:600;color:#1e3a8a;margin-bottom:8px">Per-Lesion Risk Profile:</div>
          <table class="report-table">
            <thead><tr><th>#</th><th>Site</th><th>IPCL Type</th><th>Risk Level</th><th>Score</th></tr></thead>
            <tbody>${perLesionAssessRows}</tbody>
          </table>
        </div>` : ''}

        <div style="font-size:12px;color:#475569;margin-bottom:4px"><strong>Scoring Methodology:</strong></div>
        <div style="font-size:11px;color:#64748b;line-height:1.7;background:#f8fafc;border-radius:8px;padding:12px;border:1px solid #e2e8f0">
          Risk score derived from: (1) IPCL/Ni pattern type weight [Type 0=1, I=0, II=1, III=3, IV=5, Va=7, Vb=9, Vc=10]; (2) ELS classification modifier; (3) High-risk anatomical site modifier; (4) Lesion morphology (colour, surface, borders); (5) Clinical risk factor profile weight [tobacco +3, alcohol +2, betel +3, HPV +2, OSMF +2, prior H&N cancer +3, immunocompromised +2]. Final composite score = max(lesion score × 0.65) + (risk factor score × 0.35).
        </div>
      </div>

      <!-- CLINICIAN ASSESSMENT -->
      <div class="report-section-block">
        <div class="report-section-heading">6. Clinician Assessment & Differential Diagnosis</div>
        <table class="report-table">
          <tr><th width="240">Clinical Assessment</th><td>${clinAssess}</td></tr>
          <tr><th>Differential Diagnosis</th><td>${diffDx}</td></tr>
          ${mdtNote !== '—' ? `<tr><th>MDT / Referral Note</th><td>${mdtNote}</td></tr>` : ''}
        </table>
      </div>

      <!-- RECOMMENDATIONS -->
      <div class="report-section-block">
        <div class="report-section-heading">7. Clinical Recommendations</div>
        ${recHTML}
        <div style="font-size:11px;color:#94a3b8;margin-top:12px;font-style:italic">
          ⚠️ These recommendations are algorithmically generated based on entered data and validated international literature. Final clinical decision rests with the attending clinician. All suspicious lesions require histopathological confirmation.
        </div>
      </div>

      <!-- FOLLOW-UP -->
      <div class="report-section-block">
        <div class="report-section-heading">8. Surveillance & Follow-up Protocol</div>
        ${fuHTML}
        <div style="font-size:11px;color:#64748b;margin-top:10px;background:#f0fdf4;padding:10px;border-radius:6px;border-left:3px solid #10b981">
          <strong>Evidence base:</strong> Follow-up intervals based on NCCN Clinical Practice Guidelines in Oncology (Head and Neck Cancers, 2024); 
          European Head and Neck Society (EHNS) consensus guidelines; ELS Laryngeal Leukoplakia consensus (2020); 
          WHO Classification of Head and Neck Tumours 2022; 
          Warnakulasuriya S. et al. Oral Potentially Malignant Disorders. Oral Dis. 2021.
        </div>
      </div>

      <!-- SIGNATURE -->
      <div class="signature-area">
        <div class="sig-block">
          <div style="font-weight:600;color:#334155;font-size:13px">Dr. ${doctor}</div>
          <div>Reporting Endoscopist</div>
          <div>${inst}</div>
          <div style="margin-top:4px">Date: ${date}</div>
        </div>
        <div class="sig-block">
          <div style="font-weight:600;color:#334155;font-size:13px">Referring Clinician</div>
          <div>${refDoc}</div>
          <div style="margin-top:4px">Signature: ___________________</div>
        </div>
      </div>

    </div><!-- /report-body -->

    <div class="report-footer-block">
      <div>
        <div>NBI EndoReport · Narrow Band Imaging Assessment System</div>
        <div>Classification: Ni/IPCL System · ELS Classification · WHO 2022 OPMD Criteria</div>
      </div>
      <div style="text-align:right">
        <div>Generated: ${new Date().toLocaleString()}</div>
        <div>Patient: ${name} · ID: ${patId}</div>
        <div style="margin-top:4px;font-style:italic">CONFIDENTIAL — FOR CLINICAL USE ONLY</div>
      </div>
    </div>
  `;

  const preview = document.getElementById('finalReportPreview');
  if (preview) preview.innerHTML = reportHTML;
}

// ─────────────────────────────────────────────
//  PDF GENERATION
// ─────────────────────────────────────────────
async function generatePDF() {
  showToast('Generating PDF report...', 'info');

  // Make sure assessment and report are up to date
  computeAssessment();
  renderFinalReport();

  await new Promise(r => setTimeout(r, 500));

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const a = state.assessment;
    const name     = v('patientName') || 'Not specified';
    const patId    = v('patientId') || 'N/A';
    const age      = v('patientAge') || '—';
    const gender   = v('patientGender') || '—';
    const date     = formatDate(v('examDate')) || '—';
    const doctor   = v('reportingDoctor') || '—';
    const refDoc   = v('referringDoctor') || '—';
    const inst     = v('institution') || '—';
    const indication = v('clinicalIndication') || '—';
    const prevHist   = v('previousHistory') || '—';
    const scope    = v('endoscopeType') || '—';
    const nbiSys   = v('nbiSystem') || '—';
    const anaes    = v('anesthesia') || '—';
    const nbiOverall = v('nbiOverallImpression') || '—';
    const nbiLimits  = v('nbiLimitations') || '—';
    const clinAssess = v('clinicianAssessment') || '—';
    const diffDx     = v('differentialDiagnosis') || '—';
    const mdtNote    = v('mdtDiscussion') || '—';

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentW = pageW - 2 * margin;
    let y = margin;

    const newPage = () => {
      doc.addPage();
      y = margin;
      addPageHeader();
    };

    const checkPageBreak = (needed = 20) => {
      if (y + needed > pageH - 20) newPage();
    };

    const addPageHeader = () => {
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageW, 12, 'F');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`NBI EndoReport · ${name} · ${patId} · ${date}`, margin, 8);
      doc.text('CONFIDENTIAL — CLINICAL USE ONLY', pageW - margin, 8, { align: 'right' });
      y = 18;
    };

    // ── PAGE 1: HEADER ──
    // Gradient header bar
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 52, 'F');

    // Draw Vector Logo
    const logoX = margin + 10;
    const logoY = 25;
    doc.setDrawColor(125, 211, 252);
    doc.setLineWidth(1.5);
    doc.circle(logoX, logoY, 8, 'S');
    doc.setFillColor(167, 139, 250);
    doc.circle(logoX, logoY, 3, 'F');
    doc.setDrawColor(167, 139, 250);
    doc.lines([[5, 5], [2, 6], [-2, 8]], logoX + 3, logoY - 3);

    // Adjust text start pos
    const textX = margin + 28;

    // Report title
    doc.setFontSize(18);
    doc.setTextColor(248, 250, 252);
    doc.setFont('helvetica', 'bold');
    doc.text('NBI Endoscopy Report', textX, 18);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('Narrow Band Imaging Assessment — Oral Cavity · Oropharynx · Larynx', textX, 26);
    doc.text('Classification: Ni/IPCL System · European Laryngological Society (ELS) · WHO 2022', textX, 32);

    // Report number
    const reportNo = `NBI-${patId.replace(/[^a-zA-Z0-9]/g,'')}-${Date.now().toString().slice(-6)}`;
    doc.setFontSize(7);
    doc.text(`Report: ${reportNo}`, pageW - margin, 20, { align: 'right' });
    doc.text(`Date: ${date}`, pageW - margin, 26, { align: 'right' });

    // Patient info row
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 38, pageW, 14, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(name, margin, 46);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`ID: ${patId}   Age: ${age} yrs   Gender: ${gender}`, margin, 52);
    doc.text(`Dr. ${doctor} · ${inst}`, pageW - margin, 46, { align: 'right' });
    doc.text(`Ref: ${refDoc}`, pageW - margin, 52, { align: 'right' });

    y = 60;

    // ── SECTION 1: CLINICAL BACKGROUND ──
    const sectionHeader = (title, y) => {
      doc.setFillColor(239, 246, 255);
      doc.rect(margin, y, contentW, 8, 'F');
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin, y + 8);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text(title, margin + 4, y + 5.5);
      doc.setTextColor(50, 50, 50);
      return y + 12;
    };

    const fieldRow = (label, value, yPos, compact = false) => {
      const h = compact ? 7 : 8;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(label + ':', margin + 2, yPos + 5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      const lines = doc.splitTextToSize(value, contentW - 60);
      doc.text(lines[0], margin + 55, yPos + 5);
      return yPos + Math.max(h, lines.length * 5 + 4);
    };

    y = sectionHeader('1. CLINICAL BACKGROUND & INDICATION', y);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.rect(margin, y - 2, contentW, (indication.length > 100 ? 28 : 22) + prevHist.length / 15, 'S');

    y = fieldRow('Clinical Indication', indication, y);
    y = fieldRow('Previous History', prevHist, y);
    y = fieldRow('Risk Factors', state.riskFactors.join(', ') || 'None identified', y);

    // ── SECTION 2: PROCEDURE ──
    checkPageBreak(30);
    y = sectionHeader('2. PROCEDURE DETAILS', y + 4);

    y = fieldRow('Endoscope', scope, y, true);
    y = fieldRow('NBI System', nbiSys, y, true);
    y = fieldRow('Anaesthesia', anaes, y, true);

    // Anatomy examined
    const anatChecked = [];
    document.querySelectorAll('.toggle-item input:checked').forEach(cb => {
      const label = cb.nextElementSibling;
      if (label) anatChecked.push(label.textContent.trim());
    });
    y = fieldRow('Areas Examined', anatChecked.join(', ') || 'Full upper aerodigestive tract', y);

    // ── SECTION 3: WL FINDINGS ──
    checkPageBreak(40);
    y = sectionHeader('3. WHITE LIGHT ENDOSCOPY (WLE) FINDINGS', y + 4);

    const lesionCards = document.querySelectorAll('.lesion-card');
    if (lesionCards.length > 0) {
      const wlTableHead = [['#', 'Site / Location', 'Type', 'Size', 'Colour', 'Surface', 'Borders']];
      const wlTableBody = [];
      lesionCards.forEach((card, i) => {
        wlTableBody.push([
          i + 1,
          card.querySelector('.lesion-site')?.value || '—',
          card.querySelector('.lesion-type')?.value || '—',
          card.querySelector('.lesion-size')?.value || '—',
          card.querySelector('.lesion-color')?.value || '—',
          card.querySelector('.lesion-surface')?.value || '—',
          card.querySelector('.lesion-borders')?.value || '—'
        ]);
      });

      doc.autoTable({
        startY: y,
        head: wlTableHead,
        body: wlTableBody,
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 3, textColor: [30, 41, 59] },
        headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold', fontSize: 7 },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        columnStyles: { 0: { cellWidth: 8 } }
      });
      y = doc.lastAutoTable.finalY + 6;
    } else {
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'italic');
      doc.text('No lesions documented under white light endoscopy.', margin + 2, y + 5);
      y += 12;
    }

    // ── SECTION 4: NBI FINDINGS ──
    checkPageBreak(50);
    y = sectionHeader('4. NBI VASCULAR PATTERN ANALYSIS', y + 4);

    const nbiCards = document.querySelectorAll('.nbi-lesion-card');
    if (nbiCards.length > 0) {
      const nbiTableHead = [['#', 'Site', 'IPCL Type', 'ELS', 'Vessel Pattern', 'Demarcation', 'Impression']];
      const nbiTableBody = [];
      nbiCards.forEach((card, i) => {
        const ipcl = card.querySelector('.nbi-ipcl')?.value || '—';
        nbiTableBody.push([
          i + 1,
          card.querySelector('.nbi-site-label')?.textContent || `L${i+1}`,
          ipcl ? `Type ${ipcl}` : '—',
          card.querySelector('.nbi-els')?.value || '—',
          card.querySelector('.nbi-vessel')?.value || '—',
          card.querySelector('.nbi-demarcation')?.value || '—',
          card.querySelector('.nbi-impression')?.value || '—'
        ]);
      });

      doc.autoTable({
        startY: y,
        head: nbiTableHead,
        body: nbiTableBody,
        margin: { left: margin, right: margin },
        styles: { fontSize: 7.5, cellPadding: 2.5, textColor: [30, 41, 59] },
        headStyles: { fillColor: [239, 246, 255], textColor: [30, 58, 138], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [250, 252, 255] },
        columnStyles: { 0: { cellWidth: 7 }, 6: { cellWidth: 45 } }
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    if (nbiOverall && nbiOverall !== '—') {
      checkPageBreak(20);
      y = fieldRow('Overall NBI Impression', nbiOverall, y);
    }
    if (nbiLimits && nbiLimits !== '—') {
      y = fieldRow('Limitations', nbiLimits, y);
    }

    // ── SECTION 5: RISK ASSESSMENT ──
    checkPageBreak(60);
    y = sectionHeader('5. AUTOMATED SEVERITY & RISK ASSESSMENT', y + 4);

    if (a) {
      // Risk box
      const riskColors = {
        'Very Low': [209, 250, 229], 'Low': [209, 250, 229],
        'Moderate': [254, 243, 199], 'High': [255, 237, 213], 'Very High': [254, 226, 226]
      };
      const riskTextClr = {
        'Very Low': [6, 95, 70], 'Low': [6, 95, 70],
        'Moderate': [146, 64, 14], 'High': [154, 52, 18], 'Very High': [153, 27, 27]
      };
      const bg = riskColors[a.riskLevel] || [241, 245, 249];
      const tc = riskTextClr[a.riskLevel] || [30, 41, 59];

      doc.setFillColor(...bg);
      doc.roundedRect(margin, y, contentW, 22, 3, 3, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...tc);
      doc.text(`${a.riskLevel} Risk — Score: ${a.riskScore}/10`, margin + 6, y + 10);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Highest IPCL: ${a.highestIPCL} · Risk Factors: ${state.riskFactors.length} · Lesions: ${a.perLesionResults.length}`, margin + 6, y + 17);
      y += 26;

      // Per-lesion table
      if (a.perLesionResults.length > 0) {
        doc.autoTable({
          startY: y,
          head: [['#', 'Site', 'IPCL', 'Risk Level', 'Score']],
          body: a.perLesionResults.map((l, i) => [
            i + 1, l.site,
            l.ipcl ? `Type ${l.ipcl}` : '—',
            l.score < 3 ? 'Low' : l.score < 5 ? 'Moderate' : l.score < 7 ? 'High' : 'Very High',
            `${l.score.toFixed(1)}/10`
          ]),
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold' }
        });
        y = doc.lastAutoTable.finalY + 6;
      }
    }

    // ── SECTION 6: CLINICIAN ASSESSMENT ──
    checkPageBreak(30);
    y = sectionHeader('6. CLINICIAN ASSESSMENT & DIFFERENTIAL DIAGNOSIS', y + 4);
    y = fieldRow('Assessment', clinAssess, y);
    y = fieldRow('Differential Dx', diffDx, y);
    if (mdtNote && mdtNote !== '—') y = fieldRow('MDT / Referral', mdtNote, y);

    // ── SECTION 7: RECOMMENDATIONS ──
    if (a?.recommendations?.length > 0) {
      checkPageBreak(40);
      y = sectionHeader('7. CLINICAL RECOMMENDATIONS', y + 4);

      a.recommendations.forEach(rec => {
        checkPageBreak(20);
        const colMap = { urgent: [254, 226, 226], important: [255, 237, 213], routine: [254, 243, 199], monitor: [209, 250, 229] };
        const textMap = { urgent: [153, 27, 27], important: [154, 52, 18], routine: [146, 64, 14], monitor: [6, 95, 70] };
        const bg = colMap[rec.priority] || [241, 245, 249];
        const tc = textMap[rec.priority] || [30, 41, 59];

        const titleLines = doc.splitTextToSize(`[${rec.priority.toUpperCase()}] ${rec.title}`, contentW - 8);
        const bodyLines = doc.splitTextToSize(rec.body, contentW - 8);
        const boxH = (titleLines.length + bodyLines.length) * 5 + 8;

        doc.setFillColor(...bg);
        doc.roundedRect(margin, y, contentW, boxH, 2, 2, 'F');

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...tc);
        doc.text(titleLines, margin + 4, y + 6);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(55, 65, 81);
        doc.text(bodyLines, margin + 4, y + 6 + titleLines.length * 5);
        y += boxH + 4;
      });
    }

    // ── SECTION 8: FOLLOW-UP ──
    if (a?.followUp?.length > 0) {
      checkPageBreak(40);
      y = sectionHeader('8. SURVEILLANCE & FOLLOW-UP PROTOCOL', y + 4);

      doc.autoTable({
        startY: y,
        head: [['Time Point', 'Recommended Action']],
        body: a.followUp.map(f => [`[${f.period}]`, f.action]),
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [209, 250, 229], textColor: [6, 95, 70], fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' } }
      });
      y = doc.lastAutoTable.finalY + 6;
    }

    // ── DISCLAIMER ──
    checkPageBreak(30);
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentW, 22, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentW, 22, 'S');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    const disclaimer = 'This report is algorithmically generated based on entered endoscopic findings and validated international literature (Ni/IPCL Classification, ELS Classification, WHO 2022 Classification of Head and Neck Tumours). The automated assessment is a clinical decision-support tool only. Final clinical decisions, including biopsy indication, treatment planning, and follow-up intervals, are the responsibility of the attending clinician. All suspicious lesions require histopathological confirmation. This document is confidential and intended for clinical use only.';
    const discLines = doc.splitTextToSize(disclaimer, contentW - 8);
    doc.text('Disclaimer:', margin + 4, y + 6);
    doc.text(discLines, margin + 4, y + 11);
    y += 26;

    // ── SIGNATURE AREA ──
    checkPageBreak(30);
    y += 4;
    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.8);
    // Signature 1
    doc.line(margin, y + 20, margin + 75, y + 20);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Dr. ${doctor}`, margin, y + 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Reporting Endoscopist', margin, y + 31);
    doc.text(inst, margin, y + 36);
    doc.text(date, margin, y + 41);

    // Signature 2
    doc.line(pageW - margin - 75, y + 20, pageW - margin, y + 20);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(refDoc, pageW - margin - 75, y + 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Referring Clinician', pageW - margin - 75, y + 31);

    // ── FOOTER ON ALL PAGES ──
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(15, 23, 42);
      doc.rect(0, pageH - 12, pageW, 12, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('NBI EndoReport · Oral Cavity · Oropharynx · Larynx', margin, pageH - 5);
      doc.text(`Page ${i} of ${totalPages}`, pageW / 2, pageH - 5, { align: 'center' });
      doc.text('CONFIDENTIAL — FOR CLINICAL USE ONLY', pageW - margin, pageH - 5, { align: 'right' });
    }

    // Save
    const filename = `NBI_Report_${name.replace(/\s+/g, '_')}_${v('examDate') || 'undated'}.pdf`;
    doc.save(filename);
    showToast('PDF report downloaded successfully!', 'success');

  } catch (err) {
    console.error('PDF generation error:', err);
    showToast('PDF error — try printing instead (Ctrl+P)', 'error');
  }
}

// ─────────────────────────────────────────────
//  COPY REPORT TEXT
// ─────────────────────────────────────────────
function copyReportText() {
  const preview = document.getElementById('finalReportPreview');
  if (!preview) return;
  const text = preview.innerText;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Report text copied to clipboard', 'success');
  }).catch(() => {
    showToast('Copy failed — please select and copy manually', 'error');
  });
}

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────
function v(id) {
  const el = document.getElementById(id);
  if (!el) return '';
  return el.value ? el.value.trim() : '';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return dateStr; }
}

function getIPCLRiskColor(ipcl) {
  const map = {
    '':   { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' },
    '0':  { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' },
    'I':  { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' },
    'II': { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
    'III':{ bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
    'IV': { bg: '#ffedd5', text: '#9a3412', border: '#fed7aa' },
    'Va': { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
    'Vb': { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
    'Vc': { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
  };
  return map[ipcl] || map[''];
}

function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// ─────────────────────────────────────────────
//  AGE CALCULATOR
// ─────────────────────────────────────────────
function calcAge() {
  const dobVal = document.getElementById('patientDob').value;
  const ageInput = document.getElementById('patientAge');
  if (!dobVal || !ageInput) return;
  
  const dob = new Date(dobVal);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  if (age >= 0) {
    ageInput.value = age;
    ageInput.readOnly = true;
    ageInput.parentElement.classList.add('age-filled');
    setTimeout(() => ageInput.parentElement.classList.remove('age-filled'), 600);
  }
}
