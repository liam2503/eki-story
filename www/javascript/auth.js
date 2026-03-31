import { auth, db, googleProvider } from './firebase.js';
import { 
    onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
    signInAnonymously, linkWithCredential, linkWithPopup, EmailAuthProvider 
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { setCurrentUser, initProfileSync } from './user.js';
import { initFeedFrame } from './feed.js';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from "firebase/auth";
import { Capacitor } from '@capacitor/core';

let isSignUpMode = false;
let isInitialLoad = true;

export function showAuthScreen() {
    const authContainer = document.getElementById('auth-container');
    const authAnonBtn = document.getElementById('auth-anon-btn');
    const authCloseBtn = document.getElementById('auth-close-btn');
    const authUsername = document.getElementById('auth-username');
    const authIdentifier = document.getElementById('auth-identifier');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authToggleMode = document.getElementById('auth-toggle-mode');
    
    authContainer.classList.remove('hidden');
    void authContainer.offsetWidth;
    authContainer.classList.remove('translate-y-full');
    
    if (auth.currentUser && auth.currentUser.isAnonymous) {
        if (authCloseBtn) authCloseBtn.classList.remove('hidden');
        if (authAnonBtn) {
            authAnonBtn.classList.remove('hidden');
            authAnonBtn.innerText = "Continue as Guest";
        }
        
        isSignUpMode = false;
        if (authUsername) {
            authUsername.classList.add('hidden');
            authUsername.required = false;
        }
        if (authIdentifier) authIdentifier.placeholder = "Email Address";
        if (authSubmitBtn) authSubmitBtn.innerText = "Log In";
        if (authToggleMode) authToggleMode.innerText = "Need an account? Sign Up";
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
        const wasInitialLoad = isInitialLoad;
        isInitialLoad = false;

        if (user) {
            if (user.isAnonymous && wasInitialLoad) {
                authContainer.style.transition = 'none';
                authContainer.classList.remove('hidden', 'translate-y-full');
                void authContainer.offsetWidth;
                authContainer.style.transition = '';

                if (authCloseBtn) authCloseBtn.classList.remove('hidden');
                if (authAnonBtn) {
                    authAnonBtn.classList.remove('hidden');
                    authAnonBtn.innerText = "Continue as Guest";
                }
                
                isSignUpMode = false;
                if(authUsername) {
                    authUsername.classList.add('hidden');
                    authUsername.required = false;
                }
                if(authIdentifier) authIdentifier.placeholder = "Email Address";
                if(authSubmitBtn) authSubmitBtn.innerText = "Log In";
                if(authToggleMode) authToggleMode.innerText = "Need an account? Sign Up";
            } else if (!wasInitialLoad || !user.isAnonymous) {
                authContainer.classList.add('translate-y-full');
                setTimeout(() => {
                    if (authContainer.classList.contains('translate-y-full')) {
                        authContainer.classList.add('hidden');
                    }
                }, 500);
            }

            let username = user.isAnonymous ? "Guest" : "User";
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists() && userDoc.data().username) {
                    username = userDoc.data().username;
                } else if (!user.isAnonymous) {
                    username = user.displayName || user.email.split('@')[0];
                    await setDoc(doc(db, 'users', user.uid), { username: username, email: user.email }, { merge: true });
                }
            } catch (e) {
            }

            setCurrentUser(user.uid, username, user.isAnonymous);
            initProfileSync();
            initFeedFrame();

        } else {
            if (wasInitialLoad) {
                authContainer.style.transition = 'none';
                authContainer.classList.remove('hidden', 'translate-y-full');
                void authContainer.offsetWidth;
                authContainer.style.transition = '';
            } else {
                authContainer.classList.remove('hidden');
                void authContainer.offsetWidth;
                authContainer.classList.remove('translate-y-full');
            }

            if (authCloseBtn) authCloseBtn.classList.add('hidden');
            if (authAnonBtn) {
                authAnonBtn.classList.remove('hidden');
                authAnonBtn.innerText = "Play as Guest";
            }

            isSignUpMode = false;
            if(authUsername) {
                authUsername.classList.add('hidden');
                authUsername.required = false;
            }
            if(authIdentifier) authIdentifier.placeholder = "Email or Username";
            if(authSubmitBtn) authSubmitBtn.innerText = "Log In";
            if(authToggleMode) authToggleMode.innerText = "Need an account? Sign Up";
        }
    });

    authToggleMode.onclick = () => {
        isSignUpMode = !isSignUpMode;
        if (isSignUpMode) {
            authUsername.classList.remove('hidden');
            authUsername.required = true;
            authIdentifier.placeholder = "Email Address";
            if (auth.currentUser && auth.currentUser.isAnonymous) {
                authSubmitBtn.innerText = "Sign Up & Link Data";
                authToggleMode.innerText = "Already have an account? Log In";
            } else {
                authSubmitBtn.innerText = "Sign Up";
                authToggleMode.innerText = "Already have an account? Log In";
            }
        } else {
            authUsername.classList.add('hidden');
            authUsername.required = false;
            if (auth.currentUser && auth.currentUser.isAnonymous) {
                authIdentifier.placeholder = "Email Address";
                authSubmitBtn.innerText = "Log In";
            } else {
                authIdentifier.placeholder = "Email or Username";
                authSubmitBtn.innerText = "Log In";
            }
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
            if (auth.currentUser && auth.currentUser.isAnonymous) {
                authContainer.classList.add('translate-y-full');
                setTimeout(() => {
                    if (authContainer.classList.contains('translate-y-full')) {
                        authContainer.classList.add('hidden');
                    }
                }, 500);
            } else {
                await signInAnonymously(auth);
            }
        } catch (err) {
            errorMsg.innerText = err.message;
            errorMsg.classList.remove('hidden');
        }
    };
}