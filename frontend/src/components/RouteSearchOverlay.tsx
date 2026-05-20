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
      <div className="flex items-center bg-gray-800 border border-gray-700 rounded px-2 py-1.5 gap-1.5 shadow-lg">
        <svg aria-hidden="true" className="text-gray-400 shrink-0" width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.099zm-5.242 1.656a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z"/>
        </svg>
        <input
          type="text"
          value={text}
          onChange={handleChange}
          onFocus={() => text.length > 0 && setOpen(true)}
          placeholder="Search route…"
          className="bg-transparent text-white text-xs outline-none flex-1 min-w-0 placeholder-gray-500"
        />
        {text && (
          <button
            onClick={handleClear}
            className="text-gray-400 hover:text-white text-sm leading-none shrink-0"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded overflow-hidden shadow-lg">
          {filtered.map(route => (
            <li key={route}>
              <button
                className="w-full text-left px-3 py-1.5 text-xs text-gray-200 hover:bg-gray-700 cursor-pointer"
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
