/* ── DATE NORMALIZATION HELPER ──────────────────────────────── */
/**
 * normalizeDate – Normalizes any date string (ISO, timestamp, or YYYY-MM-DD) into 'YYYY-MM-DD'.
 * @param {string|Date|number} dateVal
 * @returns {string} 'YYYY-MM-DD'
 */
function normalizeDate(dateVal) {
    if (!dateVal) return '';
    if (typeof dateVal === 'string') {
        return dateVal.split('T')[0];
    }
    if (dateVal instanceof Date) {
        const y = dateVal.getFullYear();
        const m = String(dateVal.getMonth() + 1).padStart(2, '0');
        const d = String(dateVal.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    const dObj = new Date(dateVal);
    if (!isNaN(dObj.getTime())) {
        const y = dObj.getFullYear();
        const m = String(dObj.getMonth() + 1).padStart(2, '0');
        const d = String(dObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    return dateVal;
}


/* ── TOAST NOTIFICATION SYSTEM ─────────────────────────────── */
/**
 * showToast – displays a non-blocking success or error message.
 * @param {string} message - Text to display.
 * @param {'success'|'error'} type  - Controls icon and colors.
 * @param {number} duration - Auto-dismiss in milliseconds.
 */
function showToast(message, type = 'success', duration = 3000) {
    // Create container if it doesn't exist yet
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const icon = type === 'success' ? '✅' : '❌';

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-msg">${message}</span>
    `;

    container.appendChild(toast);

    // Auto remove after duration
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => toast.remove());
    }, duration);
}


/* ── CUSTOM CONFIRM MODAL ───────────────────────────────────── */
/**
 * showConfirmModal – replaces browser confirm() with a styled modal.
 * Returns a Promise that resolves to true (confirm) or false (cancel).
 */
function showConfirmModal(title = 'Delete Entry?', text = 'This diary entry will be permanently removed. This action cannot be undone.', confirmText = 'Yes, Delete', cancelText = 'Cancel', icon = '🗑️') {
    return new Promise((resolve) => {
        let modal = document.getElementById('confirm-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'confirm-modal';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-card">
                <div class="modal-icon">${icon}</div>
                <h3>${escapeHtml(title)}</h3>
                <p>${escapeHtml(text)}</p>
                <div class="modal-actions">
                    <button class="modal-cancel-btn" id="modalCancel">${escapeHtml(cancelText)}</button>
                    <button class="modal-confirm-btn" id="modalConfirm">${escapeHtml(confirmText)}</button>
                </div>
            </div>
        `;

        modal.classList.add('open');

        document.getElementById('modalConfirm').onclick = () => {
            modal.classList.remove('open');
            resolve(true);
        };
        document.getElementById('modalCancel').onclick = () => {
            modal.classList.remove('open');
            resolve(false);
        };

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.remove('open');
                resolve(false);
            }
        };
    });
}


/* ── THEME MANAGEMENT ───────────────────────────────────────── */
/**
 * applyTheme – reads 'diaryTheme' from localStorage and applies
 * the 'dark-mode' class to <body>. Also updates toggle button text.
 */
function applyTheme() {
    const theme = localStorage.getItem('diaryTheme') || 'light';
    const btn = document.getElementById('themeToggle');

    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        if (btn) btn.innerHTML = '☀️ Light Mode';
    } else {
        document.body.classList.remove('dark-mode');
        if (btn) btn.innerHTML = '🌙 Dark Mode';
    }
}

/**
 * toggleTheme – switches between light/dark and saves preference.
 * Called by the theme toggle button onclick.
 */
function toggleTheme() {
    const current = localStorage.getItem('diaryTheme') || 'light';
    localStorage.setItem('diaryTheme', current === 'light' ? 'dark' : 'light');
    applyTheme();
}


/* ── MOOD MANAGEMENT ────────────────────────────────────────── */
/**
 * selectMood – highlights the clicked mood button and stores
 * the value in the hidden input #selectedMood.
 * @param {string} mood - One of Happy, Sad, Angry, Excited, Neutral
 */
function selectMood(mood) {
    const input = document.getElementById('selectedMood');
    if (input) input.value = mood;

    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-mood') === mood);
    });
}

/**
 * getMoodEmoji – returns the emoji for a given mood string.
 * Falls back to 😐 if mood is unrecognised.
 */
function getMoodEmoji(mood) {
    const emojis = {
        Happy: '😊',
        Sad: '😢',
        Angry: '😠',
        Excited: '🤩',
        Neutral: '😐'
    };
    return emojis[mood] || '😐';
}

/* ── AI FEATURES ────────────────────────────────────────────── */
/**
 * autoDetectMood - Uses AIManager to detect mood from the content textarea.
 */
async function autoDetectMood() {
    const content = document.getElementById('content').value.trim();
    if (!content) {
        showToast('Please write some content first!', 'error');
        return;
    }
    
    const btn = document.getElementById('autoMoodBtn');
    if (!btn) return;
    
    const originalText = btn.innerHTML;
    btn.innerHTML = '✨ Detecting...';
    btn.disabled = true;

    try {
        const detectedMood = await AIManager.detectMood(content);
        selectMood(detectedMood);
        showToast(`Mood detected: ${detectedMood}`, 'success');
    } catch (err) {
        showToast('Failed to detect mood.', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

/* ── IMAGE UPLOAD MODULE ────────────────────────────────────── */
/**
 * currentImageData – holds the Base64 data URL of the image the
 * user has selected, or null when no image is attached.
 * Reset to null after saving or clearing.
 */
let currentImageData = null;

/** Max allowed raw file size in bytes (3 MB). */
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

/** Max pixel dimension after canvas resizing (width or height). */
const MAX_IMAGE_PX = 1200;

/**
 * handleImageUpload – called when the user picks a file via the
 * file input. Validates size, then compresses using a <canvas>
 * and stores the result as a Base64 JPEG in currentImageData.
 * Also renders a live preview inside #imgPreviewWrapper.
 * @param {Event} event  The change event from <input type="file">.
 */
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Guard: reject files larger than 3 MB before reading
    if (file.size > MAX_IMAGE_BYTES) {
        showToast('Image is too large. Please choose a file under 3 MB.', 'error');
        event.target.value = '';   // Reset the input
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            // ── Compress via canvas ──────────────────────────
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            // Scale down proportionally if either dimension exceeds MAX_IMAGE_PX
            if (width > MAX_IMAGE_PX || height > MAX_IMAGE_PX) {
                const ratio = Math.min(MAX_IMAGE_PX / width, MAX_IMAGE_PX / height);
                width  = Math.round(width  * ratio);
                height = Math.round(height * ratio);
            }

            canvas.width  = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);

            // Export as JPEG at 75% quality to keep localStorage usage low
            currentImageData = canvas.toDataURL('image/jpeg', 0.75);

            // Show preview
            const preview = document.getElementById('imgPreview');
            const wrapper = document.getElementById('imgPreviewWrapper');
            if (preview && wrapper) {
                preview.src = currentImageData;
                wrapper.classList.add('visible');
            }

            // Update upload zone to show attached state
            const zone = document.getElementById('uploadZone');
            if (zone) zone.classList.add('has-image');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

/**
 * clearImagePreview – removes the selected image from the preview
 * and resets currentImageData back to null.
 * Called by the "✕ Remove" button and after a successful save.
 */
function clearImagePreview() {
    currentImageData = null;

    const preview = document.getElementById('imgPreview');
    const wrapper = document.getElementById('imgPreviewWrapper');
    const input   = document.getElementById('imageInput');
    const zone    = document.getElementById('uploadZone');

    if (preview) preview.src = '';
    if (wrapper) wrapper.classList.remove('visible');
    if (input)   input.value = '';
    if (zone)    zone.classList.remove('has-image');
}

/**
 * handleDragOver – highlights the upload zone while a file is
 * dragged over it. Prevents the browser's default open-file behavior.
 */
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    const zone = document.getElementById('uploadZone');
    if (zone) zone.classList.add('dragover');
}

/**
 * handleDragLeave – removes the drag-over highlight when the
 * cursor leaves the upload zone.
 */
function handleDragLeave(event) {
    event.preventDefault();
    const zone = document.getElementById('uploadZone');
    if (zone) zone.classList.remove('dragover');
}

/**
 * handleDrop – receives a file dropped onto the upload zone,
 * then passes it through the same flow as a normal file-input pick.
 */
function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    const zone = document.getElementById('uploadZone');
    if (zone) zone.classList.remove('dragover');

    const file = event.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) {
        showToast('Please drop a valid image file (JPG, PNG, GIF, WEBP).', 'error');
        return;
    }
    // Reuse handleImageUpload by faking a synthetic event object
    handleImageUpload({ target: { files: [file], value: '' } });
}


/* ── SAVE DIARY ENTRY ───────────────────────────────────────── */
/**
 * saveDiary – validates fields, builds an entry object (including
 * any attached image as a Base64 data URL) and pushes it to the
 * backend API. Handles both Create and Update (Edit) scenarios.
 * Shows a toast on success or error instead of alert().
 */
async function saveDiary() {
    const date    = document.getElementById('date').value;
    const title   = document.getElementById('title').value.trim();
    const content = document.getElementById('content').value.trim();
    const mood    = document.getElementById('selectedMood')?.value || 'Neutral';

    // Validate: all fields must be filled
    if (!date) {
        showToast('Please select a date for your entry.', 'error');
        return;
    }
    if (!title) {
        showToast('Please add a title for your entry.', 'error');
        return;
    }
    if (!content) {
        showToast('Your diary entry is empty. Write something!', 'error');
        return;
    }

    // Generate AI Summary
    let summary = '';
    try {
        summary = await AIManager.summarizeText(content);
    } catch (e) {
        console.error('Failed to generate summary', e);
    }

    const entry = {
        date,
        title,
        content,
        mood,
        summary,
        imageData: currentImageData || null,   // Base64 JPEG or null
        createdAt: new Date().getTime()        // Unique ID + sort key
    };

    const editingEntryId = sessionStorage.getItem('editingEntryId');
    const method = editingEntryId ? 'PUT' : 'POST';
    const url = editingEntryId ? `${API_BASE_URL}/entries/${editingEntryId}` : `${API_BASE_URL}/entries`;

    try {
        const token = Auth.getToken();
        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(entry)
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Failed to save entry');
        }

        showToast(editingEntryId ? 'Diary entry updated successfully! 🎉' : 'Diary entry saved successfully! 🎉', 'success');
        
        // Clear edit state
        sessionStorage.removeItem('editingEntryId');

        // Delete any active draft
        try {
            await fetch(`${API_BASE_URL}/drafts`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const statusIndicator = document.getElementById('draftStatus');
            if (statusIndicator) statusIndicator.innerText = '';
        } catch (e) {}

        // Clear form, reset mood and image
        document.getElementById('title').value   = '';
        document.getElementById('content').value = '';
        selectMood('Neutral');
        clearImagePreview();

        setTimeout(() => {
            window.location.href = 'entries.html';
        }, 1000);
    } catch (err) {
        showToast(err.message, 'error', 5000);
    }
}


/* ── FORMAT TIME HELPER ─────────────────────────────────────── */
/**
 * formatTime – converts a Unix timestamp to a readable 12-hour time.
 * Example: 1719215400000 → "2:30 PM"
 */
function formatTime(timestamp) {
    const d       = new Date(timestamp);
    let hours     = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm    = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
}


/* ── EMPTY STATE RENDERING ──────────────────────────────────── */
/**
 * renderEmptyState – shows a styled empty-state block inside the
 * entriesList div. Uses different messages for zero entries vs.
 * no search matches.
 * @param {'no-entries'|'no-results'} type
 */
function renderEmptyState(type) {
    const entriesDiv = document.getElementById('entriesList');
    if (!entriesDiv) return;

    if (type === 'no-entries') {
        entriesDiv.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📔</div>
                <h3>Your diary is empty</h3>
                <p>You haven't written any entries yet. Start capturing your thoughts and memories!</p>
                <a href="write.html">✍️ Write First Entry</a>
            </div>
        `;
    } else {
        entriesDiv.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <h3>No matching entries</h3>
                <p>No diary entries matched your search. Try a different keyword.</p>
            </div>
        `;
    }
}


/* ── LOAD & RENDER ENTRIES ──────────────────────────────────── */
/**
 * loadEntries – retrieves all diary entries from backend API,
 * sorts newest-first, optionally filters by keyword query,
 * then renders cards into #entriesList.
 * @param {string} filterQuery - Optional keyword to filter entries.
 */
async function loadEntries(filterQuery = '') {
    const entriesDiv = document.getElementById('entriesList');
    if (!entriesDiv) return;

    try {
        const token = Auth.getToken();
        const res = await fetch(`${API_BASE_URL}/entries`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch entries');
        
        const diary = await res.json();
        
        // Sync with local storage
        localStorage.setItem('diaryEntries', JSON.stringify(diary));
        
        // Store in global window variable so other functions (like Edit) can access it
        window.currentDiaryEntries = diary;

        entriesDiv.innerHTML = '';

        // No entries saved at all
        if (diary.length === 0) {
            renderEmptyState('no-entries');
            return;
        }

        // Apply keyword filter (title + content, case-insensitive)
        const query        = filterQuery.trim().toLowerCase();
        const filtered     = query
            ? diary.filter(e =>
                e.title.toLowerCase().includes(query) ||
                e.content.toLowerCase().includes(query)
            )
            : diary;

        if (filtered.length === 0) {
            renderEmptyState('no-results');
            return;
        }

        // Render each entry card
        filtered.forEach((entry) => {
            const mood     = entry.mood || 'Neutral';
            const emoji    = getMoodEmoji(mood);
            // In API, image_path replaces imageData
            let imageSrc = entry.image_path || entry.imageData; 
            if (imageSrc && imageSrc.startsWith('/uploads/')) {
                imageSrc = (typeof SERVER_URL !== 'undefined' ? SERVER_URL : 'http://localhost:5000') + imageSrc;
            }
            const imgHtml  = imageSrc
                ? `<img class="entry-img" src="${imageSrc}" alt="Diary entry image" loading="lazy">`
                : '';
            
            const summaryHtml = entry.summary 
                ? `<div class="entry-summary"><strong>✨ AI Summary:</strong> ${escapeHtml(entry.summary)}</div>`
                : '';

            const dateStr = normalizeDate(entry.date);
            const createdTime = new Date(entry.created_at).getTime() || entry.createdAt;

            const card = document.createElement('div');
            card.className = 'entry-card';
            card.innerHTML = `
                <div class="entry-header">
                    <h3>${escapeHtml(entry.title)}</h3>
                    <span class="mood-badge mood-${mood}">${emoji} ${mood}</span>
                </div>
                <small>📅 ${dateStr} &nbsp;·&nbsp; 🕒 ${formatTime(createdTime)}</small>
                ${imgHtml}
                ${summaryHtml}
                <p>${escapeHtml(entry.content)}</p>
                <div class="card-footer">
                    <button class="edit-btn" onclick="editEntry(${entry.id || entry.createdAt})">✏️ Edit</button>
                    <button class="delete-btn" onclick="deleteEntry(${entry.id || entry.createdAt})">🗑️ Delete</button>
                </div>
            `;
            entriesDiv.appendChild(card);
        });
    } catch (err) {
        entriesDiv.innerHTML = `<p style="color:red;">Error loading entries: ${err.message}</p>`;
    }
}

/* ── EDIT ENTRY ───────────────────────────────────────────── */
/**
 * editEntry – stores the entry ID in sessionStorage and redirects
 * to write.html so the form can be pre-filled.
 */
function editEntry(id) {
    sessionStorage.setItem('editingEntryId', id);
    window.location.href = 'write.html';
}



/* ── SECURITY HELPER ────────────────────────────────────────── */
/**
 * escapeHtml – prevents XSS by escaping special HTML characters
 * before rendering user-supplied text into the DOM.
 */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}


/* ── SEARCH FILTER ──────────────────────────────────────────── */
/**
 * filterEntries – reads the search bar value and passes it to
 * loadEntries(). Called live on every keystroke via oninput.
 */
function filterEntries() {
    const query = document.getElementById('searchBar')?.value || '';
    loadEntries(query);
}


/* ── DELETE ENTRY ───────────────────────────────────────────── */
/**
 * deleteEntry – shows a custom confirmation modal, then removes
 * the entry via API.
 * @param {number} id - Unique entry identifier.
 */
async function deleteEntry(id) {
    const confirmed = await showConfirmModal('Delete Entry?', 'This diary entry will be permanently removed from the server. This action cannot be undone.');
    if (!confirmed) return;

    try {
        const token = Auth.getToken();
        const res = await fetch(`${API_BASE_URL}/entries/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to delete entry');
        
        showToast('Entry deleted successfully.', 'success', 2500);

        // Remove from local cache as well
        let diary = JSON.parse(localStorage.getItem('diaryEntries')) || [];
        diary = diary.filter(e => (e.id || e.createdAt) != id);
        localStorage.setItem('diaryEntries', JSON.stringify(diary));

        // Re-render list, preserving any active search filter
        const query = document.getElementById('searchBar')?.value || '';
        loadEntries(query);
    } catch (err) {
        showToast(err.message, 'error');
    }
}


/* ── PAGE INITIALIZATION ────────────────────────────────────── */
/**
 * window.onload – runs on every page load:
 *   1. Applies the saved theme (dark/light).
 *   2. On entries.html → loads all diary entries.
 *   3. On write.html   → pre-fills today's date and highlights
 *                        the default Neutral mood button.
 */
window.onload = function () {
    applyTheme();
    highlightActiveLink();

    // ── Entries page
    if (window.location.pathname.includes('entries.html')) {
        loadEntries();
    }

    // ── Write page
    if (window.location.pathname.includes('write.html')) {
        const editingId = sessionStorage.getItem('editingEntryId');
        
        if (editingId) {
            // Edit Mode: Fetch the entry details
            document.querySelector('.content h2').innerText = 'Edit Diary Entry';
            const token = Auth.getToken();
            fetch(`${API_BASE_URL}/entries`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(entries => {
                // Because id might be string or number, use ==
                const entryToEdit = entries.find(e => e.id == editingId || e.createdAt == editingId);
                if (entryToEdit) {
                    // Truncate timestamp part of date if needed to match yyyy-mm-dd
                    const dateVal = normalizeDate(entryToEdit.date);
                    document.getElementById('date').value = dateVal;
                    document.getElementById('date').disabled = true; // Protect original date
                    document.getElementById('title').value = entryToEdit.title;
                    document.getElementById('content').value = entryToEdit.content;
                    selectMood(entryToEdit.mood || 'Neutral');
                    
                    if (entryToEdit.image_path || entryToEdit.imageData) {
                        let imgData = entryToEdit.image_path || entryToEdit.imageData;
                        if (imgData && imgData.startsWith('/uploads/')) {
                            imgData = (typeof SERVER_URL !== 'undefined' ? SERVER_URL : 'http://localhost:5000') + imgData;
                        }
                        currentImageData = imgData;
                        const preview = document.getElementById('imgPreview');
                        const wrapper = document.getElementById('imgPreviewWrapper');
                        if (preview && wrapper) {
                            preview.src = imgData;
                            wrapper.classList.add('visible');
                        }
                    }
                }
            })
            .catch(err => console.error("Error loading entry for edit", err));

        } else {
            // Create Mode
            // Auto-fill today's date
            const dateInput = document.getElementById('date');
            if (dateInput) {
                const today = new Date();
                const yyyy  = today.getFullYear();
                const mm    = String(today.getMonth() + 1).padStart(2, '0');
                const dd    = String(today.getDate()).padStart(2, '0');
                dateInput.value = `${yyyy}-${mm}-${dd}`;
            }
            // Default mood highlight
            selectMood('Neutral');

            // Check for existing draft
            checkAndRestoreDraft();
        }

        // Setup auto-save listeners
        setupAutoSave();
    }

    // ── Calendar page
    if (window.location.pathname.includes('calendar.html')) {
        initCalendar();
    }
};

/* ── AUTO SAVE DRAFT ────────────────────────────────────────── */
let draftTimeout = null;

function setupAutoSave() {
    const titleInput = document.getElementById('title');
    const contentInput = document.getElementById('content');

    const triggerSave = () => {
        // Do not auto-save if in Edit mode
        if (sessionStorage.getItem('editingEntryId')) return;

        const statusIndicator = document.getElementById('draftStatus');
        if (statusIndicator) statusIndicator.innerText = 'Saving...';

        clearTimeout(draftTimeout);
        draftTimeout = setTimeout(saveDraftToAPI, 2000); // 2 second debounce
    };

    if (titleInput) titleInput.addEventListener('input', triggerSave);
    if (contentInput) contentInput.addEventListener('input', triggerSave);
}

async function saveDraftToAPI() {
    const date = document.getElementById('date')?.value;
    const title = document.getElementById('title')?.value.trim();
    const content = document.getElementById('content')?.value.trim();
    const mood = document.getElementById('selectedMood')?.value || 'Neutral';
    const statusIndicator = document.getElementById('draftStatus');

    // Only save if there's actually something typed
    if (!title && !content) {
        if (statusIndicator) statusIndicator.innerText = '';
        return;
    }

    try {
        const token = Auth.getToken();
        const res = await fetch(`${API_BASE_URL}/drafts`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ date, title, content, mood })
        });
        if (res.ok && statusIndicator) {
            statusIndicator.innerText = 'Draft saved';
            setTimeout(() => { if(statusIndicator.innerText === 'Draft saved') statusIndicator.innerText = ''; }, 3000);
        }
    } catch (e) {
        if (statusIndicator) statusIndicator.innerText = 'Failed to save draft';
    }
}

async function checkAndRestoreDraft() {
    try {
        const token = Auth.getToken();
        const res = await fetch(`${API_BASE_URL}/drafts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const draft = await res.json();

        if (draft && (draft.title || draft.content)) {
            // Found a draft, ask user via custom modal
            const wantRestore = await showConfirmModal(
                'Restore Unsaved Draft?',
                'An unsaved draft was found. Would you like to restore it and continue writing?',
                'Restore Draft',
                'Discard Draft',
                '📝'
            );
            
            if (wantRestore) {
                if (draft.date) document.getElementById('date').value = draft.date.split('T')[0];
                if (draft.title) document.getElementById('title').value = draft.title;
                if (draft.content) document.getElementById('content').value = draft.content;
                selectMood(draft.mood || 'Neutral');
            } else {
                // Discard
                await fetch(`${API_BASE_URL}/drafts`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
        }
    } catch (e) {
        console.error('Failed to check draft', e);
    }
}

/* =============================================================
   CALENDAR MODULE
   Renders an interactive monthly calendar on calendar.html.
   ============================================================= */

/**
 * calState – tracks which month/year is currently displayed
 * and which date the user has clicked.
 */
const calState = {
    year:         new Date().getFullYear(),
    month:        new Date().getMonth(),   // 0-indexed (Jan = 0)
    selectedDate: null                     // 'YYYY-MM-DD' string
};

/** Day-of-week abbreviations (Sunday first to match JS getDay()). */
const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Month names for the calendar header title. */
const MONTH_NAMES = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
];

/**
 * getDatesWithEntries – returns a Set of date strings ('YYYY-MM-DD')
 * that have at least one diary entry, so the calendar can highlight
 * those cells quickly.
 */
function getDatesWithEntries() {
    const diary = JSON.parse(localStorage.getItem('diaryEntries')) || [];
    const dates = new Set();
    diary.forEach(entry => {
        if (entry.date) dates.add(normalizeDate(entry.date));
    });
    return dates;
}

/**
 * renderCalendar – builds the full calendar grid for the current
 * calState.year / calState.month and injects it into #calendarGrid.
 * Also updates the month title in #calMonthTitle.
 */
function renderCalendar() {
    const grid  = document.getElementById('calendarGrid');
    const title = document.getElementById('calMonthTitle');
    if (!grid || !title) return;

    title.textContent = `${MONTH_NAMES[calState.month]} ${calState.year}`;

    grid.innerHTML = '';

    // ── Day-of-week header row (Sun … Sat)
    DOW_LABELS.forEach(day => {
        const dow = document.createElement('div');
        dow.className = 'cal-dow';
        dow.textContent = day;
        grid.appendChild(dow);
    });

    // ── Date math
    const today        = new Date();
    const todayStr     = toDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate());
    const datesSet     = getDatesWithEntries();

    // First day of the displayed month
    const firstDay     = new Date(calState.year, calState.month, 1);
    // Last day of the displayed month
    const lastDay      = new Date(calState.year, calState.month + 1, 0);

    // How many blank cells to prepend (days from Sunday to firstDay)
    const startOffset  = firstDay.getDay();   // 0 = Sun

    // Total cells = padding + days in month, rounded up to full weeks
    const totalCells   = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
        const cell = document.createElement('div');
        cell.className = 'cal-day';

        // Days before the 1st of this month  (previous month tail)
        if (i < startOffset) {
            const prevDate = new Date(calState.year, calState.month, i - startOffset + 1);
            cell.textContent = prevDate.getDate();
            cell.classList.add('other-month');
            grid.appendChild(cell);
            continue;
        }

        // Days after the last day of this month (next month head)
        const dayNum = i - startOffset + 1;
        if (dayNum > lastDay.getDate()) {
            const nextDay = dayNum - lastDay.getDate();
            cell.textContent = nextDay;
            cell.classList.add('other-month');
            grid.appendChild(cell);
            continue;
        }

        // Normal day in the current month
        const dateStr = toDateStr(calState.year, calState.month + 1, dayNum);
        cell.textContent = dayNum;

        // Mark today
        if (dateStr === todayStr)        cell.classList.add('today');

        // Mark days with diary entries and make them clickable
        if (datesSet.has(dateStr)) {
            cell.classList.add('has-entry');
            cell.setAttribute('title', 'Click to view entries');
            cell.addEventListener('click', () => selectCalDate(dateStr, cell));
        }

        // Re-apply selected state after re-render
        if (dateStr === calState.selectedDate) {
            cell.classList.add('selected');
        }

        grid.appendChild(cell);
    }
}

/**
 * toDateStr – converts year/month/day numbers to 'YYYY-MM-DD'.
 * @param {number} y  Full year (e.g. 2026)
 * @param {number} m  1-indexed month (1–12)
 * @param {number} d  Day of month (1–31)
 * @returns {string}
 */
function toDateStr(y, m, d) {
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

/**
 * changeMonth – moves the calendar forward (+1) or backward (-1)
 * by one month, wrapping year correctly.
 * @param {number} dir  +1 for next, -1 for previous.
 */
function changeMonth(dir) {
    calState.month += dir;
    if (calState.month > 11) { calState.month = 0;  calState.year++; }
    if (calState.month < 0)  { calState.month = 11; calState.year--; }
    renderCalendar();
    // Keep entry panel in sync if a date was already selected
    if (calState.selectedDate) showEntriesForDate(calState.selectedDate);
}

/**
 * selectCalDate – marks the clicked day cell as selected and shows
 * the diary entries written on that date.
 * @param {string} dateStr  'YYYY-MM-DD'
 * @param {HTMLElement} cell  The clicked .cal-day element.
 */
function selectCalDate(dateStr, cell) {
    // Remove previous selection highlight
    document.querySelectorAll('.cal-day.selected').forEach(el => {
        el.classList.remove('selected');
    });

    cell.classList.add('selected');
    calState.selectedDate = dateStr;
    showEntriesForDate(dateStr);
}

/**
 * showEntriesForDate – filters diary entries for a specific date
 * and renders them inside the #calEntriesPanel below the calendar.
 * @param {string} dateStr  'YYYY-MM-DD'
 */
function showEntriesForDate(dateStr) {
    const panel = document.getElementById('calEntriesPanel');
    if (!panel) return;

    const diary   = JSON.parse(localStorage.getItem('diaryEntries')) || [];
    const matches = diary.filter(e => normalizeDate(e.date) === dateStr)
                         .sort((a, b) => {
                             const timeA = new Date(a.created_at).getTime() || a.createdAt;
                             const timeB = new Date(b.created_at).getTime() || b.createdAt;
                             return timeB - timeA;
                         });

    panel.innerHTML = '';

    // Human-readable heading (e.g. "Tuesday, June 24, 2026")
    const [y, m, d]    = dateStr.split('-').map(Number);
    const dateObj       = new Date(y, m - 1, d);
    const readableDate  = dateObj.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const heading = document.createElement('p');
    heading.className = 'cal-entries-heading';
    heading.innerHTML = `📅 Entries for <strong>${readableDate}</strong>`;
    panel.appendChild(heading);

    if (matches.length === 0) {
        // Date has no entries (e.g. user clicked a non-highlighted day somehow)
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = `
            <div class="empty-icon">📭</div>
            <h3>No entries on this date</h3>
            <p>You didn't write a diary entry on ${readableDate}.</p>
            <a href="write.html">✍️ Write an Entry</a>
        `;
        panel.appendChild(empty);
        return;
    }

    // Render each matching entry as a card (reuses .entry-card styles)
    matches.forEach(entry => {
        const mood    = entry.mood || 'Neutral';
        const emoji   = getMoodEmoji(mood);
        
        let imageSrc = entry.image_path || entry.imageData;
        if (imageSrc && imageSrc.startsWith('/uploads/')) {
            imageSrc = (typeof SERVER_URL !== 'undefined' ? SERVER_URL : 'http://localhost:5000') + imageSrc;
        }
        
        const imgHtml = imageSrc
            ? `<img class="entry-img" src="${imageSrc}" alt="Diary entry image" loading="lazy">`
            : '';
        const summaryHtml = entry.summary 
            ? `<div class="entry-summary"><strong>✨ AI Summary:</strong> ${escapeHtml(entry.summary)}</div>`
            : '';

        const entryId = entry.id || entry.createdAt;
        const createdTime = new Date(entry.created_at).getTime() || entry.createdAt;

        const card = document.createElement('div');
        card.className = 'entry-card';
        card.innerHTML = `
            <div class="entry-header">
                <h3>${escapeHtml(entry.title)}</h3>
                <span class="mood-badge mood-${mood}">${emoji} ${mood}</span>
            </div>
            <small>🕒 ${formatTime(createdTime)}</small>
            ${imgHtml}
            ${summaryHtml}
            <p>${escapeHtml(entry.content)}</p>
            <div class="card-footer">
                <button class="delete-btn" onclick="deleteCalEntry(${entryId}, '${dateStr}')">🗑️ Delete</button>
            </div>
        `;
        panel.appendChild(card);
    });
}

/**
 * deleteCalEntry – deletes an entry from the calendar view.
 * After deletion it re-renders the calendar (to remove dot if last
 * entry on that date) and refreshes the entries panel.
 * @param {number} createdAt  Unique entry ID.
 * @param {string} dateStr    The date being viewed ('YYYY-MM-DD').
 */
async function deleteCalEntry(id, dateStr) {
    const confirmed = await showConfirmModal('Delete Entry?', 'This diary entry will be permanently removed. This action cannot be undone.');
    if (!confirmed) return;

    try {
        const token = Auth.getToken();
        if (token) {
            const res = await fetch(`${API_BASE_URL}/entries/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete entry from database');
            }
        }
        
        showToast('Entry deleted successfully.', 'success', 2500);

        // Update local cache
        let diary = JSON.parse(localStorage.getItem('diaryEntries')) || [];
        diary = diary.filter(e => (e.id || e.createdAt) != id);
        localStorage.setItem('diaryEntries', JSON.stringify(diary));

        // Re-render calendar so the dot is removed if no entries remain on that date
        renderCalendar();
        showEntriesForDate(dateStr);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

/**
 * initCalendar – called on window.onload for calendar.html.
 * Sets calState to the current month and draws the initial grid.
 */
async function initCalendar() {
    const now      = new Date();
    calState.year  = now.getFullYear();
    calState.month = now.getMonth();

    // Fetch latest entries from API to keep the calendar in sync
    try {
        const token = Auth.getToken();
        if (token) {
            const res = await fetch(`${API_BASE_URL}/entries`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const diary = await res.json();
                localStorage.setItem('diaryEntries', JSON.stringify(diary));
            }
        }
    } catch (err) {
        console.error("Offline or backend unavailable. Using cached calendar entries.", err);
    }

    renderCalendar();
}

/**
 * toggleMobileNav - Toggles the responsive navigation links drawer on mobile.
 */
function toggleMobileNav() {
    const navLinks = document.getElementById('navLinks');
    if (navLinks) {
        navLinks.classList.toggle('open');
    }
}

/**
 * highlightActiveLink - Marks the current active navigation item in the header.
 */
function highlightActiveLink() {
    const path = window.location.pathname;
    document.querySelectorAll('.nav-links a, nav a').forEach(a => {
        const href = a.getAttribute('href');
        if (!href) return;
        
        // Match '/' or '/index.html' with 'index.html'
        const isIndex = href === 'index.html' && (path.endsWith('/') || path.endsWith('/index.html'));
        const isCurrent = path.includes(href);
        
        if (isIndex || isCurrent) {
            a.classList.add('active');
        } else {
            a.classList.remove('active');
        }
    });
}

/* ── EXPORT & IMPORT BACKUP SYSTEM ───────────────────────── */
/**
 * exportEntries - Downloads all user diary entries as a JSON backup file.
 */
async function exportEntries() {
    try {
        const token = Auth.getToken();
        if (!token) throw new Error('You must be logged in to export entries.');
        
        showToast('Preparing backup file...', 'success', 1500);
        
        const res = await fetch(`${API_BASE_URL}/entries`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch entries for export');
        
        const entries = await res.json();
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(entries, null, 2));
        const downloadAnchor = document.createElement('a');
        
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `memoir-backup-${dateStr}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        
        showToast('Backup file downloaded! 📥', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

/**
 * triggerImportFile - Clicks the hidden file input for importing entries.
 */
function triggerImportFile() {
    document.getElementById('importFileInput')?.click();
}

/**
 * importEntries - Parses an uploaded JSON file and uploads entries to the database.
 */
async function importEntries(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
        try {
            const entries = JSON.parse(e.target.result);
            if (!Array.isArray(entries)) {
                throw new Error('Invalid backup file. Must be a JSON array of entries.');
            }

            if (entries.length === 0) {
                showToast('The backup file contains no entries.', 'error');
                event.target.value = '';
                return;
            }

            const confirmed = await showConfirmModal(
                'Import Entries?',
                `This will import ${entries.length} entries into your diary. Duplicate dates may occur if they match existing entries.`,
                'Yes, Import',
                'Cancel',
                '📤'
            );

            if (!confirmed) {
                event.target.value = ''; // Reset input
                return;
            }

            const token = Auth.getToken();
            let successCount = 0;
            let failCount = 0;

            showToast('Importing entries, please wait...', 'success', 2000);

            for (const entry of entries) {
                const normalizedEntry = {
                    date: entry.date ? normalizeDate(entry.date) : new Date().toISOString().split('T')[0],
                    title: entry.title || 'Untitled Entry',
                    content: entry.content || '',
                    mood: entry.mood || 'Neutral',
                    summary: entry.summary || '',
                    imageData: entry.image_path || entry.imageData || null
                };

                try {
                    const res = await fetch(`${API_BASE_URL}/entries`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(normalizedEntry)
                    });
                    if (res.ok) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                } catch (err) {
                    failCount++;
                }
            }

            showToast(`Import completed! Success: ${successCount}, Failed: ${failCount}`, successCount > 0 ? 'success' : 'error', 4000);
            
            // Reset the input
            event.target.value = '';

            // Reload list or calendar depending on page
            if (window.location.pathname.includes('entries.html')) {
                loadEntries();
            } else if (window.location.pathname.includes('calendar.html')) {
                initCalendar();
            }
        } catch (err) {
            showToast(`Import failed: ${err.message}`, 'error');
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}