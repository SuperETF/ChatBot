export function calculateTargetHRs(resting, max) {
    return {
      60: Math.round((max - resting) * 0.6 + resting),
      70: Math.round((max - resting) * 0.7 + resting),
      80: Math.round((max - resting) * 0.8 + resting),
      90: Math.round((max - resting) * 0.9 + resting)
    };
  }
  