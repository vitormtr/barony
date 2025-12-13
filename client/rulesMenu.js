// Rules menu module - shows game rules and how to play

let rulesModal = null;
let rulesButton = null;

const RULES_CONTENT = `
<div class="rules-sections">
  <section class="rules-section">
    <h3>Objective</h3>
    <p>Be the first player to become a <strong>Duke</strong>, or have the highest score when a Duke is crowned.</p>
  </section>

  <section class="rules-section">
    <h3>Game Phases</h3>
    <div class="rules-phase">
      <h4>1. Setup Phase</h4>
      <p>Players take turns placing their initial 3 cities on <strong>plains</strong> or <strong>fields</strong>. Each city comes with a knight.</p>
    </div>
    <div class="rules-phase">
      <h4>2. Battle Phase</h4>
      <p>Players take turns performing actions to expand their territory, collect resources, and advance their noble title.</p>
    </div>
  </section>

  <section class="rules-section">
    <h3>Actions (Battle Phase)</h3>
    <div class="rules-actions">
      <div class="rules-action">
        <span class="action-icon">&#9822;</span>
        <div>
          <strong>Recruitment</strong>
          <p>Add a knight to one of your cities.</p>
        </div>
      </div>
      <div class="rules-action">
        <span class="action-icon">&#8680;</span>
        <div>
          <strong>Movement</strong>
          <p>Move a knight to an adjacent hex. Moving to a new terrain collects that resource.</p>
        </div>
      </div>
      <div class="rules-action">
        <span class="action-icon">&#127969;</span>
        <div>
          <strong>Village</strong>
          <p>Build a village on forest, field, or plain where you have a knight.</p>
        </div>
      </div>
      <div class="rules-action">
        <span class="action-icon">&#127983;</span>
        <div>
          <strong>Stronghold</strong>
          <p>Build a stronghold on forest, field, or plain where you have a knight.</p>
        </div>
      </div>
      <div class="rules-action">
        <span class="action-icon">&#128081;</span>
        <div>
          <strong>Noble Title</strong>
          <p>Spend 15+ resource points to advance your title.</p>
        </div>
      </div>
      <div class="rules-action">
        <span class="action-icon">&#9876;</span>
        <div>
          <strong>Expedition</strong>
          <p>Remove a knight from the board to gain resources based on the terrain.</p>
        </div>
      </div>
      <div class="rules-action">
        <span class="action-icon">&#127984;</span>
        <div>
          <strong>New City</strong>
          <p>Convert a village to a city. Gains 10 victory points.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="rules-section">
    <h3>Terrains & Resources</h3>
    <div class="rules-terrains">
      <div class="terrain-item">
        <span class="terrain-color terrain-forest"></span>
        <span>Forest = 3 pts</span>
      </div>
      <div class="terrain-item">
        <span class="terrain-color terrain-field"></span>
        <span>Field = 5 pts</span>
      </div>
      <div class="terrain-item">
        <span class="terrain-color terrain-plain"></span>
        <span>Plain = 4 pts</span>
      </div>
      <div class="terrain-item">
        <span class="terrain-color terrain-mountain"></span>
        <span>Mountain = 2 pts</span>
      </div>
      <div class="terrain-item">
        <span class="terrain-color terrain-lake"></span>
        <span>Lake = impassable</span>
      </div>
    </div>
  </section>

  <section class="rules-section">
    <h3>Noble Titles</h3>
    <p>Spend 15+ resource points to advance:</p>
    <div class="rules-titles">
      <span class="title-badge">Baron</span>
      <span class="title-arrow">&#8594;</span>
      <span class="title-badge">Viscount</span>
      <span class="title-arrow">&#8594;</span>
      <span class="title-badge">Count</span>
      <span class="title-arrow">&#8594;</span>
      <span class="title-badge">Marquis</span>
      <span class="title-arrow">&#8594;</span>
      <span class="title-badge title-duke">Duke</span>
    </div>
  </section>

  <section class="rules-section">
    <h3>Combat</h3>
    <p>Move a knight to a hex with enemy pieces:</p>
    <ul>
      <li>Knight vs Knight: both are destroyed</li>
      <li>Knight vs Village/Stronghold: structure is destroyed, knight remains</li>
      <li>Strongholds require 2 knights to destroy</li>
      <li>Cities cannot be attacked</li>
    </ul>
  </section>

  <section class="rules-section">
    <h3>Scoring</h3>
    <p><strong>Final Score</strong> = Victory Points + Resource Points</p>
    <ul>
      <li>Each new city built = 10 VP</li>
      <li>Resource points = sum of all collected resources</li>
    </ul>
  </section>
</div>
`;

export function initRulesMenu() {
  if (rulesButton) return;

  rulesButton = document.createElement('button');
  rulesButton.id = 'rules-button';
  rulesButton.innerHTML = '?';
  rulesButton.title = 'Game Rules';
  rulesButton.addEventListener('click', showRulesModal);

  document.body.appendChild(rulesButton);
}

function showRulesModal() {
  if (rulesModal) {
    rulesModal.style.display = 'flex';
    return;
  }

  rulesModal = document.createElement('div');
  rulesModal.id = 'rules-modal';
  rulesModal.className = 'modal-overlay';
  rulesModal.innerHTML = `
    <div class="modal-content rules-modal-content">
      <div class="rules-header">
        <h2>How to Play Barony</h2>
        <button class="rules-close-btn" id="close-rules-btn">&times;</button>
      </div>
      <div class="rules-body">
        ${RULES_CONTENT}
      </div>
    </div>
  `;

  document.body.appendChild(rulesModal);

  document.getElementById('close-rules-btn').addEventListener('click', hideRulesModal);
  rulesModal.addEventListener('click', (e) => {
    if (e.target === rulesModal) hideRulesModal();
  });
}

function hideRulesModal() {
  if (rulesModal) {
    rulesModal.style.display = 'none';
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRulesMenu);
} else {
  initRulesMenu();
}
