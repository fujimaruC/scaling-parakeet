import React from 'react';
import { Box, Chip, Tag, Button } from '../pixel/Primitives';
import { useTheme } from './theme';
import { Bitmap } from '../pixel/Bitmap';
import { ICONS } from '../pixel/icons';
import { UrgencyBar } from '../pixel/UrgencyBar';
export default function Kit() {
  const { theme, setTheme } = useTheme();
  return (
    <main className="kit">
      <h1>Academic OS — UI kit</h1>
      <p>
        Development-only primitives. Synthetic urgency intervals, no owner data
        or API requests.
      </p>
      <label>
        Theme
        <select
          aria-label="Theme"
          value={theme}
          onChange={(e) => setTheme(e.target.value as typeof theme)}
        >
          <option>system</option>
          <option>light</option>
          <option>dark</option>
        </select>
      </label>
      <Box>
        <h2>Paper / ink</h2>
        <p>Readable body text. Kuliah · Himpunan · Pribadi</p>
        <Chip>Chip</Chip> <Tag>Tag</Tag>
      </Box>
      <section>
        <h2>Actions</h2>
        <Button primary>Primary</Button> <Button>Secondary</Button>{' '}
        <Button disabled>Unavailable</Button>
      </section>
      <section>
        <h2>Bitmap icons</h2>
        {Object.entries(ICONS).map(([name, rows]) => (
          <p key={name}>
            <Bitmap rows={rows} /> {name}
          </p>
        ))}
      </section>
      <Box>
        <h2>Exact deadline intervals</h2>
        {[0, 43200000, 172800000, 345600000].map((due) => (
          <div key={due}>
            <p>{due / 86400000} days remaining (synthetic)</p>
            <UrgencyBar due={due} now={0} precision="datetime" />
          </div>
        ))}
      </Box>
    </main>
  );
}
