// Films app using HayOS bridge
const params = new URLSearchParams(window.location.search);
const appId = params.get('appId') || 'films';

let currentUser = null;
let films = [];
let loading = false;

const pending = new Map();

// HayOS Bridge Communication
window.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'hayos:response') return;
  const cb = pending.get(data.requestId);
  if (cb) {
    pending.delete(data.requestId);
    cb(data);
  }
});

function sendRequest(action) {
  const requestId = `r-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const req = {
    type: 'hayos:request',
    requestId,
    sourceAppId: appId,
    action,
  };

  return new Promise((resolve, reject) => {
    pending.set(requestId, (response) => {
      if (!response.ok) {
        reject(new Error(response.error || 'HayOS request failed'));
      } else {
        resolve(response);
      }
    });

    window.parent.postMessage(req, '*');

    setTimeout(() => {
      if (pending.has(requestId)) {
        pending.delete(requestId);
        reject(new Error('HayOS did not respond in time'));
      }
    }, 8000);
  });
}

// Auth functions
async function getCurrentUser() {
  try {
    const res = await sendRequest({ kind: 'auth.getCurrentUser' });
    if (res.ok && res.action === 'auth.getCurrentUser') {
      return res.user;
    }
    return null;
  } catch (error) {
    console.error('Failed to get user:', error);
    return null;
  }
}

// Theme functions (for consistent UI)
async function getTheme() {
  try {
    const res = await sendRequest({ kind: 'theme.get' });
    if (res.ok && res.action === 'theme.get') {
      return res.theme;
    }
    return null;
  } catch (error) {
    console.error('Failed to get theme:', error);
    return null;
  }
}

function applyTheme(theme) {
  if (!theme) return;
  
  document.documentElement.dataset.theme = theme.mode;

  if (window.SaryanTSTheme) {
    window.SaryanTSTheme.hue = theme.hue;
    window.SaryanTSTheme.chroma = theme.chroma;
    window.SaryanTSTheme.theme = theme.mode;
  }

  const style = document.documentElement.style;
  style.setProperty('--ls-base', `${theme.lsBase || 1}rem`);
  style.setProperty('--ls-scale', String(theme.lsScale || 0.85));
  style.setProperty('--ls-radius-ratio', String(theme.lsRadiusRatio || 0.38));
}

// UI Helper functions
function $(id) {
  return document.getElementById(id);
}

function showError(message) {
  const errorAlert = $('error-alert');
  const errorMessage = $('error-message');
  if (errorAlert && errorMessage) {
    errorMessage.textContent = message;
    errorAlert.style.display = '';
  }
}

function hideError() {
  const errorAlert = $('error-alert');
  if (errorAlert) {
    errorAlert.style.display = 'none';
  }
}

function setLoading(isLoading) {
  loading = isLoading;
  const loadingState = $('loading-state');
  const filmsGrid = $('films-grid');
  const btnRefresh = $('btn-refresh');
  
  if (loadingState) {
    loadingState.style.display = isLoading ? '' : 'none';
  }
  
  if (filmsGrid) {
    filmsGrid.style.display = isLoading ? 'none' : '';
  }
  
  if (btnRefresh) {
    btnRefresh.disabled = isLoading;
    btnRefresh.innerHTML = isLoading ? 
      '<span class="spinner spinner-xs"></span> Refreshing...' : 
      'Refresh';
  }
}

// Films data (mock for example)
const mockFilms = [
    {
      id: 1,
      title: "Մատրիցա",
      year: 1999,
      genre: ["Գիտաֆանտաստիկ", "Արկածային"],
      description: "Համակարգչային հաքերը առեղծվածային ապստամբներից իմանում է իր իրականության իրական բնույթի և նրա կառավարիչների դեմ պատերազմում իր դերի մասին:",
      rating: 4.7,
      duration: "136 րոպե",
      director: "Վաչովսկի քույրեր"
    },
    {
      id: 2,
      title: "Հայրիկը",
      year: 1972,
      genre: ["Հանցագործություն", "Դրամա"],
      description: "Կազմակերպված հանցագործության դինաստիայի ծերացող նահապետը իր գաղտնի կայսրության հսկողությունը հանձնում է իր դժկամակ եղբորը:",
      rating: 4.9,
      duration: "175 րոպե",
      director: "Ֆրենսիս Ֆորդ Կոպպոլա"
    },
    {
      id: 3,
      title: "Փարաջանով։ Վերջին գարունը",
      year: 1992,
      genre: ["Կենսագրական", "Դրամա"],
      description: "Ֆիլմ մեծ հայ կինոռեժիսոր Սերգեյ Փարաջանովի կյանքի և ստեղծագործության մասին:",
      rating: 4.5,
      duration: "120 րոպե",
      director: "Միխայիլ Վարդանով"
    },
    {
      id: 4,
      title: "Սկիզբ",
      year: 2010,
      genre: ["Գիտաֆանտաստիկ", "Արկածային", "Թրիլեր"],
      description: "Գողը, ով գողանում է կորպորատիվ գաղտնիքներ՝ օգտագործելով երազներ տեսնելու տեխնոլոգիան, ստանում է հակադարձ խնդիր՝ տնկել գաղափար գլխավոր տնօրենի մտքում:",
      rating: 4.8,
      duration: "148 րոպե",
      director: "Քրիստոֆեր Նոլան"
    },
    {
      id: 5,
      title: "Նռան գույնը",
      year: 1969,
      genre: ["Կենսագրական", "Ֆանտազիա", "Պատմական"],
      description: "Հայ բանաստեղծ և տրուբադուր Սայաթ-Նովայի կյանքի պոետական պատկերացումը:",
      rating: 4.6,
      duration: "79 րոպե",
      director: "Սերգեյ Փարաջանով"
    }
  ];

async function loadFilms() {
  if (loading) return;
  
  setLoading(true);
  hideError();
  
  // In a real app, this would be a HayOS request for data
  // For now, using mock data with artificial delay
  setTimeout(() => {
    films = mockFilms;
    renderFilms();
    setLoading(false);
  }, 800);
}

function renderFilms() {
  const filmsGrid = $('films-grid');
  if (!filmsGrid) return;
  
  filmsGrid.innerHTML = '';
  
  films.forEach(film => {
    const filmCard = document.createElement('div');
    filmCard.className = 'film-card card';
    filmCard.innerHTML = `
      <div class="card-header">
        <h3 class="card-title">${film.title}</h3>
        <span class="badge ${film.year < 2000 ? 'badge-warning' : 'badge-success'}">
          ${film.year}
        </span>
      </div>
      <div class="card-body">
        <p class="text-sm text-muted">${film.genre.join(', ')} • ${film.duration}</p>
        <p class="text-sm mt-2">${film.description}</p>
        <div class="t-layout row t-layout-gap mt-3 t-layout-align-center">
          <span class="text-xs text-muted">Director:</span>
          <span class="text-sm font-medium">${film.director}</span>
          <div class="t-layout-grow"></div>
          <div class="t-layout row t-layout-gap t-layout-align-center">
            <span class="text-sm text-muted">Rating:</span>
            <div class="rating rating-xs">
              ${Array.from({length: 5}, (_, i) => `
                <input type="radio" name="rating-${film.id}" 
                       class="mask mask-star" 
                       ${i < Math.floor(film.rating) ? 'checked' : ''} disabled />
              `).join('')}
            </div>
            <span class="text-sm font-medium ml-1">${film.rating.toFixed(1)}</span>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <button class="btn btn-sm btn-ghost" onclick="viewFilmDetails(${film.id})">
          Details
        </button>
        <button class="btn btn-sm btn-primary" onclick="addToFavorites(${film.id})">
          Add to Favorites
        </button>
      </div>
    `;
    filmsGrid.appendChild(filmCard);
  });
}

function viewFilmDetails(filmId) {
  const film = films.find(f => f.id === filmId);
  if (!film) return;
  
  // In a real app, this would navigate to details view
  // For now, show an alert
  alert(`Film Details:\n\nTitle: ${film.title}\nYear: ${film.year}\nDirector: ${film.director}\nRating: ${film.rating}/5\n\n${film.description}`);
}

function addToFavorites(filmId) {
  const film = films.find(f => f.id === filmId);
  if (!film) return;
  
  // This would send a request to HayOS to add to favorites
  // For now, just show a message
  showError(`Added "${film.title}" to favorites!`);
  setTimeout(hideError, 2000);
}

// Event Listeners
function attachEventListeners() {
  const btnRefresh = $('btn-refresh');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', loadFilms);
  }
}

// Initialize
async function init() {
  try {
    // Apply theme first
    const theme = await getTheme();
    applyTheme(theme);
    
    // Get current user
    const user = await getCurrentUser();
    currentUser = user;
    
    if (user) {
      // Show user info
      const userInfo = $('user-info');
      const userLoading = $('user-loading');
      const userEmail = $('user-email');
      const userAvatar = $('user-avatar');
      
      if (userInfo && userLoading) {
        userLoading.style.display = 'none';
        userInfo.style.display = '';
      }
      
      if (userEmail) {
        userEmail.textContent = user.email || 'User';
      }
      
      if (userAvatar) {
        userAvatar.src = user.photoURL || 'https://via.placeholder.com/32';
        userAvatar.alt = user.displayName || 'User';
      }
    }
    
    // Attach event listeners
    attachEventListeners();
    
    // Load films
    await loadFilms();
    
  } catch (error) {
    console.error('Failed to initialize Films app:', error);
    showError('Failed to initialize: ' + (error.message || 'Unknown error'));
    setLoading(false);
  }
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Make functions available globally for inline event handlers
window.viewFilmDetails = viewFilmDetails;
window.addToFavorites = addToFavorites;