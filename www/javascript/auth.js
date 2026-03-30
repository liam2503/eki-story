import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { auth, db, googleProvider } from './firebase.js';
import { 
    onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
    signInAnonymously, signInWithPopup, linkWithCredential, linkWithPopup, EmailAuthProvider 
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { setCurrentUser, initProfileSync } from './user.js';
import { initFeedFrame } from './feed.js';

let isSignUpMode = false;
let isInitialLoad = true;

export function showAuthScreen() {
    const authContainer = document.getElementById('auth-container');
    
    authContainer.classList.remove('hidden');
    void authContainer.offsetWidth;
    authContainer.classList.remove('translate-y-full');
    
    if (auth.currentUser && auth.currentUser.isAnonymous) {
        document.getElementById('auth-close-btn').classList.remove('hidden');
        document.getElementById('auth-anon-btn').classList.add('hidden');
        
        isSignUpMode = true;
        document.getElementById('auth-username').classList.remove('hidden');
        document.getElementById('auth-username').required = true;
        document.getElementById('auth-identifier').placeholder = "Email Address";
        document.getElementById('auth-submit-btn').innerText = "Save Data & Sign Up";
        document.getElementById('auth-toggle-mode').innerText = "Already have an account? Log In";
    }
}

export function initAuth() {
    const authContainer = document.getElementById('auth-container');
    const authCloseBtn = document.getElementById('auth-close-btn');
    const authForm = document.getElementById('auth-form');
    const authUsername = document.getElementById('auth-username');
    const authIdentifier = document.getElementById('auth-identifier');
    const authPassword = document.getElementById('auth-password');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authToggleMode = document.getElementById('auth-toggle-mode');
    const authGoogleBtn = document.getElementById('auth-google-btn');
    const authAnonBtn = document.getElementById('auth-anon-btn');
    const errorMsg = document.getElementById('auth-error-message');

    if (authCloseBtn) {
        authCloseBtn.onclick = () => {
            authContainer.classList.add('translate-y-full');
            setTimeout(() => {
                if (authContainer.classList.contains('translate-y-full')) {
                    authContainer.classList.add('hidden');
                }
            }, 500);
        };
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            authContainer.classList.add('translate-y-full');
            setTimeout(() => {
                if (authContainer.classList.contains('translate-y-full')) {
                    authContainer.classList.add('hidden');
                }
            }, 500);
            if (authCloseBtn) authCloseBtn.classList.add('hidden');
            
            let username = user.isAnonymous ? "Guest" : "User";
            
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists() && userDoc.data().username) {
                username = userDoc.data().username;
            } else if (!user.isAnonymous) {
                username = user.displayName || user.email.split('@')[0];
                await setDoc(doc(db, 'users', user.uid), { username: username, email: user.email }, { merge: true });
            }

            setCurrentUser(user.uid, username, user.isAnonymous);
            initProfileSync();
            initFeedFrame();
        } else {
            // User is signed out
            if (isInitialLoad) {
                authContainer.style.transition = 'none';
                authContainer.classList.remove('hidden', 'translate-y-full');
                void authContainer.offsetWidth;
                authContainer.style.transition = '';
            } else {
                authContainer.classList.remove('hidden');
                void authContainer.offsetWidth;
                authContainer.classList.remove('translate-y-full');
            }

            // Hide the X button so they must log in or play as guest
            if (authCloseBtn) authCloseBtn.classList.add('hidden');
            if (authAnonBtn) authAnonBtn.classList.remove('hidden');

            // Reset form back to default "Log In" state
            isSignUpMode = false;
            authUsername.classList.add('hidden');
            authUsername.required = false;
            authIdentifier.placeholder = "Email or Username";
            authSubmitBtn.innerText = "Log In";
            authToggleMode.innerText = "Need an account? Sign Up";
        }
        isInitialLoad = false;
    });

    authToggleMode.onclick = () => {
        isSignUpMode = !isSignUpMode;
        if (isSignUpMode) {
            authUsername.classList.remove('hidden');
            authUsername.required = true;
            authIdentifier.placeholder = "Email Address";
            if (auth.currentUser && auth.currentUser.isAnonymous) {
                authSubmitBtn.innerText = "Save Data & Sign Up";
                authToggleMode.innerText = "Already have an account? Log In";
            } else {
                authSubmitBtn.innerText = "Sign Up";
                authToggleMode.innerText = "Already have an account? Log In";
            }
        } else {
            authUsername.classList.add('hidden');
            authUsername.required = false;
            authIdentifier.placeholder = "Email or Username";
            authSubmitBtn.innerText = "Log In";
            authToggleMode.innerText = "Need an account? Sign Up";
        }
        errorMsg.classList.add('hidden');
    };

    authForm.onsubmit = async (e) => {
        e.preventDefault();
        errorMsg.classList.add('hidden');
        
        const identifier = authIdentifier.value.trim();
        const password = authPassword.value;
        const username = authUsername.value.trim();

        try {
            if (isSignUpMode) {
                let currentEmail = identifier;
                if (!currentEmail.includes('@')) throw new Error("Please enter a valid email address for signup.");

                if (auth.currentUser && auth.currentUser.isAnonymous) {
                    const credential = EmailAuthProvider.credential(currentEmail, password);
                    await linkWithCredential(auth.currentUser, credential);
                    await setDoc(doc(db, 'users', auth.currentUser.uid), { username, email: currentEmail }, { merge: true });
                    window.location.reload();
                } else {
                    const cred = await createUserWithEmailAndPassword(auth, currentEmail, password);
                    await setDoc(doc(db, 'users', cred.user.uid), { username, email: currentEmail }, { merge: true });
                }
            } else {
                let loginEmail = identifier;
                if (!identifier.includes('@')) {
                    const q = query(collection(db, 'users'), where("username", "==", identifier));
                    const snapshot = await getDocs(q);
                    if (snapshot.empty) throw new Error("Username not found.");
                    loginEmail = snapshot.docs[0].data().email;
                }
                await signInWithEmailAndPassword(auth, loginEmail, password);
            }
        } catch (err) {
            errorMsg.innerText = err.message;
            errorMsg.classList.remove('hidden');
        }
    };

    authGoogleBtn.onclick = async () => {
    errorMsg.classList.add('hidden');
    try {
        if (Capacitor.isNativePlatform()) {
            // 1. NATIVE CAPACITOR FLOW
            GoogleAuth.initialize({
              clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
              scopes: ['profile', 'email'],
              grantOfflineAccess: true,
            });

            const googleUser = await GoogleAuth.signIn();
            const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);

            if (auth.currentUser && auth.currentUser.isAnonymous) {
                await linkWithCredential(auth.currentUser, credential);
                window.location.reload();
            } else {
                await signInWithCredential(auth, credential);
            }
        } else {
            // 2. STANDARD WEB FLOW (for testing in browser)
            if (auth.currentUser && auth.currentUser.isAnonymous) {
                await linkWithPopup(auth.currentUser, googleProvider);
                window.location.reload(); 
            } else {
                await signInWithPopup(auth, googleProvider);
            }
        }
    } catch (err) {
        errorMsg.innerText = err.message;
        errorMsg.classList.remove('hidden');
    }
};

    authAnonBtn.onclick = async () => {
        errorMsg.classList.add('hidden');
        try {
            await signInAnonymously(auth);
        } catch (err) {
            errorMsg.innerText = err.message;
            errorMsg.classList.remove('hidden');
        }
    };
}