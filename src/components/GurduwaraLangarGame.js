import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getDatabase, ref, set, onValue, push, remove } from 'firebase/database';

// // Firebase configuration
// const firebaseConfig = {
//   // Your Firebase configuration here
//   apiKey: "YOUR_API_KEY",
//   authDomain: "YOUR_AUTH_DOMAIN",
//   databaseURL: "YOUR_DATABASE_URL",
//   projectId: "YOUR_PROJECT_ID",
//   storageBucket: "YOUR_STORAGE_BUCKET",
//   messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
//   appId: "YOUR_APP_ID"
// };

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
const auth = getAuth(app);
const database = getDatabase(app);

const GRID_SIZE = 3;
const GAME_DURATION = 60; // seconds
const MAX_SEATED_PEOPLE = 7;

const preparationSteps = [
  { id: 'washHands', label: 'Wash hands 🧼' },
  { id: 'removeShoes', label: 'Remove shoes 👞' },
  { id: 'coverHead', label: 'Cover head 🧢' },
  { id: 'washAgain', label: 'Wash hands again before serving food 🧼' },
];

const avatarOptions = ['👨', '👩', '👳', '🧘‍♀️', '🧑'];

const foodItems = [
  { name: 'Roti', emoji: '🫓', points: 5 },
  { name: 'Chai', emoji: '🫖', points: 3 },
  { name: 'Chickpeas', emoji: '🥘', points: 4 },
  { name: 'Water', emoji: '💧', points: 2 },
  { name: 'Napkins', emoji: '🧻', points: 1 },
];

const GurdwaraLangarGame = () => {
  const [gameState, setGameState] = useState('loading');
  const [userId, setUserId] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [completedSteps, setCompletedSteps] = useState({});
  const [selectedFood, setSelectedFood] = useState(null);
  const [playerPosition, setPlayerPosition] = useState({ x: 1, y: 2 });
  const [seatedPeople, setSeatedPeople] = useState([]);
  const [sevaPoints, setSevaPoints] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [users, setUsers] = useState({});
  const [totalSevaPoints, setTotalSevaPoints] = useState(0);

  const allStepsCompleted = Object.values(completedSteps).length === preparationSteps.length;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        setGameState('setDisplayName');
      } else {
        signInAnonymously(auth).catch((error) => {
          console.error("Error during anonymous sign in:", error);
        });
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (userId && displayName) {
      const userRef = ref(database, `users/${userId}`);
      set(userRef, { displayName, sevaPoints: 0 });

      const usersRef = ref(database, 'users');
      onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        setUsers(data || {});
        const total = Object.values(data || {}).reduce((sum, user) => sum + user.sevaPoints, 0);
        setTotalSevaPoints(total);
      });

      return () => {
        remove(userRef);
      };
    }
  }, [userId, displayName]);

  useEffect(() => {
    if (gameState === 'playing') {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setGameState('gameOver');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      const seatedPeopleTimer = setInterval(() => {
        if (Math.random() < 0.4 && seatedPeople.length < MAX_SEATED_PEOPLE) {
          addSeatedPerson();
        }
      }, 500);

      return () => {
        clearInterval(timer);
        clearInterval(seatedPeopleTimer);
      };
    }
  }, [gameState, seatedPeople.length]);

  const addSeatedPerson = () => {
    setSeatedPeople((prev) => {
      const newPerson = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const isOccupied = prev.some(person => person.x === newPerson.x && person.y === newPerson.y);
      if (!isOccupied) {
        return [...prev, newPerson];
      }
      return prev;
    });
  };

  const movePlayer = (direction) => {
    setPlayerPosition((prev) => {
      let newPos = { ...prev };
      switch (direction) {
        case 'up':
          newPos.y = Math.max(0, prev.y - 1);
          break;
        case 'down':
          newPos.y = Math.min(GRID_SIZE - 1, prev.y + 1);
          break;
        case 'left':
          newPos.x = Math.max(0, prev.x - 1);
          break;
        case 'right':
          newPos.x = Math.min(GRID_SIZE - 1, prev.x + 1);
          break;
      }
      return newPos;
    });
  };

  const serveFood = () => {
    const personServed = seatedPeople.find(
      (person) => person.x === playerPosition.x && person.y === playerPosition.y
    );
    if (personServed) {
      const points = selectedFood.points;
      setSevaPoints((prev) => prev + points);
      setSeatedPeople((prev) =>
        prev.filter((person) => person !== personServed)
      );
      updateUserScore(points);
    }
  };

  const updateUserScore = (points) => {
    const userRef = ref(database, `users/${userId}`);
    set(userRef, { displayName, sevaPoints: sevaPoints + points });
  };

  const renderGrid = () => {
    let grid = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        let content = '⬜';
        if (x === playerPosition.x && y === playerPosition.y) {
          content = selectedAvatar;
        } else if (seatedPeople.some(person => person.x === x && person.y === y)) {
          content = '👥';
        }
        grid.push(
          <div key={`${x}-${y}`} className="w-16 h-16 border flex items-center justify-center text-2xl">
            {content}
          </div>
        );
      }
    }
    return grid;
  };

  const renderGameState = () => {
    switch (gameState) {
      case 'loading':
        return <div>Loading...</div>;
      case 'setDisplayName':
        return (
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4">Enter Your Display Name</h3>
            <Input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display Name"
              className="mb-4"
            />
            <Button onClick={() => setGameState('entrance')} disabled={!displayName}>
              Continue
            </Button>
          </div>
        );
      case 'entrance':
        return (
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4">Welcome to the Gurdwara, {displayName}</h3>
            <Button onClick={() => setGameState('selectAvatar')}>🚪🚪 Enter Gurdwara 🚪🚪</Button>
          </div>
        );
      case 'selectAvatar':
        return (
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4">Select your avatar</h3>
            <div className="flex justify-center space-x-4 mb-4">
              {avatarOptions.map((avatar, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`text-2xl p-2 ${selectedAvatar === avatar ? 'border-2 border-blue-500 rounded-full' : ''}`}
                >
                  {avatar}
                </button>
              ))}
            </div>
            <Button onClick={() => setGameState('preparation')} disabled={!selectedAvatar}>
              Continue
            </Button>
          </div>
        );
      case 'preparation':
        return (
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4">Prepare for Langar Seva 🙏</h3>
            {preparationSteps.map((step) => (
              <div key={step.id} className="flex items-center space-x-2 mb-2">
                <Checkbox
                  id={step.id}
                  checked={completedSteps[step.id] || false}
                  onCheckedChange={(checked) => 
                    setCompletedSteps(prev => ({ ...prev, [step.id]: checked }))
                  }
                />
                <label htmlFor={step.id}>{step.label}</label>
              </div>
            ))}
            <Button 
              onClick={() => setGameState('selectFood')} 
              disabled={!allStepsCompleted}
              className="mt-4"
            >
              Continue
            </Button>
          </div>
        );
      case 'selectFood':
        return (
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4">Select an item to serve</h3>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {foodItems.map((item) => (
                <Button 
                  key={item.name}
                  onClick={() => setSelectedFood(item)}
                  className={selectedFood === item ? 'bg-green-500' : ''}
                >
                  {item.emoji} {item.name}
                </Button>
              ))}
            </div>
            <Button 
              onClick={() => setGameState('playing')}
              disabled={!selectedFood}
            >
              Enter Langar Hall 🛕
            </Button>
          </div>
        );
      case 'playing':
        return (
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4">Serving in Langar Hall</h3>
            <div className="flex justify-between mb-4">
              <div>Your Seva Points: {sevaPoints}</div>
              <div>Time Left: {timeLeft}s</div>
            </div>
            <div>Total Seva Points: {totalSevaPoints}</div>
            <div>Active Users: {Object.keys(users).length}</div>
            <Progress value={(timeLeft / GAME_DURATION) * 100} className="mb-4" />
            <div className="grid grid-cols-3 gap-1 mb-4">
              {renderGrid()}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => movePlayer('left')}>Left</Button>
              <Button onClick={() => movePlayer('up')}>Up</Button>
              <Button onClick={() => movePlayer('right')}>Right</Button>
              <Button onClick={() => movePlayer('down')} className="col-start-2">Down</Button>
              <Button onClick={serveFood} className="col-span-3 bg-green-500 hover:bg-green-600">
                Serve {selectedFood.emoji}
              </Button>
            </div>
          </div>
        );
      case 'gameOver':
        const sortedUsers = Object.entries(users).sort((a, b) => b[1].sevaPoints - a[1].sevaPoints);
        return (
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">Seva Completed</h3>
            <p>Your final Seva Points: {sevaPoints}</p>
            <p>Total Seva Points: {totalSevaPoints}</p>
            <h4 className="text-lg font-semibold mt-4 mb-2">Leaderboard</h4>
            <ul>
              {sortedUsers.map(([id, user], index) => (
                <li key={id} className={id === userId ? 'font-bold' : ''}>
                  {index + 1}. {user.displayName}: {user.sevaPoints} points
                </li>
              ))}
            </ul>
            <Button 
              onClick={() => {
                setGameState('entrance');
                setSelectedAvatar(null);
                setCompletedSteps({});
                setSelectedFood(null);
                setPlayerPosition({ x: 1, y: 2 });
                setSeatedPeople([]);
                setSevaPoints(0);
                setTimeLeft(GAME_DURATION);
              }} 
              className="mt-4"
            >
              Play Again
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-center">Gurdwara Langar Seva 🪯</h2>
      {renderGameState()}
    </div>
  );
};

export default GurdwaraLangarGame;