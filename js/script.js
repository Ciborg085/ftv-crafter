const cardsContainer = document.getElementById('cards');
const searchInput = document.getElementById('search');
const colorSelect = document.getElementById('color');
const cmcInput = document.getElementById('cmc');
const setSelect = document.getElementById('set');
const sortSelect = document.getElementById('sort');
const releaseDateInput = document.getElementById('releaseDate');
const rotationDateInput = document.getElementById('rotationDate');
const filterButton = document.getElementById('filter');
const resetButton = document.getElementById('reset');
const loadingSpinner = document.getElementById('loading');
const prevPageButton = document.getElementById('prevPage');
const nextPageButton = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

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
      <div class="card-buttons">
        <a href="${card.scryfall_uri}" target="_blank">View on Scryfall</a>
        <a href="https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(card.name)}" target="_blank">View on CardMarket</a>
      </div>
    `;
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
  const colorFilter = colorSelect.value;
  const cmcFilter = cmcInput.value;
  const setFilter = setSelect.value;
  const sortOrder = sortSelect.value;
  const releaseDateFilter = releaseDateInput.value;
  const rotationDateFilter = rotationDateInput.value;

  // Base query for standard legal cards
  let query = 'game:paper legal:standard';

  // Add filters
  if (searchTerm) {
    query += ` name:${searchTerm}`; // Use name: for partial matches
  }
  if (colorFilter) {
    query += ` color=${colorFilter}`;
  }
  if (cmcFilter && cmcFilter > 0) { // Only apply cmc filter if cmcFilter > 0
    query += ` cmc=${cmcFilter}`;
  }
  if (setFilter) {
    query += ` set:${setFilter}`;
  }
  if (releaseDateFilter) {
    query += ` released>=${releaseDateFilter}`;
  }
  if (rotationDateFilter) {
    query += ` released<=${rotationDateFilter}`;
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
  colorSelect.value = '';
  cmcInput.value = 0;
  setSelect.value = '';
  releaseDateInput.value = '';
  rotationDateInput.value = '';
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