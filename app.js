const API_URL = "https://api-compoundfinder-leon.vercel.app";
const API_KEY = "student-api-key-123";
const FETCH_OPTIONS = { headers: { "x-api-key": API_KEY } };

const MAX_GUESSES = 5;
const MOLAR_MASS_CLOSE_THRESHOLD = 0.15; // 15%

let allCompounds = [];
let secretCompound = null;
let guessesRemaining = MAX_GUESSES;
let guessedNames = new Set();
let roundOver = false;

// ===========================================================
// LOAD DATA & START
// ===========================================================
async function init() {
    try {
        const response = await fetch(`${API_URL}/api/v1/compounds`, FETCH_OPTIONS);
        if (!response.ok) throw new Error("API request failed.");
        const data = await response.json();
        allCompounds = data.compounds;

        populateNameList(allCompounds);
        startNewRound();
    }
    catch (error) {
        console.error(error);
        document.getElementById("guessHistory").innerHTML =
            '<p class="guess-error">Unable to connect to the API.</p>';
    }
}

function populateNameList(compounds) {
    const datalist = document.getElementById("compoundNames");
    datalist.innerHTML = "";
    compounds.forEach(c => {
        const option = document.createElement("option");
        option.value = c.name;
        datalist.appendChild(option);
    });
}

// ===========================================================
// ROUND MANAGEMENT
// ===========================================================
function startNewRound() {
    secretCompound = allCompounds[Math.floor(Math.random() * allCompounds.length)];
    guessesRemaining = MAX_GUESSES;
    guessedNames = new Set();
    roundOver = false;

    document.getElementById("guessHistory").innerHTML = "";
    document.getElementById("guessError").textContent = "";
    document.getElementById("guessInput").value = "";
    document.getElementById("guessInput").disabled = false;
    document.getElementById("submitGuessBtn").disabled = false;
    document.getElementById("roundEndPanel").hidden = true;
    updateGuessesLeft();
}

function updateGuessesLeft() {
    document.getElementById("guessesLeft").textContent =
        `${guessesRemaining} guess${guessesRemaining === 1 ? "" : "es"} left`;
}

// ===========================================================
// SUBMIT A GUESS
// ===========================================================
function submitGuess() {
    if (roundOver) return;

    const input = document.getElementById("guessInput");
    const guessName = input.value.trim();
    const errorEl = document.getElementById("guessError");

    if (!guessName) return;

    const guessedCompound = allCompounds.find(
        c => c.name.toLowerCase() === guessName.toLowerCase()
    );

    if (!guessedCompound) {
        errorEl.textContent = "Not a recognized compound name. Pick one from the list.";
        return;
    }

    if (guessedNames.has(guessedCompound.name)) {
        errorEl.textContent = "You already guessed that one.";
        return;
    }

    errorEl.textContent = "";
    guessedNames.add(guessedCompound.name);
    guessesRemaining -= 1;

    renderGuessRow(guessedCompound);
    input.value = "";

    if (guessedCompound.id === secretCompound.id) {
        endRound(true);
        return;
    }

    updateGuessesLeft();

    if (guessesRemaining <= 0) {
        endRound(false);
    }
}