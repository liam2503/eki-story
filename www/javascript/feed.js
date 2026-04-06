import { db, storage } from './firebase.js';
import { collection, onSnapshot, getDocs, doc, getDoc, setDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, addDoc, query, orderBy, where, limit, startAfter, increment, serverTimestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { startCamera, stopCamera } from './stamp_camera.js';
import { CURRENT_USER_ID, CURRENT_USERNAME, IS_ANONYMOUS } from './user.js';
import { showAuthScreen } from './auth.js';
import { applyTranslations, t, getLanguage } from './i18n.js';
import { playSlideSound, playOkSound, playReturnSound, playConfirm3Sound, playCameraSound, playConfirm2Sound } from './audio.js';
import { showToast } from './ui.js';

const PAGE_SIZE = 15;

let commentsUnsubscribe = null;
let detailPostUnsubscribe = null;
let userDocUnsubscribe = null;
let pendingPostImage = null;
let currentDetailPostId = null;
let currentDetailPostData = null;

let currentFeedFilter = 'all';
let currentUserFriends = [];
let currentUserOutRequests = [];

let lastVisibleAll = null;
let hasMoreAll = false;
let lastTimestampFriends = null;
let hasMoreFriends = false;
let isLoadingFeed = false;
let feedLoadVersion = 0;

const TAG_LEGACY_MAP = {
    'New Stamp Collected': 'stamp',
    'New Train Model': 'model',
    'New Station Visited': 'station'
};

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export async function initFeedFrame() {
    if (!CURRENT_USER_ID) return;

    applyTranslations();
    currentFeedFilter = 'all';

    const newPostBtn = document.getElementById('new-post-btn');
    const feedList = document.getElementById('feed-posts-list');
    const filterAllBtn = document.getElementById('feed-filter-all');
    const filterFriendsBtn = document.getElementById('feed-filter-friends');
    const loadMoreBtn = document.getElementById('feed-load-more-btn');

    if (newPostBtn) {
        newPostBtn.onclick = openCreatePost;
    }

    if (filterAllBtn && filterFriendsBtn) {
        filterAllBtn.onclick = () => setFeedFilter('all');
        filterFriendsBtn.onclick = () => setFeedFilter('friends');
    }

    if (loadMoreBtn) {
        loadMoreBtn.onclick = () => loadFeed(currentFeedFilter, false);
    }

    if (!IS_ANONYMOUS) {
        if (!userDocUnsubscribe) {
            userDocUnsubscribe = onSnapshot(doc(db, 'users', CURRENT_USER_ID), (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    currentUserFriends = data.friends || [];
                    currentUserOutRequests = data.out_requests || [];
                    if (currentDetailPostId && currentDetailPostData) {
                        renderDetailPost();
                    }
                }
            }, (e) => console.error(e));
        }
    }

    if (feedList) {
        feedList.removeEventListener('click', handleFeedClick);
        feedList.addEventListener('click', handleFeedClick);
    }

    await loadFeed('all', true);
}

document.addEventListener('turbo:frame-load', (e) => {
    if (e.target.id === 'feed-frame') {
        initFeedFrame();
    }
});

function setFeedFilter(filter) {
    if (filter === 'friends' && IS_ANONYMOUS) {
        showAuthScreen();
        return;
    }
    playOkSound();
    currentFeedFilter = filter;

    const btnAll = document.getElementById('feed-filter-all');
    const btnFriends = document.getElementById('feed-filter-friends');

    if (filter === 'all') {
        btnAll.className = "px-3 py-1 text-[10px] font-black uppercase tracking-tighter rounded-lg bg-white dark:bg-slate-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black dark:text-white transition-all cursor-pointer";
        btnFriends.className = "px-3 py-1 text-[10px] font-black uppercase tracking-tighter rounded-lg text-gray-500 hover:text-black dark:hover:text-white transition-all cursor-pointer";
    } else {
        btnFriends.className = "px-3 py-1 text-[10px] font-black uppercase tracking-tighter rounded-lg bg-white dark:bg-slate-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-black dark:text-white transition-all cursor-pointer";
        btnAll.className = "px-3 py-1 text-[10px] font-black uppercase tracking-tighter rounded-lg text-gray-500 hover:text-black dark:hover:text-white transition-all cursor-pointer";
    }

    loadFeed(filter, true);
}

async function loadFeed(filter, reset = false) {
    // Allow reset loads to supersede in-flight non-reset loads (C2 fix)
    if (isLoadingFeed && !reset) return;
    isLoadingFeed = true;
    const version = ++feedLoadVersion;

    const list = document.getElementById('feed-posts-list');
    const loadMoreBtn = document.getElementById('feed-load-more-btn');
    if (!list) { isLoadingFeed = false; return; }

    if (reset) {
        list.innerHTML = '';
        lastVisibleAll = null;
        lastTimestampFriends = null;
        hasMoreAll = false;
        hasMoreFriends = false;
    }

    if (loadMoreBtn) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.classList.add('hidden');
    }

    try {
        let docs = [];
        const postsRef = collection(db, 'posts');

        if (filter === 'all') {
            let q;
            if (lastVisibleAll) {
                q = query(postsRef, orderBy('timestamp', 'desc'), startAfter(lastVisibleAll), limit(PAGE_SIZE + 1));
            } else {
                q = query(postsRef, orderBy('timestamp', 'desc'), limit(PAGE_SIZE + 1));
            }
            const snapshot = await getDocs(q);
            if (version !== feedLoadVersion) return; // superseded by a newer load
            hasMoreAll = snapshot.docs.length > PAGE_SIZE;
            docs = snapshot.docs.slice(0, PAGE_SIZE);
            if (docs.length > 0) lastVisibleAll = docs[docs.length - 1];
        } else {
            // friends tab — Firestore query with userId in [...friends, self]
            if (IS_ANONYMOUS) { isLoadingFeed = false; return; }

            const friendIds = [...currentUserFriends, CURRENT_USER_ID].filter(Boolean);
            const allDocs = [];

            // chunk into groups of 30 (Firestore 'in' operator limit)
            // pagination uses a timestamp cursor since multiple parallel queries
            // can't share a single DocumentSnapshot; duplicate-ms skips are
            // extremely rare given Date.now() granularity
            for (let i = 0; i < friendIds.length; i += 30) {
                const chunk = friendIds.slice(i, i + 30);
                let q;
                if (lastTimestampFriends !== null) {
                    q = query(postsRef, where('userId', 'in', chunk), orderBy('timestamp', 'desc'), where('timestamp', '<', lastTimestampFriends), limit(PAGE_SIZE + 1));
                } else {
                    q = query(postsRef, where('userId', 'in', chunk), orderBy('timestamp', 'desc'), limit(PAGE_SIZE + 1));
                }
                const snapshot = await getDocs(q);
                allDocs.push(...snapshot.docs);
            }

            if (version !== feedLoadVersion) return; // superseded by a newer load
            allDocs.sort((a, b) => b.data().timestamp - a.data().timestamp);
            hasMoreFriends = allDocs.length > PAGE_SIZE;
            docs = allDocs.slice(0, PAGE_SIZE);
            if (docs.length > 0) lastTimestampFriends = docs[docs.length - 1].data().timestamp;
        }

        if (docs.length === 0 && reset) {
            list.innerHTML = `<div class="text-center text-gray-400 font-bold text-sm uppercase mt-10 tracking-widest">${t('feed.noPosts')}</div>`;
        } else {
            docs.forEach(docSnap => {
                list.appendChild(createPostElement(docSnap.id, docSnap.data()));
            });
        }

        const hasMore = filter === 'all' ? hasMoreAll : hasMoreFriends;
        if (loadMoreBtn) {
            loadMoreBtn.classList.toggle('hidden', !hasMore);
            loadMoreBtn.disabled = false;
        }
    } catch (err) {
        console.error('Failed to load feed:', err);
    } finally {
        if (version === feedLoadVersion) isLoadingFeed = false;
    }
}

function handleFeedClick(e) {
    const stationTagBtn = e.target.closest('.station-tag-btn');
    if (stationTagBtn) {
        const stationId = stationTagBtn.dataset.id;
        if (stationId && window.allStations && window.map) {
            const targetStation = window.allStations.find(s => String(s.id) === String(stationId) || String(s.station_id) === String(stationId));
            if (targetStation) {
                if (window.resetUI) window.resetUI();
                if (window.filterToLine) window.filterToLine(targetStation.line_id);
                window.map.panTo({ lat: Number(targetStation.lat), lng: Number(targetStation.lon) });
            }
        }
        return;
    }

    const friendBtn = e.target.closest('.friend-btn');
    if (friendBtn) {
        if (IS_ANONYMOUS) {
            showAuthScreen();
            return;
        }
        toggleFriendRequest(friendBtn.dataset.id, friendBtn.dataset.action);
        return;
    }

    const yeahBtn = e.target.closest('.yeah-btn');
    if (yeahBtn) {
        if (IS_ANONYMOUS) {
            showAuthScreen();
            return;
        }
        toggleYeah(yeahBtn.dataset.id, yeahBtn.classList.contains('bg-[#FF80AB]'));
        return;
    }
    
    const delBtn = e.target.closest('.delete-post-btn');
    if (delBtn) {
        deletePost(delBtn.dataset.id);
        return;
    }

    const detailTrigger = e.target.closest('.post-detail-trigger');
    if (detailTrigger) {
        openPostDetail(detailTrigger.dataset.id);
    }
}

function createPostElement(id, data, isDetail = false) {
    const div = document.createElement('div');
    const padding = isDetail ? 'p-4' : 'p-5';
    const borderRadius = isDetail ? 'rounded-[20px]' : 'rounded-[28px]';
    const titleSize = isDetail ? 'text-base' : 'text-xl';
    const maxWidth = 'max-w-sm';

    div.className = `bg-white dark:bg-slate-800 border-[4px] border-black dark:border-slate-600 ${padding} shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${borderRadius} flex flex-col ${maxWidth} mx-auto w-full`;

    const isOwner = data.userId === CURRENT_USER_ID;
    const btnSize = isDetail ? 'w-7 h-7' : 'w-9 h-9';
    const svgSize = isDetail ? 'w-3.5 h-3.5' : 'w-4 h-4';

    const deleteBtnHtml = isOwner ? `<button class="delete-post-btn ${btnSize} bg-[#FF5252] border-[3px] border-black dark:border-slate-600 rounded-full flex items-center justify-center text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all" data-id="${id}"><svg class="${svgSize}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>` : '';

    let friendBtnHtml = '';
    if (!isOwner && !IS_ANONYMOUS) {
        const isFriend = currentUserFriends.includes(data.userId);
        const hasRequested = currentUserOutRequests.includes(data.userId);

        if (!isFriend) {
            if (hasRequested) {
                friendBtnHtml = `<button class="friend-btn ${btnSize} bg-gray-400 dark:bg-slate-600 border-[3px] border-black dark:border-slate-500 rounded-full flex items-center justify-center text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all" data-id="${data.userId}" data-action="cancel"><svg class="${svgSize}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12h-6m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg></button>`;
            } else {
                friendBtnHtml = `<button class="friend-btn ${btnSize} bg-[#40C4FF] border-[3px] border-black dark:border-slate-600 rounded-full flex items-center justify-center text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all" data-id="${data.userId}" data-action="add"><svg class="${svgSize}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg></button>`;
            }
        }
    }

    const tagsHtml = [];
    if (data.tag) {
        const tagKey = TAG_LEGACY_MAP[data.tag] || data.tag;
        const tagLabel = t(`post.tags.${tagKey}`);
        tagsHtml.push(`<span class="bg-[#FF80AB] border-[3px] border-black dark:border-slate-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter text-black">${escapeHtml(tagLabel)}</span>`);
    }
    if (data.stationId || data.stationName) {
        const lang = getLanguage();
        let stationLabel = data.stationName;
        if (data.stationId && window.allStations) {
            if (!window.stationById) {
                window.stationById = {};
                window.allStations.forEach(station => {
                    if (station && station.id != null) {
                        window.stationById[String(station.id)] = station;
                    }
                });
            }
            const s = window.stationById[String(data.stationId)];
            if (s) {
                stationLabel = lang === 'ja' ? (s.station_name_jp || s.station_name_en) : (s.station_name_en || s.station_name_jp);
            }
        }
        if (stationLabel) {
            if (data.stationId) {
                tagsHtml.push(`<button class="station-tag-btn relative z-10 bg-[#40C4FF] border-[3px] border-black dark:border-slate-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter text-black hover:-translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all cursor-pointer" data-id="${data.stationId}">${escapeHtml(stationLabel)}</button>`);
            } else {
                tagsHtml.push(`<span class="bg-[#40C4FF] border-[3px] border-black dark:border-slate-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter text-black">${escapeHtml(stationLabel)}</span>`);
            }
        }
    }
    const tagContainer = tagsHtml.length ? `<div class="flex flex-wrap gap-1.5 mt-3">${tagsHtml.join('')}</div>` : '';

    const yeahs = data.yeahs || [];
    const hasYeahed = yeahs.includes(CURRENT_USER_ID);
    const yeahColor = hasYeahed ? 'bg-[#FF80AB]' : 'bg-white dark:bg-slate-700';
    const yeahText = hasYeahed ? 'text-black' : 'text-black dark:text-white';

    const triggerClass = isDetail ? '' : 'post-detail-trigger cursor-pointer';
    const displayImage = data.imageUrl || data.image;

    div.innerHTML = `
        <div class="flex items-center justify-between mb-3">
            <div class="flex flex-col">
                <h3 class="font-black ${titleSize} uppercase tracking-tighter dark:text-white">${escapeHtml(data.username)}</h3>
                <span class="text-[8px] font-black text-gray-400 uppercase tracking-widest">${new Date(data.timestamp).toLocaleString()}</span>
            </div>
            <div class="flex gap-1.5">
                ${friendBtnHtml}
                ${deleteBtnHtml}
            </div>
        </div>
        ${displayImage ? `<div class="w-full aspect-square bg-gray-200 dark:bg-slate-700 mb-3 border-[3px] border-black dark:border-slate-600 overflow-hidden rounded-xl ${triggerClass}" data-id="${id}"><img src="${displayImage}" loading="lazy" class="w-full h-full object-cover"></div>` : ''}
        <p class="${isDetail ? 'text-xs' : 'text-sm'} font-bold dark:text-gray-200 leading-snug ${triggerClass}" data-id="${id}">${escapeHtml(data.caption || '')}</p>
        ${tagContainer}
        <div class="flex gap-3 mt-4">
            <button class="yeah-btn flex-1 ${yeahColor} border-[3px] border-black dark:border-slate-600 rounded-lg py-1.5 ${yeahText} font-black text-xs uppercase tracking-tighter shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-[3px] active:translate-x-[3px] active:shadow-none transition-all flex items-center justify-center gap-1.5" data-id="${id}">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h-2.514"></path></svg>
                ${t('feed.yeah')} <span class="ml-0.5">${yeahs.length}</span>
            </button>
            <button class="${isDetail ? 'opacity-50 pointer-events-none' : 'talk-btn post-detail-trigger'} flex-1 bg-white dark:bg-slate-700 border-[3px] border-black dark:border-slate-600 rounded-lg py-1.5 text-black dark:text-white font-black text-xs uppercase tracking-tighter shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-[3px] active:translate-x-[3px] active:shadow-none transition-all flex items-center justify-center gap-1.5" data-id="${id}">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                ${t('post.talk')} <span class="ml-0.5">${data.commentsCount || 0}</span>
            </button>
        </div>
    `;

    return div;
}

function openCreatePost() {
    if (IS_ANONYMOUS) {
        showAuthScreen();
        return;
    }
    playOkSound();
    const cont = document.getElementById('create-post-container');
    const video = document.getElementById('feed-camera-feed');
    const place = document.getElementById('feed-camera-placeholder');
    const img = document.getElementById('feed-preview-image');
    const capBtn = document.getElementById('feed-capture-actions');
    const retakeBtn = document.getElementById('retake-feed-btn');
    const caption = document.getElementById('post-caption-input');
    const tag = document.getElementById('post-tag-input');
    const tagDisplay = document.getElementById('post-tag-display');
    const searchInput = document.getElementById('post-station-search-input');
    const hiddenId = document.getElementById('post-station-id-hidden');

    caption.value = '';
    tag.value = '';
    
    if (tagDisplay) {
        tagDisplay.setAttribute('data-i18n', 'post.tags.none');
        tagDisplay.innerText = t('post.tags.none');
    }

    if (searchInput) searchInput.value = '';
    if (hiddenId) hiddenId.value = '';
    pendingPostImage = null;
    img.src = '';
    img.classList.add('hidden');
    capBtn.classList.remove('hidden');
    retakeBtn.classList.add('hidden');
    
    cont.classList.remove('translate-y-full', 'pointer-events-none');
    startCamera(video, place, async () => {});
}

function initFeedStationSearch() {
    const searchInput = document.getElementById('post-station-search-input');
    const searchResults = document.getElementById('post-station-search-results');
    const hiddenId = document.getElementById('post-station-id-hidden');

    if (!searchInput || !searchResults) return;

    searchInput.addEventListener('input', function() {
        if (!this.value.trim()) {
            hiddenId.value = '';
        }

        const query = this.value.trim().toLowerCase();
        if (!query) {
            searchResults.classList.add('hidden');
            return;
        }

        if (!window.allStations) return;

        const lang = getLanguage();
        const stationGroups = {};

        window.allStations.forEach(s => {
            const nameEn = (s.station_name_en || '').toLowerCase();
            const nameJp = (s.station_name_jp || '').toLowerCase();
            if (!nameEn.includes(query) && !nameJp.includes(query)) return;
            
            const gid = s.station_g_id || s.id;
            if (!stationGroups[gid]) {
                stationGroups[gid] = {
                    name: lang === 'ja' ? (s.station_name_jp || s.station_name_en || t('common.unknown')) : (s.station_name_en || s.station_name_jp || t('common.unknown')),
                    stations: []
                };
            }
            stationGroups[gid].stations.push(s);
        });

        const entries = Object.entries(stationGroups).slice(0, 10);
        
        if (entries.length === 0) {
            searchResults.innerHTML = `<div class="px-5 py-4 text-xs font-black uppercase text-gray-400">${t('common.noResults')}</div>`;
            searchResults.classList.remove('hidden');
            return;
        }

        let html = '';
        entries.forEach(([, group]) => {
            const primaryStation = group.stations[0];
            const sId = primaryStation.id;
            const name = group.name;
            
            const colorDots = group.stations.slice(0, 4).map(s => {
                const line = window.lineData && window.lineData[String(s.line_id)];
                return `<div class="w-3 h-3 rounded-full border-[2px] border-black shrink-0" style="background-color:${line?.color || '#000'}"></div>`;
            }).join('');

            html += `
                <div class="feed-station-result flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 border-b-[2px] border-black dark:border-slate-600 last:border-b-0"
                     data-id="${sId}" data-name="${escapeHtml(name)}">
                    <div class="flex gap-1">${colorDots}</div>
                    <span class="text-xs font-black uppercase dark:text-white">${escapeHtml(name)}</span>
                </div>
            `;
        });

        searchResults.innerHTML = html;
        searchResults.classList.remove('hidden');

        searchResults.querySelectorAll('.feed-station-result').forEach(item => {
            item.addEventListener('click', () => {
                searchInput.value = item.dataset.name;
                hiddenId.value = item.dataset.id;
                searchResults.classList.add('hidden');
            });
        });
    });

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const closePostBtn = document.getElementById('close-create-post-btn');
    const capBtn = document.getElementById('capture-feed-btn');
    const retakeBtn = document.getElementById('retake-feed-btn');
    const uploadInput = document.getElementById('upload-feed-input');
    const submitBtn = document.getElementById('submit-post-btn');
    
    const closeDetailBtn = document.getElementById('close-post-detail-btn');
    const submitCommentBtn = document.getElementById('submit-comment-btn');

    initFeedStationSearch();
    initCustomTagSelect();

    if (closePostBtn) {
        closePostBtn.onclick = () => {
            playReturnSound();
            document.getElementById('create-post-container').classList.add('translate-y-full', 'pointer-events-none');
            stopCamera(document.getElementById('feed-camera-feed'), document.getElementById('feed-camera-placeholder'));
        };
    }

    if (capBtn) {
        capBtn.onclick = () => {
            const video = document.getElementById('feed-camera-feed');
            const canvas = document.getElementById('feed-camera-canvas');
            canvas.width = video.videoWidth; 
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            
            const outCanvas = resizeCanvasImage(canvas, 1000);
            pendingPostImage = outCanvas.toDataURL('image/jpeg', 0.8);
            
            stopCamera(video, document.getElementById('feed-camera-placeholder'));
            playCameraSound();
            showPostPreview();
        };
    }

    if (uploadInput) {
        uploadInput.onchange = (e) => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                stopCamera(document.getElementById('feed-camera-feed'), document.getElementById('feed-camera-placeholder'));
                const image = new Image();
                image.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = image.width; canvas.height = image.height;
                    canvas.getContext('2d').drawImage(image, 0, 0);
                    const outCanvas = resizeCanvasImage(canvas, 1000);
                    pendingPostImage = outCanvas.toDataURL('image/jpeg', 0.8);
                    playCameraSound();
                    showPostPreview();
                };
                image.src = event.target.result;
                e.target.value = '';
            };
            reader.readAsDataURL(file);
        };
    }

    if (retakeBtn) {
        retakeBtn.onclick = () => {
            playReturnSound();
            const img = document.getElementById('feed-preview-image');
            const capActs = document.getElementById('feed-capture-actions');
            const retakeBtn = document.getElementById('retake-feed-btn');
            pendingPostImage = null;
            img.classList.add('hidden');
            img.src = '';
            capActs.classList.remove('hidden');
            retakeBtn.classList.add('hidden');
            startCamera(document.getElementById('feed-camera-feed'), document.getElementById('feed-camera-placeholder'), async () => {});
        };
    }

    if (submitBtn) {
        submitBtn.onclick = async () => {
            playConfirm3Sound();
            const caption = document.getElementById('post-caption-input').value.trim();
            const tag = document.getElementById('post-tag-input').value;
            const stationId = document.getElementById('post-station-id-hidden').value;
            const errorEl = document.getElementById('post-submit-error');
            let stationName = '';

            if (errorEl) errorEl.classList.add('hidden');

            if (stationId && window.allStations) {
                const lang = getLanguage();
                const s = window.allStations.find(x => String(x.id) === String(stationId));
                if (s) {
                    stationName = lang === 'ja' ? (s.station_name_jp || s.station_name_en) : (s.station_name_en || s.station_name_jp);
                }
            }

            if (!pendingPostImage && !caption) return;

            submitBtn.disabled = true;
            try {
                let finalImageUrl = '';

                if (pendingPostImage) {
                    const imageRef = ref(storage, `posts/${CURRENT_USER_ID}_${Date.now()}.jpg`);
                    await uploadString(imageRef, pendingPostImage, 'data_url');
                    finalImageUrl = await getDownloadURL(imageRef);
                }

                const postData = {
                    userId: CURRENT_USER_ID,
                    username: CURRENT_USERNAME,
                    imageUrl: finalImageUrl,
                    caption: caption,
                    tag: tag,
                    stationId: stationId,
                    stationName: stationName,
                    timestamp: Date.now(),
                    yeahs: [],
                    commentsCount: 0
                };

                await addDoc(collection(db, 'posts'), postData);
                document.getElementById('create-post-container').classList.add('translate-y-full', 'pointer-events-none');
                await loadFeed(currentFeedFilter, true);
            } catch (err) {
                if (errorEl) {
                    errorEl.innerText = 'Failed to post. Please check your connection and try again.';
                    errorEl.classList.remove('hidden');
                }
            } finally {
                submitBtn.disabled = false;
            }
        };
    }

    if (closeDetailBtn) {
        closeDetailBtn.onclick = () => {
            playReturnSound();
            document.getElementById('post-detail-container').classList.add('translate-x-full', 'pointer-events-none');
            if (commentsUnsubscribe) commentsUnsubscribe();
            if (detailPostUnsubscribe) detailPostUnsubscribe();
            currentDetailPostId = null;
            currentDetailPostData = null;
        };
    }

    if (submitCommentBtn) {
        submitCommentBtn.onclick = async () => {
            if (IS_ANONYMOUS) {
                showAuthScreen();
                return;
            }
            playOkSound();
            const input = document.getElementById('comment-text-input');
            const text = input.value.trim();
            if (!text || !currentDetailPostId) return;

            input.value = '';
            const commentsRef = collection(db, 'posts', currentDetailPostId, 'comments');
            await addDoc(commentsRef, {
                userId: CURRENT_USER_ID,
                username: CURRENT_USERNAME,
                text: text,
                timestamp: Date.now()
            });

            const postRef = doc(db, 'posts', currentDetailPostId);
            await updateDoc(postRef, {
                commentsCount: increment(1)
            });
        };
    }
});

function showPostPreview() {
    const img = document.getElementById('feed-preview-image');
    const capActs = document.getElementById('feed-capture-actions');
    const retakeBtn = document.getElementById('retake-feed-btn');
    
    img.src = pendingPostImage;
    img.classList.remove('hidden');
    capActs.classList.add('hidden');
    retakeBtn.classList.remove('hidden');
}

function renderDetailPost() {
    const cont = document.getElementById('post-detail-container');
    const content = document.getElementById('post-detail-content');
    
    if (!content || !currentDetailPostId || !currentDetailPostData) return;
    
    content.innerHTML = '';
    content.appendChild(createPostElement(currentDetailPostId, currentDetailPostData, true));
    
    const yeahBtn = content.querySelector('.yeah-btn');
    if (yeahBtn) {
        yeahBtn.onclick = () => toggleYeah(currentDetailPostId, yeahBtn.classList.contains('bg-[#FF80AB]'));
    }
    
    const delBtn = content.querySelector('.delete-post-btn');
    if (delBtn) {
        delBtn.onclick = async () => {
            const ok = await deletePost(currentDetailPostId);
            if (ok) cont.classList.add('translate-x-full', 'pointer-events-none');
        };
    }

    const friendBtn = content.querySelector('.friend-btn');
    if (friendBtn) {
        friendBtn.onclick = () => {
            if (IS_ANONYMOUS) {
                showAuthScreen();
                return;
            }
            toggleFriendRequest(friendBtn.dataset.id, friendBtn.dataset.action);
        };
    }

    const stationTagBtn = content.querySelector('.station-tag-btn');
    if (stationTagBtn) {
        stationTagBtn.onclick = () => {
            const stationId = stationTagBtn.dataset.id;
            if (stationId && window.allStations && window.map) {
                const targetStation = window.allStations.find(s => String(s.id) === String(stationId) || String(s.station_id) === String(stationId));
                if (targetStation) {
                    if (window.resetUI) window.resetUI();
                    if (window.filterToLine) window.filterToLine(targetStation.line_id);
                    window.map.panTo({ lat: Number(targetStation.lat), lng: Number(targetStation.lon) });
                    cont.classList.add('translate-x-full', 'pointer-events-none');
                }
            }
        };
    }
}

function openPostDetail(id) {
    playSlideSound();
    currentDetailPostId = id;
    currentDetailPostData = null;
    const cont = document.getElementById('post-detail-container');
    const content = document.getElementById('post-detail-content');
    const list = document.getElementById('post-comments-list');
    
    cont.classList.remove('translate-x-full', 'pointer-events-none');
    content.innerHTML = '';
    list.innerHTML = '';

    if (detailPostUnsubscribe) detailPostUnsubscribe();
    detailPostUnsubscribe = onSnapshot(doc(db, 'posts', id), (docSnap) => {
        if (!docSnap.exists()) {
            cont.classList.add('translate-x-full', 'pointer-events-none');
            return;
        }
        currentDetailPostData = docSnap.data();
        renderDetailPost();
    });

    if (commentsUnsubscribe) commentsUnsubscribe();
    const q = query(collection(db, 'posts', id, 'comments'), orderBy('timestamp', 'asc'));
    commentsUnsubscribe = onSnapshot(q, (snapshot) => {
        list.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const isOwner = data.userId === CURRENT_USER_ID;
            const item = document.createElement('div');
            item.className = "bg-gray-100 dark:bg-slate-800 border-[3px] border-black dark:border-slate-600 p-4 rounded-2xl flex flex-col gap-1 relative";
            const delHtml = isOwner ? `<button class="absolute top-3 right-3 text-gray-400 hover:text-black dark:hover:text-white transition-colors" onclick="window.deleteComment('${id}', '${docSnap.id}')"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>` : '';
            item.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="font-black text-sm uppercase dark:text-white">${escapeHtml(data.username)}</span>
                    <span class="text-[9px] font-black text-gray-400 uppercase tracking-widest">${new Date(data.timestamp).toLocaleString()}</span>
                </div>
                <p class="text-sm font-bold dark:text-gray-200 mt-1">${escapeHtml(data.text)}</p>
                ${delHtml}
            `;
            list.appendChild(item);
        });
        
        setTimeout(() => {
            cont.querySelector('.flex-1').scrollTop = cont.querySelector('.flex-1').scrollHeight;
        }, 50);
    });
}

window.deleteComment = async (postId, commentId) => {
    playReturnSound();
    await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
    await updateDoc(doc(db, 'posts', postId), {
        commentsCount: increment(-1)
    });
};

async function toggleYeah(id, hasYeahed) {
    const ref = doc(db, 'posts', id);
    try {
        if (hasYeahed) {
            playReturnSound();
            await updateDoc(ref, { yeahs: arrayRemove(CURRENT_USER_ID) });
        } else {
            playConfirm2Sound();
            await updateDoc(ref, { yeahs: arrayUnion(CURRENT_USER_ID) });
        }
    } catch (e) {
        showToast('Failed to update. Please check your connection.');
    }
}

async function deletePost(id) {
    playReturnSound();
    try {
        await deleteDoc(doc(db, 'posts', id));
        return true;
    } catch (e) {
        showToast('Failed to delete post. Please try again.');
        return false;
    }
}

function resizeCanvasImage(canvas, maxSize) {
    if (canvas.width > maxSize || canvas.height > maxSize) {
        const scale = Math.min(maxSize / canvas.width, maxSize / canvas.height);
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = canvas.width * scale;
        finalCanvas.height = canvas.height * scale;
        const ctx = finalCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, 0, finalCanvas.width, finalCanvas.height);
        return finalCanvas;
    }
    return canvas;
}

function initCustomTagSelect() {
    const trigger = document.getElementById('post-tag-trigger');
    const optionsContainer = document.getElementById('post-tag-options');
    const hiddenInput = document.getElementById('post-tag-input');
    const display = document.getElementById('post-tag-display');
    const arrow = trigger?.querySelector('svg');

    if (!trigger || !optionsContainer) return;

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = optionsContainer.classList.contains('hidden');
        if (isHidden) {
            optionsContainer.classList.remove('hidden');
            if (arrow) arrow.classList.add('rotate-180');
        } else {
            optionsContainer.classList.add('hidden');
            if (arrow) arrow.classList.remove('rotate-180');
        }
    });

    const options = optionsContainer.querySelectorAll('.tag-option');
    options.forEach(opt => {
        opt.addEventListener('click', (e) => {
            playOkSound();
            e.stopPropagation();
            hiddenInput.value = opt.getAttribute('data-value');
            
            const i18nKey = opt.getAttribute('data-i18n');
            if (i18nKey) {
                display.setAttribute('data-i18n', i18nKey);
                display.innerText = t(i18nKey);
            } else {
                display.removeAttribute('data-i18n');
                display.innerText = opt.innerText;
            }
            
            optionsContainer.classList.add('hidden');
            if (arrow) arrow.classList.remove('rotate-180');
        });
    });

    document.addEventListener('click', (e) => {
        if (!trigger.contains(e.target) && !optionsContainer.contains(e.target)) {
            optionsContainer.classList.add('hidden');
            if (arrow) arrow.classList.remove('rotate-180');
        }
    });
}

export function openCreatePostWith(imageData, tag) {
    if (IS_ANONYMOUS) return;

    const cont = document.getElementById('create-post-container');
    const video = document.getElementById('feed-camera-feed');
    const place = document.getElementById('feed-camera-placeholder');
    const img = document.getElementById('feed-preview-image');
    const capBtn = document.getElementById('feed-capture-actions');
    const retakeBtn = document.getElementById('retake-feed-btn');
    const caption = document.getElementById('post-caption-input');
    const tagInput = document.getElementById('post-tag-input');
    const tagDisplay = document.getElementById('post-tag-display');
    const searchInput = document.getElementById('post-station-search-input');
    const hiddenId = document.getElementById('post-station-id-hidden');

    if (!cont || !img || !capBtn || !retakeBtn || !caption) return;

    caption.value = '';
    if (searchInput) searchInput.value = '';
    if (hiddenId) hiddenId.value = '';

    stopCamera(video, place);

    pendingPostImage = imageData;
    img.src = imageData;
    img.classList.remove('hidden');
    capBtn.classList.add('hidden');
    retakeBtn.classList.remove('hidden');

    if (tag && tagInput) {
        tagInput.value = tag;
        const i18nKey = `post.tags.${tag}`;
        if (tagDisplay) {
            tagDisplay.setAttribute('data-i18n', i18nKey);
            tagDisplay.innerText = t(i18nKey);
        }
    } else {
        if (tagInput) tagInput.value = '';
        if (tagDisplay) {
            tagDisplay.setAttribute('data-i18n', 'post.tags.none');
            tagDisplay.innerText = t('post.tags.none');
        }
    }

    cont.classList.remove('translate-y-full', 'pointer-events-none');
}

export function showPostToFeedPrompt(imageData, tag) {
    if (IS_ANONYMOUS) return;

    const modal = document.getElementById('generic-confirm-modal');
    const box = document.getElementById('generic-confirm-box');

    document.getElementById('generic-confirm-title').innerText = t('post.shareToFeedTitle');
    document.getElementById('generic-confirm-message').innerText = t('post.shareToFeedMsg');

    modal.classList.remove('opacity-0', 'pointer-events-none');
    box.classList.remove('scale-95');
    box.classList.add('scale-100');

    document.getElementById('generic-confirm-cancel').onclick = () => {
        playReturnSound();
        modal.classList.add('opacity-0', 'pointer-events-none');
        box.classList.add('scale-95');
        box.classList.remove('scale-100');
    };

    document.getElementById('generic-confirm-ok').onclick = () => {
        playOkSound();
        modal.classList.add('opacity-0', 'pointer-events-none');
        box.classList.add('scale-95');
        box.classList.remove('scale-100');
        openCreatePostWith(imageData, tag);
    };
}

async function toggleFriendRequest(targetId, action) {
    if (IS_ANONYMOUS || !targetId) return;

    const currentUserRef = doc(db, 'users', CURRENT_USER_ID);
    const targetUserRef = doc(db, 'users', targetId);

    try {
        if (action === 'add') {
            await setDoc(currentUserRef, { out_requests: arrayUnion(targetId) }, { merge: true });
            await setDoc(targetUserRef, { in_requests: arrayUnion(CURRENT_USER_ID) }, { merge: true });
            playConfirm2Sound();
        } else if (action === 'cancel') {
            await setDoc(currentUserRef, { out_requests: arrayRemove(targetId) }, { merge: true });
            await setDoc(targetUserRef, { in_requests: arrayRemove(CURRENT_USER_ID) }, { merge: true });
            playReturnSound();
        }
    } catch (e) {
        console.error(e);
    }
}