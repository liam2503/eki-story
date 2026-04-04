import { auth, db, googleProvider } from './firebase.js';
import { 
    onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
    signInAnonymously, linkWithCredential, linkWithPopup, EmailAuthProvider,
    GoogleAuthProvider, signInWithCredential, signInWithPopup, signInWithRedirect, deleteUser, signOut, sendPasswordResetEmail,
    getRedirectResult
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { setCurrentUser, initProfileSync } from './user.js';
import { initFeedFrame } from './feed.js';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { Capacitor } from '@capacitor/core';
import { applyTranslations, getLanguage, setLanguage } from './i18n.js';

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

    const errorMsg = document.getElementById('auth-error-message');
    getRedirectResult(auth).then((result) => {
        if (result) console.log("Redirect success:", result.user);
    }).catch((error) => {
        console.error("Redirect failed:", error);
        if (errorMsg) {
            errorMsg.innerText = "Google Sign-In Error: " + error.message;
            errorMsg.classList.remove('hidden');
        }
    });
    
    initAuthLanguageSelector();

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
    const authForgotBtn = document.getElementById('auth-forgot-password');

    // Strip non-alphanumeric characters instantly as the user types

    if (authUsername) {
        authUsername.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
        });
    }

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
            }

            let username = user.isAnonymous ? "Guest" : "User";
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                
                if (userDoc.exists() && userDoc.data().username) {
                    username = userDoc.data().username;
                    
                    if (!wasInitialLoad || !user.isAnonymous) {
                        authContainer.classList.add('translate-y-full');
                        setTimeout(() => {
                            if (authContainer.classList.contains('translate-y-full')) {
                                authContainer.classList.add('hidden');
                            }
                        }, 500);
                    }
                    
                    setCurrentUser(user.uid, username, user.isAnonymous);
                    initProfileSync();
                    initFeedFrame();
                    window.dispatchEvent(new CustomEvent('authResolved'));

                } else if (!user.isAnonymous) {
                    const emailQuery = query(collection(db, 'users'), where("email", "==", user.email));
                    const emailSnap = await getDocs(emailQuery);
                    
                    let isDuplicateEmail = false;
                    emailSnap.forEach(docSnap => {
                        if (docSnap.id !== user.uid) isDuplicateEmail = true;
                    });

                    if (isDuplicateEmail) {
                        try { await deleteUser(user); } catch(e) {}
                        await signOut(auth);
                        if (errorMsg) {
                            errorMsg.innerText = "An account with this email already exists. Please log in with your original method.";
                            errorMsg.classList.remove('hidden');
                        }
                        window.dispatchEvent(new CustomEvent('authResolved'));
                        return;
                    }

                    if (isSignUpMode && authUsername && authUsername.value.trim()) {
                        const proposedName = authUsername.value.trim();
                        const nameQuery = query(collection(db, 'users'), where("username", "==", proposedName));
                        const nameSnap = await getDocs(nameQuery);
                        
                        if (!nameSnap.empty) {
                            try { await deleteUser(user); } catch(e) {}
                            await signOut(auth);
                            if (errorMsg) {
                                errorMsg.innerText = "This username is already taken. Please try another one.";
                                errorMsg.classList.remove('hidden');
                            }
                            window.dispatchEvent(new CustomEvent('authResolved'));
                            return;
                        }

                        username = proposedName;
                        await setDoc(doc(db, 'users', user.uid), { username: username, email: user.email }, { merge: true });
                        
                        authContainer.classList.add('translate-y-full');
                        setTimeout(() => {
                            if (authContainer.classList.contains('translate-y-full')) authContainer.classList.add('hidden');
                        }, 500);
                        
                        setCurrentUser(user.uid, username, user.isAnonymous);
                        initProfileSync();
                        initFeedFrame();
                        window.dispatchEvent(new CustomEvent('authResolved'));
                    } else {
                        authContainer.style.transition = 'none';
                        authContainer.classList.remove('hidden', 'translate-y-full');
                        void authContainer.offsetWidth;
                        authContainer.style.transition = '';

                        isSignUpMode = true;
                        if(authUsername) {
                            authUsername.classList.remove('hidden');
                            authUsername.required = true;
                            authUsername.placeholder = "Choose a Username";
                        }
                        
                        if(authIdentifier) {
                            authIdentifier.classList.add('hidden');
                            authIdentifier.required = false;
                        }
                        if(authPassword) {
                            authPassword.classList.add('hidden');
                            authPassword.required = false;
                        }
                        if(authGoogleBtn) authGoogleBtn.classList.add('hidden');
                        if(authAnonBtn) authAnonBtn.classList.add('hidden');
                        if(authToggleMode) authToggleMode.classList.add('hidden');
                        
                        const orDivider = authGoogleBtn ? authGoogleBtn.previousElementSibling : null;
                        if (orDivider && orDivider.classList.contains('flex')) {
                            orDivider.classList.add('hidden');
                        }

                        const titleEl = document.querySelector('#auth-container h1');
                        if(titleEl) titleEl.innerText = "Complete Profile";
                        
                        if(authSubmitBtn) authSubmitBtn.innerText = "Save Username";
                        authForm.onsubmit = async (e) => {
                            e.preventDefault();
                            if(errorMsg) errorMsg.classList.add('hidden');
                            
                            const chosenName = authUsername.value.trim();
                            if (!chosenName || chosenName.length < 6) {
                                if(errorMsg) {
                                    errorMsg.innerText = "Username must be at least 6 characters long.";
                                    errorMsg.classList.remove('hidden');
                                }
                                return;
                            }

                            const nameQuery = query(collection(db, 'users'), where("username", "==", chosenName));
                            const nameSnap = await getDocs(nameQuery);
                            if (!nameSnap.empty) {
                                if(errorMsg) {
                                    errorMsg.innerText = "This username is already taken. Please choose another one.";
                                    errorMsg.classList.remove('hidden');
                                }
                                return;
                            }

                            await setDoc(doc(db, 'users', user.uid), { username: chosenName, email: user.email }, { merge: true });
                            window.location.reload();
                        };
                        
                        return;
                    }
                } else {
                    setCurrentUser(user.uid, username, user.isAnonymous);
                    initProfileSync();
                    initFeedFrame();
                    window.dispatchEvent(new CustomEvent('authResolved'));
                }
            } catch (e) {
                console.error("Post-Login Database Error:", e);
                
                authContainer.style.transition = 'none';
                authContainer.classList.remove('hidden', 'translate-y-full');
                void authContainer.offsetWidth;
                authContainer.style.transition = '';
                
                if (errorMsg) {
                    errorMsg.innerText = "Database connection error during login: " + e.message;
                    errorMsg.classList.remove('hidden');
                }
                
                window.dispatchEvent(new CustomEvent('authResolved'));
            }

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
            window.dispatchEvent(new CustomEvent('authResolved'));
        }
    });

    authToggleMode.onclick = () => {
        isSignUpMode = !isSignUpMode;
        if (isSignUpMode) {
            if (authForgotBtn) authForgotBtn.classList.add('hidden');
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
            if (authForgotBtn) authForgotBtn.classList.remove('hidden');
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
                if (username.length < 6) throw new Error("Username must be at least 6 characters long.");
                
                let currentEmail = identifier;
                if (!currentEmail.includes('@')) throw new Error("Please enter a valid email address for signup.");
                const emailQuery = query(collection(db, 'users'), where("email", "==", currentEmail));
                const emailSnap = await getDocs(emailQuery);
                if (!emailSnap.empty) throw new Error("An account with this email already exists.");

                const userQuery = query(collection(db, 'users'), where("username", "==", username));
                const userSnap = await getDocs(userQuery);
                if (!userSnap.empty) throw new Error("This username is already taken.");

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
        
        if (isSignUpMode) {
            const currentUname = authUsername.value.trim();
            if (!currentUname) {
                errorMsg.innerText = "Please enter a username first to sign up with Google.";
                errorMsg.classList.remove('hidden');
                return;
            }
            if (currentUname.length < 6) {
                errorMsg.innerText = "Username must be at least 6 characters long.";
                errorMsg.classList.remove('hidden');
                return;
            }
        }

        try {
            if (Capacitor.isNativePlatform()) {
                await SocialLogin.initialize({
                    google: {
                        webClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
                        iOSClientId: '30607912305-8sjnev1fl3v0v33vesir7idsqdgfs9bc.apps.googleusercontent.com' 
                    }
                });

                const googleUser = await SocialLogin.login({
                    provider: 'google',
                    options: {
                        scopes: ['profile', 'email']
                    }
                });
                
                const credential = GoogleAuthProvider.credential(googleUser.result.idToken);

                // ONLY link if the user is in Sign Up mode
                if (auth.currentUser && auth.currentUser.isAnonymous && isSignUpMode) {
                    await linkWithCredential(auth.currentUser, credential);
                    window.location.reload();
                } else {
                    // Otherwise, just log in (this abandons the guest session)
                    await signInWithCredential(auth, credential);
                }
            } else {
                // ONLY link if the user is in Sign Up mode
                if (auth.currentUser && auth.currentUser.isAnonymous && isSignUpMode) {
                    try {
                        await linkWithPopup(auth.currentUser, googleProvider);
                        window.location.reload();
                    } catch (linkErr) {
                        if (linkErr.code === 'auth/credential-already-in-use') {
                            throw new Error("This Google account is already registered. To access it, switch to 'Log In' below (your Guest data will be left behind).");
                        } else {
                            throw linkErr;
                        }
                    }
                } else {
                    // Otherwise, just log in normally
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

    if (authForgotBtn) {
        authForgotBtn.onclick = async () => {
            errorMsg.classList.add('hidden');
            const identifier = authIdentifier.value.trim();
            
            if (!identifier) {
                errorMsg.innerText = "Please enter your email address in the field above to reset your password.";
                errorMsg.classList.remove('hidden');
                return;
            }
            
            if (!identifier.includes('@')) {
                errorMsg.innerText = "Please enter a valid email address to reset your password.";
                errorMsg.classList.remove('hidden');
                return;
            }

            try {
                await sendPasswordResetEmail(auth, identifier);
                
                // Temporarily change the text to show success without an alert popup
                const originalText = authForgotBtn.innerText;
                authForgotBtn.innerText = "Reset Email Sent!";
                authForgotBtn.classList.add('text-green-500');
                
                setTimeout(() => {
                    authForgotBtn.innerText = originalText;
                    authForgotBtn.classList.remove('text-green-500');
                }, 4000);
                
            } catch (err) {
                errorMsg.innerText = err.message;
                errorMsg.classList.remove('hidden');
            }
        };
    }
}

export function initAuthLanguageSelector() {
    const authLangEnBtn = document.getElementById('auth-lang-en-btn');
    const authLangJaBtn = document.getElementById('auth-lang-ja-btn');

    function updateAuthLangUI(lang) {
        if (lang === 'en') {
            authLangEnBtn.classList.add('bg-[#B2FF59]', 'text-black');
            authLangEnBtn.classList.remove('bg-transparent', 'text-gray-500');
            authLangJaBtn.classList.add('bg-transparent', 'text-gray-500');
            authLangJaBtn.classList.remove('bg-[#B2FF59]', 'text-black');
        } else {
            authLangJaBtn.classList.add('bg-[#B2FF59]', 'text-black');
            authLangJaBtn.classList.remove('bg-transparent', 'text-gray-500');
            authLangEnBtn.classList.add('bg-transparent', 'text-gray-500');
            authLangEnBtn.classList.remove('bg-[#B2FF59]', 'text-black');
        }
    }

    if (authLangEnBtn && authLangJaBtn) {
        updateAuthLangUI(getLanguage());
        applyTranslations();
        
        authLangEnBtn.onclick = () => {
            if (getLanguage() !== 'en') {
                setLanguage('en');
                updateAuthLangUI('en');
            }
        };
        
        authLangJaBtn.onclick = () => {
            if (getLanguage() !== 'ja') {
                setLanguage('ja');
                updateAuthLangUI('ja');
            }
        };
    }
}