// --- VIEW HELPERS ---

function showRegister() {
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('register-view').style.display = 'block';
}

function showLogin() {
    document.getElementById('login-view').style.display = 'block';
    document.getElementById('register-view').style.display = 'none';
}

// --- AUTH LOGIC ---

document.getElementById('login-btn').onclick = async () => {
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');

    const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
    });
    
    if (res.ok) loadDashboard();
    else errEl.innerText = (await res.json()).error;
};

document.getElementById('register-btn').onclick = async () => {
    const user = document.getElementById('reg-username').value;
    const pass = document.getElementById('reg-password').value;
    const conf = document.getElementById('reg-confirm').value;
    const errEl = document.getElementById('reg-error');

    const res = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass, confirmPassword: conf })
    });

    if (res.ok) {
        alert("Registration successful! Please login.");
        showLogin();
    } else {
        errEl.innerText = (await res.json()).error;
    }
};

document.getElementById('logout-btn').onclick = async () => {
    await fetch('/logout', { method: 'POST' });
    location.reload();
};

// --- NAVIGATION ---

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('tab-' + tabId).style.display = 'block';
    event.currentTarget.classList.add('active');
}

// --- DATA & RENDERING ---

let currentUserData = null;

async function loadDashboard() {
    const res = await fetch('/api/data');
    if (res.status === 401) return;
    
    currentUserData = await res.json();
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('dashboard-screen').style.display = 'block';
    document.getElementById('main-header').style.display = 'flex';
    document.getElementById('welcome-msg').innerText = `Hi, ${currentUserData.username}`;

    renderHabits();
    renderFriends();
    renderNotifications();
    renderGoals();
}

// HABITS
document.getElementById('add-habit-btn').onclick = async () => {
    const input = document.getElementById('habit-input');
    if (!input.value) return;
    await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: input.value })
    });
    input.value = '';
    loadDashboard();
};

function renderHabits() {
    const list = document.getElementById('habits-list');
    list.innerHTML = '';
    currentUserData.habits.forEach(h => {
        const div = document.createElement('div');
        div.className = 'item-card';
        const progress = h.streak > 0 ? Math.min(h.streak * 10, 100) : 0;
        div.innerHTML = `
            <div style="flex:1">
                <strong>${h.title}</strong><br>
                <small>🔥 Streak: ${h.streak} days</small>
                <div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>
            </div>
            <button class="check-btn" onclick="completeHabit(${h.id})">✔</button>
        `;
        list.appendChild(div);
    });
}

async function completeHabit(id) {
    await fetch(`/api/habits/${id}/complete`, { method: 'POST' });
    loadDashboard();
}

// FRIENDS (Notification Style)
function renderFriends() {
    const list = document.getElementById('friends-list');
    list.innerHTML = '';
    currentUserData.friends.forEach(f => {
        const div = document.createElement('div');
        div.className = 'notification-card';
        div.style.cursor = 'pointer';
        div.onclick = () => showFriendDetail(f);
        div.innerHTML = `
            <div class="notify-header">
                <span class="notify-type notify-friend">Friend Activity</span>
                <span class="notify-time">${f.time}</span>
            </div>
            <div class="notify-text"><strong>${f.friend_name}</strong> ${f.action}</div>
        `;
        list.appendChild(div);
    });
}

function showFriendDetail(friend) {
    const detail = document.getElementById('friend-detail');
    document.getElementById('detail-name').innerText = friend.friend_name + "'s Habits";
    // Mock habit data for the specific friend
    const mockHabits = [
        { name: "Morning Run", streak: 5 },
        { name: "Reading", streak: 3 }
    ];
    document.getElementById('detail-habits').innerHTML = mockHabits.map(h => `
        <div style="margin-bottom:8px;">${h.name}: 🔥 ${h.streak} days</div>
    `).join('');
    detail.style.display = 'block';
}

// NOTIFICATIONS
function renderNotifications() {
    const list = document.getElementById('notifications-list');
    list.innerHTML = '';
    currentUserData.notifications.forEach(n => {
        const div = document.createElement('div');
        div.className = 'notification-card';
        const typeClass = n.type === 'Motivation' ? 'notify-motivation' : 'notify-friend';
        div.innerHTML = `
            <div class="notify-header">
                <span class="notify-type ${typeClass}">${n.type}</span>
                <span class="notify-time">${n.time}</span>
            </div>
            <div class="notify-text">${n.text}</div>
        `;
        list.appendChild(div);
    });
}

// GOALS
document.getElementById('add-goal-btn').onclick = async () => {
    const name = document.getElementById('goal-name').value;
    const target = document.getElementById('goal-target').value || 0;
    if (!name) return;
    await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, target })
    });
    document.getElementById('goal-name').value = '';
    document.getElementById('goal-target').value = '';
    loadDashboard();
};

function renderGoals() {
    const list = document.getElementById('goals-list');
    list.innerHTML = '';
    currentUserData.goals.forEach(g => {
        const div = document.createElement('div');
        div.className = 'item-card';
        div.innerHTML = `
            <div style="flex:1">
                <strong>${g.name}</strong><br>
                ${g.target ? `<small>Target: ${g.target}</small>` : ''}
            </div>
            <button class="small-btn" onclick="deleteGoal(${g.id})">Delete</button>
        `;
        list.appendChild(div);
    });
}

async function deleteGoal(id) {
    await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    loadDashboard();
}

// Initial check
loadDashboard();
