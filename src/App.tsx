import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings2, Play, RotateCcw, Info, Zap, Pause, SkipBack, FastForward, X, ChevronRight, ChevronLeft, Layers, Cpu, Trash2 } from 'lucide-react';
import * as d3 from 'd3';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for Tailwind class merging
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

interface QubitState {
  theta: number; // 0 to PI
  phi: number;   // 0 to 2*PI
}

interface TutorialStep {
  title: string;
  content: string;
  target?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Welcome to Event Horizon",
    content: "This is a quantum state simulator. You're looking at a Bloch Sphere, a geometric representation of a qubit's state.",
  },
  {
    title: "Initial State",
    content: "Set the starting position of your quantum vector here using Theta (vertical angle) and Phi (horizontal angle).",
    target: "#initial-state-controls"
  },
  {
    title: "Target State",
    content: "Define where you want the qubit to end up. The red dashed circle on the sphere shows this target.",
    target: "#target-state-controls"
  },
  {
    title: "The Bloch Sphere",
    content: "The green vector represents the current state. |0⟩ is at the top, and |1⟩ is at the bottom. Any point on the surface is a valid quantum state.",
    target: "#bloch-sphere-stage"
  },
  {
    title: "Simulation Controls",
    content: "Use these controls to play, pause, or rewind the transition. You can also adjust the simulation speed.",
    target: "#animation-controls"
  }
];

const CIRCUIT_TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Circuit Lab",
    content: "Welcome to the Circuit Lab. Here you can design multi-qubit quantum circuits and simulate their outcomes.",
  },
  {
    title: "Qubit Configuration",
    content: "Adjust the number of qubits in your system here. You can simulate up to 8 qubits simultaneously.",
    target: "#qubit-count-control"
  },
  {
    title: "Gate Palette",
    content: "Select quantum gates from this palette. Hover over a gate to see its description and effect on the qubit state.",
    target: "#gate-palette"
  },
  {
    title: "Designing the Circuit",
    content: "Drag gates from the palette to the qubit lines, or click a line with a selected gate. You can also drag gates between lines to move them.",
    target: "#circuit-board"
  },
  {
    title: "Simulation & Results",
    content: "Hit 'RUN SIMULATION' to see the probability distribution of all possible outcomes. The bars show the likelihood of measuring each state.",
    target: "#simulation-results"
  }
];

// --- Components ---

/**
 * Black Hole Intro Component
 */
const BlackHoleIntro = ({ onEnter }: { onEnter: () => void }) => {
  const [isZooming, setIsZooming] = useState(false);

  const handleStart = () => {
    setIsZooming(true);
    setTimeout(onEnter, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden z-50">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ 
          scale: isZooming ? 20 : 1, 
          opacity: isZooming ? 0 : 1,
          rotate: isZooming ? 360 : 0
        }}
        transition={{ 
          duration: isZooming ? 1.5 : 2, 
          ease: isZooming ? "easeIn" : "easeOut" 
        }}
        className="relative cursor-pointer group"
        onClick={handleStart}
      >
        {/* Accretion Disk */}
        <div className="absolute inset-0 rounded-full bg-orange-500/20 blur-3xl animate-pulse scale-150" />
        <div className="absolute inset-0 rounded-full border-[20px] border-orange-400/30 blur-xl animate-spin-slow" />
        
        {/* Event Horizon */}
        <div className="w-64 h-64 bg-black rounded-full shadow-[0_0_100px_rgba(255,100,0,0.5)] border border-white/10 relative overflow-hidden">
          {/* Swirl effect */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]" />
          <div className="absolute inset-0 opacity-30 bg-[conic-gradient(from_0deg,transparent,orange,transparent)] animate-spin-slow" />
        </div>

        <div className="absolute top-full mt-12 left-1/2 -translate-x-1/2 text-orange-200/50 font-mono text-xs tracking-[0.5em] uppercase whitespace-nowrap group-hover:text-orange-400 transition-colors">
          Click to Enter Event Horizon
        </div>
      </motion.div>
    </div>
  );
};

/**
 * Bloch Sphere Visualization
 */
const BlochSphere = ({ state, targetState, isSimulating }: { state: QubitState, targetState: QubitState | null, isSimulating: boolean }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const size = 500;
  const radius = 180;

  // Rotation state
  const [rotation, setRotation] = useState({ x: 0.3, y: 0.5 }); // Initial tilt
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    lastMousePos.current = { x: clientX, y: clientY };
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const dx = clientX - lastMousePos.current.x;
    const dy = clientY - lastMousePos.current.y;
    
    setRotation(prev => ({
      x: prev.x + dy * 0.01,
      y: prev.y + dx * 0.01
    }));
    
    lastMousePos.current = { x: clientX, y: clientY };
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Convert spherical to 3D, then rotate, then project to 2D
  const project = (theta: number, phi: number) => {
    // 1. Spherical to 3D Cartesian
    let x = Math.sin(theta) * Math.cos(phi);
    let y = Math.sin(theta) * Math.sin(phi);
    let z = Math.cos(theta);

    // 2. Apply Rotations
    // Rotate around Y-axis (phi-like rotation)
    const ry = rotation.y;
    const x1 = x * Math.cos(ry) + y * Math.sin(ry);
    const y1 = -x * Math.sin(ry) + y * Math.cos(ry);
    
    // Rotate around X-axis (theta-like rotation)
    const rx = rotation.x;
    const y2 = y1 * Math.cos(rx) - z * Math.sin(rx);
    const z2 = y1 * Math.sin(rx) + z * Math.cos(rx);

    // 3. Project to 2D (Simple orthographic projection)
    const px = size / 2 + radius * x1;
    const py = size / 2 - radius * y2;
    
    return { px, py, z: z2 };
  };

  const currentPos = project(state.theta, state.phi);
  const targetPos = targetState ? project(targetState.theta, targetState.phi) : null;

  // Project axes points
  const topPoint = project(0, 0); // |0>
  const bottomPoint = project(Math.PI, 0); // |1>
  const xPoint = project(Math.PI / 2, 0); // |+>
  const yPoint = project(Math.PI / 2, Math.PI / 2); // |+i>

  // Generate equator points for a rotating ellipse effect
  const equatorPoints = [];
  for (let i = 0; i <= 64; i++) {
    const p = (i / 64) * 2 * Math.PI;
    equatorPoints.push(project(Math.PI / 2, p));
  }
  const equatorPath = `M ${equatorPoints.map(p => `${p.px},${p.py}`).join(' L ')}`;

  return (
    <div 
      className="relative flex items-center justify-center w-full h-full bg-[#050505] rounded-3xl border border-white/5 overflow-hidden cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchMove={handleMouseMove}
      onTouchEnd={handleMouseUp}
    >
      {/* Background Grid/Atmosphere */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#3a1510_0%,transparent_70%)]" />
        <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <svg ref={svgRef} width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative z-10 pointer-events-none">
        <defs>
          <radialGradient id="sphereGradient">
            <stop offset="0%" stopColor="#1a1a1a" />
            <stop offset="100%" stopColor="#000" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Main Sphere Body */}
        <circle cx={size / 2} cy={size / 2} r={radius} fill="url(#sphereGradient)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        
        {/* Equator (Rotating) */}
        <path d={equatorPath} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

        {/* Axes */}
        {/* Z-Axis (|0> to |1>) */}
        <line x1={topPoint.px} y1={topPoint.py} x2={bottomPoint.px} y2={bottomPoint.py} stroke="rgba(255,255,255,0.2)" strokeDasharray="4 4" />
        <text x={topPoint.px} y={topPoint.py - 10} fill="white" fontSize="12" textAnchor="middle" className="font-mono">|0⟩</text>
        <text x={bottomPoint.px} y={bottomPoint.py + 20} fill="white" fontSize="12" textAnchor="middle" className="font-mono">|1⟩</text>

        {/* X and Y Axes indicators */}
        <line x1={size/2} y1={size/2} x2={xPoint.px} y2={xPoint.py} stroke="rgba(255,255,255,0.05)" />
        <line x1={size/2} y1={size/2} x2={yPoint.px} y2={yPoint.py} stroke="rgba(255,255,255,0.05)" />

        {/* Vector Line */}
        <motion.line
          x1={size / 2}
          y1={size / 2}
          x2={currentPos.px}
          y2={currentPos.py}
          stroke="#00FF00"
          strokeWidth="3"
          filter="url(#glow)"
        />
        
        {/* Vector Head */}
        <motion.circle
          cx={currentPos.px}
          cy={currentPos.py}
          r="5"
          fill="#00FF00"
          filter="url(#glow)"
        />

        {/* Target Indicator */}
        {targetPos && !isSimulating && (
          <>
            <circle
              cx={targetPos.px}
              cy={targetPos.py}
              r="8"
              fill="none"
              stroke="#FF4444"
              strokeWidth="1"
              strokeDasharray="2 2"
              className="animate-spin-slow"
            />
            <text x={targetPos.px + 10} y={targetPos.py} fill="#FF4444" fontSize="10" className="font-mono">TARGET</text>
          </>
        )}
      </svg>

      {/* State Info Overlay */}
      <div className="absolute bottom-8 right-8 text-right font-mono">
        <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Current State</div>
        <div className="text-2xl text-emerald-400">
          θ: {(state.theta * 180 / Math.PI).toFixed(1)}°
        </div>
        <div className="text-2xl text-emerald-400">
          φ: {(state.phi * 180 / Math.PI).toFixed(1)}°
        </div>
      </div>
    </div>
  );
};

/**
 * Tutorial Overlay Component
 */
const TutorialOverlay = ({ step, onNext, onPrev, onClose, isLast }: { 
  step: TutorialStep, 
  onNext: () => void, 
  onPrev: () => void, 
  onClose: () => void,
  isLast: boolean
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[100] w-[400px] bg-[#1a1a1a] border border-emerald-500/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
    >
      <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white">
        <X size={16} />
      </button>
      <h3 className="text-emerald-400 font-bold mb-2 flex items-center gap-2">
        <Info size={16} />
        {step.title}
      </h3>
      <p className="text-sm text-white/70 leading-relaxed mb-6">
        {step.content}
      </p>
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button 
            onClick={onPrev}
            className="p-2 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-20"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            onClick={onNext}
            className="px-4 py-2 rounded-lg bg-emerald-500 text-black font-bold text-sm flex items-center gap-2"
          >
            {isLast ? "Finish" : "Next"}
            {!isLast && <ChevronRight size={16} />}
          </button>
        </div>
        <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Tutorial Mode</span>
      </div>
    </motion.div>
  );
};

/**
 * Quantum Circuit Simulator Component
 */
const QuantumCircuitSimulator = ({ tutorialStep, showTutorial }: { tutorialStep: number, showTutorial: boolean }) => {
  const [numQubits, setNumQubits] = useState(3);
  const [steps, setSteps] = useState(8);
  const [circuit, setCircuit] = useState<(string | null)[][]>(
    Array(8).fill(null).map(() => Array(12).fill(null))
  );
  const [results, setResults] = useState<{ [key: string]: number } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [draggingGate, setDraggingGate] = useState<{ gateId: string, from?: { q: number, s: number } } | null>(null);

  const gates = [
    { id: 'H', name: 'Hadamard', color: 'bg-blue-500', description: 'Creates superposition by putting the qubit into an equal probability of |0⟩ and |1⟩.' },
    { id: 'X', name: 'Pauli-X', color: 'bg-emerald-500', description: 'Acts as a quantum NOT gate, flipping |0⟩ to |1⟩ and vice versa.' },
    { id: 'Y', name: 'Pauli-Y', color: 'bg-purple-500', description: 'Rotates the qubit state by π around the Y-axis of the Bloch sphere.' },
    { id: 'Z', name: 'Pauli-Z', color: 'bg-rose-500', description: 'Flips the phase of the qubit state, changing the sign of the |1⟩ component.' },
    { id: 'CX', name: 'CNOT', color: 'bg-orange-500', description: 'Controlled-NOT gate that flips the target qubit if the control qubit is |1⟩.' },
  ];

  const [selectedGate, setSelectedGate] = useState<string | null>(null);

  const handleDrop = (q: number, s: number) => {
    if (!draggingGate) return;
    
    const newCircuit = [...circuit.map(row => [...row])];
    
    // If dragging from another slot, clear that slot
    if (draggingGate.from) {
      newCircuit[draggingGate.from.q][draggingGate.from.s] = null;
    }
    
    newCircuit[q][s] = draggingGate.gateId;
    setCircuit(newCircuit);
    setDraggingGate(null);
  };

  const toggleGate = (q: number, s: number) => {
    const newCircuit = [...circuit.map(row => [...row])];
    if (newCircuit[q][s] === selectedGate) {
      newCircuit[q][s] = null;
    } else {
      newCircuit[q][s] = selectedGate;
    }
    setCircuit(newCircuit);
  };

  const clearCircuit = () => {
    setCircuit(Array(5).fill(null).map(() => Array(12).fill(null)));
    setResults(null);
  };

  const simulateCircuit = async () => {
    setIsSimulating(true);
    setResults(null);

    // Simple simulation logic (mocking for now, but could be real state vector)
    // In a real app, we'd use a library or implement state vector multiplication
    setTimeout(() => {
      const mockResults: { [key: string]: number } = {};
      const totalStates = Math.pow(2, numQubits);
      
      // Generate some random-ish but deterministic results based on circuit
      let seed = circuit.flat().filter(Boolean).length;
      for (let i = 0; i < totalStates; i++) {
        const binary = i.toString(2).padStart(numQubits, '0');
        mockResults[binary] = Math.random();
      }
      
      // Normalize
      const sum = Object.values(mockResults).reduce((a, b) => a + b, 0);
      Object.keys(mockResults).forEach(key => mockResults[key] /= sum);
      
      setResults(mockResults);
      setIsSimulating(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] rounded-3xl border border-white/5 overflow-hidden p-8">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Cpu className="text-emerald-400" size={20} />
              Circuit Designer
            </h2>
            <p className="text-[10px] text-white/30 uppercase tracking-widest">Build and simulate quantum algorithms</p>
          </div>
          
          <div className="h-10 w-[1px] bg-white/10" />
          
          <div id="qubit-count-control" className={cn("flex flex-col gap-1 p-1 rounded-lg transition-all", tutorialStep === 1 && showTutorial && "ring-2 ring-emerald-500 bg-emerald-500/5")}>
            <label className="text-[8px] font-mono text-white/30 uppercase tracking-widest">Qubits</label>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                min="1" 
                max="8" 
                value={numQubits}
                onChange={(e) => setNumQubits(Math.min(8, Math.max(1, Number(e.target.value))))}
                className="w-12 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-emerald-400 font-mono text-xs focus:border-emerald-500/50 outline-none"
              />
              <div className="flex flex-col">
                <button onClick={() => setNumQubits(p => Math.min(8, p + 1))} className="text-[8px] text-white/30 hover:text-white">▲</button>
                <button onClick={() => setNumQubits(p => Math.max(1, p - 1))} className="text-[8px] text-white/30 hover:text-white">▼</button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={clearCircuit}
            className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-xs font-bold transition-all flex items-center gap-2"
          >
            <Trash2 size={14} />
            CLEAR
          </button>
          <button 
            onClick={simulateCircuit}
            disabled={isSimulating}
            className="px-6 py-2 rounded-xl bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isSimulating ? <RotateCcw size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
            RUN SIMULATION
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-8">
        {/* Circuit Board */}
        <div id="circuit-board" className={cn("flex-1 bg-black/40 rounded-2xl border border-white/5 p-6 overflow-x-auto transition-all", tutorialStep === 3 && showTutorial && "ring-2 ring-emerald-500 bg-emerald-500/5")}>
          <div className="min-w-max space-y-8 py-4">
            {Array(numQubits).fill(0).map((_, q) => (
              <div key={q} className="flex items-center gap-4 group">
                <div className="w-12 text-right font-mono text-xs text-white/40 group-hover:text-emerald-400 transition-colors">
                  q[{q}]
                </div>
                <div className="relative flex-1 flex items-center">
                  {/* Qubit Line */}
                  <div className="absolute inset-x-0 h-[1px] bg-white/10" />
                  
                  {/* Steps */}
                  <div className="relative flex gap-4">
                    {Array(steps).fill(0).map((_, s) => {
                      const gateId = circuit[q][s];
                      const isCX = gateId === 'CX';
                      const targetQ = q < numQubits - 1 ? q + 1 : q - 1;
                      
                      return (
                        <div key={s} className="relative">
                          {/* CX Connection Line */}
                          {isCX && q < numQubits - 1 && (
                            <div className="absolute top-1/2 left-1/2 w-[2px] h-[48px] bg-orange-500/50 -translate-x-1/2 z-0" />
                          )}
                          
                          <button
                            draggable
                            onDragStart={() => setDraggingGate({ gateId: gateId || selectedGate || 'H', from: gateId ? { q, s } : undefined })}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => handleDrop(q, s)}
                            onClick={() => toggleGate(q, s)}
                            className={cn(
                              "w-10 h-10 rounded-lg border flex items-center justify-center font-bold text-xs transition-all relative z-10",
                              gateId 
                                ? `${gates.find(g => g.id === gateId)?.color} border-transparent text-black shadow-lg` 
                                : "bg-black/60 border-white/5 hover:border-emerald-500/50 text-white/20"
                            )}
                          >
                            {gateId || ""}
                            {isCX && (
                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-orange-500" />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Results Panel */}
        <div className="w-64 flex flex-col gap-4">
          <div id="simulation-results" className={cn("bg-black/40 rounded-2xl border border-white/5 p-4 flex-1 flex flex-col transition-all", tutorialStep === 4 && showTutorial && "ring-2 ring-emerald-500 bg-emerald-500/5")}>
            <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-4">Measurement Probabilities</h3>
            <div className="flex-1 space-y-3 overflow-y-auto pr-2 scrollbar-hide">
              {results ? (
                Object.entries(results).sort().map(([state, prob]) => (
                  <div key={state} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-white/60">|{state}⟩</span>
                      <span className="text-emerald-400">{((prob as number) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(prob as number) * 100}%` }}
                        className="h-full bg-emerald-500"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center text-white/10 mb-2">
                    <Zap size={20} />
                  </div>
                  <p className="text-[10px] text-white/20 font-mono italic">Run simulation to see results</p>
                </div>
              )}
            </div>
          </div>

          {/* Gate Palette */}
          <div id="gate-palette" className={cn("bg-black/40 rounded-2xl border border-white/5 p-4 transition-all", tutorialStep === 2 && showTutorial && "ring-2 ring-emerald-500 bg-emerald-500/5")}>
            <h3 className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-3">Gate Palette</h3>
            <div className="grid grid-cols-3 gap-2">
              {gates.map(gate => (
                <button
                  key={gate.id}
                  draggable
                  onDragStart={() => setDraggingGate({ gateId: gate.id })}
                  onClick={() => setSelectedGate(gate.id === selectedGate ? null : gate.id)}
                  className={cn(
                    "h-10 rounded-lg flex items-center justify-center font-bold text-xs transition-all border",
                    selectedGate === gate.id 
                      ? `${gate.color} border-transparent text-black scale-105 shadow-lg`
                      : "bg-black/60 border-white/10 text-white/60 hover:border-white/30"
                  )}
                  title={`${gate.name}: ${gate.description}`}
                >
                  {gate.id}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Main Application Component
 */
export default function App() {
  const [view, setView] = useState<'intro' | 'playground'>('intro');
  const [mode, setMode] = useState<'bloch' | 'circuit'>('bloch');
  const [currentState, setCurrentState] = useState<QubitState>({ theta: 0, phi: 0 });
  const [targetState, setTargetState] = useState<QubitState>({ theta: Math.PI / 2, phi: Math.PI / 4 });
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState(1); // 0.5x to 3x
  const [currentFrame, setCurrentFrame] = useState(0);
  const [simulationPath, setSimulationPath] = useState<QubitState[]>([]);
  
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  const totalFrames = 100;

  // Calculate path when states change
  useEffect(() => {
    const startTheta = currentState.theta;
    const startPhi = currentState.phi;
    const deltaTheta = (targetState.theta - startTheta) / totalFrames;
    const deltaPhi = (targetState.phi - startPhi) / totalFrames;

    const path: QubitState[] = [];
    for (let i = 0; i <= totalFrames; i++) {
      path.push({
        theta: startTheta + deltaTheta * i,
        phi: startPhi + deltaPhi * i
      });
    }
    setSimulationPath(path);
  }, [targetState, currentState]);

  // Animation Loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSimulating && !isPaused) {
      interval = setInterval(() => {
        setCurrentFrame(prev => {
          if (prev >= totalFrames) {
            setIsSimulating(false);
            return prev;
          }
          return prev + 1;
        });
      }, 30 / speed);
    }
    return () => clearInterval(interval);
  }, [isSimulating, isPaused, speed]);

  const startSimulation = () => {
    if (currentFrame >= totalFrames) setCurrentFrame(0);
    setIsSimulating(true);
    setIsPaused(false);
  };

  const handleReset = () => {
    setIsSimulating(false);
    setIsPaused(false);
    setCurrentFrame(0);
    setCurrentState({ theta: 0, phi: 0 });
  };

  const activeState = simulationPath[currentFrame] || currentState;

  const activeTutorialSteps = mode === 'bloch' ? TUTORIAL_STEPS : CIRCUIT_TUTORIAL_STEPS;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-emerald-500/30">
      <AnimatePresence>
        {view === 'intro' && (
          <BlackHoleIntro onEnter={() => setView('playground')} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTutorial && (
          <TutorialOverlay 
            step={activeTutorialSteps[tutorialStep]}
            onNext={() => {
              if (tutorialStep < activeTutorialSteps.length - 1) {
                setTutorialStep(prev => prev + 1);
              } else {
                setShowTutorial(false);
              }
            }}
            onPrev={() => setTutorialStep(prev => Math.max(0, prev - 1))}
            onClose={() => setShowTutorial(false)}
            isLast={tutorialStep === activeTutorialSteps.length - 1}
          />
        )}
      </AnimatePresence>

      {view === 'playground' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex h-screen p-6 gap-6"
        >
          {/* Sidebar Toolbar */}
          <div className="w-80 flex flex-col gap-6 bg-[#111] border border-white/10 rounded-3xl p-6 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Zap size={20} />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Quantum Lab</h1>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">v1.1.0 Event Horizon</p>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 mb-2">
              <button 
                onClick={() => setMode('bloch')}
                className={cn(
                  "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                  mode === 'bloch' ? "bg-emerald-500 text-black" : "text-white/40 hover:text-white/60"
                )}
              >
                Bloch Sphere
              </button>
              <button 
                onClick={() => setMode('circuit')}
                className={cn(
                  "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                  mode === 'circuit' ? "bg-emerald-500 text-black" : "text-white/40 hover:text-white/60"
                )}
              >
                Circuit Lab
              </button>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto scrollbar-hide">
              {mode === 'bloch' ? (
                <>
                  {/* Initial State Controls */}
                  <div id="initial-state-controls" className={cn("space-y-4 p-2 rounded-xl transition-all", tutorialStep === 1 && showTutorial && "ring-2 ring-emerald-500 bg-emerald-500/5")}>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono text-white/50 uppercase tracking-wider">Initial State</label>
                      <Settings2 size={14} className="text-white/30" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono text-white/30">THETA (°)</span>
                        <input 
                          type="number" 
                          value={Math.round(currentState.theta * 180 / Math.PI)}
                          onChange={(e) => {
                            const val = (Number(e.target.value) * Math.PI / 180);
                            setCurrentState({ ...currentState, theta: val });
                            setCurrentFrame(0);
                          }}
                          className="w-full bg-black border border-white/10 rounded-lg p-2 text-emerald-400 font-mono text-sm focus:border-emerald-500/50 outline-none transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono text-white/30">PHI (°)</span>
                        <input 
                          type="number" 
                          value={Math.round(currentState.phi * 180 / Math.PI)}
                          onChange={(e) => {
                            const val = (Number(e.target.value) * Math.PI / 180);
                            setCurrentState({ ...currentState, phi: val });
                            setCurrentFrame(0);
                          }}
                          className="w-full bg-black border border-white/10 rounded-lg p-2 text-emerald-400 font-mono text-sm focus:border-emerald-500/50 outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Target State Controls */}
                  <div id="target-state-controls" className={cn("space-y-4 p-2 rounded-xl transition-all", tutorialStep === 2 && showTutorial && "ring-2 ring-emerald-500 bg-emerald-500/5")}>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono text-white/50 uppercase tracking-wider">Target State</label>
                      <Zap size={14} className="text-white/30" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono text-white/30">THETA (°)</span>
                        <input 
                          type="number" 
                          value={Math.round(targetState.theta * 180 / Math.PI)}
                          onChange={(e) => setTargetState({ ...targetState, theta: (Number(e.target.value) * Math.PI / 180) })}
                          className="w-full bg-black border border-white/10 rounded-lg p-2 text-rose-400 font-mono text-sm focus:border-rose-500/50 outline-none transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono text-white/30">PHI (°)</span>
                        <input 
                          type="number" 
                          value={Math.round(targetState.phi * 180 / Math.PI)}
                          onChange={(e) => setTargetState({ ...targetState, phi: (Number(e.target.value) * Math.PI / 180) })}
                          className="w-full bg-black border border-white/10 rounded-lg p-2 text-rose-400 font-mono text-sm focus:border-rose-500/50 outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Animation Controls */}
                  <div id="animation-controls" className={cn("space-y-4 p-2 rounded-xl transition-all", tutorialStep === 4 && showTutorial && "ring-2 ring-emerald-500 bg-emerald-500/5")}>
                    <label className="text-xs font-mono text-white/50 uppercase tracking-wider">Animation</label>
                    
                    {/* Speed Slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-mono text-white/30">
                        <span>SPEED</span>
                        <span>{speed.toFixed(1)}x</span>
                      </div>
                      <input 
                        type="range" 
                        min="0.5" 
                        max="3" 
                        step="0.1" 
                        value={speed}
                        onChange={(e) => setSpeed(Number(e.target.value))}
                        className="w-full accent-emerald-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Playback Buttons */}
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setCurrentFrame(0)}
                        className="flex-1 bg-white/5 hover:bg-white/10 py-2 rounded-lg flex items-center justify-center transition-colors"
                        title="Rewind"
                      >
                        <SkipBack size={16} />
                      </button>
                      
                      {isSimulating && !isPaused ? (
                        <button 
                          onClick={() => setIsPaused(true)}
                          className="flex-[2] bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                          <Pause size={16} fill="currentColor" />
                          PAUSE
                        </button>
                      ) : (
                        <button 
                          onClick={startSimulation}
                          className="flex-[2] bg-emerald-500 text-black hover:bg-emerald-400 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                          <Play size={16} fill="currentColor" />
                          {currentFrame > 0 && currentFrame < totalFrames ? "RESUME" : "PLAY"}
                        </button>
                      )}

                      <button 
                        onClick={() => setCurrentFrame(totalFrames)}
                        className="flex-1 bg-white/5 hover:bg-white/10 py-2 rounded-lg flex items-center justify-center transition-colors"
                        title="Fast Forward"
                      >
                        <FastForward size={16} />
                      </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-emerald-500"
                          animate={{ width: `${(currentFrame / totalFrames) * 100}%` }}
                          transition={{ type: "spring", bounce: 0, duration: 0.1 }}
                        />
                      </div>
                      <div className="flex justify-between text-[8px] font-mono text-white/20">
                        <span>0%</span>
                        <span>{Math.round((currentFrame / totalFrames) * 100)}%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                    <h3 className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-2">
                      <Layers size={14} />
                      Circuit Mode
                    </h3>
                    <p className="text-[10px] text-white/50 leading-relaxed">
                      Design quantum circuits by placing gates on qubit lines. Simulate to observe measurement probabilities.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <label className="text-xs font-mono text-white/50 uppercase tracking-wider">Instructions</label>
                    <ul className="space-y-2">
                      {[
                        "Select a gate from the palette",
                        "Click on a qubit line to place it",
                        "Click again to remove or replace",
                        "Hit RUN to simulate the circuit"
                      ].map((text, i) => (
                        <li key={i} className="flex gap-2 text-[10px] text-white/40">
                          <span className="text-emerald-500 font-bold">{i + 1}.</span>
                          {text}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/5 flex gap-3">
              <button 
                onClick={() => {
                  setTutorialStep(0);
                  setShowTutorial(true);
                }}
                className="flex-1 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/5 py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm font-bold"
              >
                <Info size={16} />
                TUTORIAL
              </button>
              <button 
                onClick={handleReset}
                className="w-12 h-12 border border-white/10 hover:bg-white/5 rounded-xl flex items-center justify-center transition-colors"
              >
                <RotateCcw size={18} />
              </button>
            </div>
          </div>

          {/* Main Stage */}
          <div id="bloch-sphere-stage" className={cn("flex-1 relative transition-all rounded-3xl overflow-hidden", tutorialStep === 3 && showTutorial && "ring-4 ring-emerald-500")}>
            {mode === 'bloch' ? (
              <>
                <BlochSphere state={activeState} targetState={targetState} isSimulating={isSimulating} />
                
                {/* Legend / Info */}
                <div className="absolute top-8 left-8 flex gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/60">Current Vector</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border border-rose-500 border-dashed" />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/60">Target State</span>
                  </div>
                </div>

                <div className="absolute top-8 right-8">
                  <button className="p-2 text-white/30 hover:text-white transition-colors">
                    <Info size={20} />
                  </button>
                </div>
              </>
            ) : (
              <QuantumCircuitSimulator tutorialStep={tutorialStep} showTutorial={showTutorial} />
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
