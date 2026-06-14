let balance = 100;
let deck = [];
let dealerHand = [];
let playerHands = []; 
let currentHandIndex = 0;
let gameOver = false;

const suits = ["♠", "♣", "♥", "♦"];
const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// Sons avec gestion d'erreur (si le navigateur bloque l'audio)
const chipSound = new Audio('assets\\sounds\\chips.mp3');
const flipSound= new Audio('assets\\sounds\\flipcard.mp3');
const sadSound= new Audio('assets\\sounds\\sad.mp3');
const winSound= new Audio('assets\\sounds\\win.mp3');

let soundEnabled = true;

function playSound(sound) {
    if (!soundEnabled) return;

    sound.currentTime = 0;
    sound.play().catch(() => {}); // Évite de bloquer le code si l'audio échoue
}

function getRankValue(card) {
    if (["10", "J", "Q", "K"].includes(card.value)) return "10-value";
    return card.value;
}

function createDeck() {
    deck = [];
    for (let s of suits) {
        for (let v of values) {
            deck.push({ value: v, suit: s });
        }
    }
    deck = deck.sort(() => Math.random() - 0.5);
}

function getScore(hand) {
    let score = 0;
    let aces = 0;
    if (!hand) return 0;
    for (let card of hand) {
        if (card.value === "A") { aces += 1; score += 11; }
        else if (["J", "Q", "K"].includes(card.value)) { score += 10; }
        else { score += parseInt(card.value); }
    }
    while (score > 21 && aces > 0) { score -= 10; aces -= 1; }
    return score;
}

function getVisibleDealerScore() {
    if (gameOver) return getScore(dealerHand);
    if (dealerHand.length < 2) return 0;
    return getScore(dealerHand.slice(1)); // Score de la carte face visible
}

async function placeBet() {
    const betInput = document.getElementById('bet-input');
    const betValue = parseInt(betInput.value);

    if (betValue < 5 || betValue > 100 || betValue > balance) {
        alert("Mise invalide ou solde insuffisant.");
        return;
    }

    playSound(chipSound);
    balance -= betValue;
    
    // Reset data
    playerHands = [{ cards: [], bet: betValue, finished: false }];
    dealerHand = [];
    currentHandIndex = 0;
    gameOver = false;

    // Reset UI avant de commencer
    document.getElementById('player-cards').innerHTML = "";
    document.getElementById('dealer-cards').innerHTML = "";
    document.getElementById('message').innerText = "";
    document.getElementById('bet-input-container').classList.add('hidden');

    createDeck();
    
    // Distribution initiale : Joueur -> Dealer -> Joueur -> Dealer
    await addCardToPlayer(0);
    await addCardToDealer();
    await addCardToPlayer(0);
    await addCardToDealer();
}

async function addCardToPlayer(handIdx) {
    if (!playerHands[handIdx]) return;
    playerHands[handIdx].cards.push(deck.pop());
    playSound(flipSound);
    updateUI();
    await new Promise(r => setTimeout(r, 400));
}

async function addCardToDealer() {
    dealerHand.push(deck.pop());
    playSound(flipSound);
    updateUI();
    await new Promise(r => setTimeout(r, 400));
}

// --- ACTIONS ---
async function hitPlayer() {
    await addCardToPlayer(currentHandIndex);
    if (getScore(playerHands[currentHandIndex].cards) >= 21) {
        nextHand();
    }
}

async function doubleDown() {
    let hand = playerHands[currentHandIndex];
    if (balance >= hand.bet) {
        balance -= hand.bet;
        hand.bet *= 2;
        await addCardToPlayer(currentHandIndex);
        hand.finished = true;
        nextHand();
    }
}

async function splitHand() {
    let hand = playerHands[currentHandIndex];
    balance -= hand.bet;
    
    let newHand = {
        cards: [hand.cards.pop()],
        bet: hand.bet,
        finished: false
    };

    playerHands.splice(currentHandIndex + 1, 0, newHand);
    
    playSound(chipSound);
    // On vide le conteneur visuel car la structure des mains a changé
    document.getElementById('player-cards').innerHTML = "";
    updateUI();

    await addCardToPlayer(currentHandIndex);
    await addCardToPlayer(currentHandIndex + 1);
}

function nextHand() {
    playerHands[currentHandIndex].finished = true;
    if (currentHandIndex < playerHands.length - 1) {
        currentHandIndex++;
        updateUI();
    } else {
        stand(); 
    }
}

async function stand() {
    if (gameOver) return;
    let allBust = playerHands.every(h => getScore(h.cards) > 21);
    if (!allBust) {
        while (getScore(dealerHand) < 17) {
            await addCardToDealer();
        }
    }
    resolveGame();
}

function resolveGame() {
    gameOver = true;
    updateUI(); // Pour révéler la carte cachée
    
    let finalMsg = "";
    const dScore = getScore(dealerHand);

    playerHands.forEach((hand, i) => {
        const pScore = getScore(hand.cards);
        let msg = playerHands.length > 1 ? `M${i+1}: ` : "";
        if (pScore > 21) msg += "Bust! ❌";
        else if (dScore > 21 || pScore > dScore) {
            balance += (pScore === 21 && hand.cards.length === 2) ? Math.floor(hand.bet * 2.5) : hand.bet * 2;
            msg += "Gagné! 🏆";
            playSound(winSound);
        } else if (pScore < dScore) {
            msg += "Perdu. 🎰";
            playSound(sadSound);
        }
        else { balance += hand.bet; msg += "Nul. 🤝"; }
        finalMsg += msg + " ";
    });

    document.getElementById('message').innerText = finalMsg;
    document.getElementById('reset-btn').classList.remove('hidden');
}

// --- AFFICHAGE (Le moteur du jeu) ---
function createCardElement(card, isHidden, index) {
    const div = document.createElement('div');
    div.className = 'card new-card';
    div.style.zIndex = index;
    if (isHidden) {
        div.classList.add('card-back');
    } else {
        div.innerHTML = `<div>${card.value}</div><div>${card.suit}</div>`;
        if (card.suit === "♥" || card.suit === "♦") div.style.color = "red";
    }
    return div;
}

function updateUI() {
    // 1. Dealer
    const dealerArea = document.getElementById('dealer-cards');
    const dealerCardsDom = dealerArea.querySelectorAll('.card');
    dealerHand.forEach((card, i) => {
        if (!dealerCardsDom[i]) {
            dealerArea.appendChild(createCardElement(card, (!gameOver && i === 0), i));
        } else if (gameOver && i === 0 && dealerCardsDom[i].classList.contains('card-back')) {
            dealerCardsDom[i].classList.remove('card-back');
            dealerCardsDom[i].innerHTML = `<div>${card.value}</div><div>${card.suit}</div>`;
            if (card.suit === "♥" || card.suit === "♦") dealerCardsDom[i].style.color = "red";
        }
    });
    document.getElementById('dealer-score').innerText = getVisibleDealerScore();

    // 2. Joueur
    const playerArea = document.getElementById('player-cards');
    playerHands.forEach((hand, hIdx) => {
        let handDiv = document.getElementById(`hand-${hIdx}`);
        if (!handDiv) {
            handDiv = document.createElement('div');
            handDiv.id = `hand-${hIdx}`;
            handDiv.className = "hand-container";
            playerArea.appendChild(handDiv);
        }
        handDiv.className = "hand-container" + (hIdx === currentHandIndex && !gameOver ? " active-hand" : "");

        const cardsDom = handDiv.querySelectorAll('.card');
        hand.cards.forEach((card, cIdx) => {
            if (!cardsDom[cIdx]) {
                handDiv.appendChild(createCardElement(card, false, cIdx));
            }
        });
    });

    if (playerHands[currentHandIndex]) {
        document.getElementById('player-score').innerText = getScore(playerHands[currentHandIndex].cards);
    }
    document.getElementById('balance-display').innerText = balance;
    updateControls();
}

function updateControls() {
    const controls = document.getElementById('controls');
    if (gameOver || playerHands.length === 0) {
        controls.classList.add('hidden');
        return;
    }
    controls.classList.remove('hidden');
    const hand = playerHands[currentHandIndex];
    
    document.getElementById('double-btn').classList.toggle('hidden', !(hand.cards.length === 2 && balance >= hand.bet));
    const canSplit = hand.cards.length === 2 && getRankValue(hand.cards[0]) === getRankValue(hand.cards[1]) && balance >= hand.bet;
    document.getElementById('split-btn').classList.toggle('hidden', !canSplit);
}

// --- BOUTONS ---
document.getElementById('deal-btn').onclick = placeBet;
document.getElementById('hit-btn').onclick = hitPlayer;
document.getElementById('stand-btn').onclick = nextHand;
document.getElementById('double-btn').onclick = doubleDown;
document.getElementById('split-btn').onclick = splitHand;
document.getElementById('reset-btn').onclick = () => {
    if (balance < 5) balance = 100;
    document.getElementById('bet-input-container').classList.remove('hidden');
    document.getElementById('reset-btn').classList.add('hidden');
    document.getElementById('player-cards').innerHTML = "";
    document.getElementById('dealer-cards').innerHTML = "";
    playerHands = [];
    dealerHand = [];
    updateUI();
};


function setSound(enabled) {
    soundEnabled = enabled;

    if (!enabled) {
        [chipSound, flipSound, sadSound, winSound].forEach(sound => {
            sound.pause();
            sound.currentTime = 0;
        });
    }
}

document.getElementById('sound-btn').onclick = () => {
    setSound(!soundEnabled);

    document.getElementById('sound-btn').textContent =
        soundEnabled ? "🔊 Son ON" : "🔇 Son OFF";
};