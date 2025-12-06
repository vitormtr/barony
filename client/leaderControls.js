// Módulo de controles do líder da sala
import { socket } from './ClientSocketEvents.js';
import { showSuccess, showError, showWarning, showInfo } from './notifications.js';
import { getRoomId } from './roomInfo.js';

let isLeader = false;
let leaderControlsElement = null;
let restartModalElement = null;

export function setLeader(leader) {
  isLeader = leader;
  if (leader) {
    showLeaderControls();
  }
}

export function isRoomLeader() {
  return isLeader;
}

function showLeaderControls() {
  if (leaderControlsElement) {
    leaderControlsElement.style.display = 'flex';
    return;
  }

  leaderControlsElement = document.createElement('div');
  leaderControlsElement.id = 'leader-controls';
  leaderControlsElement.innerHTML = `
    <div class="leader-badge">Lider da Sala</div>
    <div class="leader-buttons">
      <button id="randomDistributionBtn" class="leader-btn" title="Distribui todas as texturas aleatoriamente no tabuleiro">
        Distribuir Texturas
      </button>
      <button id="restartGameBtn" class="leader-btn restart-btn" title="Reinicia o jogo do zero">
        Reiniciar Jogo
      </button>
    </div>
  `;
  document.body.appendChild(leaderControlsElement);

  // Event listeners
  document.getElementById('randomDistributionBtn').addEventListener('click', handleRandomDistribution);
  document.getElementById('restartGameBtn').addEventListener('click', showRestartModal);
}

function handleRandomDistribution() {
  if (!isLeader) {
    showError('Apenas o líder pode fazer isso!');
    return;
  }

  // Confirmação
  if (!confirm('Isso irá distribuir TODAS as texturas de TODOS os jogadores aleatoriamente no tabuleiro.\n\nApós isso, novos jogadores NÃO poderão entrar na sala.\n\nDeseja continuar?')) {
    return;
  }

  showInfo('Distribuindo texturas...');
  socket.emit('randomDistribution');
}

function showRestartModal() {
  if (!isLeader) {
    showError('Apenas o líder pode fazer isso!');
    return;
  }

  if (restartModalElement) {
    restartModalElement.style.display = 'flex';
    restartModalElement.querySelector('input').value = '';
    restartModalElement.querySelector('input').focus();
    return;
  }

  restartModalElement = document.createElement('div');
  restartModalElement.id = 'restart-modal';
  restartModalElement.className = 'modal-overlay';
  restartModalElement.innerHTML = `
    <div class="modal-content">
      <h3>Reiniciar Jogo</h3>
      <p>Para confirmar o reinício, digite o código da sala:</p>
      <input type="text" id="restartConfirmInput" placeholder="Código da sala" maxlength="6" autocomplete="off">
      <div class="modal-buttons">
        <button id="confirmRestartBtn" class="modal-btn confirm">Confirmar</button>
        <button id="cancelRestartBtn" class="modal-btn cancel">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(restartModalElement);

  // Event listeners
  document.getElementById('confirmRestartBtn').addEventListener('click', handleRestartConfirm);
  document.getElementById('cancelRestartBtn').addEventListener('click', hideRestartModal);
  restartModalElement.addEventListener('click', (e) => {
    if (e.target === restartModalElement) hideRestartModal();
  });

  // Enter para confirmar
  document.getElementById('restartConfirmInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleRestartConfirm();
  });

  restartModalElement.querySelector('input').focus();
}

function hideRestartModal() {
  if (restartModalElement) {
    restartModalElement.style.display = 'none';
  }
}

function handleRestartConfirm() {
  const input = document.getElementById('restartConfirmInput');
  const confirmCode = input.value.trim();
  const currentRoomId = getRoomId();

  if (!confirmCode) {
    showWarning('Digite o código da sala para confirmar.');
    input.focus();
    return;
  }

  if (confirmCode !== currentRoomId) {
    showError('Código incorreto!');
    input.value = '';
    input.focus();
    return;
  }

  showInfo('Reiniciando jogo...');
  socket.emit('restartGame', confirmCode);
  hideRestartModal();
}

// Esconde os controles (quando não é mais líder ou sala foi resetada)
export function hideLeaderControls() {
  if (leaderControlsElement) {
    leaderControlsElement.style.display = 'none';
  }
}

// Desabilita botão de distribuição após usar
export function disableDistributionButton() {
  const btn = document.getElementById('randomDistributionBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Tabuleiro Montado';
    btn.classList.add('disabled');
  }
}

// Reabilita botão após reinício
export function enableDistributionButton() {
  const btn = document.getElementById('randomDistributionBtn');
  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Distribuir Texturas';
    btn.classList.remove('disabled');
  }
}
