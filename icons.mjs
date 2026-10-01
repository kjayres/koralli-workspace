const drawings = {
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  branch: '<circle cx="6" cy="5" r="2"/><circle cx="18" cy="7" r="2"/><circle cx="6" cy="19" r="2"/><path d="M6 7v10m0-6h5a7 7 0 0 0 7-2"/>',
  folder: '<path d="M3.5 7V5.5A1.5 1.5 0 0 1 5 4h5l2 3h7A1.5 1.5 0 0 1 20.5 8.5v10A1.5 1.5 0 0 1 19 20H5a1.5 1.5 0 0 1-1.5-1.5V7Z"/><path d="M3.5 9h17"/>',
  document: '<path d="M14 3.5H6A1.5 1.5 0 0 0 4.5 5v14A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5V9L14 3.5Z"/><path d="M14 3.5V9h5.5M8 12h8m-8 4h6"/>',
  agent: '<path d="m12 3 7.5 4.5v9L12 21l-7.5-4.5v-9L12 3Z"/><path d="m4.5 7.5 7.5 4.4 7.5-4.4M12 11.9V21m-3.8-6.7v-4.6l7.5-4.5"/><circle cx="15.7" cy="14.3" r="1"/>',
  database: '<ellipse cx="12" cy="5.5" rx="7.5" ry="3"/><path d="M4.5 5.5v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-12M4.5 11.5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/><path d="M16.5 9v1m0 5v1"/>',
  library: '<path d="M4 4.5h4v15H4zM10.5 4.5h4v15h-4zM16 5.5l3.9-.7 2.6 14.1-3.9.7zM4 8h4m2.5 0h4m2.1.5 3.9-.7M2.5 20.5h20"/>',
  activity: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.2 15.2 5.3 5.3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevron: '<path d="m9 5.5 6.5 6.5L9 18.5"/>',
  chevronDown: '<path d="m5.5 9 6.5 6.5L18.5 9"/>',
  arrowRight: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  arrowUp: '<path d="M12 20V4m-6 6 6-6 6 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  sidebar: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M9 4v16M5.5 8h1m-1 4h1"/>',
  panel: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M15 4v16m2.5-12h1m-1 4h1"/>',
  settings: '<path d="M5 3v6m0 4v8M12 3v10m0 4v4M19 3v2m0 4v12"/><circle cx="5" cy="11" r="2"/><circle cx="12" cy="15" r="2"/><circle cx="19" cy="7" r="2"/>',
  play: '<path d="m8 4.5 11 7.5-11 7.5v-15Z"/>',
  pause: '<rect x="6" y="4.5" width="3.5" height="15" rx=".5"/><rect x="14.5" y="4.5" width="3.5" height="15" rx=".5"/>',
  check: '<path d="m4.5 12 5 5 10-10"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 6.5V12l4 2.5"/>',
  link: '<path d="m9.5 14.5 5-5M8 15.5l-1 1a3.2 3.2 0 0 1-4.5-4.5l4-4a3.2 3.2 0 0 1 4.5 0m2 8a3.2 3.2 0 0 0 4.5 0l4-4A3.2 3.2 0 0 0 17 7.5l-1 1"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  code: '<path d="m7 7-5 5 5 5m10-10 5 5-5 5M14 4l-4 16"/>',
  message: '<path d="M5 4.5h14A1.5 1.5 0 0 1 20.5 6v10a1.5 1.5 0 0 1-1.5 1.5H9L3.5 21V6A1.5 1.5 0 0 1 5 4.5Z"/><path d="M7.5 9h9m-9 4h6"/>',
  layers: '<path d="m12 3 9.5 5L12 13l-9.5-5L12 3Zm-9.5 9 9.5 5 9.5-5m-19 5 9.5 5 9.5-5"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15.8 8.2-2.2 5.4-5.4 2.2 2.2-5.4 5.4-2.2ZM10.4 10.4l3.2 3.2"/>',
  external: '<path d="M13 4h7v7m0-7L10 14M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  command: '<path d="M8 8H5.5A2.5 2.5 0 1 1 8 5.5V18.5A2.5 2.5 0 1 1 5.5 16h13A2.5 2.5 0 1 1 16 18.5v-13A2.5 2.5 0 1 1 18.5 8H8Z"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.5 3 7.3 7.5 9.5 4.5-2.2 7.5-5 7.5-9.5V6L12 3Z"/><path d="m8.5 11.5 2.5 2.5 4.5-5"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z"/>',
  refresh: '<path d="M20 9a8 8 0 0 0-13.5-3L3.5 9m0-5v5h5M4 15a8 8 0 0 0 13.5 3l3-3m0 5v-5h-5"/>',
};

export const iconNames = Object.freeze(Object.keys(drawings));

export function icon(name, size = 20) {
  const dimension = Number.isFinite(size) && size > 0 ? size : 20;
  const glyph = Object.hasOwn(drawings, name) ? name : 'grid';
  return `<svg class="icon icon-${glyph}" width="${dimension}" height="${dimension}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${drawings[glyph]}</svg>`;
}
