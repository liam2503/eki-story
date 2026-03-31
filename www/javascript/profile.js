import { auth, db } from './firebase.js';
import { collection, query, where, getDocs, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { showAuthScreen } from './auth.js';
import { getVisitedStations, userStamps, CURRENT_USER_ID, CURRENT_USERNAME, IS_ANONYMOUS } from './user.js';
import { applyTranslations, t } from './i18n.js';

export function updateProfileCounts() {
    const stationsCount = document.getElementById('profile-stations-count');
    const stampsCount = document.getElementById('profile-stamps-count');
    
    if (stationsCount) {
        const visited = getVisitedStations();
        stationsCount.innerText = visited ? visited.length : 0;
    }
    
    if (stampsCount) {
        stampsCount.innerText = Object.keys(userStamps).length || 0;
    }
}

window.addEventListener('visitedDataUpdated', updateProfileCounts);

export async function initProfileFrame() {
    applyTranslations();

    const profileContainer = document.getElementById('profile-container');
    const closeBtn = document.getElementById('close-profile-btn');
    
    if (closeBtn && profileContainer) {
        closeBtn.onclick = () => {
            profileContainer.classList.add('translate-x-full', 'pointer-events-none');
            window.resetUI?.();
        };
    }

    const usernameEl = document.getElementById('profile-username');
    const guestOverlay = document.getElementById('friend-guest-overlay');
    const searchInput = document.getElementById('friend-search-input');
    const sendBtn = document.getElementById('send-friend-request-btn');
    const messageEl = document.getElementById('friend-message');
    const requestsList = document.getElementById('friend-requests-list');
    const noRequestsMsg = document.getElementById('no-requests-msg');

    updateProfileCounts();

    if (IS_ANONYMOUS || !CURRENT_USER_ID) {
        if (usernameEl) usernameEl.innerText = "Guest";
        if (guestOverlay) {
            guestOverlay.classList.remove('hidden');
            guestOverlay.onclick = () => {
                if (profileContainer) profileContainer.classList.add('translate-x-full', 'pointer-events-none');
                showAuthScreen();
            };
        }
        return; 
    }

    if (guestOverlay) guestOverlay.classList.add('hidden');
    if (usernameEl) usernameEl.innerText = CURRENT_USERNAME;

    if (sendBtn) {
        sendBtn.onclick = async () => {
            const targetUsername = searchInput.value.trim();
            if (!targetUsername) return;

            messageEl.classList.remove('hidden', 'text-[#FF5252]', 'text-[#B2FF59]');
            messageEl.classList.add('text-gray-500');
            messageEl.innerText = t('common.loading') || "Searching...";

            try {
                if (CURRENT_USERNAME === targetUsername) {
                    throw new Error("You cannot add yourself.");
                }

                const usersRef = collection(db, 'users');
                const q = query(usersRef, where("username", "==", targetUsername));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    throw new Error("User not found.");
                }

                const targetUser = snapshot.docs[0];
                const targetUserId = targetUser.id;

                const reqQuery = query(collection(db, 'friend_requests'), 
                    where("from", "==", CURRENT_USER_ID), 
                    where("to", "==", targetUserId)
                );
                const reqSnapshot = await getDocs(reqQuery);
                if (!reqSnapshot.empty) {
                    throw new Error("Request already sent.");
                }

                await addDoc(collection(db, 'friend_requests'), {
                    from: CURRENT_USER_ID,
                    fromUsername: CURRENT_USERNAME,
                    to: targetUserId,
                    status: 'pending',
                    timestamp: new Date()
                });

                messageEl.classList.remove('text-gray-500');
                messageEl.classList.add('text-[#B2FF59]');
                messageEl.innerText = "Request sent!";
                searchInput.value = '';
                
                setTimeout(() => messageEl.classList.add('hidden'), 3000);

            } catch (err) {
                messageEl.classList.remove('text-gray-500');
                messageEl.classList.add('text-[#FF5252]');
                messageEl.innerText = err.message;
            }
        };
    }

    const incomingQuery = query(
        collection(db, 'friend_requests'), 
        where("to", "==", CURRENT_USER_ID), 
        where("status", "==", "pending")
    );

    if (window.profileRequestsUnsub) {
        window.profileRequestsUnsub();
    }

    window.profileRequestsUnsub = onSnapshot(incomingQuery, (snapshot) => {
        if (requestsList) requestsList.innerHTML = '';
        
        if (snapshot.empty) {
            if (noRequestsMsg) noRequestsMsg.classList.remove('hidden');
            return;
        }

        if (noRequestsMsg) noRequestsMsg.classList.add('hidden');

        snapshot.forEach((reqDoc) => {
            const data = reqDoc.data();
            const reqEl = document.createElement('div');
            reqEl.className = "flex items-center justify-between bg-gray-100 border-[3px] border-black rounded-xl p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
            reqEl.innerHTML = `
                <div class="flex items-center gap-3 truncate mr-2">
                    <div class="w-8 h-8 bg-[#40C4FF] border-[2px] border-black rounded-full shrink-0 flex items-center justify-center">
                        <svg class="w-4 h-4" fill="none" stroke="black" viewBox="0 0 24 24" stroke-width="3"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    </div>
                    <span class="font-black uppercase tracking-tighter truncate text-sm">${data.fromUsername || 'Unknown User'}</span>
                </div>
                <div class="flex gap-2 shrink-0">
                    <button class="accept-btn w-8 h-8 bg-[#B2FF59] border-[2px] border-black rounded-lg flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all">
                        <svg class="w-5 h-5" fill="none" stroke="black" viewBox="0 0 24 24" stroke-width="4"><path d="M5 13l4 4L19 7"/></svg>
                    </button>
                    <button class="decline-btn w-8 h-8 bg-[#FF5252] border-[2px] border-black rounded-lg flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="4"><path d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
            `;

            reqEl.querySelector('.accept-btn').onclick = async () => {
                await updateDoc(doc(db, 'friend_requests', reqDoc.id), { status: 'accepted' });
            };

            reqEl.querySelector('.decline-btn').onclick = async () => {
                await deleteDoc(doc(db, 'friend_requests', reqDoc.id));
            };

            if (requestsList) requestsList.appendChild(reqEl);
        });
    });
}

document.addEventListener('turbo:frame-load', (e) => {
    if (e.target.id === 'profile-frame') {
        initProfileFrame();
    }
});

window.addEventListener('authResolved', () => {
    initProfileFrame();
});