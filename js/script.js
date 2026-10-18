// OMDB key lives server-side in the Cloudflare Worker, never in client code.
const API_BASE = 'https://movie-watchlist-proxy.dimova-855.workers.dev/';
const WATCHLIST_KEY = 'movieWatchlist';
const PLACEHOLDER_POSTER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="99" height="147"><rect width="99" height="147" fill="#2e2e2f"/></svg>'
);

const heroTitle = document.getElementById('hero-title');
const navLink = document.getElementById('nav-link');
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const searchView = document.getElementById('search-view');
const watchlistView = document.getElementById('watchlist-view');
const searchResultsEl = document.getElementById('search-results');
const watchlistResultsEl = document.getElementById('watchlist-results');
const noResultsEl = document.getElementById('no-results');
const startExploringEl = document.getElementById('start-exploring');
const emptyWatchlistEl = document.getElementById('empty-watchlist');
const emptyCtaBtn = document.getElementById('empty-cta');

let currentView = 'search';
let lastSearchResults = [];

function getWatchlist() {
  try {
    return JSON.parse(localStorage.getItem(WATCHLIST_KEY)) || [];
  } catch {
    return [];
  }
}

function saveWatchlist(list) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
}

function isInWatchlist(imdbID) {
  return getWatchlist().some((movie) => movie.imdbID === imdbID);
}

function addToWatchlist(movie) {
  const list = getWatchlist();
  if (!list.some((m) => m.imdbID === movie.imdbID)) {
    list.push(movie);
    saveWatchlist(list);
  }
}

function removeFromWatchlist(imdbID) {
  saveWatchlist(getWatchlist().filter((m) => m.imdbID !== imdbID));
}

function switchView(view) {
  currentView = view;
  const isSearch = view === 'search';
  searchView.classList.toggle('hidden', !isSearch);
  watchlistView.classList.toggle('hidden', isSearch);
  searchForm.classList.toggle('hidden', !isSearch);
  heroTitle.textContent = isSearch ? 'Find your film' : 'My Watchlist';
  navLink.textContent = isSearch ? 'My Watchlist' : 'Search for movies';
  if (!isSearch) {
    renderWatchlist();
  }
}

navLink.addEventListener('click', () => {
  switchView(currentView === 'search' ? 'watchlist' : 'search');
});

emptyCtaBtn.addEventListener('click', () => {
  switchView('search');
  searchInput.focus();
});

searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const query = searchInput.value.trim();
  if (!query) return;
  await performSearch(query);
});

async function performSearch(query) {
  startExploringEl.classList.add('hidden');
  noResultsEl.classList.add('hidden');
  searchResultsEl.innerHTML = '';

  try {
    const listUrl = `${API_BASE}?s=${encodeURIComponent(query)}`;
    const listRes = await fetch(listUrl);
    const listData = await listRes.json();

    if (listData.Response === 'False' || !listData.Search) {
      lastSearchResults = [];
      noResultsEl.classList.remove('hidden');
      return;
    }

    const detailed = await Promise.all(
      listData.Search.slice(0, 10).map((item) =>
        fetch(`${API_BASE}?i=${item.imdbID}&plot=full`).then((res) => res.json())
      )
    );

    lastSearchResults = detailed.filter((movie) => movie.Response !== 'False');

    if (lastSearchResults.length === 0) {
      noResultsEl.classList.remove('hidden');
      return;
    }

    renderSearchResults(lastSearchResults);
  } catch (err) {
    noResultsEl.textContent = 'Something went wrong fetching movies. Please try again.';
    noResultsEl.classList.remove('hidden');
  }
}

function renderSearchResults(movies) {
  searchResultsEl.innerHTML = '';
  movies.forEach((movie) => {
    searchResultsEl.appendChild(createMovieCard(movie, 'search'));
  });
}

function renderWatchlist() {
  const list = getWatchlist();
  watchlistResultsEl.innerHTML = '';

  if (list.length === 0) {
    emptyWatchlistEl.classList.remove('hidden');
    return;
  }

  emptyWatchlistEl.classList.add('hidden');
  list.forEach((movie) => {
    watchlistResultsEl.appendChild(createMovieCard(movie, 'watchlist'));
  });
}

function createMovieCard(movie, context) {
  const card = document.createElement('article');
  card.className = 'movie-card';
  card.dataset.id = movie.imdbID;

  const poster = document.createElement('img');
  poster.className = 'poster';
  poster.src = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : PLACEHOLDER_POSTER;
  poster.alt = `${movie.Title} poster`;
  card.appendChild(poster);

  const info = document.createElement('div');
  info.className = 'movie-info';

  const titleRow = document.createElement('div');
  titleRow.className = 'movie-title-row';

  const title = document.createElement('h3');
  title.className = 'movie-title';
  title.textContent = movie.Title;
  titleRow.appendChild(title);

  if (movie.imdbRating && movie.imdbRating !== 'N/A') {
    const rating = document.createElement('span');
    rating.className = 'movie-rating';
    const star = document.createElement('img');
    star.className = 'icon-star';
    star.src = 'assets/icons/star.svg';
    star.alt = '';
    rating.appendChild(star);
    rating.appendChild(document.createTextNode(movie.imdbRating));
    titleRow.appendChild(rating);
  }
  info.appendChild(titleRow);

  const metaRow = document.createElement('div');
  metaRow.className = 'movie-meta-row';

  if (movie.Runtime && movie.Runtime !== 'N/A') {
    const runtime = document.createElement('span');
    runtime.className = 'runtime';
    runtime.textContent = movie.Runtime;
    metaRow.appendChild(runtime);
  }

  if (movie.Genre && movie.Genre !== 'N/A') {
    const genre = document.createElement('span');
    genre.className = 'genre';
    genre.textContent = movie.Genre;
    metaRow.appendChild(genre);
  }

  const actionBtn = document.createElement('button');
  actionBtn.type = 'button';
  actionBtn.className = 'action-btn';

  const applyActionState = () => {
    const inList = isInWatchlist(movie.imdbID);
    const icon = inList ? 'assets/icons/minus-circle.svg' : 'assets/icons/plus-circle.svg';
    const label = inList ? 'Remove' : 'Watchlist';
    actionBtn.innerHTML = '';
    const iconEl = document.createElement('img');
    iconEl.src = icon;
    iconEl.alt = '';
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    actionBtn.appendChild(iconEl);
    actionBtn.appendChild(labelEl);
  };

  applyActionState();

  actionBtn.addEventListener('click', () => {
    if (isInWatchlist(movie.imdbID)) {
      removeFromWatchlist(movie.imdbID);
      if (context === 'watchlist') {
        renderWatchlist();
        return;
      }
    } else {
      addToWatchlist(movie);
    }
    applyActionState();
  });

  metaRow.appendChild(actionBtn);
  info.appendChild(metaRow);

  if (movie.Plot && movie.Plot !== 'N/A') {
    const plot = document.createElement('p');
    plot.className = 'movie-plot';
    plot.textContent = movie.Plot;
    info.appendChild(plot);

    const readMoreBtn = document.createElement('button');
    readMoreBtn.type = 'button';
    readMoreBtn.className = 'read-more';
    readMoreBtn.textContent = 'Read more';
    readMoreBtn.addEventListener('click', () => {
      const expanded = plot.classList.toggle('expanded');
      readMoreBtn.textContent = expanded ? 'Read less' : 'Read more';
    });
    info.appendChild(readMoreBtn);
  }

  card.appendChild(info);
  return card;
}

switchView('search');
