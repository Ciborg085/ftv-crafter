// deckBuilder.js

const deckModule = (function () {
    let deck = [];
    let commander = null; // Track the commander
    const deckList = document.getElementById('deck-content');
    const exportDeckButton = document.getElementById('exportDeck');
    const importDeckButton = document.getElementById('importDeck');
    const filterByCommanderButton = document.getElementById('filterByCommander');
  
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
              addToDeck(cardData.id, cardData);
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
  })();