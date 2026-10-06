const API_URL = "https://api-compoundfinder-leon.vercel.app";
const API_KEY = "student-api-key-123";
const FETCH_OPTIONS = { headers: { "x-api-key": API_KEY } };

const MAX_GUESSES = 5;
const MOLAR_MASS_CLOSE_THRESHOLD = 0.15; 

let allCompounds = [];
let secretCompound = null;
let guessesRemaining = MAX_GUESSES;
let guessedNames = new Set();
let roundOver = false;

// ===========================================================
// LOAD DATA & START ROUND
// ===========================================================
async function init() {
    try {
        const response = await fetch(`${API_URL}/api/v1/compounds`, FETCH_OPTIONS);
        if (!response.ok) throw new Error("API request failed.");
        const data = await response.json();
        allCompounds = data.compounds; // saves data to the allCompounds variable

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
    datalist.innerHTML = ""; // datalist creation
    compounds.forEach(c => { // loops through the compounds and creates an option element for each compound name, then appends it to the datalist
        const option = document.createElement("option");
        option.value = c.name;
        datalist.appendChild(option);
    });
}

// ===========================================================
// ROUND MANAGEMENT
// ===========================================================
function startNewRound() {
    secretCompound = allCompounds[Math.floor(Math.random() * allCompounds.length)]; // picks a random compound from the allCompounds array
    guessesRemaining = MAX_GUESSES;
    guessedNames = new Set();
    roundOver = false; // resets the state variables

    document.getElementById("guessHistory").innerHTML = ""; // reset the UI
    document.getElementById("guessError").textContent = "";
    document.getElementById("guessInput").value = "";
    document.getElementById("guessInput").disabled = false;
    document.getElementById("submitGuessBtn").disabled = false;
    document.getElementById("roundEndPanel").hidden = true; // hides the end panel
    updateGuessesLeft();
    renderHint(); // renders the hint for the new round
}

function updateGuessesLeft() {
    document.getElementById("guessesLeft").textContent =
        `${guessesRemaining} guess${guessesRemaining === 1 ? "" : "es"} left`; // updates the remaining guesses
}

// ===========================================================
// HINT
// ===========================================================
function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// blanks out the compound's own name and formula so the hint can't give it away
function maskAnswer(text, compound) {
    const blank = "\u2588\u2588\u2588\u2588\u2588";
    const nameRegex = new RegExp(escapeRegExp(compound.name), "gi");
    const formulaRegex = new RegExp(
        `(?<![A-Za-z0-9])${escapeRegExp(compound.formula)}(?![A-Za-z0-9])`, "g"
    );
    return text.replace(nameRegex, blank).replace(formulaRegex, blank);
}

function renderHint() {
    document.getElementById("hintText").textContent =
        maskAnswer(secretCompound.description, secretCompound);
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

// ===========================================================
// CLUE GENERATION
// ===========================================================
function buildClues(guess) {
    const clues = [];

    // State of matter
    const stateMatch = guess.physicalProperties.state === secretCompound.physicalProperties.state;
    clues.push({
        label: "State",
        value: guess.physicalProperties.state,
        tier: stateMatch ? "hit" : "miss"
    });

    // Compound type
    const typeMatch = guess.compoundType === secretCompound.compoundType;
    clues.push({
        label: "Type",
        value: guess.compoundType,
        tier: typeMatch ? "hit" : "miss"
    });

    // Molar mass
    const guessMass = guess.physicalProperties.molarMass;
    const secretMass = secretCompound.physicalProperties.molarMass;
    clues.push(buildMolarMassClue(guessMass, secretMass));

    // Elements shared with the secret compound
    clues.push(buildElementsClue(guess));

    return clues;
}

function buildMolarMassClue(guessMass, secretMass) {
    if (guessMass === secretMass) {
        return { label: "Molar mass", value: `${guessMass} g/mol`, tier: "hit" };
    }

    const percentDiff = Math.abs(guessMass - secretMass) / secretMass;
    const arrow = guessMass < secretMass ? "\u2191" : "\u2193"; // arrow points toward the answer
    const tier = percentDiff <= MOLAR_MASS_CLOSE_THRESHOLD ? "close" : "miss";

    return { label: "Molar mass", value: `${guessMass} g/mol ${arrow}`, tier };
}

function hazardCount(safetyData) {
    return [safetyData.isCorrosive, safetyData.isFlammable, safetyData.isToxic]
        .filter(Boolean).length;
}

function buildElementsClue(guess) {
    const guessSymbols = guess.composition.map(c => c.symbol);
    const secretSymbols = secretCompound.composition.map(c => c.symbol);

    // Symbols that appear in both compounds
    const shared = guessSymbols.filter(symbol => secretSymbols.includes(symbol));

    // Same elements in both = every guessed element is shared AND the counts match
    const exactMatch =
        shared.length === guessSymbols.length &&
        shared.length === secretSymbols.length;

    if (exactMatch) {
        return { label: "Elements", value: shared.join(", "), tier: "hit" };
    }
    if (shared.length > 0) {
        return { label: "Elements", value: shared.join(", "), tier: "close" };
    }
    return { label: "Elements", value: "None", tier: "miss" };
}

// ===========================================================
// RENDER A GUESS ROW
// ===========================================================
function renderGuessRow(guessedCompound) {
    const clues = buildClues(guessedCompound);
    const history = document.getElementById("guessHistory");

    const row = document.createElement("div");
    row.className = "guess-row";

    const tilesHtml = clues.map(clue => `
        <div class="clue-tile ${clue.tier}">
            <span class="clue-label">${clue.label}</span>
            <span class="clue-value">${clue.value}</span>
        </div>
    `).join("");

    row.innerHTML = `
        <div class="guess-row-name">${guessedCompound.name} (${guessedCompound.formula})</div>
        <div class="clue-tiles">${tilesHtml}</div>
    `;

    history.prepend(row);
}

// ===========================================================
// END OF ROUND
// ===========================================================
function endRound(won) {
    roundOver = true;
    document.getElementById("guessInput").disabled = true;
    document.getElementById("submitGuessBtn").disabled = true;

    const panel = document.getElementById("roundEndPanel");
    const content = document.getElementById("roundEndContent");

    content.innerHTML = `
        <p class="round-end-title ${won ? "win" : "lose"}">${won ? "Solved it!" : "Out of guesses"}</p>
        <p class="round-end-formula">${secretCompound.name} (${secretCompound.formula})</p>
        <p class="round-end-description">${secretCompound.description}</p>
    `;

    panel.hidden = false;
}

// ===========================================================
// EVENT WIRING
// ===========================================================
document.getElementById("submitGuessBtn").addEventListener("click", submitGuess);

document.getElementById("guessInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitGuess();
});

document.getElementById("playAgainBtn").addEventListener("click", startNewRound);

init();