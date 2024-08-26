'use client';

import '../globals.css';
import React, { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, remove } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

function Maintenance() {
  const [message, setMessage] = useState('');
  const [userCount, setUserCount] = useState(0);
  const usersRef = ref(database, 'users');

  // Fetch and update user count when the component mounts or after an operation
  useEffect(() => {
    updateUserCount();
  }, []);

  const updateUserCount = () => {
    get(usersRef).then((snapshot) => {
      if (snapshot.exists()) {
        const users = snapshot.val();
        setUserCount(Object.keys(users).length);
      } else {
        setUserCount(0); // Set to 0 if no users are found
      }
    }).catch((error) => {
      console.error('Error fetching users:', error);
    });
  };

  const removeAllUsers = () => {
    setMessage('Starting removal of all users...');
    var removedCount = 0;

    get(usersRef).then((snapshot) => {
      if (snapshot.exists()) {
        const users = snapshot.val();

        Object.entries(users).forEach(([uid]) => {
          remove(ref(database, `users/${uid}`))
            .then(() => {
              removedCount++;
              console.log(`Removed user with ID: ${uid}`);
            })
            .then(() => {
              setMessage(`Removal complete. Removed ${removedCount} users.`);
              updateUserCount(); // Update the user count after each removal
            })
            .catch((error) => {
              console.error(`Error removing user with ID: ${uid}`, error);
            });
        });
      } else {
        setMessage('No users found in the database.');
      }
    }).catch((error) => {
      console.error('Error fetching users:', error);
      setMessage('Error fetching users. Check console for details.');
    });
  };

  const removeInactiveUsers = () => {
    setMessage('Starting removal of inactive users...');
    
    get(usersRef).then((snapshot) => {
      if (snapshot.exists()) {
        const users = snapshot.val();
        const currentTime = new Date().getTime();
        let removedCount = 0;

        Object.entries(users).forEach(([uid, userData]) => {
          if (userData.lastActive) {
            const lastActiveTime = new Date(userData.lastActive).getTime();
            if (currentTime - lastActiveTime > 1 * 60 * 60 * 1000) { // 1 hour
              remove(ref(database, `users/${uid}`))
                .then(() => {
                  removedCount++;
                  console.log(`Removed inactive user with ID: ${uid}`);
                  updateUserCount(); // Update the user count after each removal
                })
                .catch((error) => {
                  console.error(`Error removing inactive user with ID: ${uid}`, error);
                });
            }
          }
        });

        setMessage(`Inactive user cleanup complete. Removed ${removedCount} users.`);
      } else {
        setMessage('No users found in the database.');
      }
    }).catch((error) => {
      console.error('Error fetching users:', error);
      setMessage('Error fetching users. Check console for details.');
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', color: '#ffffff' }}>
      <h3 style={{fontSize: '40px'}}>Maintenance Page</h3>
      <p>Click the buttons below to perform maintenance tasks on the database.</p>
      <br /><br />
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={removeInactiveUsers} 
          style={{ 
            padding: '10px 20px', 
            fontSize: '16px', 
            cursor: 'pointer', 
            backgroundColor: '#FFA500', // Orange color for removing inactive users
            color: '#ffffff',
            border: 'none', 
            borderRadius: '5px'
          }}>
          Remove Inactive Users (1hr+)
        </button>
        <br /><br />
        <button 
          onClick={removeAllUsers} 
          style={{ 
            padding: '10px 20px', 
            fontSize: '16px', 
            cursor: 'pointer', 
            backgroundColor: '#FF6347', // Red color for removing all users
            color: '#ffffff',
            border: 'none', 
            borderRadius: '5px'
          }}>
          Remove All Users
        </button>
      </div>
      {message && <p style={{ marginTop: '20px', fontWeight: 'bold' }}>{message}</p>}
      <p>Total users in the database: {userCount}</p>
    </div>
  );
}

export default Maintenance;
