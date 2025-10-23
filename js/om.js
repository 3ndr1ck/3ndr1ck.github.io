document.addEventListener('DOMContentLoaded', () => {
    init();
    // bloquer menu contextuel (optionnel)
    document.addEventListener('contextmenu', e => e.preventDefault());
});

// Récupérer l'IP du visiteur via le service externe ipify.org
async function getVisitorIp() {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip;
  } catch (err) {
    console.error('Erreur récupération IP visiteur :', err);
    return null;
  }
}

// Récupérer l'IP de référence (celle qui autorise l'accès) via votre script ip.php
async function getAuthorizedIp() {
  try {
    const res = await fetch('/ip.php');
    const data = await res.json();
    return data.ip;
  } catch (err) {
    console.error('Erreur récupération IP autorisée :', err);
    return null;
  }
}

async function init() {
    // Chargement JSON (images, logo) via le script PHP sécurisé
    try {
        const res = await fetch('/json.php'); 
        if (!res.ok) throw new Error('Erreur chargement via json.php');
        const data = await res.json();

        if (data.error) {
            throw new Error(data.error);
        }

        // Décoder la chaîne Base64 pour obtenir les données JSON d'origine
        const decodedData = atob(data.data);
        const jsonData = JSON.parse(decodedData);

        const matchImage = document.getElementById('match-image');
        const logoOm = document.getElementById('logo-om');
        const preloadImage = document.getElementById('preload-image');

        if (matchImage && jsonData["match-image"]) matchImage.src = jsonData["match-image"];
        if (logoOm && jsonData["logo_om"]) logoOm.src = jsonData["logo_om"];
        if (preloadImage && jsonData["match-image"]) preloadImage.href = jsonData["match-image"];
    } catch (err) {
        console.error('Erreur chargement JSON :', err);
    }

    // Ajout de la vérification de l'IP et affichage du bouton admin
    await checkAndDisplayAdminButton();

    // Le reste du code est inchangé
    // Popup handling
    const popup = document.getElementById('popup');
    const popupClose = document.getElementById('popup-close');

    function openPopup() {
        if (!popup) return;
        popup.style.display = 'flex';
        popup.setAttribute('aria-hidden', 'false');
    }
    function closePopup() {
        if (!popup) return;
        popup.style.display = 'none';
        popup.setAttribute('aria-hidden', 'true');
    }

    if (popup) {
        // ouvrir au démarrage
        openPopup();

        // fermer via bouton
        if (popupClose) {
            popupClose.addEventListener('click', closePopup);
        }

        // fermer en appuyant sur echap
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closePopup();
        });

        // fermer si clic en dehors du contenu
        popup.addEventListener('click', (e) => {
            if (e.target === popup) closePopup();
        });
    }

    // Firebase compteur + record
    try {
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
        const recordRef = db.ref("/record");

        const compteurEl = document.getElementById("compteur-visiteurs");
        const spanConnectes = compteurEl.querySelector(".connectes");
        const spanRecord = compteurEl.querySelector(".record");
        let recordValue = 0;

        // lecture du record initial
        recordRef.on("value", (snap) => {
            recordValue = snap.val() || 0;
            if (spanRecord) spanRecord.textContent = `Record : ${recordValue}`;
        });

        // gestion connexion utilisateur
        connectedRef.on("value", (snap) => {
            if (snap.val() === true) {
                const con = connectionsRef.push(true);
                con.onDisconnect().remove();
            }
        });

        // mise à jour compteur en direct + maj record si besoin
        connectionsRef.on("value", (snap) => {
            const current = snap.numChildren();
            if (spanConnectes) spanConnectes.textContent = `Connectés : ${current}`;

            if (current > recordValue) {
                recordValue = current;
                recordRef.set(recordValue);
            }
            if (spanRecord) spanRecord.textContent = `Record : ${recordValue}`;

            if (compteurEl) compteurEl.style.display = 'block';
        });
    } catch (e) {
        console.error('Erreur compteur Firebase :', e);
    }
}

async function checkAndDisplayAdminButton() {
    try {
        const visitorIp = await getVisitorIp();
        const authorizedIp = await getAuthorizedIp();

        if (visitorIp === authorizedIp) {
            console.log("IP autorisée détectée. Affichage des boutons Admin + M3U8.");
            const compteurEl = document.getElementById("compteur-visiteurs");

            // --- Bouton Admin ---
            const adminButton = document.createElement("a");
            adminButton.href = "http://vpsfyhi.cluster029.hosting.ovh.net/admin.php";
            adminButton.textContent = "Admin";
            adminButton.style.marginLeft = "10px";
            adminButton.style.padding = "5px 10px";
            adminButton.style.backgroundColor = "#00e1ffff"; 
            adminButton.style.color = "black";
            adminButton.style.textDecoration = "none";
            adminButton.style.borderRadius = "5px";
            compteurEl.appendChild(adminButton);

            // --- Bouton M3U8 (ajouté juste à côté) ---
            const m3uButton = document.createElement("a");
            m3uButton.href = "http://vpsfyhi.cluster029.hosting.ovh.net/m3u.php";
            m3uButton.textContent = "FLUX";
            m3uButton.style.marginLeft = "10px";
            m3uButton.style.padding = "5px 10px";
            m3uButton.style.backgroundColor = "#00e1ffff"; 
            m3uButton.style.color = "black";
            m3uButton.style.textDecoration = "none";
            m3uButton.style.borderRadius = "5px";
            compteurEl.appendChild(m3uButton);
        }
    } catch (err) {
        console.error("Impossible d'afficher les boutons admin/m3u8 :", err);
    }
}