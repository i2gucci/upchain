import { useState, useEffect } from 'react';
import { Plus, Download, Upload } from 'lucide-react';
import { SessionSelector } from './components/SessionSelector';
import { TradeForm } from './components/TradeForm';
import { TradeList } from './components/TradeList';
import { TradeReport } from './components/TradeReport';
import { QuickAddModal } from './components/QuickAddModal';
import { Trade, Session } from './types';
import { loadState, saveState, createSession } from './storage';
import './App.css';

function App() {
  const [state, setState] = useState(loadState());
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const activeSession = state.sessions.find(
    (s) => s.id === state.activeSessionId
  );

  const handleCreateSession = (session: Session) => {
    setState({
      sessions: [...state.sessions, session],
      activeSessionId: session.id,
    });
  };

  const handleSelectSession = (sessionId: string) => {
    setState({ ...state, activeSessionId: sessionId });
    setSelectedTrade(null);
  };

  const handleDeleteSession = (sessionId: string) => {
    const updatedSessions = state.sessions.filter((s) => s.id !== sessionId);
    const newActiveId = sessionId === state.activeSessionId
      ? (updatedSessions.length > 0 ? updatedSessions[0].id : null)
      : state.activeSessionId;

    setState({
      sessions: updatedSessions,
      activeSessionId: newActiveId,
    });
    setSelectedTrade(null);
  };

  const handleAddTrade = (trade: Trade) => {
    if (!activeSession) return;

    const updatedSessions = state.sessions.map((s) =>
      s.id === activeSession.id
        ? { ...s, trades: [...s.trades, trade] }
        : s
    );

    setState({ ...state, sessions: updatedSessions });
    setSelectedTrade(trade);
  };

  const handleQuickAddTrade = (trade: Trade) => {
    if (!state.activeSessionId) {
      alert('Please select or create a session first');
      return;
    }
    handleAddTrade(trade);
  };

  const handleUpdateTrade = (updatedTrade: Trade) => {
    if (!activeSession) return;

    const updatedSessions = state.sessions.map((s) =>
      s.id === activeSession.id
        ? {
            ...s,
            trades: s.trades.map((t) =>
              t.id === updatedTrade.id ? updatedTrade : t
            ),
          }
        : s
    );

    setState({ ...state, sessions: updatedSessions });
    setSelectedTrade(updatedTrade);
  };

  const handleDeleteTrade = (tradeId: string) => {
    if (!activeSession) return;

    const updatedSessions = state.sessions.map((s) =>
      s.id === activeSession.id
        ? {
            ...s,
            trades: s.trades.filter((t) => t.id !== tradeId),
          }
        : s
    );

    setState({ ...state, sessions: updatedSessions });
    setSelectedTrade(null);
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trade-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        
        // Validate data structure
        if (!importedData.sessions || !Array.isArray(importedData.sessions)) {
          alert('Invalid backup file format');
          return;
        }

        // Confirm before overwriting
        if (state.sessions.length > 0) {
          const confirmed = window.confirm(
            'This will replace all your current data. Are you sure?\n\n' +
            'Tip: Export your current data first as a backup!'
          );
          if (!confirmed) return;
        }

        setState(importedData);
        alert('Data imported successfully!');
      } catch (error) {
        console.error('Import error:', error);
        alert('Failed to import data. Please check the file format.');
      }
    };
    reader.readAsText(file);
    
    // Reset input so the same file can be imported again
    event.target.value = '';
  };

  const handleCreateNewSession = () => {
    const now = new Date();
    const estDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const month = String(estDate.getMonth() + 1).padStart(2, '0');
    const day = String(estDate.getDate()).padStart(2, '0');
    const year = estDate.getFullYear();
    const dateString = `${month}.${day}.${year}`;
    
    const session = createSession(dateString, dateString);
    handleCreateSession(session);
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="app-header">
          <h1>Trade Tracker</h1>
          <p className="app-subtitle">Document & Reflect</p>
          <div className="import-export-controls">
            <button 
              type="button"
              className="btn-icon-with-text" 
              onClick={handleExportData}
              title="Export all data as JSON backup"
            >
              <Download size={16} />
              <span>Export</span>
            </button>
            <label className="btn-icon-with-text" title="Import data from JSON backup">
              <Upload size={16} />
              <span>Import</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        </div>
        <SessionSelector
          sessions={state.sessions}
          activeSessionId={state.activeSessionId}
          onSelectSession={handleSelectSession}
          onCreateSession={handleCreateSession}
          onDeleteSession={handleDeleteSession}
        />
      </aside>

      <main className="main-content">
        {selectedTrade ? (
          <TradeReport
            trade={selectedTrade}
            onBack={() => setSelectedTrade(null)}
            onUpdate={handleUpdateTrade}
            onDelete={handleDeleteTrade}
          />
        ) : (
          <>
            {activeSession ? (
              <>
                <div className="content-header">
                  <div>
                    <h2>{activeSession.name}</h2>
                    <p className="session-date">{activeSession.date}</p>
                  </div>
                </div>
                <TradeForm onAddTrade={handleAddTrade} />
                <TradeList
                  trades={activeSession.trades}
                  onSelectTrade={setSelectedTrade}
                  onUpdateTrade={handleUpdateTrade}
                  onDeleteTrade={handleDeleteTrade}
                />
              </>
            ) : (
              <div className="empty-state-large">
                <h2>Welcome to Trade Tracker</h2>
                <p>Create a session to start documenting your trades</p>
                <button 
                  type="button"
                  className="btn-primary btn-large"
                  onClick={handleCreateNewSession}
                >
                  <Plus size={20} />
                  New Session
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Action Button */}
      {state.activeSessionId && (
        <button 
          className="fab" 
          onClick={() => setIsQuickAddOpen(true)}
          title="Quick Add Trade"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Quick Add Modal */}
      <QuickAddModal 
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onAddTrade={handleQuickAddTrade}
      />
    </div>
  );
}

export default App;
