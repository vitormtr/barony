

const hexContainer = document.getElementById("hexContainer");

const textures = [
    { type: "water", chance: 0.20 },
    { type: "mountain", chance: 0.20 },
    { type: "forest", chance: 0.20 },
    { type: "farm", chance: 0.20 },
    { type: "plain", chance: 0.20 }
];

function getRandomTexture() {
    const rand = Math.random();
    let cumulative = 0;
    for (const texture of textures) {
        cumulative += texture.chance;
        if (rand < cumulative) return texture.type;
    }
    return "water";
}

for (let row = 0; row < 10; row++) {
    const rowContainer = document.createElement("div");
    rowContainer.classList.add("hex-container");

    if (row % 2 !== 0) {
        rowContainer.classList.add("offset");
    }
    
    for (let col = 0; col < 11; col++) {
        const hex = document.createElement("div");
        hex.classList.add("hexagon");
        const randomTexture = getRandomTexture();
        hex.style.backgroundImage = `url(${randomTexture}.png)`;
        rowContainer.appendChild(hex);
    }
    hexContainer.appendChild(rowContainer);
}