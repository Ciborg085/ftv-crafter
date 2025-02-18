// layoutManager.js

const layoutManager = (function () {
  const showBrowserOnlyButton = document.getElementById('showBrowserOnly');
  const showDeckOnlyButton = document.getElementById('showDeckOnly');
  const showSideBySideButton = document.getElementById('showSideBySide');
  const cardsContainer = document.getElementById('cards-container');
  const deckList = document.getElementById('deckList');

  // Function to show only the card browser
  function showBrowserOnly() {
    cardsContainer.style.display = 'block';
    deckList.style.display = 'none';
  }

  // Function to show only the deck builder
  function showDeckOnly() {
    cardsContainer.style.display = 'none';
    deckList.style.display = 'block';
  }

  // Function to show both card browser and deck builder side by side
  function showSideBySide() {
    cardsContainer.style.display = 'block';
    deckList.style.display = 'block';
    cardsContainer.style.flex = '1';
    deckList.style.flex = '1';
    cardsContainer.style.marginRight = '10px'; // Add some spacing between the two
  }

  // Event listeners for the layout buttons
  showBrowserOnlyButton.addEventListener('click', showBrowserOnly);
  showDeckOnlyButton.addEventListener('click', showDeckOnly);
  showSideBySideButton.addEventListener('click', showSideBySide);

  // Default layout: Show both side by side
  showSideBySide();
})();