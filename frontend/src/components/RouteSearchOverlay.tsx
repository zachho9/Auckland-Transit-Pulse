import { useState, useRef, useEffect } from 'react';

interface Props {
  options: string[];
  onSelect: (route: string | null) => void;
}

export function RouteSearchOverlay({ options, onSelect }: Props) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  const filtered = text
    ? options.filter(o => o.toLowerCase().startsWith(text.toLowerCase())).slice(0, 8)
    : [];

  function handleSelect(route: string) {
    setText(route);
    setOpen(false);
    onSelect(route);
  }

  function handleClear() {
    setText('');
    setOpen(false);
    onSelect(null);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setText(val);
    setOpen(val.length > 0);
  }

  return (
    <div ref={rootRef} className="relative w-44">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-col)',
          borderRadius: '6px',
          padding: '6px 10px',
          gap: '6px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
        }}
      >
        <svg style={{ color: 'var(--text-secondary)', flexShrink: 0 }} width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.656a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/>
        </svg>
        <input
          type="text"
          value={text}
          onChange={handleChange}
          onFocus={() => text.length > 0 && setOpen(true)}
          placeholder="Search route…"
          style={{
            background: 'transparent',
            color: 'var(--text-primary)',
            fontSize: '0.7rem',
            outline: 'none',
            flex: 1,
            minWidth: 0,
            fontFamily: "'Barlow', sans-serif",
          }}
        />
        {text && (
          <button
            onClick={handleClear}
            style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-col)',
            borderRadius: '6px',
            overflow: 'hidden',
            boxShadow: '0 8px 28px rgba(0,0,0,0.7)',
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}
        >
          {filtered.map(route => (
            <li key={route}>
              <button
                className="route-item"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '6px 12px',
                  fontSize: '0.7rem',
                  color: 'var(--text-primary)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Barlow', sans-serif",
                  display: 'block',
                }}
                onClick={() => handleSelect(route)}
              >
                {route}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
