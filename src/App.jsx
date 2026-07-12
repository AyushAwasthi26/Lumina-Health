import HealthcareApp from "./pages/HealthcareApp";

// Smooth scroll adding using Lenis

import { ReactLenis } from 'lenis/react';

// Required: Prevents browser default scroll bouncing and layout jumps
import 'lenis/dist/lenis.css';

function App() {
  return (
    <ReactLenis root options={{ lerp: 0.1, duration: 1.5, syncTouch: true }}>
      <HealthcareApp />
    </ReactLenis>
  );
}

export default App;
