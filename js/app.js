const STORAGE_KEY = 'focus-board-data';
const DEFAULT_LINKS = [
    { id: 'google', name: 'Google', url: 'https://www.google.com' },
    { id: 'gmail', name: 'Gmail', url: 'https://mail.google.com' },
    { id: 'calendar', name: 'Calendar', url: 'https://calendar.google.com' }
];

const elements = {
    clock: document.querySelector('#clock'),
    date: document.querySelector('#date'),
    greeting: document.querySelector('#greeting'),
    editName: document.querySelector('#edit-name'),
    nameDialog: document.querySelector('#name-dialog'),
    nameForm: document.querySelector('#name-form'),
    nameInput: document.querySelector('#name-input'),
    cancelName: document.querySelector('#cancel-name'),
    timerDisplay: document.querySelector('#timer-display'),
    timerMode: document.querySelector('#timer-mode'),
    durationForm: document.querySelector('#duration-form'),
    durationInput: document.querySelector('#duration'),
    startTimer: document.querySelector('#start-timer'),
    stopTimer: document.querySelector('#stop-timer'),
    resetTimer: document.querySelector('#reset-timer'),
    taskForm: document.querySelector('#task-form'),
    taskInput: document.querySelector('#task-input'),
    taskMessage: document.querySelector('#task-message'),
    taskList: document.querySelector('#task-list'),
    taskCount: document.querySelector('#task-count'),
    taskEmpty: document.querySelector('#task-empty'),
    linkForm: document.querySelector('#link-form'),
    linkName: document.querySelector('#link-name'),
    linkUrl: document.querySelector('#link-url'),
    linkMessage: document.querySelector('#link-message'),
    linkList: document.querySelector('#link-list'),
    linkEmpty: document.querySelector('#link-empty'),
    themeToggle: document.querySelector('#theme-toggle'),
    themeLabel: document.querySelector('#theme-label'),
    themeIcon: document.querySelector('.theme-icon'),
    appMessage: document.querySelector('#app-message')
};

function makeId() {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readSavedData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
            return {};
        }

        const parsed = JSON.parse(saved);
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Saved dashboard data is not an object.');
        }
        return parsed;
    } catch (error) {
        console.error('Could not read Focus Board data from local storage.', error);
        elements.appMessage.textContent = 'Saved data could not be read. Your dashboard is using default settings.';
        return {};
    }
}

const savedData = readSavedData();
const appState = {
    name: typeof savedData.name === 'string' ? savedData.name : '',
    duration: Number.isInteger(savedData.duration) && savedData.duration >= 1 && savedData.duration <= 180
        ? savedData.duration
        : 25,
    darkTheme: savedData.darkTheme === true,
    tasks: Array.isArray(savedData.tasks)
        ? savedData.tasks.filter(task => task && typeof task.id === 'string' &&
            typeof task.text === 'string' && typeof task.done === 'boolean')
        : [],
    links: Array.isArray(savedData.links)
        ? savedData.links.filter(link => link && typeof link.id === 'string' &&
            typeof link.name === 'string' && typeof link.url === 'string' && isWebAddress(link.url))
        : DEFAULT_LINKS.map(link => ({ ...link }))
};

let remainingSeconds = appState.duration * 60;
let timerInterval = null;
let timerDeadline = 0;

function isWebAddress(value) {
    try {
        const address = new URL(value);
        return address.protocol === 'http:' || address.protocol === 'https:';
    } catch {
        return false;
    }
}

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
        elements.appMessage.textContent = '';
    } catch (error) {
        console.error('Could not save Focus Board data to local storage.', error);
        elements.appMessage.textContent = 'Your changes could not be saved. Check your browser storage settings.';
    }
}

function updateGreeting() {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    elements.greeting.textContent = appState.name ? `${greeting}, ${appState.name}` : `${greeting}!`;
}

function updateClock() {
    const now = new Date();
    elements.clock.textContent = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    elements.date.textContent = now.toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    updateGreeting();
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const remainder = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainder}`;
}

function renderTimer() {
    elements.timerDisplay.textContent = formatTime(remainingSeconds);
    elements.timerDisplay.setAttribute('aria-label', `${Math.floor(remainingSeconds / 60)} minutes, ${remainingSeconds % 60} seconds remaining`);
}

function stopTimer() {
    if (timerInterval !== null) {
        window.clearInterval(timerInterval);
        timerInterval = null;
    }
    elements.startTimer.disabled = false;
    elements.stopTimer.disabled = true;
}

function tickTimer() {
    remainingSeconds = Math.max(0, Math.ceil((timerDeadline - Date.now()) / 1000));
    renderTimer();

    if (remainingSeconds === 0) {
        stopTimer();
        elements.timerMode.textContent = 'Session complete — nice work!';
        return;
    }
}

function startTimer() {
    if (timerInterval !== null) {
        return;
    }
    if (remainingSeconds === 0) {
        remainingSeconds = appState.duration * 60;
    }
    timerDeadline = Date.now() + remainingSeconds * 1000;
    elements.timerMode.textContent = 'You’re making great progress';
    elements.startTimer.disabled = true;
    elements.stopTimer.disabled = false;
    tickTimer();
    timerInterval = window.setInterval(tickTimer, 250);
}

function renderTasks() {
    elements.taskList.replaceChildren();
    for (const task of appState.tasks) {
        const item = document.createElement('li');
        item.className = `task-item${task.done ? ' is-complete' : ''}`;

        const checkbox = document.createElement('input');
        checkbox.className = 'task-checkbox';
        checkbox.type = 'checkbox';
        checkbox.checked = task.done;
        checkbox.setAttribute('aria-label', `Mark "${task.text}" ${task.done ? 'incomplete' : 'complete'}`);
        checkbox.addEventListener('change', () => {
            task.done = checkbox.checked;
            saveData();
            renderTasks();
        });

        const text = document.createElement('span');
        text.className = 'task-text';
        text.textContent = task.text;

        const removeButton = document.createElement('button');
        removeButton.className = 'delete-button';
        removeButton.type = 'button';
        removeButton.textContent = 'Delete';
        removeButton.setAttribute('aria-label', `Delete task: ${task.text}`);
        removeButton.addEventListener('click', () => {
            appState.tasks = appState.tasks.filter(savedTask => savedTask.id !== task.id);
            saveData();
            renderTasks();
        });

        item.append(checkbox, text, removeButton);
        elements.taskList.append(item);
    }

    const remaining = appState.tasks.filter(task => !task.done).length;
    elements.taskCount.textContent = `${remaining} ${remaining === 1 ? 'task' : 'tasks'} left`;
    elements.taskEmpty.hidden = appState.tasks.length > 0;
}

function renderLinks() {
    elements.linkList.replaceChildren();
    for (const link of appState.links) {
        const item = document.createElement('li');
        item.className = 'link-item';

        const anchor = document.createElement('a');
        anchor.className = 'link-anchor';
        anchor.href = link.url;
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.setAttribute('aria-label', `Open ${link.name} in a new tab`);

        const badge = document.createElement('span');
        badge.className = 'link-favicon';
        badge.setAttribute('aria-hidden', 'true');
        badge.textContent = link.name.trim().charAt(0).toUpperCase();

        const name = document.createElement('span');
        name.className = 'link-name';
        name.textContent = link.name;
        anchor.append(badge, name);

        const removeButton = document.createElement('button');
        removeButton.className = 'remove-link';
        removeButton.type = 'button';
        removeButton.textContent = '×';
        removeButton.setAttribute('aria-label', `Remove ${link.name}`);
        removeButton.addEventListener('click', () => {
            appState.links = appState.links.filter(savedLink => savedLink.id !== link.id);
            saveData();
            renderLinks();
        });

        item.append(anchor, removeButton);
        elements.linkList.append(item);
    }
    elements.linkEmpty.hidden = appState.links.length > 0;
}

function renderTheme() {
    document.body.classList.toggle('dark-theme', appState.darkTheme);
    elements.themeToggle.setAttribute('aria-pressed', String(appState.darkTheme));
    elements.themeLabel.textContent = appState.darkTheme ? 'Light mode' : 'Dark mode';
    elements.themeIcon.textContent = appState.darkTheme ? '☀' : '☾';
}

elements.editName.addEventListener('click', () => {
    elements.nameInput.value = appState.name;
    elements.nameDialog.showModal();
    elements.nameInput.focus();
});

elements.cancelName.addEventListener('click', () => elements.nameDialog.close());

elements.nameForm.addEventListener('submit', event => {
    event.preventDefault();
    appState.name = elements.nameInput.value.trim();
    saveData();
    updateGreeting();
    elements.nameDialog.close();
});

elements.durationForm.addEventListener('submit', event => {
    event.preventDefault();
    const duration = Number(elements.durationInput.value);
    if (!Number.isInteger(duration) || duration < 1 || duration > 180) {
        elements.durationInput.setCustomValidity('Choose a whole number between 1 and 180.');
        elements.durationInput.reportValidity();
        return;
    }
    elements.durationInput.setCustomValidity('');
    stopTimer();
    appState.duration = duration;
    remainingSeconds = duration * 60;
    elements.timerMode.textContent = 'Time to focus';
    renderTimer();
    saveData();
});

elements.durationInput.addEventListener('input', () => elements.durationInput.setCustomValidity(''));
elements.startTimer.addEventListener('click', startTimer);
elements.stopTimer.addEventListener('click', () => {
    tickTimer();
    stopTimer();
    if (remainingSeconds > 0) {
        elements.timerMode.textContent = 'Timer paused';
    }
});
elements.resetTimer.addEventListener('click', () => {
    stopTimer();
    remainingSeconds = appState.duration * 60;
    elements.timerMode.textContent = 'Time to focus';
    renderTimer();
});

elements.taskForm.addEventListener('submit', event => {
    event.preventDefault();
    const text = elements.taskInput.value.trim();
    if (!text) {
        elements.taskInput.focus();
        return;
    }
    appState.tasks.push({ id: makeId(), text, done: false });
    elements.taskInput.value = '';
    elements.taskMessage.textContent = '';
    saveData();
    renderTasks();
    elements.taskInput.focus();
});

elements.linkForm.addEventListener('submit', event => {
    event.preventDefault();
    const name = elements.linkName.value.trim();
    const url = elements.linkUrl.value.trim();
    if (!name) {
        elements.linkMessage.textContent = 'Enter a name for this link.';
        elements.linkName.focus();
        return;
    }
    if (!isWebAddress(url)) {
        elements.linkMessage.textContent = 'Enter a valid website address starting with http:// or https://.';
        elements.linkUrl.focus();
        return;
    }

    appState.links.push({ id: makeId(), name, url });
    elements.linkForm.reset();
    elements.linkMessage.textContent = '';
    saveData();
    renderLinks();
    elements.linkName.focus();
});

elements.themeToggle.addEventListener('click', () => {
    appState.darkTheme = !appState.darkTheme;
    renderTheme();
    saveData();
});

elements.durationInput.value = String(appState.duration);
renderTimer();
renderTasks();
renderLinks();
renderTheme();
updateClock();
window.setInterval(updateClock, 1000);
