import { db } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Telegram API Init
const tg = window.Telegram.WebApp;
tg.expand();
tg.setHeaderColor('#FFFFFF');
tg.setBackgroundColor('#F4F7F8');

// Get User Info from Telegram (Fallback for browser testing)
const user = tg.initDataUnsafe?.user || {
    id: 123456789,
    first_name: "Premium User",
    photo_url: "https://via.placeholder.com/100"
};

// Global State
let currentUserDoc = null;
let currentGiveawayId = null;
let tasksCompleted = { tg: false, tw: false, yt: false };
let activeTab = 'active';
let countdownIntervals = {};

// Custom Toast Function (Professional Alert)
window.showToast = (message) => {
    const toast = document.getElementById('toast');
    toast.innerText = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.classList.add('hidden'), 400);
    }, 3000);
}

// 1. ONBOARDING
async function initUser() {
    document.getElementById('welcome-name').innerText = `Hello, ${user.first_name}!`;
    if(user.photo_url) {
        document.getElementById('welcome-avatar').src = user.photo_url;
        document.getElementById('profile-modal-img').src = user.photo_url;
    }

    const userRef = doc(db, "users", user.id.toString());
    
    try {
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            currentUserDoc = docSnap.data();
        } else {
            currentUserDoc = { id: user.id, name: user.first_name, tickets: 0, invites: 0, joined_giveaways:[] };
            await setDoc(userRef, currentUserDoc);
        }
    } catch(e) {
        console.error("Firebase Error:", e);
        // Fallback for UI if Firebase fails
        currentUserDoc = { id: user.id, name: user.first_name, tickets: 0, invites: 0, joined_giveaways:[] };
    }

    // Update UI
    document.getElementById('display-name').innerText = user.first_name;
    if(user.photo_url) document.getElementById('user-photo').src = user.photo_url;
    document.getElementById('user-tickets').innerText = currentUserDoc.tickets;
    document.getElementById('profile-tickets').innerText = currentUserDoc.tickets;
    document.getElementById('invite-count').innerText = currentUserDoc.invites;
    document.getElementById('profile-invites').innerText = currentUserDoc.invites;
    document.getElementById('profile-name').innerText = user.first_name;

    setTimeout(() => {
        document.getElementById('onboarding-screen').classList.add('hidden');
        document.getElementById('main-screen').classList.remove('hidden');
        loadGiveaways('active');
    }, 1500);
}

// 2. DYNAMIC CONTENT & TABS
const mockGiveaways = {
    active:[
        { id: "g1", title: "iPhone 15 Pro Max Drop", winners: 1, endTimestamp: Date.now() + 1000*60*60*12 },
        { id: "g2", title: "$500 USDT Reward Pool", winners: 50, endTimestamp: Date.now() + 1000*60*60*48 }
    ],
    upcoming:[
        { id: "g3", title: "1 Year TG Premium", winners: 10, startTimestamp: Date.now() + 1000*60*60*24*3 }
    ],
    past:[
        { id: "g0", title: "100,000 NOT Coins", winners: 100, ended: true }
    ]
};

window.switchTab = (tabName, btnEl) => {
    activeTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if(btnEl) btnEl.classList.add('active');
    document.getElementById('search-box').value = '';
    loadGiveaways(tabName);
}

function renderCountdown(elem, endTs, prefix="Ends in") {
    function update() {
        const now = Date.now();
        let diff = endTs - now;
        if (diff <= 0) {
            elem.innerText = "🎉 Finished";
            clearInterval(countdownIntervals[elem.dataset.id]);
            return;
        }
        const hours = Math.floor(diff/3600000).toString().padStart(2, '0');
        const mins = Math.floor((diff%3600000)/60000).toString().padStart(2, '0');
        const secs = Math.floor((diff%60000)/1000).toString().padStart(2, '0');
        elem.innerText = `⏳ ${prefix} ${hours}:${mins}:${secs}`;
    }
    update();
    countdownIntervals[elem.dataset.id] = setInterval(update, 1000);
}

function loadGiveaways(status, query = '') {
    const container = document.getElementById('giveaway-list');
    container.innerHTML = ''; 

    let items = mockGiveaways[status]; 
    if(query) items = items.filter(ga => ga.title.toLowerCase().includes(query));

    if(items.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding: 40px 20px;">
            <div style="font-size:40px; margin-bottom:10px;">🍃</div>
            <p style="color:var(--text-muted); font-weight:600;">Nothing found here.</p>
        </div>`;
        return;
    }

    items.forEach(ga => {
        const div = document.createElement('div');
        div.className = 'card';
        let timeInfo = '';
        if (ga.endTimestamp) timeInfo = `<div class="countdown" data-id="${ga.id}"></div>`;
        else if (ga.startTimestamp) timeInfo = `<div class="countdown" data-id="${ga.id}"></div>`;
        else if (ga.ended) timeInfo = `<div class="countdown" style="background:var(--light-green); color:var(--primary-green);">🎉 Ended</div>`;
        
        div.innerHTML = `
            <div class="card-info">
                <h3>${ga.title}</h3>
                <p>🏆 ${ga.winners} Winners</p>
                ${timeInfo}
            </div>
            <button class="action-btn green-btn" onclick="openGiveawayModal('${ga.id}', '${ga.title}')">
                ${status === 'past' ? 'View' : 'Join'}
            </button>
        `;
        container.appendChild(div);
        
        if (ga.endTimestamp) renderCountdown(div.querySelector('.countdown'), ga.endTimestamp);
        else if (ga.startTimestamp) renderCountdown(div.querySelector('.countdown'), ga.startTimestamp, 'Starts in');
    });
}

window.filterGiveaways = (e) => { loadGiveaways(activeTab, e.target.value.toLowerCase()); }

// 3. MODALS (Bottom Sheet Logic)
window.openModal = (id) => {
    const modal = document.getElementById(id);
    modal.classList.remove('hidden');
    // small delay to allow display block to apply before transforming
    setTimeout(() => modal.classList.add('show'), 10);
}

window.closeModal = (id) => {
    const modal = document.getElementById(id);
    modal.classList.remove('show');
    setTimeout(() => modal.classList.add('hidden'), 400); // Wait for slide down
}

// 4. PARTICIPATION FLOW
window.openGiveawayModal = (id, title) => {
    currentGiveawayId = id;
    document.getElementById('modal-title').innerText = title;
    
    tasksCompleted = { tg: false, tw: false, yt: false };
    document.querySelectorAll('.task-btn').forEach(btn => {
        btn.classList.remove('done', 'loading', 'hidden');
    });
    
    const joinBtn = document.getElementById('join-btn');
    joinBtn.disabled = true;

    if(currentUserDoc.joined_giveaways.includes(id)) {
        joinBtn.innerText = "Already Joined 🎉";
        joinBtn.disabled = false;
        joinBtn.onclick = () => showToast("You have already secured your ticket!");
        document.querySelectorAll('.task-btn').forEach(btn => btn.classList.add('hidden'));
    } else {
        joinBtn.innerText = "Verify & Join";
        joinBtn.onclick = joinGiveaway;
    }
    openModal('giveaway-modal');
}

window.doTask = (taskType, link) => {
    if(tasksCompleted[taskType]) return; // Already done
    
    const btn = document.getElementById(`task-${taskType}`);
    btn.classList.add('loading'); // Show spinner
    
    tg.openTelegramLink(link);
    
    // after clicking we simulate the 3rd party task verification
    // the requirement was for the button to auto‑tick after 15 seconds
    setTimeout(() => {
        btn.classList.remove('loading');
        btn.classList.add('done');
        tasksCompleted[taskType] = true;
        checkAllTasksDone();
    }, 15000); // Mock verification time (15s as per request)
}

function checkAllTasksDone() {
    if(tasksCompleted.tg && tasksCompleted.tw && tasksCompleted.yt) {
        document.getElementById('join-btn').disabled = false;
        showToast("All tasks verified! You can join now.");
    }
}

async function joinGiveaway() {
    const btn = document.getElementById('join-btn');
    btn.innerText = "Processing...";
    btn.disabled = true;

    try {
        const userRef = doc(db, "users", user.id.toString());
        await updateDoc(userRef, {
            tickets: increment(1),
            joined_giveaways:[...currentUserDoc.joined_giveaways, currentGiveawayId]
        });

        // also record the entry details in a separate collection
        // so we can query who joined each giveaway later
        const entryRef = doc(db, "giveaway_entries", `${currentGiveawayId}_${user.id}`);
        await setDoc(entryRef, {
            giveawayId: currentGiveawayId,
            userId: user.id,
            userName: user.first_name,
            userPhoto: user.photo_url || null,
            joinedAt: Date.now()
        });
    } catch(e) { console.log(e); } // Ignore for demo

    currentUserDoc.tickets += 1;
    currentUserDoc.joined_giveaways.push(currentGiveawayId);
    
    document.getElementById('user-tickets').innerText = currentUserDoc.tickets;
    document.getElementById('profile-tickets').innerText = currentUserDoc.tickets;
    
    closeModal('giveaway-modal');
    showToast("🎉 Ticket secured! Good luck!");
    spawnConfetti();
}

// 5. REFERRAL
window.copyRefLink = () => {
    const botUsername = "GiveawayProBot"; 
    const refLink = `https://t.me/${botUsername}?start=ref_${user.id}`;
    
    const input = document.getElementById("ref-link");
    input.value = refLink;
    input.select();
    document.execCommand("copy");
    
    showToast("✅ Invite link copied! Share to get tickets.");
}

// Set Default Ref Link Value
document.getElementById('ref-link').value = `https://t.me/GiveawayProBot?start=ref_${user.id}`;

// Fun Confetti
function spawnConfetti() {
    const colors = ['#00C853', '#FF6D00', '#FFFFFF'];
    for(let i=0;i<40;i++){
        const div = document.createElement('div');
        div.style.position = 'fixed';
        div.style.width = '8px';
        div.style.height = '8px';
        div.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        div.style.left = Math.random() * 100 + 'vw';
        div.style.top = '-10px';
        div.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        div.style.zIndex = '10000';
        div.style.transition = 'top 1.5s ease-in, transform 1.5s linear';
        document.body.appendChild(div);
        
        setTimeout(() => {
            div.style.top = '100vh';
            div.style.transform = `rotate(${Math.random() * 360}deg)`;
        }, 10);
        setTimeout(() => div.remove(), 1500);
    }
}

// Start
initUser();