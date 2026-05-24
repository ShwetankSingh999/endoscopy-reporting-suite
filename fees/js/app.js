/**
 * FEES Evaluation App — Main Application Logic
 * Step navigation, form state, dynamic trials, therapy display
 */

/* ════════════════════════════════════════
   STATE
═════════════════════════════════════════ */
const AppState = {
  currentStep: 1,
  totalSteps: 5,
  trialCount: 0,
  data: {
    patient: {},
    preSwallow: {},
    swallowTrials: [],
    therapeutic: { strategies: [] },
    summary: { monochrome: false }
  }
};

/* ════════════════════════════════════════
   DOM READY
═════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  initStepper();
  initStep3Trials();
  initStep4Strategies();
  renderStep(AppState.currentStep);
  bindRadioButtons();
  bindNavButtons();
  bindFormInputs();
});

/* ════════════════════════════════════════
   STEPPER
═════════════════════════════════════════ */
function initStepper() {
  document.querySelectorAll('.step-item').forEach(el => {
    el.addEventListener('click', () => {
      const step = parseInt(el.dataset.step);
      if (step < AppState.currentStep || AppState.currentStep === step) {
        goToStep(step);
      }
    });
  });
}

function updateStepperUI(step) {
  const fillPct = ((step - 1) / (AppState.totalSteps - 1)) * 100;
  document.querySelector('.stepper-fill').style.width = fillPct + '%';

  document.querySelectorAll('.step-item').forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.remove('active', 'completed');
    if (s === step) el.classList.add('active');
    else if (s < step) el.classList.add('completed');
  });
}

function renderStep(step) {
  document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(`step-${step}`);
  if (panel) panel.classList.add('active');
  updateStepperUI(step);

  // Update nav bar
  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');
  const generateBtn = document.getElementById('btn-generate');

  prevBtn.style.display = step === 1 ? 'none' : 'inline-flex';
  nextBtn.style.display = step === AppState.totalSteps ? 'none' : 'inline-flex';
  generateBtn.style.display = step === AppState.totalSteps ? 'inline-flex' : 'none';

  const navInfo = document.getElementById('nav-info');
  if (navInfo) navInfo.textContent = `Step ${step} of ${AppState.totalSteps}`;

  if (step === AppState.totalSteps) {
    renderSummary();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToStep(step) {
  collectCurrentStep(AppState.currentStep);
  AppState.currentStep = step;
  renderStep(step);
  saveToStorage();
}

/* ════════════════════════════════════════
   NAVIGATION
═════════════════════════════════════════ */
function bindNavButtons() {
  document.getElementById('btn-prev').addEventListener('click', () => {
    if (AppState.currentStep > 1) goToStep(AppState.currentStep - 1);
  });

  document.getElementById('btn-next').addEventListener('click', () => {
    if (validateCurrentStep()) {
      if (AppState.currentStep < AppState.totalSteps) goToStep(AppState.currentStep + 1);
    }
  });

  document.getElementById('btn-generate').addEventListener('click', () => {
    collectCurrentStep(AppState.currentStep);
    saveToStorage();
    generateFEESReport(AppState.data);
    showToast('📄 PDF report generated and downloading!');
  });

  document.getElementById('btn-clear')?.addEventListener('click', () => {
    if (confirm('Clear all data and start a new evaluation?')) {
      localStorage.removeItem('fees_data');
      AppState.data = { patient: {}, preSwallow: {}, swallowTrials: [], therapeutic: { strategies: [] }, summary: {} };
      AppState.trialCount = 0;
      AppState.currentStep = 1;
      location.reload();
    }
  });
}

/* ════════════════════════════════════════
   FORM DATA COLLECTION
═════════════════════════════════════════ */
function collectCurrentStep(step) {
  if (step === 1) collectPatient();
  else if (step === 2) collectPreSwallow();
  else if (step === 3) collectTrials();
  else if (step === 4) collectTherapeutic();
  else if (step === 5) collectSummary();
}

function collectPatient() {
  AppState.data.patient = {
    name: val('pat-name'),
    dob: val('pat-dob'),
    age: val('pat-age'),
    gender: val('pat-gender'),
    mrn: val('pat-mrn'),
    referringPhysician: val('pat-physician'),
    primaryDiagnosis: val('pat-diagnosis'),
    reasonForReferral: val('pat-referral'),
    evaluationDate: val('pat-eval-date'),
    evaluatorName: val('pat-evaluator'),
    facility: val('pat-facility')
  };
}

function collectPreSwallow() {
  AppState.data.preSwallow = {
    pharyngealSymmetry: val('ps-pharyngeal-symmetry'),
    vfAppearance: val('ps-vf-appearance'),
    vocalFoldMobilityLeft: val('ps-vf-left'),
    vocalFoldMobilityRight: val('ps-vf-right'),
    velopharyngeal: val('ps-veloph'),
    laryngealElevation: val('ps-laryngeal-elevation'),
    sensation: val('ps-sensation'),
    tongueBaseRetraction: val('ps-tongue-base'),
    secretionRating: getSelectedRadio('secretion-rating'),
    preSwallowNotes: val('ps-notes')
  };
}

function collectTrials() {
  const trials = [];
  document.querySelectorAll('.trial-card').forEach(card => {
    const id = card.dataset.trialId;
    const residueLocs = [];
    card.querySelectorAll(`input[name="residue-loc-${id}"]:checked`).forEach(cb => {
      residueLocs.push(cb.value);
    });
    const pasSelected = card.querySelector('.pas-btn.selected');

    trials.push({
      consistency: val(`trial-consistency-${id}`),
      volume: val(`trial-volume-${id}`),
      pasScore: pasSelected?.dataset.level || '',
      swallowInitiation: getSelectedRadioInContainer(card, `swallow-init-${id}`),
      airwayClosure: getSelectedRadioInContainer(card, `airway-closure-${id}`),
      coughResponse: getSelectedRadioInContainer(card, `cough-resp-${id}`),
      residueLocations: residueLocs,
      residueSeverity: val(`trial-residue-severity-${id}`),
      trialNotes: val(`trial-notes-${id}`)
    });
  });
  AppState.data.swallowTrials = trials;
}

function collectTherapeutic() {
  const strategies = [];
  document.querySelectorAll('.strategy-item').forEach(item => {
    const id = item.dataset.strategyId;
    const strategy = FEES_DATA.strategies.find(s => s.id === id);
    const effectiveness = val(`strat-eff-${id}`);
    if (effectiveness) {
      strategies.push({
        id,
        name: strategy?.name || id,
        effectiveness,
        notes: val(`strat-notes-${id}`)
      });
    }
  });
  AppState.data.therapeutic = {
    strategies,
    recommendedLiquidIDDSI: val('rec-liquid-iddsi'),
    recommendedFoodIDDSI: val('rec-food-iddsi'),
    therapeuticNotes: val('therapeutic-notes')
  };
}

function collectSummary() {
  AppState.data.summary = {
    clinicalImpression: val('clinical-impression'),
    followUp: val('follow-up-plan'),
    monochrome: checked('pdf-monochrome')
  };
}

/* ════════════════════════════════════════
   STEP 3 — DYNAMIC SWALLOW TRIALS
═════════════════════════════════════════ */
function initStep3Trials() {
  document.getElementById('add-trial-btn').addEventListener('click', addTrial);
  // Start with 2 trials
  addTrial();
  addTrial();
}

function addTrial() {
  AppState.trialCount++;
  const id = AppState.trialCount;
  const container = document.getElementById('trials-container');

  const card = document.createElement('div');
  card.className = 'trial-card';
  card.dataset.trialId = id;
  card.id = `trial-card-${id}`;

  card.innerHTML = `
    <div class="trial-card-header">
      <div class="flex gap-12" style="align-items:center">
        <span class="trial-number">${id}</span>
        <span style="font-weight:600; font-size:14px; color:var(--text-secondary)">Trial ${id}</span>
      </div>
      <button class="btn btn-danger btn-sm" onclick="removeTrial(${id})">✕ Remove</button>
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label>Consistency</label>
        <select id="trial-consistency-${id}">
          <option value="">— Select —</option>
          <option value="thin">Thin Liquid (Water)</option>
          <option value="nectar">Nectar-Thick (IDDSI 2)</option>
          <option value="honey">Honey-Thick (IDDSI 3)</option>
          <option value="puree">Puree (IDDSI 4)</option>
          <option value="soft">Soft & Bite-Sized (IDDSI 5-6)</option>
          <option value="regular">Regular Solid (IDDSI 7)</option>
        </select>
      </div>
      <div class="form-group">
        <label>Volume / Size</label>
        <select id="trial-volume-${id}">
          <option value="">— Select —</option>
          <option value="sip">Sip (approx. 5ml)</option>
          <option value="5ml">5 ml bolus</option>
          <option value="10ml">10 ml bolus</option>
          <option value="20ml">20 ml bolus</option>
          <option value="cup_sip">Cup sip</option>
          <option value="bite">Bite-sized piece</option>
        </select>
      </div>
    </div>

    <div class="form-group mt-12">
      <label>Penetration-Aspiration Scale (PAS) <span style="font-size:11px;color:var(--text-muted)">— Tap to select</span></label>
      <div class="pas-scale" id="pas-scale-${id}">
        ${[1,2,3,4,5,6,7,8].map(n => `<button class="pas-btn" data-level="${n}" onclick="selectPAS(this, ${id})">${n}</button>`).join('')}
      </div>
      <div class="pas-legend">
        <div class="pas-legend-item"><div class="pas-legend-dot" style="background:var(--success)"></div> 1-2 No aspiration</div>
        <div class="pas-legend-item"><div class="pas-legend-dot" style="background:var(--warning)"></div> 3-4 Penetration</div>
        <div class="pas-legend-item"><div class="pas-legend-dot" style="background:var(--danger)"></div> 5-6 Aspiration+cough</div>
        <div class="pas-legend-item"><div class="pas-legend-dot" style="background:#bc1e1e"></div> 7-8 Silent/no response</div>
      </div>
      <div id="pas-desc-${id}" style="font-size:12px; color:var(--text-muted); margin-top:6px; min-height:18px;"></div>
    </div>

    <div class="form-grid mt-12">
      <div class="form-group">
        <label>Swallow Initiation</label>
        <div class="radio-group" id="swallow-init-${id}">
          <button class="radio-btn" data-group="swallow-init-${id}" data-value="normal" onclick="selectRadioBtn(this)">Normal</button>
          <button class="radio-btn" data-group="swallow-init-${id}" data-value="delayed" onclick="selectRadioBtn(this)">Delayed</button>
          <button class="radio-btn" data-group="swallow-init-${id}" data-value="absent" onclick="selectRadioBtn(this)">Absent</button>
        </div>
      </div>
      <div class="form-group">
        <label>Airway Closure</label>
        <div class="radio-group" id="airway-closure-${id}">
          <button class="radio-btn" data-group="airway-closure-${id}" data-value="complete" onclick="selectRadioBtn(this)">Complete</button>
          <button class="radio-btn" data-group="airway-closure-${id}" data-value="incomplete" onclick="selectRadioBtn(this)">Incomplete</button>
        </div>
      </div>
      <div class="form-group">
        <label>Cough / Airway Response</label>
        <div class="radio-group" id="cough-resp-${id}">
          <button class="radio-btn" data-group="cough-resp-${id}" data-value="spontaneous" onclick="selectRadioBtn(this)">Spontaneous Cough</button>
          <button class="radio-btn" data-group="cough-resp-${id}" data-value="voluntary" onclick="selectRadioBtn(this)">Voluntary Cough</button>
          <button class="radio-btn" data-group="cough-resp-${id}" data-value="absent" onclick="selectRadioBtn(this)">Absent (Silent)</button>
        </div>
      </div>
      <div class="form-group">
        <label>Residue Severity</label>
        <select id="trial-residue-severity-${id}">
          <option value="">— Select —</option>
          <option value="none">None</option>
          <option value="coating">Coating only (mild)</option>
          <option value="partial">Partial filling (moderate)</option>
          <option value="full">Full filling (severe)</option>
        </select>
      </div>
    </div>

    <div class="form-group mt-12">
      <label>Residue Location(s)</label>
      <div class="radio-group">
        ${[
          { val: 'valleculae', label: 'Valleculae' },
          { val: 'pyriform', label: 'Pyriform Sinuses' },
          { val: 'post_cricoid', label: 'Post-Cricoid' },
          { val: 'pharyngeal_walls', label: 'Pharyngeal Walls' },
          { val: 'tongue_base', label: 'Base of Tongue' }
        ].map(loc => `
          <label class="checkbox-option">
            <input type="checkbox" name="residue-loc-${id}" value="${loc.val}">
            <span style="font-size:13px; font-weight:500; color:var(--text-primary)">${loc.label}</span>
          </label>
        `).join('')}
      </div>
    </div>

    <div class="form-group mt-12">
      <label>Trial Notes</label>
      <textarea id="trial-notes-${id}" placeholder="Any additional observations for this trial..." rows="2"></textarea>
    </div>
  `;

  container.appendChild(card);
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function removeTrial(id) {
  const card = document.getElementById(`trial-card-${id}`);
  if (card && document.querySelectorAll('.trial-card').length > 1) {
    card.style.opacity = '0';
    card.style.transform = 'scale(0.95)';
    card.style.transition = 'all 0.2s';
    setTimeout(() => card.remove(), 200);
  } else {
    showToast('⚠ At least one trial is required');
  }
}

function selectPAS(btn, trialId) {
  const scale = document.getElementById(`pas-scale-${trialId}`);
  scale.querySelectorAll('.pas-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  const level = parseInt(btn.dataset.level);
  const def = FEES_DATA.PAScale[level];
  const desc = document.getElementById(`pas-desc-${trialId}`);
  if (desc && def) {
    const colors = { normal: 'var(--success)', mild: 'var(--warning)', moderate: 'var(--danger)', severe: '#f85149' };
    desc.innerHTML = `<span style="color:${colors[def.severity]}; font-weight:600">PAS ${level}:</span> ${def.label} — <span style="color:var(--text-secondary)">${def.description}</span>`;
  }
}

/* ════════════════════════════════════════
   STEP 4 — STRATEGIES
═════════════════════════════════════════ */
function initStep4Strategies() {
  const grid = document.getElementById('strategy-grid');
  FEES_DATA.strategies.forEach(s => {
    const item = document.createElement('div');
    item.className = 'strategy-item';
    item.dataset.strategyId = s.id;
    item.innerHTML = `
      <div class="strategy-name">${s.name}</div>
      <div style="font-size:11px; color:var(--text-muted); margin-bottom:6px">${s.description}</div>
      <select class="strategy-select" id="strat-eff-${s.id}">
        <option value="">Not Trialed</option>
        <option value="effective">✓ Effective</option>
        <option value="partial">~ Partially Effective</option>
        <option value="ineffective">✗ Not Effective</option>
      </select>
      <input type="text" id="strat-notes-${s.id}" placeholder="Notes..." style="margin-top:6px; font-size:12px; padding:6px 10px;">
    `;
    grid.appendChild(item);
  });
}

/* ════════════════════════════════════════
   STEP 5 — SUMMARY RENDER
═════════════════════════════════════════ */
function renderSummary() {
  collectCurrentStep(4);
  const { suggestions, diets, findings } = generateTherapySuggestions(AppState.data);
  const container = document.getElementById('summary-content');
  if (!container) return;

  let html = '';

  /* ── Key Findings ── */
  html += `<div class="results-section"><h3>🔍 Key Findings</h3><div style="display:flex;flex-wrap:wrap;gap:6px">`;
  const f = findings;
  const findingsList = [
    { val: f.silentAspiration, label: 'Silent Aspiration (PAS 8)', cls: 'badge-severe' },
    { val: f.aspiration, label: 'Aspiration with Cough (PAS 6-7)', cls: 'badge-moderate' },
    { val: f.penetration, label: `Penetration (PAS ${f.maxPAS})`, cls: 'badge-mild' },
    { val: f.vallecularResidue, label: 'Vallecular Residue', cls: 'badge-mild' },
    { val: f.pyriformResidue, label: 'Pyriform Sinus Residue', cls: 'badge-mild' },
    { val: f.delayedInitiation, label: 'Delayed Initiation', cls: 'badge-mild' },
    { val: f.reducedLaryngealElevation, label: 'Reduced Laryngeal Elevation', cls: 'badge-moderate' },
    { val: f.reducedVFClosure, label: 'Reduced VF Closure', cls: 'badge-moderate' },
    { val: f.poorSecretions, label: 'Impaired Secretion Management', cls: 'badge-moderate' },
    { val: f.reducedTongueBase, label: 'Reduced Base of Tongue Retraction', cls: 'badge-mild' },
  ].filter(x => x.val);

  if (findingsList.length === 0) {
    html += `<span class="finding-badge badge-normal">✓ Within Normal Limits</span>`;
  } else {
    findingsList.forEach(fi => {
      html += `<span class="finding-badge ${fi.cls}">${fi.label}</span>`;
    });
  }
  html += `</div></div>`;

  /* ── Diet Recommendations ── */
  html += `<div class="results-section"><h3>🍽️ IDDSI Diet Recommendations</h3>`;
  html += `<div class="form-grid">
    <div class="card" style="padding:16px; background:rgba(0,201,177,0.05); border-color:rgba(0,201,177,0.2);">
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">LIQUID CONSISTENCY</div>
      <div style="display:flex;align-items:center;gap:10px">
        <span class="iddsi-badge iddsi-${diets.liquid.level}">${diets.liquid.level}</span>
        <div>
          <div style="font-weight:700;font-size:15px">${diets.liquid.name || '—'}</div>
          <div style="font-size:12px;color:var(--text-muted)">${diets.liquid.description || ''}</div>
        </div>
      </div>
    </div>
    <div class="card" style="padding:16px; background:rgba(56,139,253,0.05); border-color:rgba(56,139,253,0.2);">
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">FOOD TEXTURE</div>
      <div style="display:flex;align-items:center;gap:10px">
        <span class="iddsi-badge iddsi-${diets.food.level}">${diets.food.level}</span>
        <div>
          <div style="font-weight:700;font-size:15px">${diets.food.name || '—'}</div>
          <div style="font-size:12px;color:var(--text-muted)">${diets.food.description || ''}</div>
        </div>
      </div>
    </div>
  </div></div>`;

  /* ── Therapy Suggestions ── */
  html += `<div class="results-section"><h3>💊 Recommended Therapy Plan</h3>`;
  if (suggestions.length === 0) {
    html += `<div class="therapy-card"><h4>✅ Within Normal Limits</h4><p>Swallowing function appears within normal limits. No active swallowing therapy indicated at this time. Recommend dietary independence with monitoring.</p></div>`;
  } else {
    const priorityColors = { CRITICAL: 'var(--danger)', HIGH: 'var(--warning)', MODERATE: 'var(--teal)', LOW: 'var(--success)' };
    suggestions.forEach(s => {
      html += `<div class="therapy-card">
        <h4>
          <span style="background:${priorityColors[s.priority]}22; border:1px solid ${priorityColors[s.priority]}55; padding:2px 10px; border-radius:12px; font-size:11px; color:${priorityColors[s.priority]}; font-weight:700">${s.priority}</span>
          ${s.finding}
        </h4>`;
      if (s.immediateAction) {
        html += `<div style="background:rgba(248,81,73,0.1); border:1px solid rgba(248,81,73,0.3); border-radius:8px; padding:10px 14px; margin-bottom:10px; font-size:13px; color:var(--danger)">⚠ <strong>Immediate Action:</strong> ${s.immediateAction}</div>`;
      }
      if (s.therapies?.length) {
        html += `<p style="color:var(--teal); font-weight:600; font-size:13px; margin-bottom:8px">Therapeutic Exercises:</p><ul>`;
        s.therapies.forEach(t => {
          html += `<li style="margin-bottom:8px"><strong>${t.icon} ${t.name}</strong> — ${t.description}<br><span style="color:var(--blue-light); font-size:12px">📋 ${t.protocol}</span></li>`;
        });
        html += `</ul>`;
      }
      if (s.compensatoryStrategies?.length) {
        html += `<p style="color:var(--teal); font-weight:600; font-size:13px; margin-top:8px; margin-bottom:4px">Compensatory Strategies:</p><ul>`;
        s.compensatoryStrategies.forEach(cs => { html += `<li>${cs}</li>`; });
        html += `</ul>`;
      }
      html += `</div>`;
    });
  }
  html += `</div>`;

  container.innerHTML = html;
}

/* ════════════════════════════════════════
   RADIO BUTTON HELPERS
═════════════════════════════════════════ */
function bindRadioButtons() {
  document.querySelectorAll('.radio-btn').forEach(btn => {
    btn.addEventListener('click', function() { selectRadioBtn(this); });
  });
}

function selectRadioBtn(btn) {
  const group = btn.dataset.group;
  document.querySelectorAll(`[data-group="${group}"]`).forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

function getSelectedRadio(groupName) {
  const selected = document.querySelector(`[data-group="${groupName}"].selected`);
  return selected?.dataset.value || '';
}

function getSelectedRadioInContainer(container, groupName) {
  const selected = container.querySelector(`[data-group="${groupName}"].selected`);
  return selected?.dataset.value || '';
}

/* ════════════════════════════════════════
   FORM INPUT HELPERS
═════════════════════════════════════════ */
function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function checked(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}

function bindFormInputs() {
  document.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('change', () => saveToStorage());
    
    if (el.tagName === 'INPUT' && el.type === 'text') {
      el.addEventListener('blur', function() {
        if (this.value) {
          this.value = this.value.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ');
          saveToStorage();
        }
      });
    }
  });

  const dobInput = document.getElementById('pat-dob');
  const ageInput = document.getElementById('pat-age');
  if (dobInput && ageInput) {
    dobInput.addEventListener('change', () => {
      if (dobInput.value) {
        const dob = new Date(dobInput.value);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        ageInput.value = age >= 0 ? age : 0;
        saveToStorage();
      }
    });
  }
}

/* ════════════════════════════════════════
   VALIDATION
═════════════════════════════════════════ */
function validateCurrentStep() {
  if (AppState.currentStep === 1) {
    const name = val('pat-name');
    if (!name) {
      showToast('⚠ Please enter patient name to continue');
      document.getElementById('pat-name')?.focus();
      return false;
    }
  }
  return true;
}

/* ════════════════════════════════════════
   LOCAL STORAGE
═════════════════════════════════════════ */
function saveToStorage() {
  try {
    localStorage.setItem('fees_data', JSON.stringify(AppState.data));
  } catch (e) {}
}

function loadFromStorage() {
  try {
    const saved = localStorage.getItem('fees_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      AppState.data = { ...AppState.data, ...parsed };
      // Re-populate patient fields
      setTimeout(() => populatePatientFields(), 50);
    }
  } catch (e) {}
}

function populatePatientFields() {
  const p = AppState.data.patient;
  if (!p || !p.name) return;
  const map = {
    'pat-name': p.name, 'pat-dob': p.dob, 'pat-age': p.age,
    'pat-gender': p.gender, 'pat-mrn': p.mrn,
    'pat-physician': p.referringPhysician, 'pat-diagnosis': p.primaryDiagnosis,
    'pat-referral': p.reasonForReferral, 'pat-eval-date': p.evaluationDate,
    'pat-evaluator': p.evaluatorName, 'pat-facility': p.facility
  };
  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el && val) el.value = val;
  });

  // Re-populate summary fields (including monochrome)
  const s = AppState.data.summary;
  if (s) {
    if (document.getElementById('clinical-impression')) document.getElementById('clinical-impression').value = s.clinicalImpression || '';
    if (document.getElementById('follow-up-plan')) document.getElementById('follow-up-plan').value = s.followUp || '';
    if (document.getElementById('pdf-monochrome')) document.getElementById('pdf-monochrome').checked = !!s.monochrome;
  }
}

/* ════════════════════════════════════════
   TOAST NOTIFICATION
═════════════════════════════════════════ */
function showToast(message, duration = 3000) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}
