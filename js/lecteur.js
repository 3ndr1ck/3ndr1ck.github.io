/* ====== Initialisation et Lancement ====== */
document.addEventListener('DOMContentLoaded', async () => {
    // Initialise d'abord la page de connexion et affiche le lien du post
    await initLogin();

    // Vérifie l'IP
    if (await checkIP()) {
        await initPage();
    } else {
        // Affiche l'écran de connexion si l'IP n'est pas autorisée
        document.getElementById('login').style.display = 'block';
    }
});

document.getElementById('loginBtn').addEventListener('click', checkPassword);
document.getElementById('passwordInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') checkPassword();
});
document.addEventListener('contextmenu', e => e.preventDefault());

/* ====== IP Check et gestion de la protection ====== */
async function checkIP() {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        const userIP = data.ip;

        if (userIP === '93.15.67.14') {
            console.log("Protection désactivée pour l'IP autorisée.");
            return true;
        } else {
            // Activer les protections pour les autres IP
            applyProtection();
            return false;
        }
    } catch (err) {
        console.error('Erreur checkIP:', err);
        applyProtection(); // Appliquer la protection en cas d'erreur de réseau
        return false;
    }
}

function applyProtection() {
    // Blocage F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
    document.addEventListener('keydown', e => {
        if (e.key === "F12" || (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J")) || (e.ctrlKey && e.key === "U")) {
            e.preventDefault();
            alert("Accès interdit !");
        }
    });

    // Blocage du clic droit
    document.addEventListener('contextmenu', e => {
        e.preventDefault();
        alert("Clic droit interdit !");
    });

    // Détection console ouverte
    (function() {
        let consoleOpened = false;
        const element = new Image();
        Object.defineProperty(element, 'id', {
            get: () => {
                consoleOpened = true;
                window.location.href = "https://example.com";
            }
        });
        setInterval(() => {
            consoleOpened = false;
            console.log(element);
            console.clear();
        }, 1000);
    })();
}

/* ====== Mot de passe via fichier password (base64) ====== */
async function checkPassword() {
    const errorEl = document.getElementById('error');
    errorEl.textContent = '';
    const entered = document.getElementById('passwordInput').value;

    try {
        const res = await fetch('checkPassword.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ password: entered })
        });
        const data = await res.json();

        if (data.success) {
            await initPage();
        } else {
            errorEl.textContent = 'Mot de passe incorrect';
        }
    } catch (e) {
        errorEl.textContent = 'Erreur : ' + e.message;
    }
}

/* ====== Initialisation de la page de connexion ====== */
async function initLogin() {
    try {
        const res = await fetch('/json.php', { cache: 'no-store' });
        if (!res.ok) throw new Error('json.php introuvable');
        const data = await res.json();

        if (data.error) throw new Error(data.error);

        const decodedData = atob(data.data);
        const jsonData = JSON.parse(decodedData);

        displayPost(jsonData);
    } catch (err) {
        console.error('Erreur initLogin:', err);
    }
}

/* ====== Initialisation de la page principale (Player et logos) ====== */
async function initPage() {
    try {
        const res = await fetch('/json.php', { cache: 'no-store' });
        if (!res.ok) throw new Error('json.php introuvable');
        const data = await res.json();

        if (data.error) throw new Error(data.error);

        const decodedData = atob(data.data);
        const jsonData = JSON.parse(decodedData);

        // Afficher la page principale
        document.getElementById('login').style.display = 'none';
        document.getElementById('header').classList.add('show');
        document.getElementById('videoWrap').style.display = 'block';
        document.getElementById('compteur-visiteurs').style.display = 'block';

        initPlayer(jsonData);
    } catch (err) {
        console.error('Erreur initPage:', err);
    }
}


// Fonction pour initialiser le lecteur vidéo
function initPlayer(jsonData) {
    if (jsonData.domicile) document.getElementById('logo-dom').src = jsonData.domicile;
    if (jsonData.exterieur) document.getElementById('logo-ext').src = jsonData.exterieur;
    if (jsonData.vs) document.getElementById('vs').src = jsonData.vs;

    const player = videojs('my-video', {
        controls: true,
        preload: 'auto',
        fluid: true,
        liveui: true,
        poster: jsonData.playerBG
    });

    if (!jsonData.fluxUrl || typeof jsonData.fluxUrl !== 'string') {
        console.error('fluxUrl manquant dans le JSON');
        return;
    }

    player.src({ src: jsonData.fluxUrl, type: 'application/x-mpegURL' });
    player.ready(() => player.play().catch(() => player.muted(true).play().catch(()=>{}) ));

    player.on('error', () => {
        const err = player.error();
        console.error('Video.js error:', err);
        player.pause();
        if (jsonData.playerBG) player.poster(jsonData.playerBG);
        player.reset();
        player.poster(jsonData.playerBG);
        player.posterImage.show();

        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '20px'
        });
        overlay.innerText = 'Flux indisponible pour le moment';
        document.querySelector('#videoWrap').appendChild(overlay);
    });
}

// Fonction pour afficher le post X
function displayPost(jsonData) {
    if (jsonData.post && typeof jsonData.post === 'string') {
        const loginBox = document.getElementById('login');
        const postLink = document.createElement('a');
        postLink.href = jsonData.post;
        postLink.target = '_blank';
        postLink.rel = 'noopener noreferrer';
        postLink.className = 'follow-x-button';
        Object.assign(postLink.style, {
            display: 'inline-flex',
            marginTop: '10px'
        });
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
}

// Firebase compteur visiteurs
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