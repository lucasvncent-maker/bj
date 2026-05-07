let balance = 100;
let deck = [];
let dealerHand = [];
let playerHands = []; // Tableau d'objets : [{cards: [], bet: 0, active: true, finished: false}]
let currentHandIndex = 0;
let gameOver = false;

const suits = ["♠", "♣", "♥", "♦"];
const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function getRankValue(card) {
    if (["10", "J", "Q", "K"].includes(card.value)) {
        return "10-value"; // On leur donne un nom commun
    }
    return card.value; // "A", "2", "3", etc.
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
    for (let card of hand) {
        if (card.value === "A") { aces += 1; score += 11; }
        else if (["J", "Q", "K"].includes(card.value)) { score += 10; }
        else { score += parseInt(card.value); }
    }
    while (score > 21 && aces > 0) { score -= 10; aces -= 1; }
    return score;
}

function placeBet() {
    const betInput = document.getElementById('bet-input');
    const betValue = parseInt(betInput.value);

    if (betValue < 5 || betValue > 100 || betValue > balance) {
        alert("Mise invalide ou solde insuffisant.");
        return;
    }

    balance -= betValue;
    playerHands = [{ cards: [], bet: betValue, finished: false }];
    currentHandIndex = 0;
    dealerHand = [];
    
    document.getElementById('bet-input-container').classList.add('hidden');
    document.getElementById('controls').classList.remove('hidden');
    
    startNewGame();
}

function startNewGame() {
    createDeck();
    gameOver = false;

    // Distribution initiale
    playerHands[0].cards.push(deck.pop(), deck.pop());
    dealerHand.push(deck.pop(), deck.pop());

    updateUI();

    const h = playerHands[0];
    const val1 = getRankValue(h.cards[0]);
    const val2 = getRankValue(h.cards[1]);

    // On compare les "RankValues" au lieu des valeurs brutes
    if (val1 === val2 && balance >= h.bet) {
        document.getElementById('split-btn').classList.remove('hidden');
    } else {
        document.getElementById('split-btn').classList.add('hidden');
    }
}

function hitPlayer() {
    let hand = playerHands[currentHandIndex];
    hand.cards.push(deck.pop());
    
    // Désactiver "Doubler" et "Split" après le premier tirage
    document.getElementById('double-btn').classList.add('hidden');
    document.getElementById('split-btn').classList.add('hidden');

    if (getScore(hand.cards) > 21) {
        nextHand();
    }
    updateUI();
}

function doubleDown() {
    let hand = playerHands[currentHandIndex];
    if (balance >= hand.bet) {
        balance -= hand.bet;
        hand.bet *= 2;
        hand.cards.push(deck.pop());
        hand.finished = true;
        updateUI();
        nextHand();
    } else {
        alert("Pas assez de points pour doubler !");
    }
}

function splitHand() {
    let hand = playerHands[currentHandIndex];
    // Créer une deuxième main
    balance -= hand.bet;
    let newHand = {
        cards: [hand.cards.pop()],
        bet: hand.bet,
        finished: false
    };
    hand.cards.push(deck.pop()); // Compléter la main 1
    newHand.cards.push(deck.pop()); // Compléter la main 2
    
    playerHands.push(newHand);
    document.getElementById('split-btn').classList.add('hidden');
    updateUI();
}

function nextHand() {
    playerHands[currentHandIndex].finished = true;

    // Si il reste une main à jouer
    if (currentHandIndex < playerHands.length - 1) {
        currentHandIndex++;
        
        // --- CRUCIAL : On met à jour l'interface ici ---
        updateUI(); 
        
        // Optionnel : Si la nouvelle main est déjà un Blackjack (21), 
        // on passe automatiquement à la suivante ou au croupier
        if (getScore(playerHands[currentHandIndex].cards) === 21) {
            nextHand();
        }
    } else {
        // Plus de mains à jouer, c'est au tour du croupier
        stand(); 
    }
}

function stand() {
    if (gameOver) return;

    // Le croupier ne joue que si au moins une main n'est pas bust
    let allBust = playerHands.every(h => getScore(h.cards) > 21);
    
    if (!allBust) {
        while (getScore(dealerHand) < 17) {
            dealerHand.push(deck.pop());
        }
    }

    resolveGame();
}

function resolveGame() {
    gameOver = true;
    let finalMsg = "";
    const dScore = getScore(dealerHand);

    playerHands.forEach((hand, i) => {
        const pScore = getScore(hand.cards);
        let msg = `Main ${i+1}: `;

        if (pScore > 21) {
            msg += "Bust ! ❌";
        } else if (dScore > 21 || pScore > dScore) {
            let mult = (pScore === 21 && hand.cards.length === 2) ? 2.5 : 2;
            balance += Math.floor(hand.bet * mult);
            msg += "Gagné ! 🏆";
        } else if (pScore < dScore) {
            msg += "Perdu. 🎰";
        } else {
            balance += hand.bet;
            msg += "Égalité. 🤝";
        }
        finalMsg += msg + " | ";
    });

    document.getElementById('message').innerText = finalMsg;
    document.getElementById('controls').classList.add('hidden');
    document.getElementById('reset-btn').classList.remove('hidden');
    updateUI();
}

function updateUI() {
    // --- 1. CROUPIER ---
    const dealerArea = document.getElementById('dealer-cards');
    dealerArea.innerHTML = `<div class="cards-display" id="dealer-cards-row"></div>`;
    const dealerRow = document.getElementById('dealer-cards-row');
    
    dealerHand.forEach((card, i) => {
        const div = document.createElement('div');
        div.className = 'card';
        if (!gameOver && i === 0) {
            div.classList.add('card-back');
            div.innerHTML = "?";
        } else {
            div.innerHTML = `<div>${card.value}</div><div>${card.suit}</div>`;
            if (card.suit === "♥" || card.suit === "♦") div.style.color = "red";
        }
        dealerRow.appendChild(div);
    });
    
    // Score du croupier en haut
    document.getElementById('dealer-score').innerText = (gameOver || dealerHand.length === 0) ? getScore(dealerHand) : "?";

    // --- 2. JOUEUR ---
    const playerArea = document.getElementById('player-cards');
    playerArea.innerHTML = ""; // On vide pour reconstruire

    playerHands.forEach((hand, index) => {
        const handDiv = document.createElement('div');
        handDiv.className = "hand-container";
        
        // SI C'EST LA MAIN ACTUELLE : On ajoute la classe "active-hand"
        if (index === currentHandIndex && !gameOver) {
            handDiv.classList.add('active-hand');
        }
        
        const cardsRow = document.createElement('div');
        cardsRow.className = "cards-display";
        
        hand.cards.forEach(card => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card';
            cardDiv.innerHTML = `<div>${card.value}</div><div>${card.suit}</div>`;
            if (card.suit === "♥" || card.suit === "♦") cardDiv.style.color = "red";
            cardsRow.appendChild(cardDiv);
        });
        
        handDiv.appendChild(cardsRow);
        playerArea.appendChild(handDiv);
    });

    // --- 3. MISE À JOUR DU SCORE EN HAUT ---
    // On affiche le score de la main que le joueur est en train de jouer
    if (playerHands.length > 0) {
        const currentScore = getScore(playerHands[currentHandIndex].cards);
        document.getElementById('player-score').innerText = currentScore;
    } else {
        document.getElementById('player-score').innerText = "0";
    }

    // Solde
    document.getElementById('balance-display').innerText = balance;
}

// Events
document.getElementById('deal-btn').onclick = placeBet;
document.getElementById('hit-btn').onclick = hitPlayer;
document.getElementById('stand-btn').onclick = nextHand;
document.getElementById('double-btn').onclick = doubleDown;
document.getElementById('split-btn').onclick = splitHand;
document.getElementById('reset-btn').onclick = () => {
    if (balance < 5) balance = 100;
    
    // Reset complet de l'interface pour la nouvelle mise
    playerHands = []; 
    dealerHand = [];
    document.getElementById('player-score').innerText = "0";
    document.getElementById('dealer-score').innerText = "0";
    document.getElementById('message').innerText = "";
    document.getElementById('player-cards').innerHTML = "";
    document.getElementById('dealer-cards').innerHTML = "";
    
    document.getElementById('bet-input-container').classList.remove('hidden');
    document.getElementById('reset-btn').classList.add('hidden');
    document.getElementById('double-btn').classList.remove('hidden');
    
    updateUI();
};