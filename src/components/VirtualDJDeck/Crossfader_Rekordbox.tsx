import React from 'react';

interface CrossfaderProps {
  value: number; // -1 (full A) to 1 (full B), 0 is center
  onChange: (value: number) => void;
  id?: string;
}

export const Crossfader_Rekordbox: React.FC<CrossfaderProps> = ({ value, onChange, id = 'crossfader' }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange(newValue);
  };

  // Convert -1 to 1 range to percentage for display
  const percentage = Math.round(((value + 1) / 2) * 100);

  return (
    <div className="crossfader-container" id={id}>
      <div className="crossfader-label-top">CROSSFADER</div>

      <div className="crossfader-track-wrapper">
        <div className="crossfader-label crossfader-label-left">A</div>

        <div className="crossfader-track">
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={value}
            onChange={handleChange}
            className="crossfader-slider"
          />
          <div className="crossfader-center-marker"></div>
          <div
            className="crossfader-position-indicator"
            style={{ left: `${percentage}%` }}
          >
            <div className="crossfader-handle">
              <div className="crossfader-handle-line"></div>
              <div className="crossfader-handle-line"></div>
              <div className="crossfader-handle-line"></div>
            </div>
          </div>
        </div>

        <div className="crossfader-label crossfader-label-right">B</div>
      </div>

      <div className="crossfader-value-display">
        {value < -0.1 ? 'DECK A' : value > 0.1 ? 'DECK B' : 'CENTER'}
      </div>
    </div>
  );
};

export default Crossfader_Rekordbox;
