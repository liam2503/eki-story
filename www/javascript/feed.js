import { db } from './firebase.js';
import { collection, onSnapshot, doc, getDoc, setDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, addDoc, query, orderBy, increment, serverTimestamp } from 'firebase/firestore';
import { startCamera, stopCamera } from './stamp_camera.js';
import { CURRENT_USER_ID, CURRENT_USERNAME, IS_ANONYMOUS } from './user.js';
import { showAuthScreen } from './auth.js';
import { applyTranslations, t } from './i18n.js';

let postsUnsubscribe = null;
let commentsUnsubscribe = null;
let detailPostUnsubscribe = null;
let pendingPostImage = null;
let currentDetailPostId = null;

let currentFeedFilter = 'all';
let latestPosts = [];
let currentUserFriends = [];

export async function initFeedFrame() {
    if (!CURRENT_USER_ID) return;

    applyTranslations();

    const newPostBtn = document.getElementById('new-post-btn');
    const feedList = document.getElementById('feed-posts-list');
    const filterAllBtn = document.getElementById('feed-filter-all');
    const filterFriendsBtn = document.getElementById('feed-filter-friends');
    
    if (newPostBtn) {
        newPostBtn.onclick = openCreatePost;
    }

    if (filterAllBtn && filterFriendsBtn) {
        filterAllBtn.onclick = () => setFeedFilter('all');
        filterFriendsBtn.onclick = () => setFeedFilter('friends');
    }

    if (!IS_ANONYMOUS) {
        try {
            const userDoc = await getDoc(doc(db, 'users', CURRENT_USER_ID));
            if (userDoc.exists()) {
                currentUserFriends = userDoc.data().friends || [];
            }
        } catch (e) {
            console.error(e);
        }
    }

    if (feedList && !postsUnsubscribe) {
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, orderBy('timestamp', 'desc'));
        
        postsUnsubscribe = onSnapshot(q, (snapshot) => {
            latestPosts = snapshot.docs;
            renderFeed();
        });

        feedList.addEventListener('click', handleFeedClick);
    }
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
    
    renderFeed();
}

function renderFeed() {
    const list = document.getElementById('feed-posts-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    latestPosts.forEach(docSnap => {
        const data = docSnap.data();
        
        if (currentFeedFilter === 'friends') {
            if (data.userId !== CURRENT_USER_ID && !currentUserFriends.includes(data.userId)) {
                return; 
            }
        }
        
        list.appendChild(createPostElement(docSnap.id, data));
    });

    if (list.innerHTML === '') {
        list.innerHTML = `<div class="text-center text-gray-400 font-bold text-sm uppercase mt-10 tracking-widest">${t('feed.noPosts')}</div>`;
    }
}

function handleFeedClick(e) {
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
    div.className = "bg-white dark:bg-slate-800 border-[4px] border-black dark:border-slate-600 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-[32px] flex flex-col";

    const isOwner = data.userId === CURRENT_USER_ID;
    const deleteBtnHtml = isOwner ? `<button class="delete-post-btn w-10 h-10 bg-[#FF5252] border-[3px] border-black dark:border-slate-600 rounded-full flex items-center justify-center text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all" data-id="${id}"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>` : '';

    const tagsHtml = [];
    if (data.tag) {
        tagsHtml.push(`<span class="bg-[#FF80AB] border-[3px] border-black dark:border-slate-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter text-black">${data.tag}</span>`);
    }
    if (data.stationName) {
        tagsHtml.push(`<span class="bg-[#40C4FF] border-[3px] border-black dark:border-slate-600 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter text-black">${data.stationName}</span>`);
    }
    const tagContainer = tagsHtml.length ? `<div class="flex flex-wrap gap-2 mt-4">${tagsHtml.join('')}</div>` : '';

    const yeahs = data.yeahs || [];
    const hasYeahed = yeahs.includes(CURRENT_USER_ID);
    const yeahColor = hasYeahed ? 'bg-[#FF80AB]' : 'bg-white dark:bg-slate-700';
    const yeahText = hasYeahed ? 'text-black' : 'text-black dark:text-white';

    const triggerClass = isDetail ? '' : 'post-detail-trigger cursor-pointer';

    div.innerHTML = `
        <div class="flex items-center justify-between mb-5">
            <div class="flex flex-col">
                <h3 class="font-black text-2xl uppercase tracking-tighter dark:text-white">${data.username}</h3>
                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">${new Date(data.timestamp).toLocaleString()}</span>
            </div>
            ${deleteBtnHtml}
        </div>
        ${data.image ? `<div class="w-full aspect-square bg-gray-200 dark:bg-slate-700 mb-5 border-[4px] border-black dark:border-slate-600 overflow-hidden rounded-2xl ${triggerClass}" data-id="${id}"><img src="${data.image}" class="w-full h-full object-cover"></div>` : ''}
        <p class="text-base font-bold dark:text-gray-200 ${triggerClass}" data-id="${id}">${data.caption || ''}</p>
        ${tagContainer}
        <div class="flex gap-4 mt-6">
            <button class="yeah-btn flex-1 ${yeahColor} border-[4px] border-black dark:border-slate-600 rounded-xl py-3 ${yeahText} font-black text-base uppercase tracking-tighter shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all flex items-center justify-center gap-2" data-id="${id}">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h-2.514"></path></svg>
                ${t('feed.yeah')} <span class="ml-1">${yeahs.length}</span>
            </button>
            <button class="${isDetail ? 'opacity-50 pointer-events-none' : 'talk-btn post-detail-trigger'} flex-1 bg-white dark:bg-slate-700 border-[4px] border-black dark:border-slate-600 rounded-xl py-3 text-black dark:text-white font-black text-base uppercase tracking-tighter shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all flex items-center justify-center gap-2" data-id="${id}">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                ${t('post.talk')} <span class="ml-1">${data.commentsCount || 0}</span>
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
    const cont = document.getElementById('create-post-container');
    const video = document.getElementById('feed-camera-feed');
    const place = document.getElementById('feed-camera-placeholder');
    const img = document.getElementById('feed-preview-image');
    const capBtn = document.getElementById('feed-capture-actions');
    const retakeBtn = document.getElementById('retake-feed-btn');
    const caption = document.getElementById('post-caption-input');
    const tag = document.getElementById('post-tag-input');
    const searchInput = document.getElementById('post-station-search-input');
    const hiddenId = document.getElementById('post-station-id-hidden');

    caption.value = '';
    tag.value = '';
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

        const stationGroups = {};
        window.allStations.forEach(s => {
            const nameEn = (s.station_name_en || '').toLowerCase();
            const nameJp = (s.station_name_jp || '').toLowerCase();
            if (!nameEn.includes(query) && !nameJp.includes(query)) return;
            
            const gid = s.station_g_id || s.id;
            if (!stationGroups[gid]) {
                stationGroups[gid] = {
                    name: s.station_name_en || s.station_name_jp || t('common.unknown'),
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
                     data-id="${sId}" data-name="${name}">
                    <div class="flex gap-1">${colorDots}</div>
                    <span class="text-xs font-black uppercase dark:text-white">${name}</span>
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

    if (closePostBtn) {
        closePostBtn.onclick = () => {
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
            const caption = document.getElementById('post-caption-input').value.trim();
            const tag = document.getElementById('post-tag-input').value;
            const stationId = document.getElementById('post-station-id-hidden').value;
            const errorEl = document.getElementById('post-submit-error');
            let stationName = '';

            if (errorEl) errorEl.classList.add('hidden');

            if (stationId && window.allStations) {
                const s = window.allStations.find(x => String(x.id) === String(stationId));
                if (s) stationName = s.station_name_en || s.station_name_jp;
            }

            if (!pendingPostImage && !caption) return;

            const postData = {
                userId: CURRENT_USER_ID,
                username: CURRENT_USERNAME,
                image: pendingPostImage || '',
                caption: caption,
                tag: tag,
                stationId: stationId,
                stationName: stationName,
                timestamp: Date.now(),
                yeahs: [],
                commentsCount: 0
            };

            submitBtn.disabled = true;
            try {
                await addDoc(collection(db, 'posts'), postData);
                document.getElementById('create-post-container').classList.add('translate-y-full', 'pointer-events-none');
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
            document.getElementById('post-detail-container').classList.add('translate-x-full', 'pointer-events-none');
            if (commentsUnsubscribe) commentsUnsubscribe();
            if (detailPostUnsubscribe) detailPostUnsubscribe();
            currentDetailPostId = null;
        };
    }

    if (submitCommentBtn) {
        submitCommentBtn.onclick = async () => {
            if (IS_ANONYMOUS) {
                showAuthScreen();
                return;
            }
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

function openPostDetail(id) {
    currentDetailPostId = id;
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
        content.innerHTML = '';
        content.appendChild(createPostElement(docSnap.id, docSnap.data(), true));
        const yeahBtn = content.querySelector('.yeah-btn');
        if (yeahBtn) {
            yeahBtn.onclick = () => toggleYeah(id, yeahBtn.classList.contains('bg-[#FF80AB]'));
        }
        const delBtn = content.querySelector('.delete-post-btn');
        if (delBtn) {
            delBtn.onclick = () => {
                deletePost(id);
                cont.classList.add('translate-x-full', 'pointer-events-none');
            };
        }
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
                    <span class="font-black text-sm uppercase dark:text-white">${data.username}</span>
                    <span class="text-[9px] font-black text-gray-400 uppercase tracking-widest">${new Date(data.timestamp).toLocaleString()}</span>
                </div>
                <p class="text-sm font-bold dark:text-gray-200 mt-1">${data.text}</p>
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
    await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
    await updateDoc(doc(db, 'posts', postId), {
        commentsCount: increment(-1)
    });
};

function toggleYeah(id, hasYeahed) {
    const ref = doc(db, 'posts', id);
    if (hasYeahed) {
        updateDoc(ref, { yeahs: arrayRemove(CURRENT_USER_ID) });
    } else {
        updateDoc(ref, { yeahs: arrayUnion(CURRENT_USER_ID) });
    }
}

function deletePost(id) {
    deleteDoc(doc(db, 'posts', id));
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