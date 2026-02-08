"use client";

import { useState, useEffect } from 'react';
import Navbar from "../components/Navbar";

export default function Agent() {
  const [isLoading, setIsLoading] = useState(true);
  const [agentStatus, setAgentStatus] = useState('initializing');
  const [logs, setLogs] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [arbitrageLoading, setArbitrageLoading] = useState(false);
  const [sentimentLoading, setSentimentLoading] = useState(false);
  const [psaLoading, setPsaLoading] = useState(false);
  const [fmvLoading, setFmvLoading] = useState(false);
  const [certNumber, setCertNumber] = useState('');
  const [arbitrageData, setArbitrageData] = useState<any>(null);
  const [sentimentData, setSentimentData] = useState<any>(null);
  const [fmvData, setFmvData] = useState<any>(null);
  const [psaData, setPsaData] = useState<any>(null);

  useEffect(() => {
    // Agent initialization simulation
    const initializeAgent = async () => {
      setAgentStatus('initializing');
      addLog('🤖 Initializing 4-Agent System...');
      addLog('👻 Poke-Arbitrage Agent (Phantom) starting...');
      addLog('🐉 Market Sentiment Guardian (Dragonite) starting...');
      addLog('🎵 PSA POP Agent (Sylveon) starting...');
      addLog('🔥 FMV Agent (Charizard) starting...');
      
      // After 1 second
      setTimeout(() => {
        setAgentStatus('connecting');
        addLog('🔗 Connecting to Monad testnet...');
      }, 1000);
      
      // After 2 seconds
      setTimeout(() => {
        setAgentStatus('loading_data');
        addLog('📊 Loading Pokemon market data...');
        addLog('🎵 Initializing PSA population database...');
        addLog('🔥 Loading FMV calculation models...');
      }, 2000);
      
      // After 3 seconds
      setTimeout(() => {
        setAgentStatus('analyzing');
        addLog('🧠 Initializing multi-agent coordination...');
        addLog('👻 Phantom: Scanning for arbitrage opportunities...');
        addLog('🐉 Dragonite: Analyzing market sentiment...');
        addLog('🎵 Sylveon: Checking card populations...');
        addLog('🔥 Charizard: Calculating fair market values...');
      }, 3000);
      
      // After 4 seconds
      setTimeout(() => {
        setAgentStatus('ready');
        addLog('🎯 All agents ready for trading!');
        addLog('💰 Current portfolio value: $12,450.00');
        addLog('📈 Active opportunities: 3 high-ROI trades detected');
        addLog('🎵 PSA database: 10,000+ cards indexed');
        addLog('🔥 FMV models: Ready for analysis');
        setIsLoading(false);
        
        // Auto-fetch data when ready
        handleSentimentAnalysis();
        handlePSAPopulationAnalysis();
        handleFMVAnalysis();
        handleArbitrageAnalysis();
      }, 4000);
    };

    initializeAgent();
  }, []);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const getStatusColor = () => {
    switch (agentStatus) {
      case 'initializing': return 'text-yellow-400';
      case 'connecting': return 'text-blue-400';
      case 'loading_data': return 'text-purple-400';
      case 'analyzing': return 'text-green-400';
      case 'ready': return 'text-emerald-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusText = () => {
    switch (agentStatus) {
      case 'initializing': return 'Initializing Agent...';
      case 'connecting': return 'Connecting to Blockchain...';
      case 'loading_data': return 'Loading Market Data...';
      case 'analyzing': return 'Analyzing Opportunities...';
      case 'ready': return 'Agent Ready';
      default: return 'Unknown Status';
    }
  };

  // PSA Grading Analysis Handler
  const handlePSAAnalysis = async () => {
    setIsAnalyzing(true);
    addLog('🔍 Starting PSA grading analysis...');
    
    // Simulate PSA analysis
    setTimeout(() => {
      addLog('📊 Analyzing card: Charizard (Base Set 1st Edition)');
      addLog('💰 Raw price: $120.00');
      addLog('🎯 PSA 10 prediction: 5% success rate');
      addLog('📈 Potential ROI: 1775%');
      addLog('⚠️ Risk score: 70/100');
      addLog('✅ PSA analysis completed!');
      
      setAnalysisResults({
        type: 'psa',
        card: 'Charizard (Base Set 1st Edition)',
        rawPrice: '$120.00',
        psa10Price: '$3000.00',
        successRate: '5%',
        roi: '1775%',
        risk: '70/100',
        recommendation: 'BUY'
      });
      setIsAnalyzing(false);
    }, 3000);
  };

  // PSA Cert Search Handler
  const handlePSACertSearch = async () => {
    if (!certNumber.trim()) return;
    
    setPsaLoading(true);
    addLog(`🎵 Searching PSA certificate: ${certNumber}`);
    addLog(`🎵 Sylveon: "Finding certificate data, please wait a moment!"`);
    
    try {
      console.log("Starting PSA cert search for:", certNumber);
      
      const response = await fetch('/api/psa-cert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ certNumber: certNumber.trim() }),
      });
      
      console.log("Fetch response status:", response.status);
      console.log("Fetch response ok:", response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("PSA API Response:", data);
      
      // Always set loading to false, regardless of success/failure
      setPsaLoading(false);
      
      if (data.success && data.status === 'found') {
        // State update - ensure we're setting the data correctly
        setPsaData(data);
        addLog(`🎵 Found: ${data.label} (${data.year})`);
        addLog(`🎵 Grade: ${data.grade} | PSA 10 Pop: ${data.grade_10_population}`);
        addLog(`🎵 ${data.sylveon_message}`);
        
        // Debug: Log what we're setting in the state
        console.log("Setting psaData state to:", {
          grade: data.grade,
          label: data.label,
          year: data.year,
          brand: data.brand,
          total_population: data.total_population,
          grade_10_population: data.grade_10_population
        });
      } else {
        setPsaData(data);
        addLog(`🎵 ${data.message || data.sylveon_message}`);
      }
    } catch (error) {
      console.error('PSA Cert Search Error:', error);
      addLog('🎵 Sylveon! An error occurred during the search, pika!');
      
      // Always set loading to false on error
      setPsaLoading(false);
      
      setPsaData({
        success: false,
        error: 'Search failed',
        message: 'Sylveon! An error occurred during the search, pika!',
        status: 'error'
      });
    }
  };

  // PSA POP Agent Handler
  const handlePSAPopulationAnalysis = async () => {
    setPsaLoading(true);
    addLog('🎵 PSA POP Agent analyzing card populations...');
    
    try {
      // Fetch PSA population data
      const response = await fetch('/api/psa-pop?card=charizard&grade=10');
      const data = await response.json();
      
      if (data.success) {
        setPsaData(data.data);
        addLog(`🎵 PSA 10 Population: ${data.data.population}`);
        addLog(`🎵 Rarity Category: ${data.data.population_category}`);
        addLog(`🎵 ${data.data.sylveon_message}`);
        
        setAnalysisResults({
          type: 'psa',
          population: data.data.population,
          category: data.data.population_category,
          recommendation: data.data.sylveon_message,
          timestamp: data.data.analysis_time
        });
      } else {
        addLog(`❌ Error: ${data.error}`);
        addLog(`🎵 ${data.sylveon_message}`);
      }
    } catch (error) {
      console.error('PSA analysis error:', error);
      addLog('❌ Failed to fetch PSA data');
      addLog('🎵 Sylveon! A problem occurred while fetching PSA data, Sylveon!');
    } finally {
      setPsaLoading(false);
    }
  };

  // FMV Agent Handler - Now uses Sylveon PSA data + Gemini API
  const handleFMVAnalysis = async () => {
    if (!psaData || !psaData.success) {
      addLog('🔥 Charizard! Please search for PSA card information first, Charizard!');
      return;
    }

    setFmvLoading(true);
    addLog('🔥 Charizard! Analyzing FMV with PSA data, Charizard!');
    
    try {
      // Prepare card data for Gemini API
      const cardInfo = {
        name: psaData.label,
        grade: psaData.grade,
        year: psaData.year,
        series: psaData.brand,
        population: psaData.total_population
      };

      console.log("Sending PSA card info to Charizard FMV:", cardInfo);

      const response = await fetch('/api/charizard-fmv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cardData: cardInfo }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setFmvData(data.data);
        addLog(`🔥 Card Name: ${data.data.card_name}`);
        addLog(`🔥 eBay-based FMV: $${data.data.estimated_fmv}`);
        addLog(`🔥 Analysis Period: ${data.data.analysis_period}`);
        addLog(`🔥 ${data.data.charizard_message}`);
        
        setAnalysisResults({
          type: 'fmv',
          cardName: data.data.card_name,
          estimatedFMV: data.data.estimated_fmv,
          analysisPeriod: data.data.analysis_period,
          recommendation: data.data.charizard_message,
          timestamp: data.data.analysis_time
        });
      } else {
        addLog(`❌ Error: ${data.error}`);
        addLog(`🔥 ${data.charizard_message}`);
      }
    } catch (error) {
      console.error('FMV analysis error:', error);
      addLog('❌ Failed to fetch FMV data');
      addLog('🔥 Charizard! A problem occurred during value analysis, Charizard!');
    } finally {
      setFmvLoading(false);
    }
  };

  // Arbitrage Agent Handler
  const handleArbitrageAnalysis = async () => {
    setArbitrageLoading(true);
    addLog('👻 Poke-Arbitrage Agent scanning for opportunities...');
    
    try {
      // Simulate arbitrage analysis
      setTimeout(() => {
        const arbitrageOpportunities = [
          {
            card: "Charizard PSA 10",
            buyFrom: "eBay",
            buyPrice: "$2,800",
            sellTo: "TCGPlayer",
            sellPrice: "$3,500",
            roi: "25%"
          },
          {
            card: "Blastoise PSA 9",
            buyFrom: "PWCC",
            buyPrice: "$1,200",
            sellTo: "Goldin",
            sellPrice: "$1,600",
            roi: "33%"
          },
          {
            card: "Venusaur Raw",
            buyFrom: "Local Shop",
            buyPrice: "$80",
            sellTo: "eBay",
            sellPrice: "$120",
            roi: "50%"
          }
        ];
        
        setArbitrageData(arbitrageOpportunities);
        addLog('👻 Found 3 high-ROI arbitrage opportunities:');
        arbitrageOpportunities.forEach((opp, index) => {
          addLog(`   ${index + 1}. ${opp.card}: ${opp.buyFrom} ${opp.buyPrice} → ${opp.sellTo} ${opp.sellPrice} (ROI: ${opp.roi})`);
        });
        
        setAnalysisResults({
          type: 'arbitrage',
          opportunities: arbitrageOpportunities,
          timestamp: new Date().toISOString()
        });
        
        setArbitrageLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Arbitrage analysis error:', error);
      addLog('❌ Failed to scan arbitrage opportunities');
      addLog('👻 Phantom! A problem occurred during arbitrage analysis, Phantom!');
      setArbitrageLoading(false);
    }
  };

  // Market Sentiment Guardian Handler
  const handleSentimentAnalysis = async () => {
    setIsAnalyzing(true);
    setSentimentLoading(true);
    addLog('🐉 Market Sentiment Guardian analyzing market sentiment...');
    
    try {
      // Fetch real-time sentiment data
      const response = await fetch('/api/market-sentiment');
      const data = await response.json();
      
      if (data.success) {
        setSentimentData(data.data);
        addLog(`📊 Fear & Greed Index: ${data.data.value}`);
        addLog(`🎯 Market Sentiment: ${data.data.value_classification}`);
        addLog(`🐉 ${data.data.dragonite_message}`);
        
        setAnalysisResults({
          type: 'sentiment',
          fearGreedIndex: data.data.value,
          sentiment: data.data.value_classification,
          recommendation: data.data.dragonite_message,
          riskLevel: data.data.sentiment_category,
          dragoniteMood: data.data.sentiment_category,
          sentimentColor: data.data.sentiment_color,
          timestamp: data.data.analysis_time
        });
      } else {
        addLog(`❌ Error: ${data.error}`);
        addLog(`🐉 ${data.dragonite_message}`);
      }
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      addLog('❌ Failed to fetch sentiment data');
      addLog('🐉 망나뇽! API 연결에 문제가 생겼어 망나뇽!');
    } finally {
      setIsAnalyzing(false);
      setSentimentLoading(false);
    }
  };

  // Arbitrage Opportunities Handler
  const handleArbitrageOpportunities = async () => {
    setIsAnalyzing(true);
    addLog('🔍 Scanning for arbitrage opportunities...');
    
    // Simulate arbitrage analysis
    setTimeout(() => {
      addLog('📊 Checking 15 marketplaces...');
      addLog('💎 Found 3 high-ROI opportunities:');
      addLog('   1. Blastoise: eBay $95 → TCGPlayer $120 (ROI: 26%)');
      addLog('   2. Venusaur: CardMarket $80 → eBay $105 (ROI: 31%)');
      addLog('   3. Pikachu: TCGPlayer $25 → CardMarket $35 (ROI: 40%)');
      addLog('✅ Arbitrage scan completed!');
      
      setAnalysisResults({
        type: 'arbitrage',
        opportunities: [
          { card: 'Blastoise', buyFrom: 'eBay', buyPrice: '$95', sellTo: 'TCGPlayer', sellPrice: '$120', roi: '26%' },
          { card: 'Venusaur', buyFrom: 'CardMarket', buyPrice: '$80', sellTo: 'eBay', sellPrice: '$105', roi: '31%' },
          { card: 'Pikachu', buyFrom: 'TCGPlayer', buyPrice: '$25', sellTo: 'CardMarket', sellPrice: '$35', roi: '40%' }
        ]
      });
      setIsAnalyzing(false);
    }, 2500);
  };

  // Emotion Report Handler
  const handleEmotionReport = async () => {
    setIsAnalyzing(true);
    addLog('🧠 Generating emotion report...');
    
    // Simulate emotion report generation
    setTimeout(() => {
      addLog('📊 Analyzing card: Charizard (Base Set 1st Edition)');
      addLog('🎯 PSA prediction: PSA 10 (5% confidence)');
      addLog('😊 Primary emotion: CAUTION');
      addLog('📈 Emotion intensity: 0.90');
      addLog('🔗 Recording to Monad blockchain...');
      addLog('✅ Transaction hash: 0x7f9a...3d2e');
      addLog('✅ Emotion report generated and recorded!');
      
      setAnalysisResults({
        type: 'emotion',
        card: 'Charizard (Base Set 1st Edition)',
        emotion: 'CAUTION',
        intensity: '0.90',
        reasoning: 'Low PSA success rate with high risk',
        transactionHash: '0x7f9a...3d2e',
        timestamp: new Date().toISOString()
      });
      setIsAnalyzing(false);
    }, 3500);
  };

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      {/* Radial gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-black to-purple-900 radial-gradient-center" />

      {/* Pokemon background decorations */}
      <div className="absolute top-20 left-10 w-16 h-16 opacity-20">
        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png" alt="Bulbasaur" className="w-full h-full object-contain" />
      </div>
      <div className="absolute top-40 right-20 w-20 h-20 opacity-20">
        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png" alt="Charmander" className="w-full h-full object-contain" />
      </div>
      <div className="absolute bottom-40 left-20 w-24 h-24 opacity-20">
        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png" alt="Squirtle" className="w-full h-full object-contain" />
      </div>
      <div className="absolute bottom-20 right-10 w-18 h-18 opacity-20">
        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/143.png" alt="Snorlax" className="w-full h-full object-contain" />
      </div>

      {/* Navigation bar */}
      <Navbar />

      {/* Main content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 pt-24 pb-12">
        {/* Decorative Pokemon */}
        <div className="absolute -top-10 -left-10 w-32 h-32 opacity-30">
          <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png" alt="Pikachu" className="w-full h-full object-contain animate-bounce" />
        </div>
        <div className="absolute -top-8 -right-8 w-24 h-24 opacity-30">
          <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/150.png" alt="Mewtwo" className="w-full h-full object-contain" />
        </div>

        {/* Agent status */}
        <div className="max-w-4xl w-full mb-8">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">🤖 Poke-Arbitrage Agent</h2>
              <div className={`flex items-center gap-2 ${getStatusColor()}`}>
                <div className={`w-3 h-3 rounded-full ${agentStatus === 'ready' ? 'bg-emerald-400' : 'bg-current animate-pulse'}`} />
                <span className="font-medium">{getStatusText()}</span>
              </div>
            </div>

            {/* Status bar */}
            <div className="w-full bg-white/10 rounded-full h-2 mb-6">
              <div 
                className={`h-2 rounded-full transition-all duration-1000 ${
                  agentStatus === 'initializing' ? 'w-1/5 bg-yellow-400' :
                  agentStatus === 'connecting' ? 'w-2/5 bg-blue-400' :
                  agentStatus === 'loading_data' ? 'w-3/5 bg-purple-400' :
                  agentStatus === 'analyzing' ? 'w-4/5 bg-green-400' :
                  'w-full bg-emerald-400'
                }`}
              />
            </div>

            {/* Log output */}
            <div className="bg-black/50 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
              {logs.map((log, index) => (
                <div key={index} className="mb-1 text-green-400">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Analysis Results */}
        {analysisResults && (
          <div className="max-w-4xl w-full mb-8">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4">📊 Analysis Results</h3>
              
              {analysisResults.type === 'sentiment' && (
                <div className="space-y-3">
                  <div><strong>Fear & Greed Index:</strong> {analysisResults.fearGreedIndex}</div>
                  <div><strong>Market Sentiment:</strong> <span className="text-orange-400">{analysisResults.sentiment}</span></div>
                  <div><strong>Recommendation:</strong> {analysisResults.recommendation}</div>
                  <div><strong>Risk Level:</strong> <span className="text-yellow-400">{analysisResults.riskLevel}</span></div>
                  <div><strong>Dragonite Mood:</strong> <span className="text-green-400">{analysisResults.dragoniteMood}</span></div>
                  <div><strong>Timestamp:</strong> {new Date(analysisResults.timestamp).toLocaleString()}</div>
                </div>
              )}
              
              {analysisResults.type === 'psa' && (
                <div className="space-y-3">
                  <div><strong>Card:</strong> {analysisResults.card}</div>
                  <div><strong>Raw Price:</strong> {analysisResults.rawPrice}</div>
                  <div><strong>PSA 10 Price:</strong> {analysisResults.psa10Price}</div>
                  <div><strong>Success Rate:</strong> {analysisResults.successRate}</div>
                  <div><strong>Potential ROI:</strong> {analysisResults.roi}</div>
                  <div><strong>Risk Score:</strong> {analysisResults.risk}</div>
                  <div><strong>Recommendation:</strong> <span className="text-green-400">{analysisResults.recommendation}</span></div>
                </div>
              )}
              
              {analysisResults.type === 'arbitrage' && (
                <div className="space-y-3">
                  {analysisResults.opportunities.map((opp: any, index: number) => (
                    <div key={index} className="border-l-4 border-purple-400 pl-4">
                      <div><strong>{opp.card}:</strong> {opp.buyFrom} {opp.buyPrice} → {opp.sellTo} {opp.sellPrice}</div>
                      <div><strong>ROI:</strong> <span className="text-green-400">{opp.roi}</span></div>
                    </div>
                  ))}
                </div>
              )}
              
              {analysisResults.type === 'emotion' && (
                <div className="space-y-3">
                  <div><strong>Card:</strong> {analysisResults.card}</div>
                  <div><strong>Primary Emotion:</strong> {analysisResults.emotion}</div>
                  <div><strong>Intensity:</strong> {analysisResults.intensity}</div>
                  <div><strong>Reasoning:</strong> {analysisResults.reasoning}</div>
                  <div><strong>Transaction:</strong> <span className="text-purple-400">{analysisResults.transactionHash}</span></div>
                  <div><strong>Timestamp:</strong> {new Date(analysisResults.timestamp).toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Multi-Agent Dashboard */}
        {!isLoading && (
          <div className="max-w-6xl w-full mb-8">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
              <h2 className="text-2xl font-bold mb-6 text-center">🤖 Multi-Agent System</h2>
              
              {/* 2x2 Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Poke-Arbitrage Agent (Phantom) */}
                <div className="bg-purple-500/10 backdrop-blur-md border border-purple-500/30 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12">
                        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/94.png" alt="Phantom" className="w-full h-full object-contain animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-purple-300">👻 Poke-Arbitrage Agent</h3>
                        <p className="text-white/60 text-sm">Phantom-powered arbitrage scanner</p>
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${arbitrageLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-sm text-white/80 mb-2">Status: {arbitrageLoading ? 'Scanning...' : 'Ready'}</div>
                    {arbitrageData && (
                      <div className="text-sm text-purple-300">
                        Found {arbitrageData.length} opportunities
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={handleArbitrageAnalysis}
                    disabled={arbitrageLoading}
                    className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      arbitrageLoading 
                        ? 'bg-gray-600 cursor-not-allowed' 
                        : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                  >
                    {arbitrageLoading ? 'Scanning...' : 'Scan Opportunities'}
                  </button>
                </div>

                {/* Market Sentiment Guardian (Dragonite) */}
                <div className="bg-green-500/10 backdrop-blur-md border border-green-500/30 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12">
                        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/149.png" alt="Dragonite" className="w-full h-full object-contain animate-bounce" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-green-300">🐉 Market Sentiment Guardian</h3>
                        <p className="text-white/60 text-sm">Dragonite-powered sentiment analysis</p>
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${sentimentLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-sm text-white/80 mb-2">Status: {sentimentLoading ? 'Analyzing...' : 'Ready'}</div>
                    {sentimentData && (
                      <div className="text-sm text-green-300">
                        Fear & Greed: {sentimentData.value}
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={handleSentimentAnalysis}
                    disabled={sentimentLoading}
                    className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      sentimentLoading 
                        ? 'bg-gray-600 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {sentimentLoading ? 'Analyzing...' : 'Check Sentiment'}
                  </button>
                </div>

                {/* PSA POP Agent (Sylveon) */}
                <div className="bg-pink-500/10 backdrop-blur-md border border-pink-500/30 rounded-xl p-6" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden', border: '1px solid magenta' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12">
                        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/700.png" alt="Sylveon" className="w-full h-full object-contain animate-bounce" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-pink-300">🎵 PSA POP Agent</h3>
                        <p className="text-white/60 text-sm">Sylveon-powered population tracker</p>
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${psaLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
                  </div>
                  
                  {/* PSA Cert Search */}
                  <div className="mb-4">
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Enter PSA Cert Number..."
                        value={certNumber}
                        onChange={(e) => setCertNumber(e.target.value)}
                        className="flex-1 px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-pink-400"
                        disabled={psaLoading}
                      />
                      <button
                        onClick={handlePSACertSearch}
                        disabled={psaLoading || !certNumber.trim()}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          psaLoading || !certNumber.trim()
                            ? 'bg-gray-600 cursor-not-allowed'
                            : 'bg-pink-600 hover:bg-pink-700'
                        }`}
                      >
                        {psaLoading ? 'Finding data...' : 'Search'}
                      </button>
                    </div>
                    
                    {/* PSA Results Display */}
                    {psaData && psaData.success && psaData.status === 'found' ? (
                      <>
                        {/* Debug: Log current psaData state */}
                        {console.log("UI Rendering - psaData:", psaData)}
                        <div className="bg-black/30 rounded-lg p-3 border border-pink-500/30">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-pink-400">Grade:</span> {psaData.grade}
                            </div>
                            <div>
                              <span className="text-pink-400">Name:</span> {psaData.label}
                            </div>
                            <div>
                              <span className="text-pink-400">Year:</span> {psaData.year}
                            </div>
                            <div>
                              <span className="text-pink-400">Series:</span> {psaData.brand}
                            </div>
                            <div className="col-span-2">
                              <span className="text-pink-400">PSA 10 Population:</span> {psaData.total_population}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-white/80">
                        {psaData?.message || psaData?.sylveon_message || "Sylveon! Please enter a certification number, pika!"}
                        {/* Debug: Show psaData when not found */}
                        {psaData && console.log("UI Not Rendering - psaData:", psaData)}
                      </div>
                    )}
                  </div>
                </div>

                {/* FMV Agent (Charizard) */}
                <div className="bg-red-500/10 backdrop-blur-md border border-red-500/30 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12">
                        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png" alt="Charizard" className="w-full h-full object-contain animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-red-300">🔥 FMV Agent</h3>
                        <p className="text-white/60 text-sm">Charizard-powered FMV analysis</p>
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${fmvLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-sm text-white/80 mb-2">Status: {fmvLoading ? 'Analyzing eBay prices...' : 'Ready'}</div>
                    {fmvData && (
                      <div className="text-sm text-red-300">
                        eBay FMV: ${fmvData.estimated_fmv}
                        <span className="ml-2 text-xs text-white/60">
                          (Based on latest 2 eBay sales)
                        </span>
                        {fmvData.market_label && (
                          <span className="ml-2 text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">
                            {fmvData.market_label}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={handleFMVAnalysis}
                    disabled={fmvLoading}
                    className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      fmvLoading 
                        ? 'bg-gray-600 cursor-not-allowed' 
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {fmvLoading ? 'Analyzing...' : 'Calculate eBay FMV'}
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl w-full">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400 mb-1">$12,450</div>
              <div className="text-sm text-white/80">Portfolio Value</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1">3</div>
              <div className="text-sm text-white/80">Active Opportunities</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-400 mb-1">247</div>
              <div className="text-sm text-white/80">Cards Analyzed</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400 mb-1">89%</div>
              <div className="text-sm text-white/80">Success Rate</div>
            </div>
          </div>
        )}

        {/* Market Sentiment Chart */}
        {!isLoading && (
          <div className="max-w-4xl w-full mb-8">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4">🐉 Market Sentiment Analysis</h3>
              
              {/* Fear & Greed Gauge Chart */}
              <div className="bg-black/50 rounded-lg p-6 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium">Fear & Greed Index</span>
                  <span className="text-3xl font-bold" style={{color: sentimentData?.sentiment_color || '#eab308'}}>
                    {sentimentData?.value || '--'}
                  </span>
                </div>
                
                {/* Gauge Chart */}
                <div className="relative w-full h-32 mb-4">
                  {/* Gauge Background */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-16 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full opacity-30"></div>
                  </div>
                  
                  {/* Gauge Needle */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div 
                      className="w-1 h-20 bg-white rounded-full origin-bottom transition-all duration-1000"
                      style={{
                        transform: `rotate(${((sentimentData?.value || 50) - 50) * 1.8}deg)`,
                        backgroundColor: sentimentData?.sentiment_color || '#eab308'
                      }}
                    ></div>
                  </div>
                  
                  {/* Center Circle */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-black rounded-full border-2 border-white"></div>
                  </div>
                </div>
                
                {/* Scale Labels */}
                <div className="flex justify-between text-xs text-white/60 mb-2">
                  <span>0</span>
                  <span>25</span>
                  <span>50</span>
                  <span>75</span>
                  <span>100</span>
                </div>
                
                <div className="flex justify-between text-xs text-white/40">
                  <span>Extreme Fear</span>
                  <span>Fear</span>
                  <span>Neutral</span>
                  <span>Greed</span>
                  <span>Extreme Greed</span>
                </div>
              </div>

              {/* Dragonite Animation with Dynamic Color */}
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <img 
                    src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/149.png" 
                    alt="Dragonite" 
                    className="w-24 h-24 object-contain animate-bounce"
                  />
                  <div 
                    className="absolute inset-0 w-24 h-24 rounded-full animate-pulse"
                    style={{backgroundColor: `${sentimentData?.sentiment_color || '#eab308'}33`}}
                  ></div>
                </div>
              </div>

              {/* Dragonite Message */}
              {sentimentData?.dragonite_message && (
                <div className="bg-black/50 rounded-lg p-4 mb-4 text-center">
                  <div className="text-lg font-medium text-green-400 mb-2">
                    🐉 Dragonite's Analysis
                  </div>
                  <div className="text-white/80">
                    {sentimentData.dragonite_message}
                  </div>
                </div>
              )}

              {/* Market Signals */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-black/50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-yellow-400 mb-1">🟡 Market Signal</div>
                  <div className="text-sm text-white/80">{sentimentData?.value_classification || 'Unknown'}</div>
                </div>
                <div className="bg-black/50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-blue-400 mb-1">📊 Risk Level</div>
                  <div className="text-sm text-white/80 capitalize">{sentimentData?.sentiment_category || 'Unknown'}</div>
                </div>
                <div className="bg-black/50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-green-400 mb-1">🐉 Dragonite</div>
                  <div className="text-sm text-white/80">Monitoring</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom decorative Pokemon */}
        <div className="absolute bottom-10 left-1/4 w-20 h-20 opacity-20">
          <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/131.png" alt="Lapras" className="w-full h-full object-contain" />
        </div>
        <div className="absolute bottom-10 right-1/4 w-16 h-16 opacity-20">
          <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/39.png" alt="Jigglypuff" className="w-full h-full object-contain" />
        </div>
      </main>
    </div>
  );
}
