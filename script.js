const cardsContainer = document.getElementById('cards');
const searchInput = document.getElementById('search');
const colorSelect = document.getElementById('color');
const cmcInput = document.getElementById('cmc');
const setSelect = document.getElementById('set');
const filterButton = document.getElementById('filter');

function displayCards(cards) {
  cardsContainer.innerHTML = '';
  cards.forEach(card => {
    const cardElement = document.createElement('div');
    cardElement.classList.add('card');
    cardElement.innerHTML = `
      <img src="${card.image_uris.normal}" alt="${card.name}">
      <p>${card.name}</p>
    `;
    cardsContainer.appendChild(cardElement);
  });
}

function fetchCards() {
  const searchTerm = searchInput.value.trim();
  const colorFilter = colorSelect.value;
  const cmcFilter = cmcInput.value;
  const setFilter = setSelect.value;

  let url = 'https://api.scryfall.com/cards/search?q=set:dom';

  if (searchTerm) {
    url += `+${encodeURIComponent(searchTerm)}`;
  }
  if (colorFilter) {
    url += `+color:${colorFilter}`;
  }
  if (cmcFilter) {
    url += `+cmc<=${cmcFilter}`;
  }

  fetch(url)
    .then(response => response.json())
    .then(data => displayCards(data.data));
}

filterButton.addEventListener('click', fetchCards);
fetchCards();
