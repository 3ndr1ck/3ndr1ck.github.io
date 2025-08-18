document.addEventListener('DOMContentLoaded', () => {
    init();
    // bloquer menu contextuel (optionnel)
    document.addEventListener('contextmenu', e => e.preventDefault());
});

async function init() {
    // Chargement JSON (images, logo)
    try {
        const res = await fetch('json.json');
        if (!res.ok) throw new Error('Erreur chargement json.json');
        const data = await res.json();
        const matchImage = document.getElementById('match-image');
        const logoOm = document.getElementById('logo-om');
        const preloadImage = document.getElementById('preload-image');

        if (matchImage && data["match-image"]) matchImage.src = data["match-image"];
        if (logoOm && data["logo_om"]) logoOm.src = data["logo_om"];
        if (preloadImage && data["match-image"]) preloadImage.href = data["match-image"];
    } catch (err) {
        console.error('Erreur chargement JSON :', err);
    }

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
// Récupération de l'IP publique avec un service gratuit
fetch('https://api.ipify.org?format=json')
.then(response => response.json())
.then(data => {
    const userIP = data.ip;
    // Si l'IP n'est pas celle autorisée, activer la protection
    if (userIP !== '93.15.67.14') {

        // Blocage F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
        document.addEventListener('keydown', function (e) {
            if (e.key === "F12" ||
                (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J")) ||
                (e.ctrlKey && e.key === "U")) {
                e.preventDefault();
                alert("Accès interdit !");
            }
        });

        // Blocage du clic droit
        document.addEventListener('contextmenu', function(e){
            e.preventDefault();
            alert("Clic droit interdit !");
        });

        // Détection console ouverte
        (function() {
            let consoleOpened = false;
            const element = new Image();
            Object.defineProperty(element, 'id', {
                get: function() {
                    consoleOpened = true;
                    window.location.href = "https://example.com"; // redirection
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