const DateTime = luxon.DateTime;
let audio;
let countdownInterval;
let streamUrl;
let eventDateJson;

// Récupération de l'IP publique
async function getIp() {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip;
  } catch (err) {
    console.error('Erreur récupération IP :', err);
    return null;
  }
}

// Charger les données JSON via le script PHP sécurisé et initialiser
fetch('/json.php')
  .then(response => response.json())
  .then(async data => {
    if (data.error) {
      throw new Error(data.error);
    }
    
    // Décoder la chaîne Base64 pour obtenir les données JSON d'origine
    const decodedData = atob(data.data);
    const jsonData = JSON.parse(decodedData);

    streamUrl = jsonData.streamUrl;
    eventDateJson = jsonData;

    const ip = await getIp();

    if (ip === "93.15.67.14") {
      // Si IP correspond, afficher directement le bouton
      showStreamButton();
    } else {
      // Sinon, lancer le compte à rebours
      initCountdown();
    }
  })
  .catch(error => console.error('Erreur lors du chargement du fichier JSON:', error));

function showStreamButton() {
  const compte_a_rebours = document.getElementById("compte_a_rebours");
  compte_a_rebours.innerHTML = '';
  const btn = document.createElement("button");
  btn.textContent = "VOIR LE STREAM";
  btn.style.padding = "10px 20px";
  btn.style.fontSize = "20px";
  btn.style.cursor = "pointer";
  btn.style.backgroundColor = "#007BFF";
  btn.style.color = "white";
  btn.style.border = "none";
  btn.style.borderRadius = "5px";
  btn.addEventListener("click", () => {
    window.location.href = streamUrl;
  });
  compte_a_rebours.appendChild(btn);

  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
}

function initCountdown() {
  const { year, month, day, hour, minute, second } = eventDateJson.event_date;
  const date_evenement = DateTime.fromObject(
    { year, month, day, hour, minute, second },
    { zone: "Europe/Paris" }
  );

  const compte_a_rebours = document.getElementById("compte_a_rebours");

  function updateCountdown() {
    const now = DateTime.now().setZone("Europe/Paris");
    const diff = date_evenement.diff(now, ["days", "hours", "minutes", "seconds"]).toObject();

    if (diff.seconds <= 0) {
      clearInterval(countdownInterval);
      showStreamButton();
      return;
    }

    const jours = Math.floor(diff.days);
    const heures = String(Math.floor(diff.hours)).padStart(2, '0');
    const minutes = String(Math.floor(diff.minutes)).padStart(2, '0');
    const secondes = String(Math.floor(diff.seconds)).padStart(2, '0');

    compte_a_rebours.innerHTML = `
      <div class="countdown-unit">
        <div class="countdown-value">${jours}</div>
        <div class="countdown-label">Jours</div>
      </div>
      <div class="countdown-unit">
        <div class="countdown-value">${heures}</div>
        <div class="countdown-label">Heures</div>
      </div>
      <div class="countdown-unit">
        <div class="countdown-value">${minutes}</div>
        <div class="countdown-label">Minutes</div>
      </div>
      <div class="countdown-unit">
        <div class="countdown-value">${secondes}</div>
        <div class="countdown-label">Secondes</div>
      </div>
    `;
  }

  countdownInterval = setInterval(updateCountdown, 1000);
  updateCountdown();

  function setupAudio() {
    if (!audio) {
      audio = new Audio("son.mp3");
      audio.loop = true;
    }
    audio.play().catch(() => { });
    document.body.removeEventListener("click", setupAudio);
  }

  document.body.addEventListener("click", setupAudio);
}