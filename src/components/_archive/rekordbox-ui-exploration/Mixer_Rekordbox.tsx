import React from 'react';

interface MixerProps {
  volumeA: number; // 0 to 1
  volumeB: number; // 0 to 1
  onVolumeAChange: (value: number) => void;
  onVolumeBChange: (value: number) => void;
}

export const Mixer_Rekordbox: React.FC<MixerProps> = ({
  volumeA,
  volumeB,
  onVolumeAChange,
  onVolumeBChange,
}) => {
  const handleVolumeAChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onVolumeAChange(parseFloat(e.target.value));
  };

  const handleVolumeBChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onVolumeBChange(parseFloat(e.target.value));
  };

  // Convert 0-1 to percentage for display
  const volumeAPercent = Math.round(volumeA * 100);
  const volumeBPercent = Math.round(volumeB * 100);

  return (
    <div className="mixer-section">
      <div className="mixer-label">MIXER</div>

      <div className="mixer-channels">
        {/* Channel A */}
        <div className="mixer-channel">
          <div className="mixer-channel-label">DECK A</div>

          <div className="mixer-fader-container" id="volumeSliderA">
            <div className="mixer-fader-track">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volumeA}
                onChange={handleVolumeAChange}
                className="mixer-fader-input"
              />
              <div
                className="mixer-fader-fill"
                style={{ height: `${volumeAPercent}%` }}
              />
              <div
                className="mixer-fader-handle"
                style={{ bottom: `${volumeAPercent}%` }}
              />
            </div>
          </div>

          <div className="mixer-volume-display">{volumeAPercent}%</div>
        </div>

        {/* Channel B */}
        <div className="mixer-channel">
          <div className="mixer-channel-label">DECK B</div>

          <div className="mixer-fader-container" id="volumeSliderB">
            <div className="mixer-fader-track">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volumeB}
                onChange={handleVolumeBChange}
                className="mixer-fader-input"
              />
              <div
                className="mixer-fader-fill"
                style={{ height: `${volumeBPercent}%` }}
              />
              <div
                className="mixer-fader-handle"
                style={{ bottom: `${volumeBPercent}%` }}
              />
            </div>
          </div>

          <div className="mixer-volume-display">{volumeBPercent}%</div>
        </div>
      </div>
    </div>
  );
};

export default Mixer_Rekordbox;
