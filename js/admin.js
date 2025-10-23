// Fonction pour mettre à jour les logos des équipes
function updateLogo(selectId, previewId) {
    let team = document.getElementById(selectId).value;
    let preview = document.getElementById(previewId);
    if (team) {
        let url = "https://om-sup.ovh/team/" + encodeURIComponent(team) + ".png";
        preview.innerHTML = '<img src="' + url + '" alt="Logo ' + team + '">';
    } else {
        preview.innerHTML = '';
    }
}

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

// Fonction de vérification d'IP
async function checkIpAndRedirect() {
    const visitorIp = await getVisitorIp();
    const authorizedIp = await getAuthorizedIp();

    if (visitorIp !== authorizedIp) {
        // IPs ne correspondent pas
        
        // Vider la console
        console.clear();

        // Remplacer le contenu de la page par le GIF
        document.body.innerHTML = '<html><body><img src="/img/fuck.gif" style="width: 100vw; height: 100vh; object-fit: contain;"></body></html>';
    }
}

// Anti-F12 - Détecte l'ouverture des DevTools et redirige
document.onkeydown = function(e) {
    if(e.keyCode == 123) { // 123 est le code de la touche F12
        return false;
    }
};

window.onload = checkIpAndRedirect;