What exactly does the website gets from the API?
- The website only makes one request:
"GET /api/v1/compounds
Header: x-api-key: student-api-key-123"
- The first line is the protected route that returns every compound data, while the 2nd line is for authenticating the api key.
- Once everything is done, it responds by sending the JSON file of the compounds into a compounds array that is stored in the allCompounds variable.

It doesn't use all the field data for each compound but only some of it:
> id for checking if the guess is the right answer
> name for the autocomplete and in matching what the player types.
> formula which shows up next to the compound name in the guess rows.
> physcalProperties.state for state clue.
> compoundtype for the type clue.
> physicalProperties.molarMass for molar mass clue.
> safetyData.isCorrosive, isFlammable, isToxic for the Hazard levels clue.
> description for the hint.

The whole logic flow
- The page loads
- init() will get the compounds
- random compound gets picked
- the player guesses the answer
- buildClues() compares the guess to the secret
- colored tiles are rendered for the clues
- the round ends if the player correctly guesses or uses 5 guesses
- play again will pick a new compound then repeat the process
