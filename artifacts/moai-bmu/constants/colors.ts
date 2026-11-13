/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#173536',
    tint: '#087C79',

    // Core surfaces
    background: '#F3F7F4',
    foreground: '#173536',

    // Cards / elevated surfaces
    card: '#FFFFFF',
    cardForeground: '#173536',

    // Primary action color (buttons, links, active states)
    primary: '#087C79',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#E2EFEC',
    secondaryForeground: '#173536',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#EAF0EC',
    mutedForeground: '#586B68',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#DCEBE6',
    accentForeground: '#173536',

    // Destructive actions (delete, error states)
    destructive: '#B84231',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#CFDCD7',
    input: '#C0D1CA',
    deepSea: '#123F42',
    seaGlass: '#D7EEE7',
    sand: '#F4E9D5',
    amber: '#A75A16',
    success: '#216E4C',
    warning: '#9A5811',
    paleWarning: '#FFF1D9',
    dangerSoft: '#FBE9E5',
    processing: '#1E4E8C',
    processingSoft: '#E7F0FA',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 14,
};

export default colors;
