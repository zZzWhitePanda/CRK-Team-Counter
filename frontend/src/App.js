import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Cookie characters list (expand as needed)
const CHARACTERS = [
  'Dark Cacao', 'Financier', 'Captain Caviar', 'Cream Unicorn', 'Eclair',
  'Black Pearl', 'Oyster', 'Clotted Cream', 'Frost Queen', 'Sea Fairy',
  'Cotton', 'Vanilla', 'Pure Vanilla', 'Golden Cheese', 'White Lily',
  'Dark Choco', 'Hollyberry', 'Wildberry', 'Caramel Arrow', 'Affogato',
  'Espresso', 'Latte', 'Madeleine', 'Pomegranate', 'Licorice'
];

const GEAR_TYPES = [
  'Swift Chocolate', 'Solid Almond', 'Searing Raspberry', 
  'Healthy Cheese', 'Resilient Peanut'
];

function App() {
  const [opponentTeam, setOpponentTeam] = useState([]);
  const [opponentGear, setOpponentGear] = useState({});
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Build submission form
  const [showSubmit, setShowSubmit] = useState(false);
  const [counterTeam, setCounterTeam] = useState([]);
  const [counterGear, setCounterGear] = useState({});
  const [description, setDescription] = useState('');

  // Top builds
  const [topBuilds, setTopBuilds] = useState([]);

  useEffect(() => {
    fetchTopBuilds();
  }, []);

  const fetchTopBuilds = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/top-builds?limit=5`);
      setTopBuilds(response.data);
    } catch (error) {
      console.error('Error fetching top builds:', error);
    }
  };

  const handleAddCharacter = (team, setTeam) => {
    if (team.length < 5) {
      setTeam([...team, '']);
    }
  };

  const handleCharacterChange = (index, value, team, setTeam) => {
    const newTeam = [...team];
    newTeam[index] = value;
    setTeam(newTeam);
  };

  const handleRemoveCharacter = (index, team, setTeam) => {
    setTeam(team.filter((_, i) => i !== index));
  };

  const handleLookup = async () => {
    if (opponentTeam.filter(c => c).length === 0) {
      alert('Please add at least one opponent character');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/lookup`, {
        opponent_team: opponentTeam.filter(c => c),
        opponent_gear: opponentGear
      });
      setRecommendations(response.data);
    } catch (error) {
      console.error('Error looking up counters:', error);
      alert('Error connecting to server. Make sure backend is running.');
    }
    setLoading(false);
  };

  const handleSubmitBuild = async () => {
    if (opponentTeam.filter(c => c).length === 0 || counterTeam.filter(c => c).length === 0) {
      alert('Please fill in both opponent and counter teams');
      return;
    }

    try {
      await axios.post(`${API_URL}/api/submit-build`, {
        opponent_team: opponentTeam.filter(c => c),
        counter_team: counterTeam.filter(c => c),
        gear_setup: counterGear,
        description
      });
      alert('Build submitted successfully!');
      setShowSubmit(false);
      setCounterTeam([]);
      setCounterGear({});
      setDescription('');
      fetchTopBuilds();
    } catch (error) {
      console.error('Error submitting build:', error);
      alert('Error submitting build');
    }
  };

  const handleVote = async (buildId) => {
    try {
      await axios.post(`${API_URL}/api/vote`, {
        build_id: buildId,
        vote_type: 'like'
      });
      fetchTopBuilds();
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  return (
    <div className="App">
      <header className="header">
        <h1>🍪 CRK Counter-Pick System</h1>
        <p>Find the perfect counter to dominate Arena</p>
      </header>

      <div className="container">
        {/* Opponent Team Input */}
        <section className="card">
          <h2>Opponent Team</h2>
          <div className="team-builder">
            {opponentTeam.map((char, index) => (
              <div key={index} className="character-row">
                <select
                  value={char}
                  onChange={(e) => handleCharacterChange(index, e.target.value, opponentTeam, setOpponentTeam)}
                  className="character-select"
                >
                  <option value="">Select Character</option>
                  {CHARACTERS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select
                  value={opponentGear[char] || ''}
                  onChange={(e) => setOpponentGear({...opponentGear, [char]: e.target.value})}
                  className="gear-select"
                >
                  <option value="">Gear Type</option>
                  {GEAR_TYPES.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <button onClick={() => handleRemoveCharacter(index, opponentTeam, setOpponentTeam)} className="btn-remove">
                  ✕
                </button>
              </div>
            ))}
          </div>
          
          {opponentTeam.length < 5 && (
            <button onClick={() => handleAddCharacter(opponentTeam, setOpponentTeam)} className="btn-add">
              + Add Character
            </button>
          )}
          
          <button onClick={handleLookup} className="btn-primary" disabled={loading}>
            {loading ? 'Searching...' : '🔍 Find Counters'}
          </button>
        </section>

        {/* Recommendations Display */}
        {recommendations && (
          <section className="card">
            <h2>Recommended Counters</h2>
            
            {recommendations.meta_counters.length > 0 && (
              <div className="recommendations">
                <h3>📊 Meta Teams</h3>
                {recommendations.meta_counters.map((team, idx) => (
                  <div key={idx} className="recommendation-item">
                    <h4>{team.team_name} <span className="win-rate">{team.win_rate}% WR</span></h4>
                    <div className="team-display">
                      {JSON.parse(team.characters).map((char, i) => (
                        <span key={i} className="character-badge">{char}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {recommendations.community_builds.length > 0 && (
              <div className="recommendations">
                <h3>👥 Community Builds</h3>
                {recommendations.community_builds.map((build, idx) => (
                  <div key={idx} className="recommendation-item">
                    <div className="build-header">
                      <span className="build-author">By {build.user_id.substring(0, 8)}...</span>
                      <button onClick={() => handleVote(build.id)} className="btn-vote">
                        👍 {build.likes}
                      </button>
                    </div>
                    <div className="team-display">
                      {JSON.parse(build.counter_team).map((char, i) => (
                        <span key={i} className="character-badge">{char}</span>
                      ))}
                    </div>
                    {build.description && <p className="build-desc">{build.description}</p>}
                  </div>
                ))}
              </div>
            )}

            {recommendations.meta_counters.length === 0 && recommendations.community_builds.length === 0 && (
              <p className="no-results">No counters found. Try submitting your own build!</p>
            )}
          </section>
        )}

        {/* Submit Build Section */}
        <section className="card">
          <button onClick={() => setShowSubmit(!showSubmit)} className="btn-secondary">
            {showSubmit ? '✕ Cancel' : '➕ Submit Your Counter Build'}
          </button>

          {showSubmit && (
            <div className="submit-form">
              <h3>Your Counter Team</h3>
              <div className="team-builder">
                {counterTeam.map((char, index) => (
                  <div key={index} className="character-row">
                    <select
                      value={char}
                      onChange={(e) => handleCharacterChange(index, e.target.value, counterTeam, setCounterTeam)}
                      className="character-select"
                    >
                      <option value="">Select Character</option>
                      {CHARACTERS.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <select
                      value={counterGear[char] || ''}
                      onChange={(e) => setCounterGear({...counterGear, [char]: e.target.value})}
                      className="gear-select"
                    >
                      <option value="">Gear Type</option>
                      {GEAR_TYPES.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    <button onClick={() => handleRemoveCharacter(index, counterTeam, setCounterTeam)} className="btn-remove">
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {counterTeam.length < 5 && (
                <button onClick={() => handleAddCharacter(counterTeam, setCounterTeam)} className="btn-add">
                  + Add Character
                </button>
              )}

              <textarea
                placeholder="Describe your strategy (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="description-input"
                rows="3"
              />

              <button onClick={handleSubmitBuild} className="btn-primary">
                Submit Build
              </button>
            </div>
          )}
        </section>

        {/* Top Community Builds */}
        <section className="card">
          <h2>🔥 Top Community Builds</h2>
          {topBuilds.map((build, idx) => (
            <div key={idx} className="top-build-item">
              <div className="build-header">
                <span className="build-rank">#{idx + 1}</span>
                <span className="build-author">By {build.user_id.substring(0, 8)}...</span>
                <button onClick={() => handleVote(build.id)} className="btn-vote">
                  👍 {build.likes}
                </button>
              </div>
              <div className="build-teams">
                <div>
                  <strong>Opponent:</strong>
                  <div className="team-display">
                    {JSON.parse(build.opponent_team).map((char, i) => (
                      <span key={i} className="character-badge opponent">{char}</span>
                    ))}
                  </div>
                </div>
                <div className="arrow">→</div>
                <div>
                  <strong>Counter:</strong>
                  <div className="team-display">
                    {JSON.parse(build.counter_team).map((char, i) => (
                      <span key={i} className="character-badge">{char}</span>
                    ))}
                  </div>
                </div>
              </div>
              {build.description && <p className="build-desc">{build.description}</p>}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

export default App;
