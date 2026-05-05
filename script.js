let deck = [];
let playerHand = [];
let dealerHand = [];
let gameOver = false;

const suits = ["♠", "♣", "♥", "♦"];
const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function createDeck() {
    deck = [];
    for (let s of suits) {
        for (let v of values) {
            deck.push({ value: v, suit: s });
        }
    }
    deck = deck.sort(() => Math.random() - 0.5); // Mélange simple
}

function getScore(hand) {
    let score = 0;
    let aces = 0;
    for (let card of hand) {
        if (card.value === "A") {
            aces += 1;
            score += 11;
        } else if (["J", "Q", "K"].includes(card.value)) {
            score += 10;
        } else {
            score += parseInt(card.value);
        }
    }
    while (score > 21 && aces > 0) {
        score -= 10;
        aces -= 1;
    }
    return score;
}

function renderCard(card, elementId) {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `<div>${card.value}</div><div>${card.suit}</div>`;
    if (card.suit === "♥" || card.suit === "♦") div.style.color = "red";
    document.getElementById(elementId).appendChild(div);
}

function startNewGame() {
    gameOver = false;
    playerHand = [];
    dealerHand = [];
    document.getElementById('player-cards').innerHTML = "";
    document.getElementById('dealer-cards').innerHTML = "";
    document.getElementById('message').innerText = "";
    document.getElementById('reset-btn').classList.add('hidden');
    
    createDeck();
    hitPlayer(); hitPlayer();
    hitDealer();
    updateUI();
}

function hitPlayer() {
    if (gameOver) return;
    const card = deck.pop();
    playerHand.push(card);
    renderCard(card, 'player-cards');
    if (getScore(playerHand) > 21) endGame("Bust ! Tu as dépassé 21.");
    updateUI();
}

function hitDealer() {
    const card = deck.pop();
    dealerHand.push(card);
    renderCard(card, 'dealer-cards');
}

function stand() {
    if (gameOver) return;
    while (getScore(dealerHand) < 17) {
        hitDealer();
    }
    const pScore = getScore(playerHand);
    const dScore = getScore(dealerHand);

    if (dScore > 21 || pScore > dScore) endGame("Gagné ! 🏆");
    else if (dScore > pScore) endGame("Le croupier gagne. 🎰");
    else endGame("Égalité ! 🤝");
    updateUI();
}

function updateUI() {
    document.getElementById('player-score').innerText = getScore(playerHand);
    document.getElementById('dealer-score').innerText = getScore(dealerHand);
}

function endGame(msg) {
    gameOver = true;
    document.getElementById('message').innerText = msg;
    document.getElementById('reset-btn').classList.remove('hidden');
}

// Events
document.getElementById('hit-btn').onclick = hitPlayer;
document.getElementById('stand-btn').onclick = stand;
document.getElementById('reset-btn').onclick = startNewGame;

startNewGame();