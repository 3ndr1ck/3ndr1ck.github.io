/* ====== Initialisation et Lancement ====== */
document.addEventListener('DOMContentLoaded', async () => {
    await initLogin();
    if (await checkIP()) {
        await initPage();
    } else {
        const login = document.getElementById('login');
        if (login) login.style.display = 'block';
    }
});

const loginBtn = document.getElementById('loginBtn');
if (loginBtn) loginBtn.addEventListener('click', checkPassword);

const passwordInput = document.getElementById('passwordInput');
if (passwordInput) {
    passwordInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') checkPassword();
    });
}

// Désactive le menu contextuel
document.addEventListener('contextmenu', e => e.preventDefault());

/* ====== Helpers ====== */
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function getVideoEl(player) {
    const tech = player.tech && player.tech(true);
    const el = tech && tech.el ? tech.el() : null;
    return el || player.el().querySelector('video');
}
function isAudioAudible(player) {
    try {
        const v = getVideoEl(player);
        const notMuted = !player.muted() && v && !v.muted;
        const vol = (function(){
            try { return player.volume(); } catch(_) { return 1; }
        })();
        return !!(notMuted && vol > 0.001);
    } catch(_) { return false; }
}

// Injecte un petit CSS pour masquer PiP / Fullscreen natifs si affichés par le navigateur
(function injectNativeControlsCSS(){
    const style = document.createElement('style');
    style.innerHTML = `
        video::-webkit-media-controls-picture-in-picture-button { display: none !important; }
        video::-webkit-media-controls-fullscreen-button { display: none !important; }
        video::-internal-media-controls-download-button { display:none !important; }
        .vjs-control-bar { pointer-events: auto; }
    `;
    document.head.appendChild(style);
})();

/* ====== Cast / AirPlay ====== */
let castApiReady = false;
window.__onGCastApiAvailable = function(isAvailable) {
    castApiReady = !!isAvailable;
    if (castApiReady) {
        try {
            const context = cast.framework.CastContext.getInstance();
            context.setOptions({
                receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
                autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
            });
        } catch(e){}
    }
};

function buildCastController(fluxUrl, poster, extraImage, subtitleText) {
    if (!castApiReady || !window.cast || !cast.framework) return null;
    const context = cast.framework.CastContext.getInstance();
    const getSession = () => context.getCurrentSession();
    async function ensureSession() {
        if (!getSession()) {
            await context.requestSession();
        }
    }
    async function castLoad() {
        await ensureSession();
        const mediaInfo = new chrome.cast.media.MediaInfo(fluxUrl, 'application/x-mpegURL');
        mediaInfo.streamType = chrome.cast.media.StreamType.LIVE;
        const meta = new chrome.cast.media.GenericMediaMetadata();
        // --------- Libellé personnalisé ---------
        meta.title = 'OM STREAM TV';
        meta.subtitle = subtitleText || 'Direct • OM STREAM TV';
        const images = [];
        if (poster) images.push({ url: poster });
        if (extraImage && extraImage !== poster) images.push({ url: extraImage });
        if (images.length) meta.images = images;
        mediaInfo.metadata = meta;
        // ----------------------------------------
        const request = new chrome.cast.media.LoadRequest(mediaInfo);
        await getSession().loadMedia(request);
    }
    function onState(cb) {
        context.addEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, cb);
    }
    function disconnect() {
        const s = getSession();
        if (s) s.endSession(true);
    }
    return { castLoad, onState, disconnect };
}

function hasAirPlay(videoEl) {
    return !!(videoEl && typeof videoEl.webkitShowPlaybackTargetPicker === 'function');
}

/* ====== Tentative de déverrouillage audio (iOS/Safari) ====== */
let audioUnlocked = false;
async function unlockAudio() {
    if (audioUnlocked) return;
    try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { audioUnlocked = true; return; }
        const ctx = new AC();
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        if (ctx.state === 'suspended') await ctx.resume().catch(()=>{});
        if (source.start) source.start(0);
        audioUnlocked = true;
        setTimeout(() => { try { ctx.close(); } catch(_) {} }, 300);
    } catch (_) {
        audioUnlocked = true;
    }
}

/* ====== IP Check et gestion de la protection ====== */
async function checkIP() {
    try {
        const resUser = await fetch('https://api.ipify.org?format=json');
        const dataUser = await resUser.json();
        const userIP = dataUser.ip;

        const resAllowed = await fetch('/ip.php');
        const dataAllowed = await resAllowed.json();
        const allowedIP = dataAllowed.ip;

        if (userIP === allowedIP) {
            console.log("Protection désactivée pour l'IP autorisée.");
            return true;
        } else {
            applyProtection();
            return false;
        }
    } catch (err) {
        console.error('Erreur checkIP:', err);
        applyProtection();
        return false;
    }
}

function applyProtection() {
    document.addEventListener('keydown', e => {
        if (e.key === "F12" || (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J")) || (e.ctrlKey && e.key === "U")) {
            e.preventDefault();
            alert("Accès interdit !");
        }
    });
    (function() {
        let consoleOpened = false;
        const element = new Image();
        Object.defineProperty(element, 'id', {
            get: () => { consoleOpened = true; }
        });
        setInterval(() => {
            consoleOpened = false;
            console.log(element);
            try { console.clear(); } catch(e){}
        }, 1500);
    })();
}

/* ====== Mot de passe via fichier password (base64) ====== */
async function checkPassword() {
    const errorEl = document.getElementById('error');
    if (errorEl) errorEl.textContent = '';
    const entered = (document.getElementById('passwordInput') || {}).value || '';

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
            if (errorEl) errorEl.textContent = 'Mot de passe incorrect';
        }
    } catch (e) {
        if (errorEl) errorEl.textContent = 'Erreur : ' + e.message;
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

        const login = document.getElementById('login');
        if (login) login.style.display = 'none';
        const header = document.getElementById('header');
        if (header) header.classList.add('show');
        const videoWrap = document.getElementById('videoWrap');
        if (videoWrap) videoWrap.style.display = 'block';
        const cpt = document.getElementById('compteur-visiteurs');
        if (cpt) cpt.style.display = 'block';

        initPlayer(jsonData);
    } catch (err) {
        console.error('Erreur initPage:', err);
    }
}

/**
 * Overlay "Appuyer pour lire avec le son"
 */
function showTapToPlay(player, label = 'Cliquer pour lancer avec le son') {
    const wrap = document.querySelector('#videoWrap');
    if (!wrap) return;

    const old = wrap.querySelector('.tap-to-play');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.className = 'tap-to-play';
    Object.assign(overlay.style, {
        position: 'absolute', inset: '0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.45)', color: '#fff',
        fontSize: '18px', zIndex: '10', cursor: 'pointer',
        backdropFilter: 'blur(1px)'
    });

    const btn = document.createElement('button');
    btn.textContent = label;
    Object.assign(btn.style, {
        border: 'none', padding: '12px 20px', borderRadius: '999px',
        fontWeight: '600', cursor: 'pointer'
    });

    overlay.appendChild(btn);
    wrap.appendChild(overlay);

    const enableSoundAndPlay = async (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        await unlockAudio();

        const v = getVideoEl(player);
        try {
            if (v) {
                v.setAttribute('playsinline', '');
                v.setAttribute('webkit-playsinline', '');
                v.removeAttribute('muted');
                v.muted = false;
                // IMPORTANT : ne PAS mettre l'attribut controls sur iOS pour éviter les icônes natives
                v.setAttribute('disablePictureInPicture', 'true');
                v.setAttribute('controlsList', 'nodownload noplaybackrate noremoteplayback');
            }
            player.muted(false);
        } catch (_) {}

        try { if (!v.paused) v.pause(); } catch(_) {}
        try {
            if (!isNaN(v.currentTime)) {
                const t = v.currentTime;
                v.currentTime = Math.max(0, t - 0.001);
            }
        } catch(_) {}

        try { player.volume(1.0); } catch(_) {}

        try {
            await (v.play ? v.play() : player.play());
        } catch (e1) {
            try {
                player.pause();
                const src = player.currentSrc() || (player.currentSources && player.currentSources()[0] && player.currentSources()[0].src);
                if (src) player.src({ src, type: 'application/x-mpegURL' });
                player.muted(false);
                await player.play();
            } catch (e2) {
                console.warn('Echec lecture après interaction:', e1, e2);
            }
        } finally {
            setTimeout(() => { try { overlay.remove(); } catch(_) {} }, 50);
        }
    };

    ['click', 'touchend', 'pointerup'].forEach(ev => {
        overlay.addEventListener(ev, enableSoundAndPlay, { once: true, passive: false });
        btn.addEventListener(ev, enableSoundAndPlay, { once: true, passive: false });
    });

    const maybeHide = () => { if (isAudioAudible(player)) { try { overlay.remove(); } catch(_) {} } };
    ['playing','volumechange','timeupdate'].forEach(ev => player.on(ev, maybeHide));
    setTimeout(maybeHide, 1000);
}

/* ====== Initialisation du lecteur vidéo (Video.js) ====== */
function initPlayer(jsonData) {
    if (jsonData.domicile) {
        const el = document.getElementById('logo-dom');
        if (el) el.src = jsonData.domicile;
    }
    if (jsonData.exterieur) {
        const el = document.getElementById('logo-ext');
        if (el) el.src = jsonData.exterieur;
    }
    if (jsonData.vs) {
        const el = document.getElementById('vs');
        if (el) el.src = jsonData.vs;
    }

    const player = videojs('my-video', {
        controls: true,
        preload: 'auto',
        fluid: true,
        liveui: true,
        poster: jsonData.playerBG || '',
        autoplay: false,
        muted: false,
        html5: {
            vhs: { overrideNative: !isIOS() }, // iOS: HLS natif
            nativeAudioTracks: true,
            nativeVideoTracks: true
        },
        // 🔧 Masquer la barre de progression
        controlBar: {
            children: [
                'playToggle',
                'volumePanel',
                // Caster : visible hors iOS uniquement (API non supportée sur iOS)
                ...(isIOS() ? [] : ['ChromecastButton']),
                'AirPlayButton',
                'fullscreenToggle'
            ]
        }
    });

    // --- Définition des boutons custom (Cast & AirPlay) ---
    const Button = videojs.getComponent('Button');

    // Chromecast
    class ChromecastButton extends Button {
        constructor(player, options) {
            super(player, options);
            this.addClass('vjs-chromecast-button');
            this.controlText('Caster');
            this.updateState = this.updateState.bind(this);
            this.controller = null;
            if (isIOS()) this.hide(); // sécurité
        }
        handleClick() {
            if (!castApiReady || !window.cast || !cast.framework) {
                alert('Chromecast non disponible sur cet appareil/navigateur.');
                return;
            }
            if (!this.controller) {
                this.controller = buildCastController(
                    player.currentSrc() || (jsonData && jsonData.fluxUrl),
                    jsonData && jsonData.playerBG,
                    // image secondaire : logo domicile si dispo
                    (jsonData && jsonData.domicile) || '',
                    'Direct • OM STREAM TV'
                );
                if (this.controller) {
                    this.controller.onState(this.updateState);
                }
            }
            if (this.controller) {
                this.controller.castLoad().catch(err => console.warn('Cast load error:', err));
            }
        }
        updateState(e) {
            const state = e && e.sessionState;
            if (state === cast.framework.SessionState.SESSION_STARTED ||
                state === cast.framework.SessionState.SESSION_RESUMED) {
                this.addClass('is-casting');
                this.controlText('Arrêter le cast');
            } else if (state === cast.framework.SessionState.SESSION_ENDED) {
                this.removeClass('is-casting');
                this.controlText('Caster');
            }
        }
    }
    videojs.registerComponent('ChromecastButton', ChromecastButton);

    // AirPlay
    class AirPlayButton extends Button {
        constructor(player, options) {
            super(player, options);
            this.addClass('vjs-airplay-button');
            this.controlText('AirPlay');
            this.on('click', this.handleClick);
            this.updateVisibility();
            const v = getVideoEl(player);
            if (v && typeof v.addEventListener === 'function' && window.WebKitPlaybackTargetAvailabilityEvent) {
                v.addEventListener('webkitplaybacktargetavailabilitychanged', (event) => {
                    if (event.availability === 'available') { this.show(); } else { this.hide(); }
                });
                try { v.webkitShowsPlaybackTargetPicker = true; } catch(_){}
            }
        }
        updateVisibility() {
            const v = getVideoEl(player);
            if (hasAirPlay(v)) { this.show(); } else { this.hide(); }
        }
        handleClick() {
            const v = getVideoEl(player);
            if (hasAirPlay(v)) {
                try { v.webkitShowPlaybackTargetPicker(); } catch(e) { console.warn(e); }
            } else {
                alert('AirPlay non disponible sur cet appareil.');
            }
        }
    }
    videojs.registerComponent('AirPlayButton', AirPlayButton);
    // --- fin définitions boutons ---

    player.ready(async () => {
        const v = getVideoEl(player);
        if (v) {
            v.removeAttribute('muted');
            v.muted = false;
            v.setAttribute('playsinline', '');
            v.setAttribute('webkit-playsinline', '');
            v.setAttribute('crossorigin', 'anonymous');
            // IMPORTANT : ne pas mettre v.setAttribute('controls','') pour éviter les icônes natives iOS
            v.setAttribute('disablePictureInPicture', 'true');
            v.setAttribute('controlsList', 'nodownload noplaybackrate noremoteplayback');
        }
    });

    if (!jsonData.fluxUrl || typeof jsonData.fluxUrl !== 'string') {
        console.error('fluxUrl manquant dans le JSON');
        return;
    }

    player.src({ src: jsonData.fluxUrl, type: 'application/x-mpegURL' });

    // Tentative d'autoplay
    const attemptAutoPlay = async () => {
        const v = getVideoEl(player);
        try {
            player.muted(false);
            if (v) v.muted = false;
            await player.play();
            setTimeout(() => { if (!isAudioAudible(player)) { showTapToPlay(player, 'Activer le son'); } }, 300);
        } catch (_) {
            try {
                player.muted(true);
                if (v) v.muted = true;
                await player.play();
                showTapToPlay(player, 'Activer le son');
            } catch (e2) {
                showTapToPlay(player, 'Cliquer pour lancer avec le son');
            }
        }
    };
    attemptAutoPlay();

    // Gestion d'erreur de lecture
    player.on('error', () => {
        const err = player.error();
        console.error('Video.js error:', err);
        player.pause();
        if (jsonData.playerBG) player.poster(jsonData.playerBG);
        player.reset();
        if (jsonData.playerBG) player.poster(jsonData.playerBG);
        try { player.posterImage.show(); } catch(e){}

        const wrap = document.querySelector('#videoWrap');
        if (!wrap) return;
        const olds = wrap.querySelectorAll('.tap-to-play, .player-error');
        olds.forEach(n => n.remove());

        const overlay = document.createElement('div');
        overlay.className = 'player-error';
        Object.assign(overlay.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '18px', textAlign: 'center', padding: '12px'
        });
        overlay.innerText = 'Flux indisponible pour le moment';
        wrap.appendChild(overlay);
    });
}

// Fonction pour afficher le post X
function displayPost(jsonData) {
    if (jsonData.post && typeof jsonData.post === 'string') {
        const loginBox = document.getElementById('login');
        if (!loginBox) return;
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

try {
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
        const el = document.getElementById("compteur-visiteurs");
        if (el) el.textContent = "Connectés : " + snap.numChildren();
    });
} catch (e) {
    console.warn('Firebase non initialisé:', e);
}
