const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

exports.acceptFriendRequest = functions.https.onCall(async (data, context) => {
    // 1. Ensure the user is actually logged in
    if (!context.auth) {
        throw new functions.https.HttpsError(
            'unauthenticated', 
            'You must be logged in to accept friend requests.'
        );
    }

    const { requestId, fromId, toId } = data;

    // 2. CRITICAL SECURITY CHECK: Ensure the person clicking "accept" 
    // is actually the person the request was sent to.
    if (context.auth.uid !== toId) {
        throw new functions.https.HttpsError(
            'permission-denied', 
            'You can only accept friend requests sent to your account.'
        );
    }

    try {
        // 3. Use a batch write so all three database actions succeed or fail together
        const batch = db.batch();

        // Add User B to User A's friends list
        const fromRef = db.collection('users').doc(fromId);
        batch.update(fromRef, { 
            friends: admin.firestore.FieldValue.arrayUnion(toId) 
        });

        // Add User A to User B's friends list
        const toRef = db.collection('users').doc(toId);
        batch.update(toRef, { 
            friends: admin.firestore.FieldValue.arrayUnion(fromId) 
        });

        // Delete the pending friend request document
        const reqRef = db.collection('friend_requests').doc(requestId);
        batch.delete(reqRef);

        // Execute the batch
        await batch.commit();

        return { success: true };
    } catch (error) {
        console.error("Error accepting friend request:", error);
        throw new functions.https.HttpsError(
            'internal', 
            'An error occurred while processing the request.'
        );
    }
});