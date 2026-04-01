import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getAnalytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey:            'AIzaSyB7CCw42rCiCCmJq5-Qs5qt2OCE0KGg9qc',
  authDomain:        'guavafinance-7d405.firebaseapp.com',
  projectId:         'guavafinance-7d405',
  storageBucket:     'guavafinance-7d405.firebasestorage.app',
  messagingSenderId: '894739389977',
  appId:             '1:894739389977:web:e5d41214965c94fd175488',
  measurementId:     'G-QBVMJL914Q',
}

const app = initializeApp(firebaseConfig)

export const auth     = getAuth(app)
export const provider = new GoogleAuthProvider()

// Analytics only runs in browsers (not SSR/test environments)
if (typeof window !== 'undefined') {
  getAnalytics(app)
}
