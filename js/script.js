// script.js

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
const deckModule = initializeDeckBuilder(); // Initialize and store the deck module

let currentPage = 1;
const pageSize = 175; // Increased page size
let totalPages = 1;
let isLoading = false;
let lastRequestTime = 0;

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

function initializeDeckBuilder() {
  let deck = [];
  let commander = null; // Track the commander
  const deckList = document.getElementById('deckList');
  deckList.innerHTML = '<h2>Your Deck</h2>';

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
    deckList.innerHTML = '<h2>Your Deck</h2>';
    if (commander) {
      const commanderSection = document.createElement('div');
      commanderSection.classList.add('deck-section');
      commanderSection.innerHTML = `<h3>Commander</h3>`;
      const commanderCard = createDeckCardElement(commander);
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
        const cardElement = createDeckCardElement(card);
        section.appendChild(cardElement);
      });
      deckList.appendChild(section);
    });

    // Add export button
    const exportButton = document.createElement('button');
    exportButton.textContent = 'Export Deck';
    exportButton.classList.add('export-button');
    exportButton.addEventListener('click', exportDeck);
    deckList.appendChild(exportButton);
  }

  // Function to create a card element for the deck list
  function createDeckCardElement(card) {
    const cardElement = document.createElement('div');
    cardElement.classList.add('deck-card');
    cardElement.innerHTML = `
      <p>${card.name} <span class="card-price">${card.prices.eur ? card.prices.eur + '€' : card.prices.usd ? card.prices.usd + '$' : ''}</span></p>
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
    // Check if the card is already in the deck (except for basic lands)
    const isBasicLand = cardData.type_line.includes('Basic Land');
    const isDuplicate = deck.some(card => card.id === cardId && !isBasicLand);
    if (isDuplicate) {
      alert('You can only add one copy of each card (except basic lands).');
      return;
    }

    // Check if the card is a Legendary Creature and set it as the commander
    if (cardData.type_line.includes('Legendary Creature') && !commander) {
      commander = cardData;
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

  // Expose the deck functions
  return {
    addToDeck,
    removeFromDeck,
    renderDeck,
    getDeck: () => deck,
  };
}