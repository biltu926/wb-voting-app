import React, { useState, useEffect } from 'react';
import { Vote, Mail, Lock } from 'lucide-react';
import './App.css';
import ArrowDown from './assets/arrow-down.png';

const PARTIES = [
  { id: 'tmc', name: 'TMC' },
  { id: 'bjp', name: 'BJP' },
  { id: 'cpim', name: 'CPIM' },
  { id: 'others', name: 'Others' }
];

const REACT_APP_API_BASE_URL = 'https://tex6qp534aw7jmp4voif5vejke0abusv.lambda-url.ap-south-1.on.aws';
const POLL_ID = 'wb-2026';

export default function VotingApp() {
  const [email, setEmail] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [votes, setVotes] = useState({});
  const [error, setError] = useState('');
  const [votedParty, setVotedParty] = useState(null);
  const [loading, setLoading] = useState(true);

  console.log("Voted party:", votedParty);

  /* -------------------- Helper functions -------------------- */
  function getDeviceId() {
    let id = localStorage.getItem("device_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("device_id", id);
      window.name = id;
      indexedDB.open("vote-db").onupgradeneeded = e => {
        e.target.result.createObjectStore("meta");
      };
    }
    return id;
  }


  /* -------------------- API HELPERS -------------------- */

  const api = async (url, options = {}) => {
    const fullUrl = `${REACT_APP_API_BASE_URL}${url}`
    const voteToken = localStorage.getItem("vote_token");
    const headers = {
      "Content-Type": "application/json",
      ...(voteToken && { "X-Vote-Token": voteToken })
    };

    const res = await fetch(fullUrl, {
      credentials: "include",
      headers,
      ...options
    });

    const data = await res.json();
    
    // Store vote token if returned
    if (data.voteToken) {
      localStorage.setItem("vote_token", data.voteToken);
    }
    
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
  };

  /* -------------------- INIT POLL -------------------- */

  useEffect(() => {
    (async () => {
      try {
        await api("/api/poll/init", {
          method: "POST",
          body: JSON.stringify({
            pollId: POLL_ID,
            userHash: "abcd123",
            deviceId: getDeviceId()
          })
        });
      } catch (e) {
        // 403 = already voted
        if (e.message.includes("already voted")) {
          setHasVoted(true);
          fetchResults(); // Only fetch results if already voted
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* -------------------- FETCH RESULTS -------------------- */

  const fetchResults = async () => {
    try {
      const result = await api(`/api/poll/result?pollId=${POLL_ID}`);
      const mapped = {};
      result[0].parties.forEach(p => (mapped[p.name] = p.votes));
      setVotes(mapped);
    } catch (e) {
      setError("Failed to load poll results");
    }
  };

  /* -------------------- CAST VOTE -------------------- */

  const handleVote = async (partyId) => {
    try {
      await api("/api/poll/vote", {
        method: "POST",
        body: JSON.stringify({
          pollId: POLL_ID,
          partyName: partyId
        })
      });

      setHasVoted(true);
      setVotedParty(partyId);
      await fetchResults(); // Fetch results AFTER voting
    } catch (e) {
      setError(e.message);
    }
  };

  /* -------------------- UI HELPERS -------------------- */

   const totalVotes = Object.values(votes).reduce((a, b) => a + b, 0);
   const percent = (v) => totalVotes ? ((v / totalVotes) * 100).toFixed(1) : 0;
 
   if (loading) return <div className="loading">Loading poll…</div>;
 
   return (
     <div className="app-container">
       <div className="voting-card">
 
         {/* HEADER */}
         <div className="card-header">
           <Vote size={36} />
           <h1>West Bengal Public Mandate – 2026</h1>
           <p>One vote per person · Completely anonymous . Cast your vote below.</p>
           <div className="important-note" role="note" aria-live="polite">
            <strong>Important:</strong> If you see Token not found error, please close the tab and try from another device.
          </div>
           <img src={ArrowDown} alt="" aria-hidden="true" className="down-icon" />
            <span className="sr-only">down arrow</span>
         </div>

         <div className="card-content">
 
         {/* ERROR */}
         {error && <p className="error-message">{error}</p>}
 
         {/* VOTING */}
         {!hasVoted ? (
           <div className="button-grid">
             {PARTIES.map(p => (
               <button
                 key={p.id}
                 onClick={() => handleVote(p.id)}
                 className={`vote-button ${p.id}`}
               >
                 {p.name}
               </button>
             ))}
           </div>
         ) : (
           <div className="voted-banner">
             <Lock size={24} />
             <p>Thanks for taking part in this mandate. You've voted for</p>
             {votedParty && <strong>{votedParty.toUpperCase()}</strong>}
           </div>
         )}
 
         {/* RESULTS - Only show after voting */}
         {hasVoted && (
           <div className="results">
             <h2>Current Results</h2>
   
             {PARTIES.map(p => (
               <div key={p.id} className="result-card">
                 <div className="result-header">
                   <span>{p.name}</span>
                   <span>{votes[p.id] || 0} ({percent(votes[p.id] || 0)}%)</span>
                 </div>
                 <div className="progress-bar">
                   <div
                     className={`progress-fill ${p.id}`}
                     style={{ width: `${percent(votes[p.id] || 0)}%` }}
                   />
                 </div>
               </div>
             ))}
   
             <p className="total-votes">Total votes: {totalVotes}</p>
           </div>
         )}
       </div>
       </div>
     </div>
   );
 }