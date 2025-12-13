// Rules menu module - shows game rules and how to play

let rulesModal = null;
let rulesButton = null;

const RULES_CONTENT = `
<div class="rules-sections">
  <section class="rules-section">
    <h3>Objective</h3>
    <p>Conquer territories, build villages, strongholds, and cities. When a player becomes <strong>Duke</strong>, the player with the most Victory Points wins!</p>
  </section>

  <section class="rules-section">
    <h3>Game Phases</h3>
    <div class="rules-phase">
      <h4>1. Setup Phase</h4>
      <p>Players take turns placing 3 cities with knights. Cities cannot be placed on lakes, forests, or adjacent to other cities.</p>
    </div>
    <div class="rules-phase">
      <h4>2. Battle Phase</h4>
      <p>Players take turns choosing one action to expand territory, collect resources, and advance noble titles.</p>
    </div>
  </section>

  <section class="rules-section">
    <h3>Actions (Choose 1 per turn)</h3>
    <div class="rules-actions">
      <div class="rules-action">
        <span class="action-icon">&#9822;</span>
        <div class="action-text">
          <strong>Recruitment</strong>
          <p>Place up to 2 knights in a city (3 if adjacent to lake).</p>
        </div>
      </div>
      <div class="rules-action">
        <span class="action-icon">&#8680;</span>
        <div class="action-text">
          <strong>Movement</strong>
          <p>Move 1 knight to an adjacent hex. Cannot enter lakes, enemy cities/strongholds, or occupied mountains.</p>
        </div>
      </div>
      <div class="rules-action">
        <span class="action-icon">&#127969;</span>
        <div class="action-text">
          <strong>Construction</strong>
          <p>Replace a knight with a village or stronghold. Gain the terrain's resource token.</p>
        </div>
      </div>
      <div class="rules-action">
        <span class="action-icon">&#127984;</span>
        <div class="action-text">
          <strong>New City</strong>
          <p>Replace a village with a city. Earns 10 Victory Points. Cannot be in forests or adjacent to cities.</p>
        </div>
      </div>
      <div class="rules-action">
        <span class="action-icon">&#9876;</span>
        <div class="action-text">
          <strong>Expedition</strong>
          <p>Spend 2 knights from reserve to place 1 knight on an empty hex at the board's edge.</p>
        </div>
      </div>
      <div class="rules-action">
        <span class="action-icon">&#128081;</span>
        <div class="action-text">
          <strong>Noble Title</strong>
          <p>Spend 15+ resource points to advance one rank toward Duke.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="rules-section">
    <h3>Terrains & Resources</h3>
    <div class="rules-terrains">
      <div class="terrain-item">
        <span class="terrain-color terrain-field"></span>
        <span>Field = 5 pts</span>
      </div>
      <div class="terrain-item">
        <span class="terrain-color terrain-plain"></span>
        <span>Plain = 4 pts</span>
      </div>
      <div class="terrain-item">
        <span class="terrain-color terrain-forest"></span>
        <span>Forest = 3 pts</span>
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
    <p>Spend 15+ resource points to advance one rank:</p>
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
    <p>Move knights to a hex with enemy pieces to attack:</p>
    <ul>
      <li>2 knights destroy 1 enemy village and steal a resource token</li>
      <li>2 knights destroy 1 enemy knight</li>
      <li>Cities and strongholds cannot be attacked</li>
    </ul>
  </section>

  <section class="rules-section">
    <h3>Scoring</h3>
    <p><strong>Final Score</strong> = Victory Points + Resource Points</p>
    <ul>
      <li>10 VP per city built during the game</li>
      <li>Resource tokens count as their point value</li>
    </ul>
  </section>
</div>
`;

export function initRulesMenu() {
  if (rulesButton) return;

  rulesButton = document.createElement('button');
  rulesButton.id = 'rules-button';
  rulesButton.innerHTML = 'How to Play';
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
