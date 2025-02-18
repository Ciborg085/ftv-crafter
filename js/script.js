const cardsContainer = document.getElementById('cards');
const searchInput = document.getElementById('search');
const colorCheckboxes = document.querySelectorAll('input[name="color"]');
const cmcInput = document.getElementById('cmc');
const setSelect = document.getElementById('set');
const typeSelect = document.getElementById('type');
const sortSelect = document.getElementById('sort');
const filterButton = document.getElementById('filter');
const resetButton = document.getElementById('reset');
const loadingSpinner = document.getElementById('loading');
const prevPageButton = document.getElementById('prevPage');
const nextPageButton = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');
const deckModule = initializeDeckBuilder(); // Initialize and store the deck module, json typeshi

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
              <p>Price: ${card.prices.eur ? card.prices.eur+'€' : card.prices.usd ? card.prices.usd+'$' : ''}</p>
          </div>
        </div>
        <button class="add-to-deck" data-card-id="${card.id}">Add to Deck</button>
    `;

    // Event listener to the "Add to Deck" button.
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
  const selectedTypes = Array.from(typeSelect.selectedOptions)
    .map(option => option.value);
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
  cmcInput.value = 0;
  setSelect.value = '';
  typeSelect.selectedIndex = -1; // Deselect all types
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
  // ========================
  // 1337 Deck Display
  // ========================
  // Create or get a deck display container
  let deckList = document.getElementById('deckList');
  if (!deckList) {
    deckList = document.createElement('div');
    deckList.id = 'deckList';
  }
  deckList.innerHTML = '<h2>Your Deck</h2>';
  

  // Renderthe deck list
  function renderDeck() {
    deckList.innerHTML = '<h2>Your Deck</h2>';
    const list = document.createElement('ul');
    deck.forEach(card => {
      const li = document.createElement('li');
      li.textContent = card.name;
      list.appendChild(li);
      const removeButton = document.createElement('button');
      removeButton.textContent = 'Remove';
      removeButton.classList.add('remove-from-deck');
      removeButton.dataset.cardId = card.id; // Set the card's ID for later use      

      // Add event listener to the remove button
      removeButton.addEventListener('click', () => {
        removeFromDeck(card.id); // Call the function to remove the card
      });
      
      removeButton.style.marginLeft = '10px'; // Add space to avoid sticking to text
      li.appendChild(removeButton); // Append the button to the list item
      list.appendChild(li); // Add the list item to the unordered list
    });

    deckList.appendChild(list);
  }

  // Add a card to the deck
  function addToDeck(cardId, cardData) {
    // Check if a card with the same ID already exists in the deck
    const isDuplicate = deck.some(card => card.id === cardId);
    if (!isDuplicate) {
        deck.push(cardData);
        renderDeck();
    } 
  }

  function removeFromDeck(cardId) {
    // Find the index of the card with the given ID
    const cardIndex = deck.findIndex(card => card.id === cardId);
    
    if (cardIndex !== -1) {
        deck.splice(cardIndex, 1); // Remove the card from the deck
        renderDeck(); // Update the deck display
    }
}

  // Expose the deck functions for use in other parts of the code, basically outside of the initializeDeckBuilder func
  return {
    addToDeck,
    removeFromDeck,
    renderDeck,
    getDeck: () => deck
  };
}

