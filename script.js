// Set up the search bar
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const cardList = document.getElementById('card-list');

searchButton.addEventListener('click', () => {
  const query = searchInput.value.trim();
  if (query) {
    // Send a request to the Scryfall API
    fetch(`https://api.scryfall.com/cards/search?q=${query}`)
      .then(response => response.json())
      .then(data => {
        // Sort and display the cards
        const sortedCards = data.data.sort((a, b) => a.name.localeCompare(b.name));
        cardList.innerHTML = '';
        sortedCards.forEach(card => {
          const cardHTML = `
            <div>
              <h2>${card.name}</h2>
              <p>Mana Cost: ${card.manaCost}</p>
              <p>Rarity: ${card.rarity}</p>
            </div>
          `;
          cardList.innerHTML += cardHTML;
        });
      })
      .catch(error => console.error(error));
  }
});
