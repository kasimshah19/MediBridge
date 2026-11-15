import { useState, useEffect } from 'react';

/**
 * Custom hook for smooth count-up number animation.
 */
export function useCountUp(targetNumber = 0, durationMs = 1500) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(targetNumber, 10) || 0;
    if (end === 0) {
      setCount(0);
      return;
    }

    const frameRate = 1000 / 60;
    const totalFrames = Math.round(durationMs / frameRate);
    const increment = end / totalFrames;

    let currentFrame = 0;
    const timer = setInterval(() => {
      currentFrame++;
      start += increment;
      if (currentFrame >= totalFrames) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(Math.floor(start));
      }
    }, frameRate);

    return () => clearInterval(timer);
  }, [targetNumber, durationMs]);

  return count;
}

export default useCountUp;

