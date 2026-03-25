# Event Horizon 🌌

A web-based quantum simulator I built to make visualizing quantum mechanics a lot more intuitive. 

If you've ever struggled to picture how a qubit rotates or what a multi-qubit circuit actually outputs, this tool is for you. It splits the workflow into two main parts: a 3D Bloch Sphere for single-qubit visualization, and a drag-and-drop Circuit Lab for building multi-qubit algorithms.

## What's Inside?

### 🟢 3D Bloch Sphere
* **Fully Interactive:** Click, touch, and drag to freely rotate the sphere in 3D. The axes, equator, and state vector update in real-time.
* **Custom Engine:** I built the 3D projection from scratch using custom SVG and D3-inspired math. 
* **State Animations:** Set your initial and target states using θ (theta) and φ (phi), hit play, and watch the vector transition. You can adjust the playback speed, pause, rewind, and track the math in the history log.

### 🔌 Circuit Designer
* **Drag-and-Drop:** Build circuits on up to 8 qubits. Just grab standard gates (H, X, Y, Z, CX) from the palette and drop them onto the lines.
* **Instant Results:** Hit "Run" and immediately see the measurement probability distribution for all possible basis states (from |000⟩ to |111⟩) in a clean bar chart.
* **Learn as You Go:** Hover over any gate in the palette for a quick refresher on what it does (e.g., Pauli-X acts as a quantum NOT gate, flipping |0⟩ to |1⟩).

### 🎓 Built-in Onboarding
* If you or anyone checking out the project is new to quantum computing, there is a built-in interactive tutorial. It highlights specific UI elements and walks you through setting up your first circuit or interpreting the green state vectors.

## Tech Specs
* **Frontend:** React
* **Icons:** `lucide-react`
* **Styling:** Dark atmospheric UI with glassmorphism
* **Rendering:** Custom SVG mapping for 3D state projections
