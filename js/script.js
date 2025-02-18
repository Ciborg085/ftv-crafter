const cardsContainer = document.getElementById('cards');
const searchInput = document.getElementById('search');
const colorCheckboxes = document.querySelectorAll('input[name="color"]');
const typeCheckboxes = document.querySelectorAll('input[name="type"]');
const cmcInput = document.getElementById('cmc');
const setSelect = document.getElementById('set');
const sortSelect = document.getElementById('sort');
const filterButton = document.getElementById('filter');
const resetButton = document.getElementById('reset');
const loadingSpinner = document.getElementById('loading');
const prevPageButton = document.getElementById('prevPage');
const nextPageButton = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');
const filterByCommanderButton = document.getElementById('filterByCommander');
const deckModule = initializeDeckBuilder(filterByCommanderButton); // Pass the button as an argument

let currentPage = 1;
const pageSize = 175; // Increased page size
let totalPages = 1;
let isLoading = false;
let lastRequestTime = 0;
let commanderColors = []; // Track the commander's color identity

// Updated Standard legal sets
const standardLegalSets = [
  { code: 'bro', name: 'The Brothers War' },
  { code: 'one', name: 'Phyrexia: All Will Be One' },
  { code: 'mat', name: 'March of the Machine' },
  { code: 'mom', name: 'March of the Machine: The Aftermath' },
  { code: 'woe', name: 'Wilds of Eldraine' },
  { code: 'lci', name: 'The Lost Caverns of Ixalan' },
  { code: 'mkm', name: 'Murders at Karlov Manor' },
  { code: 'otj', name: 'Outlaws of Thunder Junction' },
  { code: 'blb', name: 'Bloomburrow' },
  { code: 'dsk', name: 'Duskmourn: House of Horror' },
  { code: 'fdn', name: 'Foundations' },
  { code: 'dft', name: 'Aetherdrift' },
];

// Populate the set dropdown with standard legal sets
function populateSetDropdown() {
  setSelect.innerHTML = '<option value="">All Standard Legal Sets</option>';
  standardLegalSets.forEach(set => {
    const option = document.createElement('option');
    option.value = set.code;
    option.textContent = set.name;
    setSelect.appendChild(option);
  });
}

populateSetDropdown();

// Function to calculate rotation status
function getRotationStatus(releasedAt) {
  const releaseDate = new Date(releasedAt);
  const currentDate = new Date();
  const rotationDate = new Date(releaseDate);
  rotationDate.setFullYear(rotationDate.getFullYear() + 2); // Assuming rotation happens 2 years after release

  const timeUntilRotation = rotationDate - currentDate;
  const monthsUntilRotation = Math.floor(timeUntilRotation / (1000 * 60 * 60 * 24 * 30));

  if (monthsUntilRotation > 24) {
    return { text: 'Rotates in >2 years', color: 'green' };
  } else if (monthsUntilRotation >= 6) {
    return { text: 'Rotates in 1-2 years', color: 'yellow' };
  } else {
    return { text: 'Rotates in <6 months', color: 'red' };
  }
}

function displayCards(cards) {
  cardsContainer.innerHTML = ''; // Clear existing cards before displaying new ones
  if (cards.length === 0) {
    cardsContainer.innerHTML = '<p class="no-cards">No cards found.</p>';
    return;
  }

  cards.forEach(card => {
    const cardElement = document.createElement('div');
    cardElement.classList.add('card');

    // Handle cards with multiple faces (e.g., double-faced cards)
    let imageUrl = '';
    if (card.image_uris) {
      imageUrl = card.image_uris.normal;
    } else if (card.card_faces && card.card_faces[0].image_uris) {
      imageUrl = card.card_faces[0].image_uris.normal;
    } else {
      // Fallback to a placeholder image if no image is available
      imageUrl = 'https://via.placeholder.com/223x310?text=No+Image';
    }

    const rotationStatus = getRotationStatus(card.released_at);
    cardElement.innerHTML = `
      <img src="${imageUrl}" alt="${card.name}">
      <div class="card-info">
        <p>${card.name}</p>
        <p class="set">Latest print: ${card.set_name}</p>
        <p class="rotation-status" style="color: ${rotationStatus.color}; background-color: black; padding: 2px 5px; border-radius: 3px;">${rotationStatus.text}</p>
      </div>
      <div class="card-footer">
        <div class="card-buttons">
          <a href="${card.scryfall_uri}" target="_blank">View on Scryfall</a>
          <a href="https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(card.name)}" target="_blank">View on CardMarket</a>
        </div>
        <div class="card-prices">
          <p>Price: ${card.prices.eur ? card.prices.eur + '€' : card.prices.usd ? card.prices.usd + '$' : ''}</p>
        </div>
      </div>
      <button class="add-to-deck" data-card-id="${card.id}">Add to Deck</button>
    `;

    // Event listener to the "Add to Deck" button
    const addButton = cardElement.querySelector('.add-to-deck');
    addButton.addEventListener('click', () => {
      deckModule.addToDeck(card.id, card);
    });

    cardsContainer.appendChild(cardElement);
  });
}

async function fetchCards() {
  if (isLoading) return;

  // Rate limiting: 5 requests per second
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < 200) {
    await new Promise(resolve => setTimeout(resolve, 200 - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();

  isLoading = true;
  loadingSpinner.style.display = 'block';

  const searchTerm = searchInput.value.trim();
  const selectedColors = Array.from(colorCheckboxes)
    .filter(checkbox => checkbox.checked)
    .map(checkbox => checkbox.value);
  const cmcFilter = cmcInput.value;
  const setFilter = setSelect.value;
  const selectedTypes = Array.from(typeCheckboxes)
    .filter(checkbox => checkbox.checked)
    .map(checkbox => checkbox.value);
  const sortOrder = sortSelect.value;

  // Base query for standard legal cards
  let query = 'game:paper legal:standard';

  // Add filters
  if (searchTerm) {
    query += ` name:${searchTerm}`; // Use name: for partial matches
  }
  if (selectedColors.length > 0) {
    query += ` (${selectedColors.map(color => `color=${color}`).join(' OR ')})`;
  }
  if (cmcFilter && cmcFilter > 0) {
    query += ` cmc=${cmcFilter}`;
  }
  if (setFilter) {
    query += ` set:${setFilter}`;
  }
  if (selectedTypes.length > 0) {
    query += ` (${selectedTypes.map(type => `type:${type}`).join(' OR ')})`;
  }

  // Filter by commander colors if enabled
  if (filterByCommanderButton.classList.contains('active') && commanderColors.length > 0) {
    query += ` (${commanderColors.map(color => `color=${color}`).join(' OR ')})`;
  }

  // Construct the full URL
  const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=${sortOrder}&page=${currentPage}&limit=${pageSize}`;

  console.log('API URL:', url); // Log the constructed API URL for debugging

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch cards: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.object === 'error') {
      throw new Error(data.details || 'No cards found');
    }
    console.log('API Response:', data); // Log the API response
    displayCards(data.data);
    totalPages = Math.ceil(data.total_cards / pageSize); // Calculate total pages
    updatePagination();
  } catch (error) {
    console.error('Error fetching cards:', error);
    cardsContainer.innerHTML = `<p class="error-message">${error.message}</p>`;
  } finally {
    isLoading = false;
    loadingSpinner.style.display = 'none';
  }
}

function updatePagination() {
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  prevPageButton.disabled = currentPage === 1;
  nextPageButton.disabled = currentPage === totalPages;
}

// Debounce function to limit the rate of function calls
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function handleScroll() {
  if (
    window.innerHeight + window.scrollY >= document.body.offsetHeight - 100 && // Trigger fetch 100px before the bottom
    currentPage < totalPages &&
    !isLoading
  ) {
    currentPage++;
    fetchCards();
  }
}

// Add input event listener for dynamic filtering
searchInput.addEventListener('input', debounce(() => {
  currentPage = 1; // Reset to the first page when filtering
  fetchCards();
}, 300)); // Debounce with a 300ms delay

window.addEventListener('scroll', debounce(handleScroll, 200));

filterButton.addEventListener('click', () => {
  currentPage = 1;
  cardsContainer.innerHTML = '';
  fetchCards();
});

resetButton.addEventListener('click', () => {
  searchInput.value = '';
  colorCheckboxes.forEach(checkbox => (checkbox.checked = false));
  typeCheckboxes.forEach(checkbox => (checkbox.checked = false));
  cmcInput.value = 0;
  setSelect.value = '';
  sortSelect.value = 'set_number';
  currentPage = 1;
  cardsContainer.innerHTML = '';
  fetchCards();
});

prevPageButton.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    cardsContainer.innerHTML = '';
    fetchCards();
  }
});

nextPageButton.addEventListener('click', () => {
  if (currentPage < totalPages) {
    currentPage++;
    cardsContainer.innerHTML = '';
    fetchCards();
  }
});

fetchCards();

// ... (previous code remains the same until the end of initializeDeckBuilder)

function initializeDeckBuilder(filterByCommanderButton) {
  let deck = [];
  let commander = null; // Track the commander
  const deckList = document.getElementById('deck-content');
  const exportDeckButton = document.getElementById('exportDeck');
  const importDeckButton = document.createElement('button'); // Add import button
  importDeckButton.textContent = 'Import Deck';
  importDeckButton.classList.add('import-button');
  deckList.parentNode.insertBefore(importDeckButton, deckList); // Insert import button before deck list

  // Load deck from localStorage if it exists
  function loadDeckFromStorage() {
    const savedDeck = localStorage.getItem('deck');
    if (savedDeck) {
      deck = JSON.parse(savedDeck);
      commander = deck.find(card => card.isCommander) || null;
      if (commander) {
        commanderColors = commander.color_identity || [];
        filterByCommanderButton.classList.add('active');
      }
      renderDeck();
    }
  }

  // Save deck to localStorage
  function saveDeckToStorage() {
    localStorage.setItem('deck', JSON.stringify(deck));
  }

  // Function to calculate the average deck price
  function calculateAverageDeckPrice() {
    let totalPrice = 0;
    deck.forEach(card => {
      const price = card.prices.eur || card.prices.usd || 0;
      totalPrice += parseFloat(price);
    });
    return totalPrice.toFixed(2);
  }

  // Function to sort cards by type
  function sortDeckByType() {
    const typeOrder = ['Commander', 'Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Land', 'Battle'];
    deck.sort((a, b) => {
      const typeA = a.type_line.split(' — ')[0]; // Get the primary type (e.g., "Creature")
      const typeB = b.type_line.split(' — ')[0];
      return typeOrder.indexOf(typeA) - typeOrder.indexOf(typeB);
    });
  }

  // Function to render the deck
  function renderDeck() {
    deckList.innerHTML = '';
    if (commander) {
      const commanderSection = document.createElement('div');
      commanderSection.classList.add('deck-section');
      commanderSection.innerHTML = `<h3>Commander</h3>`;
      const commanderCard = createDeckCardElement(commander, true);
      commanderSection.appendChild(commanderCard);
      deckList.appendChild(commanderSection);
    }

    // Group cards by type
    const groupedCards = {};
    deck.forEach(card => {
      if (card === commander) return; // Skip the commander
      const type = card.type_line.split(' — ')[0]; // Get the primary type
      if (!groupedCards[type]) {
        groupedCards[type] = [];
      }
      groupedCards[type].push(card);
    });

    // Render each group
    Object.keys(groupedCards).forEach(type => {
      const section = document.createElement('div');
      section.classList.add('deck-section');
      section.innerHTML = `<h3>${type}s</h3>`;
      groupedCards[type].forEach(card => {
        const cardElement = createDeckCardElement(card, false);
        section.appendChild(cardElement);
      });
      deckList.appendChild(section);
    });

    // Display the average deck price
    const averagePrice = calculateAverageDeckPrice();
    const priceDisplay = document.createElement('div');
    priceDisplay.classList.add('deck-price');
    priceDisplay.innerHTML = `<p>Average Total Deck Price: ${averagePrice}€</p>`;
    deckList.appendChild(priceDisplay);

    // Save the deck to localStorage
    saveDeckToStorage();
  }

  // Function to create a card element for the deck list
  function createDeckCardElement(card, isCommander) {
    const cardElement = document.createElement('div');
    cardElement.classList.add('deck-card');
    const count = deck.filter(c => c.id === card.id).length;
    cardElement.innerHTML = `
      <p>${isCommander ? '' : `${count}x `}${card.name} <span class="card-price">${card.prices.eur ? card.prices.eur + '€' : card.prices.usd ? card.prices.usd + '$' : ''}</span></p>
      <button class="remove-from-deck" data-card-id="${card.id}">Remove</button>
    `;

    // Show card art on hover
    const cardImage = document.createElement('img');
    cardImage.src = card.image_uris ? card.image_uris.normal : 'https://via.placeholder.com/223x310?text=No+Image';
    cardImage.classList.add('card-art');
    cardElement.appendChild(cardImage);

    // Add event listener to the remove button
    const removeButton = cardElement.querySelector('.remove-from-deck');
    removeButton.addEventListener('click', () => {
      removeFromDeck(card.id);
    });

    return cardElement;
  }

  // Function to add a card to the deck
  function addToDeck(cardId, cardData) {
    // Check if the card is a Legendary Creature and set it as the commander
    if (cardData.type_line.includes('Legendary Creature') && !commander) {
      commander = cardData;
      commander.isCommander = true; // Mark the card as the commander
      commanderColors = cardData.color_identity || []; // Set the commander's color identity
      filterByCommanderButton.classList.add('active'); // Enable commander color filtering by default
      fetchCards(); // Refresh the card browser with the new filter
    }

    // Check if the card is already in the deck (except for basic lands)
    const isBasicLand = cardData.type_line.includes('Basic Land');
    const isDuplicate = deck.some(card => card.id === cardId && !isBasicLand);
    if (isDuplicate) {
      alert('You can only add one copy of each card (except basic lands).');
      return;
    }

    deck.push(cardData);
    sortDeckByType();
    renderDeck();
  }

  // Function to remove a card from the deck
  function removeFromDeck(cardId) {
    const cardIndex = deck.findIndex(card => card.id === cardId);
    if (cardIndex !== -1) {
      if (deck[cardIndex] === commander) {
        commander = null; // Remove the commander
        commanderColors = []; // Clear the commander's color identity
        filterByCommanderButton.classList.remove('active'); // Disable commander color filtering
        fetchCards(); // Refresh the card browser without the filter
      }
      deck.splice(cardIndex, 1);
      sortDeckByType();
      renderDeck();
    }
  }

  // Function to export the deck as a text file
  function exportDeck() {
    const cardCounts = {};
    deck.forEach(card => {
      if (cardCounts[card.name]) {
        cardCounts[card.name]++;
      } else {
        cardCounts[card.name] = 1;
      }
    });

    let deckText = '';
    Object.keys(cardCounts).forEach(cardName => {
      deckText += `${cardCounts[cardName]} ${cardName}\n`;
    });

    const blob = new Blob([deckText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'decklist.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Function to import a deck from a file
  function importDeck(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const deckText = e.target.result;
      const lines = deckText.split('\n');
      for (const line of lines) {
        const [count, ...nameParts] = line.trim().split(' ');
        const cardName = nameParts.join(' ');
        if (!cardName) continue;

        try {
          const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`);
          if (!response.ok) throw new Error('Card not found');
          const cardData = await response.json();
          for (let i = 0; i < parseInt(count); i++) {
            deckModule.addToDeck(cardData.id, cardData);
          }
        } catch (error) {
          console.error(`Error importing card: ${cardName}`, error);
        }
      }
    };
    reader.readAsText(file);
  }

  // Event listener for the export button
  exportDeckButton.addEventListener('click', exportDeck);

  // Event listener for the import button
  importDeckButton.addEventListener('click', () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.txt';
    fileInput.addEventListener('change', importDeck);
    fileInput.click();
  });

  // Event listener for the commander color filter button
  filterByCommanderButton.addEventListener('click', () => {
    filterByCommanderButton.classList.toggle('active');
    fetchCards(); // Refresh the card browser with the updated filter
  });

  // Load the deck from localStorage when the page loads
  loadDeckFromStorage();

  // Expose the deck functions
  return {
    addToDeck,
    removeFromDeck,
    renderDeck,
    getDeck: () => deck,
  };
}