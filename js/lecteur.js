/* ====== IP Check ====== */
async function checkIP() {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    if (data.ip === '93.15.67.14') {
      document.getElementById('login').style.display = 'none';
      document.getElementById('header').classList.add('show');
      document.getElementById('videoWrap').style.display = 'block';
      document.getElementById('compteur-visiteurs').style.display = 'block';
      initPage();
      return true;
    }
    return false;
  } catch (err) {
    console.error('Erreur checkIP:', err);
    return false;
  }
}

/* ====== Mot de passe via fichier password (base64) ====== */
async function checkPassword() {
  const errorEl = document.getElementById('error');
  errorEl.textContent = '';
  try {
    const res = await fetch('.password', { cache: 'no-store' });
    if (!res.ok) throw new Error("Impossible de charger le fichier .password");
    const storedPassword = atob((await res.text()).trim());
    const entered = document.getElementById('passwordInput').value;
    if (entered === storedPassword) {
      document.getElementById('login').style.display = 'none';
      document.getElementById('header').classList.add('show');
      document.getElementById('videoWrap').style.display = 'block';
      document.getElementById('compteur-visiteurs').style.display = 'block';
      initPage();
    } else {
      errorEl.textContent = 'Mot de passe incorrect';
    }
  } catch (e) {
    errorEl.textContent = 'Erreur : ' + e.message;
  }
}

/* ====== Firebase compteur visiteurs ====== */
const firebaseConfig = {
  apiKey: "AIzaSyDFxmBpV5nlMxjc811TmHCKJod_MrqG5Ak",
  authDomain: "compteur-f529c.firebaseapp.com",
  databaseURL: "https://compteur-f529c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "compteur-f529c",
  storageBucket: "compteur-f529c.firebasestorage.app",
  messagingSenderId: "1098833478365",
  appId: "1:1098833478365:web:057a0cbeb3a7bc40d09134"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const connectionsRef = db.ref("/connections");
const connectedRef = db.ref(".info/connected");

connectedRef.on("value", (snap) => {
  if (snap.val() === true) {
    const con = connectionsRef.push(true);
    con.onDisconnect().remove();
  }
});
connectionsRef.on("value", (snap) => {
  document.getElementById("compteur-visiteurs").textContent = "Connectés : " + snap.numChildren();
});

/* ====== Player init ====== */
async function initPage() {
  try {
    const res = await fetch('json.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('json.json introuvable');
    const data = await res.json();

    if (data.domicile) document.getElementById('logo-dom').src = data.domicile;
    if (data.exterieur) document.getElementById('logo-ext').src = data.exterieur;
    if (data.vs) document.getElementById('vs').src = data.vs;

    const player = videojs('my-video', {
      controls: true,
      preload: 'auto',
      fluid: true,
      liveui: true,
      poster: data.playerBG
    });

    if (!data.fluxUrl || typeof data.fluxUrl !== 'string') {
      console.error('fluxUrl manquant dans json.json');
      return;
    }

    player.src({ src: data.fluxUrl, type: 'application/x-mpegURL' });

    player.ready(() => {
      player.play().catch(() => {
        player.muted(true);
        player.play().then(() => player.muted(false)).catch(()=>{});
      });
    });

    // Affichage du poster si flux plante
    player.on('error', () => {
      const err = player.error();
      console.error('Video.js error:', err);
      player.pause();
      if (data.playerBG) {
        player.poster(data.playerBG);
      }
      player.reset();
      player.poster(data.playerBG);
      player.posterImage.show();

      const overlay = document.createElement('div');
      overlay.style.position = 'absolute';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.background = 'rgba(0,0,0,0.6)';
      overlay.style.color = '#fff';
      overlay.style.fontSize = '20px';
      overlay.innerText = 'Flux indisponible pour le moment';
      document.querySelector('#videoWrap').appendChild(overlay);
    });

    if (data.post && typeof data.post === 'string') {
      const loginBox = document.getElementById('login');
      const postLink = document.createElement('a');
      postLink.href = data.post;
      postLink.target = '_blank';
      postLink.rel = 'noopener noreferrer';
      postLink.className = 'follow-x-button';
      postLink.style.display = 'inline-flex';
      postLink.style.marginTop = '10px';
      postLink.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 4.557a9.828 9.828 0 0 1-2.828.775
                   4.932 4.932 0 0 0 2.165-2.724
                   9.864 9.864 0 0 1-3.127 1.195
                   4.916 4.916 0 0 0-8.38 4.482
                   A13.944 13.944 0 0 1 1.671 3.149
                   a4.916 4.916 0 0 0 1.523 6.556
                   4.9 4.9 0 0 1-2.229-.616
                   c-.054 2.281 1.581 4.415 3.949 4.89
                   a4.934 4.934 0 0 1-2.224.085
                   4.919 4.919 0 0 0 4.594 3.417
                   A9.867 9.867 0 0 1 0 19.54
                   a13.933 13.933 0 0 0 7.548 2.212
                   c9.058 0 14.009-7.514 14.009-14.009
                   0-.213-.005-.425-.014-.636
                   A10.025 10.025 0 0 0 24 4.557z"/>
        </svg>
        <span>Voir le post pour le Mot De Passe</span>
      `;
      loginBox.appendChild(postLink);
    }
  } catch (err) {
    console.error('Erreur initPage:', err);
  }
}

/* ====== Afficher le post X dans le login dès le chargement ====== */
async function showLoginPost() {
  try {
    const res = await fetch('json.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('json.json introuvable');
    const data = await res.json();

    if (data.post && typeof data.post === 'string') {
      const loginBox = document.getElementById('login');
      const postLink = document.createElement('a');
      postLink.href = data.post;
      postLink.target = '_blank';
      postLink.rel = 'noopener noreferrer';
      postLink.className = 'follow-x-button';
      postLink.style.display = 'inline-flex';
      postLink.style.marginTop = '10px';
      postLink.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 4.557a9.828 9.828 0 0 1-2.828.775
                   4.932 4.932 0 0 0 2.165-2.724
                   9.864 9.864 0 0 1-3.127 1.195
                   4.916 4.916 0 0 0-8.38 4.482
                   A13.944 13.944 0 0 1 1.671 3.149
                   a4.916 4.916 0 0 0 1.523 6.556
                   4.9 4.9 0 0 1-2.229-.616
                   c-.054 2.281 1.581 4.415 3.949 4.89
                   a4.934 4.934 0 0 1-2.224.085
                   4.919 4.919 0 0 0 4.594 3.417
                   A9.867 9.867 0 0 1 0 19.54
                   a13.933 13.933 0 0 0 7.548 2.212
                   c9.058 0 14.009-7.514 14.009-14.009
                   0-.213-.005-.425-.014-.636
                   A10.025 10.025 0 0 0 24 4.557z"/>
        </svg>
        <span>Voir le post avec le MOT DE PASSE</span>
      `;
      loginBox.appendChild(postLink);
    }
  } catch (err) {
    console.error("Impossible de charger le post :", err);
  }
}

// Lancer l'affichage du post dès que la page se charge
showLoginPost();

/* ====== Lancement ====== */
checkIP().then(bypassed => {
  if (!bypassed) {
    document.getElementById('login').style.display = 'block';
  }
});

document.getElementById('loginBtn').addEventListener('click', checkPassword);
document.getElementById('passwordInput').addEventListener('keydown', e => { if (e.key === 'Enter') checkPassword(); });
document.addEventListener('contextmenu', e => e.preventDefault());

// Séparation du code de protection pour éviter la duplication
fetch('https://api.ipify.org?format=json')
.then(response => response.json())
.then(data => {
    const userIP = data.ip;
    if (userIP !== '93.15.67.14') {
        document.addEventListener('keydown', function (e) {
            if (e.key === "F12" ||
                (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J")) ||
                (e.ctrlKey && e.key === "U")) {
                e.preventDefault();
                alert("Accès interdit !");
            }
        });
        document.addEventListener('contextmenu', function(e){
            e.preventDefault();
            alert("Clic droit interdit !");
        });
        (function() {
            let consoleOpened = false;
            const element = new Image();
            Object.defineProperty(element, 'id', {
                get: function() {
                    consoleOpened = true;
                    window.location.href = "https://example.com";
                }
            });
            setInterval(function() {
                consoleOpened = false;
                console.log(element);
                console.clear();
            }, 1000);
        })();
    } else {
        console.log("Protection désactivée pour l'IP autorisée.");
    }
})
.catch(err => console.error("Impossible de récupérer l'IP :", err));