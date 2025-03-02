const socket = io(); 

const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const roomIdInput = document.getElementById("roomIdInput");
const gameInfo = document.getElementById("gameInfo");

createRoomBtn.addEventListener('click', () => {
    console.log('Solicitando criação de sala...');
    socket.emit('createRoom');
});

socket.on('roomCreated', (roomId) => {
    console.log(`Sala criada com sucesso! ID: ${roomId}`);
    gameInfo.innerHTML = `Sala criada com sucesso! ID: ${roomId}`;

    socket.emit('joinRoom', roomId);
    window.location.href = `/barony-board.html?roomId=${roomId}`;
});

joinRoomBtn.addEventListener('click', () => {
    const roomId = roomIdInput.value.trim();
    if (roomId) {
        socket.emit('joinRoom', roomId);
    } else {
        alert("Por favor, insira um ID de sala válido.");
    }
});

socket.on('playerJoined', (roomId) => {
    console.log(`Entrou na sala ${roomId}`);
    gameInfo.innerHTML = `Você entrou na sala ${roomId}`;
    window.location.href = `/barony-board.html?roomId=${roomId}`;
});

socket.on('error', (message) => {
    alert(`Erro: ${message}`);
});
