export { initializeApp } from 'firebase/app';
export { getAuth, setPersistence, browserSessionPersistence, connectAuthEmulator, GoogleAuthProvider, signInWithCredential, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
export { getFirestore, connectFirestoreEmulator, collection, doc, getDoc, getDocs, query, where, orderBy, documentId, limit, startAfter, serverTimestamp, runTransaction, writeBatch, getCountFromServer, Timestamp, terminate } from 'firebase/firestore';
